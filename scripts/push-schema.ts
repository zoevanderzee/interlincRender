import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🚀 Pushing schema changes to the database...');
  
  try {
    // This will create tables if they don't exist or alter them if they need changes
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('✅ Schema changes successfully applied!');
  } catch (error) {
    console.error('❌ Error applying schema changes:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();