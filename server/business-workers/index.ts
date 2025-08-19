import type { Express } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertBusinessWorkerSchema } from "@shared/schema";

export function registerBusinessWorkerRoutes(app: Express, requireAuth: any) {
  // Step A: Contractor joins business (via code)
  app.post("/api/businesses/:businessId/workers/join", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const { contractorUserId, inviteCode } = req.body;

      console.log(`[JOIN] business=${businessId} contractor=${contractorUserId} code=${inviteCode?.substring(0, 3)}...`);

      // Validate inputs
      if (!businessId || !contractorUserId || !inviteCode) {
        return res.status(422).json({
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Missing required fields",
          details: { businessId, contractorUserId, inviteCode: !!inviteCode }
        });
      }

      // Get business user to validate invite code
      const businessUser = await storage.getUser(businessId);
      if (!businessUser) {
        console.log(`[JOIN] business=${businessId} contractor=${contractorUserId} code=${inviteCode?.substring(0, 3)}... result=error - business not found`);
        return res.status(404).json({
          ok: false,
          message: "Business not found"
        });
      }

      // Validate invite code matches business profile code
      if (businessUser.profileCode !== inviteCode) {
        console.log(`[JOIN] business=${businessId} contractor=${contractorUserId} code=${inviteCode?.substring(0, 3)}... result=error - invalid code`);
        return res.status(400).json({
          ok: false,
          message: "Invalid invite code"
        });
      }

      // Get contractor user
      const contractorUser = await storage.getUser(contractorUserId);
      if (!contractorUser) {
        console.log(`[JOIN] business=${businessId} contractor=${contractorUserId} code=${inviteCode?.substring(0, 3)}... result=error - contractor not found`);
        return res.status(404).json({
          ok: false,
          message: "Contractor not found"
        });
      }

      // Upsert business_workers entry
      const businessWorker = await storage.upsertBusinessWorker({
        businessId,
        contractorUserId,
        status: "active"
      });

      console.log(`[JOIN] business=${businessId} contractor=${contractorUserId} code=${inviteCode?.substring(0, 3)}... result=ok`);

      res.json({
        ok: true,
        contractorUserId: businessWorker.contractorUserId
      });

    } catch (error) {
      console.error(`[JOIN] Error:`, error);
      res.status(500).json({
        ok: false,
        code: "WR-SERVER-001",
        message: "Internal server error"
      });
    }
  });

  // Get business workers for dropdown
  app.get("/api/businesses/:businessId/workers", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      
      const workers = await storage.getBusinessWorkers(businessId);
      
      res.json(workers.map(w => ({
        contractorUserId: w.contractorUserId,
        name: w.contractorName || `User ${w.contractorUserId}`
      })));

    } catch (error) {
      console.error("Error fetching business workers:", error);
      res.status(500).json({
        ok: false,
        message: "Internal server error"
      });
    }
  });

  // Get business worker ID for a specific contractor
  app.get("/api/businesses/:contractorId/business-worker", requireAuth, async (req, res) => {
    try {
      const contractorId = parseInt(req.params.contractorId);
      const businessId = req.user?.id;
      
      if (!businessId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Find the business_workers record for this business and contractor
      const businessWorkers = await storage.getBusinessWorkers(businessId);
      const businessWorker = businessWorkers.find(bw => bw.contractorUserId === contractorId);
      
      if (!businessWorker) {
        return res.status(404).json({ error: "Contractor not found in business roster" });
      }
      
      res.json({
        contractorUserId: businessWorker.contractorUserId,
        status: businessWorker.status
      });

    } catch (error) {
      console.error("Error fetching business worker:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}