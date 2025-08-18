import type { Express } from "express";
import { storage } from "../storage";

// API endpoint to get contractors with their businessWorkerId included
export function registerContractorsWithIdsRoutes(app: Express) {
  // Get contractors for a business with businessWorkerId included
  app.get("/api/business-workers/contractors", async (req, res) => {
    try {
      // Get current business ID from authenticated user
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const businessId = req.user.id;

      // Get all business_workers relationships for this business
      const businessWorkers = await storage.getBusinessWorkers(businessId);
      
      // Get contractor details for each relationship
      const contractorsWithIds = await Promise.all(
        businessWorkers.map(async (bw) => {
          const contractor = await storage.getUser(bw.contractorUserId);
          if (!contractor) return null;
          
          return {
            ...contractor,
            businessWorkerId: bw.id, // Include the business_workers table ID
          };
        })
      );

      // Filter out any null values and return
      const validContractors = contractorsWithIds.filter(c => c !== null);
      res.json(validContractors);

    } catch (error) {
      console.error("Error fetching contractors with business worker IDs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}