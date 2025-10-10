
import { db, pool } from '../server/db';

async function addTaskIdColumn() {
  console.log('Adding task_id column to work_requests table...');
  
  try {
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'work_requests' AND column_name = 'task_id'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('Column does not exist, adding it now...');
      
      // Add the column
      await pool.query(`
        ALTER TABLE work_requests 
        ADD COLUMN task_id INTEGER REFERENCES tasks(id)
      `);
      
      console.log('✅ task_id column added successfully!');
    } else {
      console.log('Column already exists.');
    }
  } catch (error) {
    console.error('Error adding task_id column:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addTaskIdColumn();
