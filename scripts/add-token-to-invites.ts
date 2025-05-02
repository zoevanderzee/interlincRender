import { pool } from "../server/db";

/**
 * Script to add the token column to the invites table
 */
async function main() {
  console.log("Adding token column to invites table...");
  
  try {
    // Check if the token column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invites' AND column_name = 'token'
    `);
    
    if (checkResult.rowCount > 0) {
      console.log("Token column already exists in invites table.");
      return;
    }

    // Add the token column
    const result = await pool.query(`
      ALTER TABLE invites 
      ADD COLUMN token TEXT;
    `);

    console.log("Added token column to invites table successfully.");
  } catch (error) {
    console.error("Error adding token column to invites table:", error);
  } finally {
    await pool.end();
  }
}

main();