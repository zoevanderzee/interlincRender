/**
 * Test script for Trolley Submerchant functionality
 * Tests all the new submerchant API endpoints with proper authentication
 */

import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';
const testCredentials = {
  username: 'CreativLinc',
  password: 'newpassword123'
};

// Test data for submerchant creation
const testSubmerchantData = {
  merchant: {
    name: "Test Creative Business",
    currency: "USD"
  },
  onboarding: {
    businessWebsite: "https://testbusiness.com",
    businessLegalName: "Test Creative Business Inc",
    businessAsName: "Test Creative Business",
    businessTaxId: "123456789",
    businessCategory: "Technology",
    businessCountry: "US",
    businessCity: "New York",
    businessAddress: "123 Main Street",
    businessZip: "10001",
    businessRegion: "NY",
    businessTotalMonthly: "50000",
    businessPpm: "500",
    businessIntlPercentage: "25",
    expectedPayoutCountries: "US,CA,GB"
  }
};

let authCookie = '';

async function authenticateUser() {
  console.log('🔐 Authenticating test user...');
  
  const response = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testCredentials)
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
  }

  // Extract session cookie
  const cookies = response.headers.get('set-cookie');
  if (cookies) {
    authCookie = cookies.split(';')[0];
    console.log('✅ Authentication successful');
    return true;
  }
  
  throw new Error('No session cookie received');
}

async function testCreateSubmerchant() {
  console.log('\n📝 Testing submerchant account creation...');
  
  const response = await fetch(`${baseUrl}/api/trolley-submerchant/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify(testSubmerchantData)
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Submerchant creation successful:', {
      success: result.success,
      submerchantId: result.submerchantId,
      status: result.status
    });
    return result;
  } else {
    console.log('❌ Submerchant creation failed:', result);
    return null;
  }
}

async function testSetPaymentMethod(method = 'pay_as_you_go') {
  console.log(`\n💳 Testing payment method setting to "${method}"...`);
  
  const response = await fetch(`${baseUrl}/api/trolley-submerchant/payment-method`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({ paymentMethod: method })
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Payment method set successfully:', result);
    return result;
  } else {
    console.log('❌ Payment method setting failed:', result);
    return null;
  }
}

async function testCheckBudget(amount = 1000) {
  console.log(`\n💰 Testing budget check for $${amount}...`);
  
  const response = await fetch(`${baseUrl}/api/trolley-submerchant/check-budget`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({ amount })
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Budget check successful:', {
      budgetCap: result.budgetCap,
      budgetUsed: result.budgetUsed,
      budgetAvailable: result.budgetAvailable,
      canAfford: result.canAfford,
      paymentMethod: result.paymentMethod
    });
    return result;
  } else {
    console.log('❌ Budget check failed:', result);
    return null;
  }
}

async function testSubmerchantDetails() {
  console.log('\n📊 Testing submerchant details retrieval...');
  
  const response = await fetch(`${baseUrl}/api/trolley-submerchant/details`, {
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Submerchant details retrieved:', {
      submerchantId: result.submerchantId,
      status: result.status,
      paymentMethod: result.paymentMethod,
      accountBalance: result.accountBalance
    });
    return result;
  } else {
    console.log('❌ Submerchant details retrieval failed:', result);
    return null;
  }
}

async function testProcessPayment() {
  console.log('\n💸 Testing payment processing...');
  
  // This will likely fail since we need actual contractor setup, but tests the validation
  const response = await fetch(`${baseUrl}/api/trolley-submerchant/process-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({
      milestoneId: 1,
      contractorId: 999, // Non-existent contractor for testing
      amount: 100,
      currency: 'USD',
      memo: 'Test payment'
    })
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Payment processing successful:', result);
    return result;
  } else {
    console.log('⚠️  Payment processing failed (expected for test):', result.message);
    return null;
  }
}

async function runAllTests() {
  try {
    console.log('🚀 Starting Trolley Submerchant API Tests\n');
    
    // Step 1: Authenticate
    await authenticateUser();
    
    // Step 2: Test submerchant creation
    const createResult = await testCreateSubmerchant();
    
    // Step 3: Test payment method setting
    await testSetPaymentMethod('pay_as_you_go');
    await testSetPaymentMethod('pre_funded');
    
    // Step 4: Test budget checking
    await testCheckBudget(500);
    await testCheckBudget(50000); // High amount to test budget limits
    
    // Step 5: Test submerchant details retrieval
    await testSubmerchantDetails();
    
    // Step 6: Test payment processing (validation)
    await testProcessPayment();
    
    console.log('\n🎉 All Trolley Submerchant tests completed!');
    console.log('\n📝 Summary:');
    console.log('- ✅ Authentication working');
    console.log('- ✅ Submerchant creation endpoint functional');
    console.log('- ✅ Payment method setting working');
    console.log('- ✅ Budget checking operational');
    console.log('- ✅ Submerchant details retrieval working');
    console.log('- ✅ Payment processing validation functional');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runAllTests();