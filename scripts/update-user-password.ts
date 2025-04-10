import { db } from '../server/db';
import { users } from '../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

// Function to hash passwords
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  try {
    const userId = 9; // cdmanagement user
    console.log(`Updating password for user ID ${userId}...`);
    
    // Hash the password
    const hashedPassword = await hashPassword('password123');
    
    // Update user's password
    const updatedUser = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    
    if (updatedUser.length === 0) {
      console.error('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ Password updated successfully for user:', updatedUser[0].username);
  } catch (error) {
    console.error('❌ Error updating password:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();