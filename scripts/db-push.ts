import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execPromise = promisify(exec);

async function main() {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🚀 Pushing schema to database...');
  
  try {
    // Create Postgres client
    const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
    
    // Create a Drizzle instance
    const db = drizzle(migrationClient);
    
    console.log('Creating database tables...');
    
    try {
      console.log('Executing drizzle-kit push:pg...');
      await execPromise('npx drizzle-kit push:pg');
      console.log('✅ Schema successfully pushed to database!');
    } catch (error) {
      console.error('❌ Error running drizzle-kit push:', error);
      process.exit(1);
    }
    
    // Close connection
    await migrationClient.end();
    
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();