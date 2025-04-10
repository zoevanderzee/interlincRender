import fetch from 'node-fetch';

async function testGetUser() {
  console.log('Testing get user functionality...');
  
  try {
    // Step 1: Login to get cookie
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'cdmanagement',
        password: 'password123',
      }),
      redirect: 'manual',
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', await loginResponse.json());
      return;
    }
    
    // Get the cookie from the response
    const cookies = loginResponse.headers.get('set-cookie');
    if (!cookies) {
      console.log('❌ No cookies returned from login');
      return;
    }
    
    console.log('✅ Login successful! Got session cookie.');
    
    // Step 2: Get user info using the cookie
    const userResponse = await fetch('http://localhost:5000/api/user', {
      headers: {
        'Cookie': cookies,
      },
    });
    
    const userData = await userResponse.json();
    
    if (userResponse.ok) {
      console.log('✅ Get user successful!');
      console.log('User data:', userData);
    } else {
      console.log('❌ Get user failed:', userData);
    }
  } catch (error) {
    console.error('Error testing get user:', error);
  }
}

testGetUser();