import type { Express } from "express";
import { storage } from "../storage";

// API endpoint to get contractors with their contractor user ID included
export function registerContractorsWithIdsRoutes(app: Express, requireAuth?: any) {
  // Get contractors for a business with contractor user ID included
  app.get("/api/business-workers/contractors", requireAuth, async (req, res) => {
    try {
      // Get current business ID from X-User-ID header (primary method)
      let businessId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : req.user?.id;
      
      console.log(`Contractors endpoint - businessId: ${businessId}, from header: ${req.headers['x-user-id']}, from session: ${req.user?.id}`);
      
      if (!businessId) {
        console.log(`No businessId found - headers: ${JSON.stringify(req.headers)}`);
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log(`Processing contractors request for business ID: ${businessId}`);

      // Get contractors from business_workers table (primary source)
      let contractorsFromBusinessWorkers = [];
      try {
        const businessWorkers = await storage.getBusinessWorkers(businessId);
        console.log(`Found ${businessWorkers.length} entries in business_workers table for business ID: ${businessId}`);

        for (const businessWorker of businessWorkers) {
          if (businessWorker.contractorUserId && businessWorker.status === 'active') {
            const contractor = await storage.getUser(businessWorker.contractorUserId);
            if (contractor && contractor.role === 'contractor') {
              contractorsFromBusinessWorkers.push(contractor);
            }
          }
        }

        console.log(`Found ${contractorsFromBusinessWorkers.length} contractors from business_workers table`);
      } catch (error) {
        console.error("Error fetching contractors from business_workers table:", error);
      }

      // Fallback: Get contractors from legacy connection requests if business_workers table is empty
      let contractorsByConnections = [];
      if (contractorsFromBusinessWorkers.length === 0) {
        try {
          const connections = await storage.getConnectionRequests({
            businessId: businessId,
            status: 'accepted'
          });

          console.log(`Fallback: Found ${connections.length} accepted connection requests for business ID: ${businessId}`);

          for (const connection of connections) {
            if (connection.contractorId) {
              const contractor = await storage.getUser(connection.contractorId);
              if (contractor && contractor.role === 'contractor') {
                contractorsByConnections.push(contractor);
                
                // Migrate to business_workers table
                try {
                  await storage.upsertBusinessWorker({
                    businessId: businessId,
                    contractorUserId: connection.contractorId,
                    status: 'active'
                  });
                  console.log(`Migrated contractor ${connection.contractorId} to business_workers table`);
                } catch (migrateError) {
                  console.error('Error migrating contractor to business_workers table:', migrateError);
                }
              }
            }
          }

          console.log(`Fallback: Found ${contractorsByConnections.length} contractors through connections`);
        } catch (error) {
          console.error("Error fetching connected contractors:", error);
        }
      }

      // Use primary data source (business_workers) or fallback
      const finalContractors = contractorsFromBusinessWorkers.length > 0 ? contractorsFromBusinessWorkers : contractorsByConnections;

      console.log(`Returning ${finalContractors.length} contractors for business ${businessId} (source: ${contractorsFromBusinessWorkers.length > 0 ? 'business_workers table' : 'connection_requests fallback'})`);
      res.json(finalContractors);

    } catch (error) {
      console.error("Error fetching contractors:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}