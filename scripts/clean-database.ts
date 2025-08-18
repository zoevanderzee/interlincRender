import { db } from '../server/db';
import { users, contracts, milestones, payments, documents, invites } from '../shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Script to clean all data from the database
 * This will delete all data except for specifically excluded admin users
 */
async function main() {
  try {
    console.log('Starting database cleanup...');
    
    // Get list of admin users to preserve (optional)
    console.log('Preserving admin users during cleanup...');
    const adminUsers = await db.select().from(users).where(sql`role = 'admin'`);
    console.log(`Found ${adminUsers.length} admin users to preserve`);
    
    // Delete all data from tables in reverse order of dependencies
    console.log('Deleting payments...');
    await db.delete(payments);
    
    console.log('Deleting milestones...');
    await db.delete(milestones);
    
    console.log('Deleting documents...');
    await db.delete(documents);
    
    console.log('Deleting contracts...');
    await db.delete(contracts);
    
    console.log('Deleting invites...');
    await db.delete(invites);
    
    console.log('Deleting users (except admins)...');
    // Delete all non-admin users
    await db.delete(users).where(sql`role != 'admin'`);
    
    console.log('✅ Database cleanup complete. All test data has been removed.');
    console.log('The database is now ready for your real users with a clean slate!');
  } catch (error) {
    console.error('Error cleaning database:', error);
  }
}

main();