import { pool } from '../server/db';

async function addResetPasswordFields() {
  try {
    // Check if columns already exist
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('reset_password_token', 'reset_password_expires')
    `;
    
    const result = await pool.query(checkColumnsQuery);
    const existingColumns = result.rows.map(row => row.column_name);
    
    // Add reset_password_token column if it doesn't exist
    if (!existingColumns.includes('reset_password_token')) {
      console.log('Adding reset_password_token column to users table...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN reset_password_token TEXT
      `);
      console.log('reset_password_token column added successfully');
    } else {
      console.log('reset_password_token column already exists');
    }
    
    // Add reset_password_expires column if it doesn't exist
    if (!existingColumns.includes('reset_password_expires')) {
      console.log('Adding reset_password_expires column to users table...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN reset_password_expires TIMESTAMP
      `);
      console.log('reset_password_expires column added successfully');
    } else {
      console.log('reset_password_expires column already exists');
    }

    console.log('Reset password fields have been successfully added to the database!');
  } catch (error) {
    console.error('Error adding reset password fields:', error);
  } finally {
    await pool.end();
  }
}

addResetPasswordFields();