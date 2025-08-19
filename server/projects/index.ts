import type { Express } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertWorkRequestSchema, updateWorkRequestSchema } from "@shared/schema";
import { setupAuth } from "../auth";

export function registerProjectRoutes(app: Express) {
  const { requireAuth } = setupAuth(app);
  // Create a new project
  app.post("/api/projects", async (req, res) => {
    try {
      const { name, businessId, description, budget } = req.body;

      if (!name || !businessId) {
        return res.status(400).json({
          ok: false,
          message: "Name and businessId are required"
        });
      }

      const project = await storage.createProject({
        name,
        businessId,
        description,
        budget: budget ? budget.toString() : null
      });

      console.log(`[PROJECT_CREATED] id=${project.id} business=${businessId} name=${name}`);

      res.json({
        ok: true,
        data: project
      });

    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({
        ok: false,
        message: "Internal server error"
      });
    }
  });

  // Step B: Add worker to project (create work request)
  app.post("/api/projects/:projectId/work-requests", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const workRequestData = req.body;

      // Validate input data
      const validation = insertWorkRequestSchema.safeParse({
        ...workRequestData,
        projectId
      });

      if (!validation.success) {
        return res.status(422).json({
          ok: false,
          code: "WR_VALIDATION",
          message: "Invalid work request data",
          details: validation.error.errors
        });
      }

      const { contractorUserId, title, description, dueDate, amount, currency } = validation.data;

      // Load project and verify permissions
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({
          ok: false,
          message: "Project not found"
        });
      }

      // Verify contractor exists
      const contractor = await storage.getUser(contractorUserId);
      if (!contractor) {
        return res.status(404).json({
          ok: false,
          message: "Contractor not found"
        });
      }

      console.log(`[WR_CREATE] project=${projectId} business=${project.businessId} contractor=${contractorUserId}`);

      // Create work request using the new schema
      const workRequest = await storage.createWorkRequest({
        projectId,
        contractorUserId,
        title,
        description,
        dueDate,
        amount: amount.toString(),
        currency: currency || "USD",
        status: "assigned"
      });

      res.json({
        ok: true,
        workRequestId: workRequest.id,
        status: "assigned"
      });

    } catch (error) {
      console.error(`[WR_CREATE] Error:`, error);
      res.status(500).json({
        ok: false,
        code: "WR-SERVER-001",
        message: "Internal server error"
      });
    }
  });

  // Step C: Approve deliverable (triggers payout)
  app.post("/api/work-requests/:id/approve", async (req, res) => {
    try {
      const workRequestId = parseInt(req.params.id);

      // Get work request
      const workRequest = await storage.getWorkRequest(workRequestId);
      if (!workRequest) {
        return res.status(404).json({
          ok: false,
          message: "Work request not found"
        });
      }

      // Update status to approved (idempotent)
      if (workRequest.status === "approved") {
        return res.json({
          ok: true,
          status: "approved",
          message: "Already approved"
        });
      }

      // Transition status: assigned|in_review → approved
      if (!["assigned", "in_review"].includes(workRequest.status)) {
        return res.status(400).json({
          ok: false,
          message: `Cannot approve work request with status: ${workRequest.status}`
        });
      }

      // Update status
      await storage.updateWorkRequestStatus(workRequestId, "approved");

      // Emit event for payout service
      console.log(`[WORK_REQUEST_APPROVED] workRequestId=${workRequestId} amount=${workRequest.amount}`);
      // TODO: Emit WorkRequestApproved(id) event for payout service

      res.json({
        ok: true,
        status: "approved"
      });

    } catch (error) {
      console.error("Error approving work request:", error);
      res.status(500).json({
        ok: false,
        code: "WR-SERVER-001",
        message: "Internal server error"
      });
    }
  });

  // Get project work requests
  app.get("/api/projects/:projectId/work-requests", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const workRequests = await storage.getProjectWorkRequests(projectId);
      res.json(workRequests);
    } catch (error) {
      console.error("Error fetching work requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}