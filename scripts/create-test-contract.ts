/**
 * Script to create a test contract and payment between business and contractor
 */

import { db } from '../server/db';
import { users, contracts, milestones, payments } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Setting up test contract and payment...');
  
  // Get the business and contractor users
  const [businessUser] = await db.select().from(users)
    .where(eq(users.email, 'test.business@example.com'))
    .execute();
  
  if (!businessUser) {
    throw new Error('Business user not found. Run scripts/create-business-user.ts first.');
  }
  
  const [contractorUser] = await db.select().from(users)
    .where(eq(users.email, 'test.contractor@example.com'))
    .execute();
  
  if (!contractorUser) {
    throw new Error('Contractor user not found. Run scripts/simulate-connect-account.ts first.');
  }
  
  console.log(`Found business user: ${businessUser.id} (${businessUser.username})`);
  console.log(`Found contractor user: ${contractorUser.id} (${contractorUser.username})`);
  
  // Check if a contract already exists between them
  const existingContracts = await db.select().from(contracts)
    .where(eq(contracts.businessId, businessUser.id))
    .where(eq(contracts.contractorId, contractorUser.id))
    .execute();
  
  let contractId: number;
  
  if (existingContracts.length === 0) {
    // Create a new contract
    console.log('Creating new contract...');
    const [newContract] = await db.insert(contracts).values({
      businessId: businessUser.id,
      contractorId: contractorUser.id,
      contractName: 'Test Connect Payment Contract',
      contractCode: `TEST-${Date.now().toString().slice(-6)}`,
      status: 'active',
      value: '5000',
      description: 'Test contract for Connect payment',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }).returning();
    
    contractId = newContract.id;
    console.log(`Created new contract with ID: ${contractId}`);
  } else {
    contractId = existingContracts[0].id;
    console.log(`Found existing contract with ID: ${contractId}`);
  }
  
  // Create a milestone
  console.log('Creating milestone...');
  const [milestone] = await db.insert(milestones).values({
    contractId,
    name: 'Connect Payment Test',
    description: 'Test milestone for Connect payment',
    status: 'pending',
    paymentAmount: '1000',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    progress: 100
  }).returning();
  
  console.log(`Created milestone with ID: ${milestone.id}`);
  
  // Create a payment
  console.log('Creating payment...');
  const [payment] = await db.insert(payments).values({
    contractId,
    milestoneId: milestone.id,
    amount: '1000',
    status: 'scheduled',
    scheduledDate: new Date(),
    notes: 'Test payment for Connect integration',
    completedDate: null,
    stripePaymentIntentId: null,
    stripePaymentIntentStatus: null,
    stripeTransferId: null,
    stripeTransferStatus: null,
    paymentProcessor: 'stripe',
    applicationFee: null
  }).returning();
  
  console.log(`Created payment with ID: ${payment.id}`);
  
  console.log('\nTest data setup complete!');
  console.log('You can now log in with either account:');
  console.log('----------------------------------------');
  console.log('Business: test_business / password123');
  console.log('Contractor: test_contractor / password123');
  console.log('----------------------------------------');
  console.log(`Visit /payments to see the payment with ID: ${payment.id}`);
}

main().catch(console.error).finally(() => process.exit(0));