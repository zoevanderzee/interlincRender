import { createId } from '@paralleldrive/cuid2';

// Test contractor login simulation
const testUserId = 114; // Will be the new contractor ID
const testUserData = {
  id: testUserId,
  username: 'testcontractor',
  email: 'test.contractor@example.com',
  role: 'contractor'
};

console.log('Test contractor account ready for testing:');
console.log('User ID:', testUserId);
console.log('Username:', testUserData.username);
console.log('Email:', testUserData.email);
console.log('Role:', testUserData.role);
console.log('\nNext steps:');
console.log('1. Login with this account');
console.log('2. Navigate to Payment Setup');
console.log('3. Complete Trolley widget onboarding');
console.log('4. Test milestone approval → automated payment');
