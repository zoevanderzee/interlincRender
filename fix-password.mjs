import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixPassword() {
  try {
    // Hash the password properly
    const hashedPassword = await bcrypt.hash('newpassword123', 10);
    console.log('Generated hash length:', hashedPassword.length);
    console.log('Hash starts with:', hashedPassword.substring(0, 10));
    
    // Update the password
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING username',
      [hashedPassword, 'CreativLinc']
    );
    
    console.log('Password updated for:', result.rows[0]?.username);
    
    // Test the password immediately
    const user = await pool.query('SELECT password FROM users WHERE username = $1', ['CreativLinc']);
    const isValid = await bcrypt.compare('newpassword123', user.rows[0].password);
    console.log('Password verification test:', isValid ? 'PASS' : 'FAIL');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixPassword();