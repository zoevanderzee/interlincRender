import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { createId } from '@paralleldrive/cuid2';

async function main() {
  // Ensure we have a database URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  console.log('🚀 Generating migrations...');
  
  try {
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });
    const db = drizzle(sql);
    
    // Generate a unique name for the migration
    const migrationName = `update_${createId()}`;
    
    await migrate(db, {
      migrationsFolder: './drizzle',
      migrationsTable: 'drizzle_migrations',
      customMigrationName: migrationName,
    });
    
    console.log(`✅ Migration '${migrationName}' generated successfully!`);
    await sql.end();
  } catch (error) {
    console.error('❌ Error generating migrations:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();