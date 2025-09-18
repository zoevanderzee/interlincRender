import type { Express } from "express";
import { storage } from "../storage";

// API endpoint to get contractors with their contractor user ID included
export function registerContractorsWithIdsRoutes(app: Express, requireAuth?: any) {
  // Get contractors for a business with contractor user ID included
  app.get("/api/business-workers/contractors", async (req, res) => {
    try {
      // Get current business ID from X-User-ID header (primary method)
      let businessId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : req.user?.id;
      
      console.log(`Contractors endpoint - businessId: ${businessId}, from header: ${req.headers['x-user-id']}, from session: ${req.user?.id}`);
      
      if (!businessId) {
        console.log(`No businessId found - headers: ${JSON.stringify(req.headers)}`);
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get contractors linked to this business through contracts
      const contractorsWithContracts = await storage.getContractorsByBusinessId(businessId);

      // Get contractors from accepted connection requests
      let contractorsByConnections = [];
      try {
        const connections = await storage.getConnectionRequests({
          businessId: businessId,
          status: 'accepted'
        });

        console.log(`Found ${connections.length} accepted connection requests for business ID: ${businessId}`);

        for (const connection of connections) {
          if (connection.contractorId) {
            const contractor = await storage.getUser(connection.contractorId);
            if (contractor && contractor.role === 'contractor') {
              contractorsByConnections.push(contractor);
            }
          }
        }

        console.log(`Found ${contractorsByConnections.length} contractors through connections`);
      } catch (error) {
        console.error("Error fetching connected contractors:", error);
      }

      // Combine and deduplicate contractors
      const contractorIds = new Set();
      const uniqueContractors = [];

      [...contractorsWithContracts, ...contractorsByConnections].forEach(contractor => {
        if (!contractorIds.has(contractor.id) && contractor.role === 'contractor') {
          contractorIds.add(contractor.id);
          uniqueContractors.push(contractor);
        }
      });

      console.log(`Returning ${uniqueContractors.length} contractors for business ${businessId}`);
      res.json(uniqueContractors);

    } catch (error) {
      console.error("Error fetching contractors:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}