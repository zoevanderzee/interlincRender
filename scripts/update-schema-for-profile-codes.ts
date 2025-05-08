#!/usr/bin/env tsx

/**
 * Script to update the database schema for worker profile codes
 * This adds the profile_code column to users table and creates the connection_requests table
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import fs from 'fs';
import path from 'path';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  console.log("Connected to database, running manual schema updates...");
  
  // First check if the profile_code column exists
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'profile_code'
    `);
    
    if (result.rows.length === 0) {
      console.log("Adding profile_code column to users table...");
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS profile_code TEXT UNIQUE
      `);
      console.log("Profile code column added successfully!");
    } else {
      console.log("Profile code column already exists.");
    }
  } catch (error) {
    console.error("Error checking or adding profile_code column:", error);
    throw error;
  }
  
  // Check if the connection_requests table exists
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'connection_requests'
    `);
    
    if (result.rows.length === 0) {
      console.log("Creating connection_requests table...");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS connection_requests (
          id SERIAL PRIMARY KEY,
          business_id INTEGER NOT NULL REFERENCES users(id),
          contractor_id INTEGER REFERENCES users(id),
          profile_code TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          message TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log("Connection requests table created successfully!");
    } else {
      console.log("Connection requests table already exists.");
    }
  } catch (error) {
    console.error("Error checking or creating connection_requests table:", error);
    throw error;
  }
  
  console.log("Schema updates completed successfully!");
  await pool.end();
}

main()
  .then(() => {
    console.log("Script completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });