// Simple script to test contractor login
const fetch = require('node-fetch');

async function testContractorLogin() {
  try {
    console.log('Testing contractor login...');
    
    // Try to login with the contractor account
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'contractor@demo.com',
        password: 'password'
      })
    });
    
    const result = await response.text();
    console.log('Login response status:', response.status);
    console.log('Login response:', result);
    
    if (response.ok) {
      console.log('✅ Contractor login successful!');
      console.log('You can now login with:');
      console.log('Email: contractor@demo.com');
      console.log('Password: password');
    } else {
      console.log('❌ Login failed:', result);
    }
    
  } catch (error) {
    console.error('Error testing login:', error.message);
  }
}

testContractorLogin();