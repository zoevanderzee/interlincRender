/**
 * Script to clear all sessions from the database
 */
import { storage } from './storage';
import { pool } from './db';

async function clearSessions() {
  try {
    console.log('Clearing all sessions...');
    
    // For PostgreSQL store
    if (storage.sessionStore.clear) {
      await storage.sessionStore.clear();
      console.log('Successfully cleared session store using clear() method');
    } else {
      // Direct SQL approach (backup)
      try {
        await pool.query('DROP TABLE IF EXISTS "session"');
        console.log('Successfully dropped session table');
      } catch (sqlError) {
        console.error('Error dropping session table:', sqlError);
      }
    }
    
    console.log('Session clearing completed.');
  } catch (error) {
    console.error('Error clearing sessions:', error);
  } finally {
    // Close connection
    try {
      pool.end();
    } catch (e) {
      // Ignore
    }
  }
}

clearSessions().catch(console.error);