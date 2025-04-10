/**
 * Script to simulate a Stripe Connect account in the database
 * This is for demonstration purposes only when you don't have a real Stripe Connect account
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
  console.log('Setting up test contractor with simulated Stripe Connect account...');
  
  // Check if test contractor already exists
  const existingUser = await db.select().from(users).where(eq(users.email, 'test.contractor@example.com')).execute();
  
  let userId: number;
  
  if (existingUser.length === 0) {
    // Create test contractor
    console.log('Creating test contractor...');
    const [user] = await db.insert(users).values({
      username: 'test_contractor',
      password: await hashPassword('password123'),
      firstName: 'Test',
      lastName: 'Contractor',
      email: 'test.contractor@example.com',
      role: 'contractor',
      companyName: 'Test Contractor Company',
      title: 'Development Agency'
    }).returning();
    
    userId = user.id;
    console.log(`Created test contractor with ID: ${userId}`);
  } else {
    userId = existingUser[0].id;
    console.log(`Test contractor already exists with ID: ${userId}`);
  }
  
  // Simulate a Stripe Connect account by updating the user record
  // We'll use a fake account ID with the prefix "acct_" to mimic a real Stripe account ID
  const fakeConnectAccountId = `acct_${randomBytes(16).toString('hex')}`;
  
  await db.update(users)
    .set({ 
      stripeConnectAccountId: fakeConnectAccountId,
      payoutEnabled: true  // Set to true to simulate a fully onboarded account
    })
    .where(eq(users.id, userId))
    .execute();
  
  console.log(`Updated user with simulated Connect account ID: ${fakeConnectAccountId}`);
  console.log('Marked account as ready to receive payments');
  
  console.log('\nTest account ready for simulated Connect payments:');
  console.log('----------------------------------------');
  console.log('Username: test_contractor');
  console.log('Password: password123');
  console.log('----------------------------------------');
  console.log('IMPORTANT: This is a simulation only. Real payments will fail.');
  console.log('You can now log in and test the Connect payment flow UI');
}

main().catch(console.error).finally(() => process.exit(0));