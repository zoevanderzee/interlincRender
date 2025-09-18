
import { storage } from "../server/storage";

async function migrateToBusinessWorkers() {
  console.log('Starting migration to business_workers table...');
  
  try {
    // Get all accepted connection requests
    const acceptedConnections = await storage.getConnectionRequests({ status: 'accepted' });
    
    console.log(`Found ${acceptedConnections.length} accepted connection requests to migrate`);
    
    let migrated = 0;
    let errors = 0;
    
    for (const connection of acceptedConnections) {
      if (connection.businessId && connection.contractorId) {
        try {
          await storage.upsertBusinessWorker({
            businessId: connection.businessId,
            contractorUserId: connection.contractorId,
            status: 'active'
          });
          migrated++;
          console.log(`✓ Migrated: Business ${connection.businessId} <-> Contractor ${connection.contractorId}`);
        } catch (error) {
          errors++;
          console.error(`✗ Error migrating Business ${connection.businessId} <-> Contractor ${connection.contractorId}:`, error);
        }
      }
    }
    
    console.log(`Migration completed: ${migrated} successful, ${errors} errors`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
  
  process.exit(0);
}

migrateToBusinessWorkers();
