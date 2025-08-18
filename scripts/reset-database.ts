import { db } from '../server/db';
import { 
  users, 
  contracts, 
  milestones, 
  payments, 
  documents, 
  invites, 
  bankAccounts 
} from '../shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Script to completely reset the database
 * This will delete ALL data, including all users, with no exceptions
 */
async function main() {
  try {
    console.log('Starting complete database reset...');
    
    // Delete session data first (if exists)
    try {
      await db.execute(sql`DELETE FROM "session"`);
      console.log('Deleted all session data');
    } catch (error) {
      console.log('No session table found or error deleting sessions');
    }
    
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
    
    console.log('Deleting bank accounts...');
    try {
      await db.delete(bankAccounts);
    } catch (error) {
      console.log('No bank accounts table found or error deleting bank accounts');
    }
    
    console.log('Deleting ALL users (including admins)...');
    // Delete all users without exception
    await db.delete(users);
    
    console.log('✅ Complete database reset successful!');
    console.log('The database is now completely empty and ready for new accounts.');
    console.log('You can now create fresh accounts with the correct role types.');
    
  } catch (error) {
    console.error('Error resetting database:', error);
  }
}

main();