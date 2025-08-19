import type { Express } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertWorkRequestSchema, updateWorkRequestSchema } from "@shared/schema";
import { setupAuth } from "../auth";

export function registerProjectRoutes(app: Express) {
  const { requireAuth } = setupAuth(app);
  
  // Get all projects for a business (used by Projects page)
  app.get("/api/projects", async (req, res) => {
    try {
      let userId = req.user?.id;
      
      // Use X-User-ID header fallback if session auth failed
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const projects = await storage.getBusinessProjects(userId);
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get a single project by ID
  app.get("/api/projects/:id", async (req, res) => {
    try {
      let userId = req.user?.id;
      
      // Use X-User-ID header fallback if session auth failed
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Verify user has access to this project (business owner)
      if (project.businessId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
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

      const { contractorUserId, title, description, deliverableDescription, dueDate, amount, currency } = validation.data;

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
        deliverableDescription,
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
      
      // Enhance work requests with contractor information
      const enhancedWorkRequests = await Promise.all(
        workRequests.map(async (wr) => {
          if (wr.contractorUserId) {
            try {
              const contractor = await storage.getUser(wr.contractorUserId);
              if (contractor) {
                return {
                  ...wr,
                  contractorName: contractor.firstName && contractor.lastName 
                    ? `${contractor.firstName} ${contractor.lastName}`
                    : contractor.username,
                  contractorEmail: contractor.email
                };
              }
            } catch (error) {
              console.error(`Error fetching contractor ${wr.contractorUserId}:`, error);
            }
          }
          return wr;
        })
      );
      
      res.json(enhancedWorkRequests);
    } catch (error) {
      console.error("Error fetching work requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Accept work request (contractor accepts the work)
  app.post("/api/work-requests/:id/accept", async (req, res) => {
    try {
      const workRequestId = parseInt(req.params.id);
      
      // Use the same authentication pattern as other endpoints
      let currentUserId = req.user?.id;
      
      // Fallback to X-User-ID header like other endpoints in this system
      if (!currentUserId && req.headers['x-user-id']) {
        currentUserId = parseInt(req.headers['x-user-id'] as string);
      }

      console.log(`[ACCEPT DEBUG] Request ID: ${workRequestId}, User ID: ${currentUserId}, Headers:`, req.headers['x-user-id']);

      if (!currentUserId) {
        return res.status(401).json({
          ok: false,
          message: "Authentication required"
        });
      }

      // Get work request
      const workRequest = await storage.getWorkRequest(workRequestId);
      if (!workRequest) {
        return res.status(404).json({
          ok: false,
          message: "Work request not found"
        });
      }

      // Verify this contractor is assigned to this work request
      if (workRequest.contractorUserId !== currentUserId) {
        return res.status(403).json({
          ok: false,
          message: "You can only accept work requests assigned to you"
        });
      }

      // Check if already accepted
      if (workRequest.status === "accepted") {
        return res.json({
          ok: true,
          status: "accepted",
          message: "Already accepted"
        });
      }

      // Only allow accepting "assigned" work requests
      if (workRequest.status !== "assigned") {
        return res.status(400).json({
          ok: false,
          message: `Cannot accept work request with status: ${workRequest.status}`
        });
      }

      // Update status to accepted
      await storage.updateWorkRequestStatus(workRequestId, "accepted");

      // Get project and business info for contract creation
      const project = await storage.getProject(workRequest.projectId);
      if (!project) {
        throw new Error("Project not found for work request");
      }

      const business = await storage.getUser(project.businessId);
      if (!business) {
        throw new Error("Business not found for project");
      }

      // Create contract when work request is accepted
      const contractCode = `WR-${workRequestId}-${Date.now().toString(36).toUpperCase()}`;
      const contractName = `${workRequest.title} - ${business.companyName || business.firstName + ' ' + business.lastName}`;
      
      const contract = await storage.createContract({
        contractName,
        contractCode,
        businessId: project.businessId,
        projectId: workRequest.projectId,
        contractorId: currentUserId,
        description: workRequest.description || `Contract for work request: ${workRequest.title}`,
        status: "active",
        value: workRequest.amount,
        contractorBudget: workRequest.amount,
        startDate: new Date().toISOString(),
        endDate: workRequest.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days if no due date
      });

      // Link work request to contract
      await storage.updateWorkRequestContract(workRequestId, contract.id);

      // Create a deliverable/milestone automatically when work request is accepted
      const milestone = await storage.createMilestone({
        contractId: contract.id,
        name: workRequest.title,
        description: workRequest.deliverableDescription || workRequest.description || `Deliverable for: ${workRequest.title}`,
        dueDate: workRequest.dueDate ? new Date(workRequest.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentAmount: workRequest.amount,
        status: 'assigned',
        progress: 0,
        autoPayEnabled: true,
        submissionType: 'digital'
      });

      console.log(`[WORK_REQUEST_ACCEPTED] workRequestId=${workRequestId} contractorId=${currentUserId} contractId=${contract.id} milestoneId=${milestone.id} amount=${workRequest.amount}`);

      res.json({
        ok: true,
        status: "accepted",
        message: "Work request accepted successfully",
        contractId: contract.id,
        milestoneId: milestone.id
      });

    } catch (error) {
      console.error("Error accepting work request:", error);
      res.status(500).json({
        ok: false,
        code: "WR-SERVER-002",
        message: "Internal server error"
      });
    }
  });

  // Decline work request (contractor declines the work)
  app.post("/api/work-requests/:id/decline", async (req, res) => {
    try {
      const workRequestId = parseInt(req.params.id);
      
      // Use the same authentication pattern as other endpoints
      let currentUserId = req.user?.id;
      
      // Fallback to X-User-ID header like other endpoints in this system
      if (!currentUserId && req.headers['x-user-id']) {
        currentUserId = parseInt(req.headers['x-user-id'] as string);
      }

      if (!currentUserId) {
        return res.status(401).json({
          ok: false,
          message: "Authentication required"
        });
      }

      // Get work request
      const workRequest = await storage.getWorkRequest(workRequestId);
      if (!workRequest) {
        return res.status(404).json({
          ok: false,
          message: "Work request not found"
        });
      }

      // Verify this contractor is assigned to this work request
      if (workRequest.contractorUserId !== currentUserId) {
        return res.status(403).json({
          ok: false,
          message: "You can only decline work requests assigned to you"
        });
      }

      // Check if already declined
      if (workRequest.status === "declined") {
        return res.json({
          ok: true,
          status: "declined",
          message: "Already declined"
        });
      }

      // Only allow declining "assigned" or "accepted" work requests
      if (!["assigned", "accepted"].includes(workRequest.status)) {
        return res.status(400).json({
          ok: false,
          message: `Cannot decline work request with status: ${workRequest.status}`
        });
      }

      // Update status to declined
      await storage.updateWorkRequestStatus(workRequestId, "declined");

      console.log(`[WORK_REQUEST_DECLINED] workRequestId=${workRequestId} contractorId=${currentUserId} amount=${workRequest.amount}`);

      res.json({
        ok: true,
        status: "declined",
        message: "Work request declined successfully"
      });

    } catch (error) {
      console.error("Error declining work request:", error);
      res.status(500).json({
        ok: false,
        code: "WR-SERVER-003",
        message: "Internal server error"
      });
    }
  });
}