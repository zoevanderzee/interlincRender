// Direct schema update script without interactive prompts
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name properly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a temporary SQL file with our ALTER TABLE statements
const sqlContent = `
-- Add budget columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_cap DECIMAL(15,2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_used DECIMAL(15,2) DEFAULT '0';
ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_period TEXT DEFAULT 'yearly';
ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_start_date TIMESTAMP DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_end_date TIMESTAMP DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_reset_enabled BOOLEAN DEFAULT FALSE;
`;

const sqlPath = path.join(__dirname, 'temp-budget-migration.sql');
fs.writeFileSync(sqlPath, sqlContent);

try {
  // Run the SQL using psql
  console.log('Running SQL migration...');
  execSync(`psql ${process.env.DATABASE_URL} -f ${sqlPath}`, { stdio: 'inherit' });
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Error running migration:', error);
} finally {
  // Clean up the temporary file
  fs.unlinkSync(sqlPath);
}