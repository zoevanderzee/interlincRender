import type { Express } from "express";
import { storage } from "../storage";

// API endpoint to get contractors with their contractor user ID included
export function registerContractorsWithIdsRoutes(app: Express, requireAuth?: any) {
  // Get contractors for a business with contractor user ID included
  app.get("/api/business-workers/contractors", async (req, res) => {
    try {
      // Get current business ID from authenticated user or X-User-ID header
      let businessId = req.user?.id;
      
      // Fallback to X-User-ID header if session auth failed
      if (!businessId && req.headers['x-user-id']) {
        businessId = parseInt(req.headers['x-user-id'] as string);
        console.log(`Using X-User-ID header fallback for contractors endpoint: ${businessId}`);
      }
      
      if (!businessId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get all business_workers relationships for this business
      const businessWorkers = await storage.getBusinessWorkers(businessId);
      
      // Get contractor details for each relationship
      const contractorsWithIds = await Promise.all(
        businessWorkers.map(async (bw) => {
          const contractor = await storage.getUser(bw.contractorUserId);
          if (!contractor) return null;
          
          return {
            ...contractor,
            // contractor user ID is already included in contractor object
          };
        })
      );

      // Filter out any null values and return
      const validContractors = contractorsWithIds.filter(c => c !== null);
      res.json(validContractors);

    } catch (error) {
      console.error("Error fetching contractors:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}