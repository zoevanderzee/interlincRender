/**
 * Script to update the database schema for budget allocation features
 * This adds budget-related columns to users table
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create a database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log("Starting schema update for budget allocation features...");
  
  try {
    // Add budget_cap column to users table if it doesn't exist
    console.log("Adding budget_cap column...");
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_cap DECIMAL(15,2) DEFAULT NULL
    `);
    
    // Add budget_used column
    console.log("Adding budget_used column...");
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_used DECIMAL(15,2) DEFAULT '0'
    `);
    
    // Add budget_period column
    console.log("Adding budget_period column...");
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_period TEXT DEFAULT 'yearly'
    `);
    
    // Add budget_start_date column
    console.log("Adding budget_start_date column...");
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_start_date TIMESTAMP DEFAULT NULL
    `);
    
    // Add budget_end_date column
    console.log("Adding budget_end_date column...");
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_end_date TIMESTAMP DEFAULT NULL
    `);
    
    // Add budget_reset_enabled column
    console.log("Adding budget_reset_enabled column...");
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS budget_reset_enabled BOOLEAN DEFAULT FALSE
    `);
    
    console.log("Schema update for budget allocation features complete!");
  } catch (error) {
    console.error("Error updating schema:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error in main function:", error);
    process.exit(1);
  });