/**
 * Script to update the database schema for budget allocation features
 * This adds budget-related columns to users table directly using pg client
 */
import { Client } from 'pg';

async function main() {
  console.log("Starting schema update for budget allocation features...");
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log("Connected to database");
    
    // Add budget_cap column to users table if it doesn't exist
    console.log("Adding budget columns...");
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_cap DECIMAL(15,2) DEFAULT NULL;
      
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_used DECIMAL(15,2) DEFAULT '0';
      
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_period TEXT DEFAULT 'yearly';
      
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_start_date TIMESTAMP DEFAULT NULL;
      
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_end_date TIMESTAMP DEFAULT NULL;
      
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_reset_enabled BOOLEAN DEFAULT FALSE;
    `);
    
    console.log("Schema update for budget allocation features complete!");
  } catch (error) {
    console.error("Error updating schema:", error);
    throw error;
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error in main function:", error);
    process.exit(1);
  });