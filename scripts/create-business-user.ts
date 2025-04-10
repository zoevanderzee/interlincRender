/**
 * Script to create a test business user
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  console.log('Setting up test business user...');
  
  // Check if business user exists
  const existingUser = await db.select().from(users).where(eq(users.email, 'test.business@example.com')).execute();
  
  if (existingUser.length === 0) {
    // Create test business
    console.log('Creating test business user...');
    const hashedPassword = await hashPassword('password123');
    
    const [user] = await db.insert(users).values({
      username: 'test_business',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Business',
      email: 'test.business@example.com',
      role: 'business',
      companyName: 'Test Business Inc.',
      title: 'CEO'
    }).returning();
    
    console.log(`Created test business user with ID: ${user.id}`);
  } else {
    console.log(`Test business user already exists with ID: ${existingUser[0].id}`);
  }
  
  console.log('\nTest business account ready:');
  console.log('----------------------------------------');
  console.log('Username: test_business');
  console.log('Password: password123');
  console.log('----------------------------------------');
}

main().catch(console.error).finally(() => process.exit(0));