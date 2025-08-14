#!/usr/bin/env node

/**
 * LIVE TROLLEY PAYMENT TEST
 * Tests actual payment creation using live Trolley API credentials
 * This will attempt to create a real payment if credentials are valid
 */

import { trolleyApi } from './server/services/trolley-api.js';

async function testLivePayment() {
  console.log('🔴 TESTING LIVE TROLLEY PAYMENT INTEGRATION...');
  
  // Check if API is configured
  if (!trolleyApi.isConfigured()) {
    console.error('❌ TROLLEY API NOT CONFIGURED');
    console.error('Missing environment variables: TROLLEY_API_KEY');
    return false;
  }
  
  console.log('✅ Trolley API credentials found');
  
  // Test creating a recipient first (required for payments)
  console.log('Testing recipient creation...');
  
  const testRecipient = {
    type: 'individual',
    firstName: 'Test',
    lastName: 'Recipient',
    email: `test-${Date.now()}@example.com`
  };
  
  try {
    const recipientResult = await trolleyApi.createRecipient(testRecipient);
    
    if (!recipientResult.success) {
      console.error('❌ RECIPIENT CREATION FAILED:', recipientResult.error);
      return false;
    }
    
    console.log('✅ Test recipient created:', recipientResult.recipientId);
    
    // Now test payment creation
    console.log('Testing payment creation...');
    
    const testPayment = {
      recipientId: recipientResult.recipientId,
      amount: '1.00',
      currency: 'USD',
      description: 'Live integration test payment',
      externalId: `test_${Date.now()}`
    };
    
    const paymentResult = await trolleyApi.createPayment(testPayment);
    
    if (!paymentResult.success) {
      console.error('❌ PAYMENT CREATION FAILED:', paymentResult.error);
      return false;
    }
    
    console.log('✅ LIVE PAYMENT CREATED:', paymentResult.paymentId);
    console.log('🚀 LIVE TROLLEY INTEGRATION IS WORKING!');
    
    return true;
    
  } catch (error) {
    console.error('❌ LIVE TEST FAILED:', error.message);
    return false;
  }
}

// Run the test
testLivePayment()
  .then(success => {
    if (success) {
      console.log('\n🎉 LIVE PAYMENTS ARE FULLY OPERATIONAL');
      process.exit(0);
    } else {
      console.log('\n💥 LIVE PAYMENTS ARE NOT WORKING');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 TEST CRASHED:', error);
    process.exit(1);
  });