/**
 * Script to set up a test contractor with a Stripe Connect account
 * This script will create a test contractor and set up their Stripe Connect account
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Check for Stripe secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  console.log('Setting up test contractor with Stripe Connect account...');
  
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
  
  // Check if user already has a Stripe Connect account
  const user = await db.select().from(users).where(eq(users.id, userId)).execute();
  
  if (user[0].stripeConnectAccountId) {
    console.log(`User already has a Stripe Connect account: ${user[0].stripeConnectAccountId}`);
    
    // Verify if the account is still valid in Stripe
    try {
      const account = await stripe.accounts.retrieve(user[0].stripeConnectAccountId);
      console.log(`Account exists in Stripe. Status: ${account.details_submitted ? 'completed' : 'pending'}`);
      
      // Update user record with latest status
      await db.update(users)
        .set({ 
          payoutEnabled: account.payouts_enabled
        })
        .where(eq(users.id, userId))
        .execute();
        
      console.log('Account status updated in database');
    } catch (err) {
      console.log('Error retrieving Stripe account, creating a new one...');
      await createConnectAccount(userId);
    }
  } else {
    // Create Stripe Connect account
    await createConnectAccount(userId);
  }
  
  console.log('\nTest account ready for Connect payments:');
  console.log('----------------------------------------');
  console.log('Username: test_contractor');
  console.log('Password: password123');
  console.log('----------------------------------------');
  console.log('You can now log in and test the Connect payment flow');
}

async function createConnectAccount(userId: number) {
  try {
    // Create a new Connect account in test mode
    console.log('Creating Stripe Connect account...');
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: 'test.contractor@example.com',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'company',
      // For testing only - automatically verify the account
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: '127.0.0.1',
      },
    });
    
    console.log(`Created Stripe Connect account: ${account.id}`);
    
    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://example.com/reauth',
      return_url: 'https://example.com/return',
      type: 'account_onboarding',
    });
    
    console.log('Onboarding link created:');
    console.log(accountLink.url);
    
    // Update user with Connect account ID
    await db.update(users)
      .set({ 
        stripeConnectAccountId: account.id,
        payoutEnabled: false
      })
      .where(eq(users.id, userId))
      .execute();
      
    console.log('User updated with Connect account ID');
    
    return account.id;
  } catch (error: any) {
    console.error('Error creating Connect account:', error.message);
    throw error;
  }
}

main().catch(console.error).finally(() => process.exit(0));