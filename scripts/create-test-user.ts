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
    console.log('Creating test user...');
    
    // Check if the user already exists
    const existingUsers = await db.select().from(users).where(
      eq(users.username, 'test_admin')
    );
    
    if (existingUsers.length > 0) {
      console.log('Test user already exists.');
      process.exit(0);
    }
    
    // Hash the password
    const hashedPassword = await hashPassword('test123');
    
    // Create test user
    const newUser = await db.insert(users).values({
      username: 'test_admin',
      password: hashedPassword,
      email: 'admin@creativlinc.com',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'business',
      companyName: 'CreativLinc Inc.',
      title: 'Administrator'
    }).returning();
    
    console.log('✅ Test user created successfully:', newUser[0].id);
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();