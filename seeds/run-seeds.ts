import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "../shared/schema";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Function to push schema changes to database using drizzle-kit
async function pushSchemaChanges() {
  console.log("Pushing schema changes to database...");
  
  try {
    // Use drizzle-kit push to create/update tables
    const { stdout, stderr } = await execAsync("npx drizzle-kit push:pg");
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log("Schema changes pushed successfully");
    
    // Now run the seed scripts
    console.log("Running seed scripts...");
    await import('./seed-contractors.js');
    await import('./seed-business.js');
    console.log("Seed scripts completed");
  } catch (error) {
    console.error("Error pushing schema or running seeds:", error);
  }
}

// Execute the function
pushSchemaChanges().catch(console.error);