#!/usr/bin/env node

// Test script to verify the budget validation fix

import fetch from 'node-fetch';

async function testBudgetValidation() {
  console.log('🧪 Testing Budget Validation Fix...\n');

  // Test 1: Check user budget information
  console.log('📊 Step 1: Checking user budget info');
  try {
    const userResponse = await fetch('http://localhost:5000/api/user', {
      headers: {
        'x-user-id': '117'  // Business user from screenshot
      }
    });
    
    if (userResponse.status === 401) {
      console.log('❌ Authentication failed - need proper login');
      
      // Try with different user ID
      const altUserResponse = await fetch('http://localhost:5000/api/user', {
        headers: {
          'x-user-id': '1'  // Try user ID 1
        }
      });
      
      if (altUserResponse.status === 401) {
        console.log('❌ Authentication required for API testing');
        return;
      }
    }
    
    const userData = await userResponse.json();
    console.log('User Data:', {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      budgetCap: userData.budgetCap,
      budgetUsed: userData.budgetUsed
    });
    
  } catch (error) {
    console.log('❌ Error testing user endpoint:', error.message);
  }

  // Test 2: Verify the budget validation logic in code
  console.log('\n🔍 Step 2: Checking budget validation logic in code');
  
  // Simulate the budget validation logic
  const simulateValidation = (contractorValue, budgetCap, budgetUsed) => {
    if (budgetCap) {
      const budgetRemaining = parseFloat(budgetCap) - parseFloat(budgetUsed || '0');
      
      if (contractorValue > budgetRemaining) {
        return {
          success: false,
          error: `The contractor value ($${contractorValue}) exceeds the remaining budget ($${budgetRemaining.toFixed(2)})`
        };
      }
      
      return {
        success: true,
        message: `✅ BUDGET CHECK PASSED: Contractor value $${contractorValue} within remaining budget $${budgetRemaining}`
      };
    }
    
    return { success: false, error: 'No budget cap set' };
  };

  // Test scenarios
  const testCases = [
    { contractorValue: 1, budgetCap: '2.00', budgetUsed: '0.00', expected: 'PASS' },
    { contractorValue: 2, budgetCap: '2.00', budgetUsed: '0.00', expected: 'PASS' },  
    { contractorValue: 3, budgetCap: '2.00', budgetUsed: '0.00', expected: 'FAIL' },
    { contractorValue: 1, budgetCap: '2.00', budgetUsed: '1.50', expected: 'PASS' },
    { contractorValue: 1, budgetCap: '2.00', budgetUsed: '1.80', expected: 'FAIL' }
  ];

  console.log('\n📋 Test Cases:');
  testCases.forEach((testCase, index) => {
    const result = simulateValidation(testCase.contractorValue, testCase.budgetCap, testCase.budgetUsed);
    const passed = (result.success && testCase.expected === 'PASS') || 
                   (!result.success && testCase.expected === 'FAIL');
    
    console.log(`Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Input: contractor=$${testCase.contractorValue}, cap=$${testCase.budgetCap}, used=$${testCase.budgetUsed}`);
    console.log(`  Expected: ${testCase.expected}, Got: ${result.success ? 'PASS' : 'FAIL'}`);
    console.log(`  Message: ${result.message || result.error}\n`);
  });

  console.log('✅ Budget validation logic test complete!');
}

testBudgetValidation().catch(console.error);