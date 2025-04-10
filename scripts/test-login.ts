import fetch from 'node-fetch';

async function testLogin() {
  console.log('Testing login functionality...');
  
  try {
    // Attempt to login
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'cdmanagement',
        password: 'password123',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('User data:', data);
    } else {
      console.log('❌ Login failed:', data);
    }
  } catch (error) {
    console.error('Error testing login:', error);
  }
}

testLogin();