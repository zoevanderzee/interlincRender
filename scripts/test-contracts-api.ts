import fetch from 'node-fetch';

async function testContractsAPI() {
  console.log('Testing contracts API...');
  
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
    
    // Step 2: Get contracts using the cookie
    const contractsResponse = await fetch('http://localhost:5000/api/contracts', {
      headers: {
        'Cookie': cookies,
      },
    });
    
    const contractsData = await contractsResponse.json();
    
    if (contractsResponse.ok) {
      console.log('✅ Get contracts successful!');
      console.log(`Retrieved ${contractsData.length} contracts`);
      if (contractsData.length > 0) {
        console.log('First contract:', contractsData[0]);
      }
    } else {
      console.log('❌ Get contracts failed:', contractsData);
    }
  } catch (error) {
    console.error('Error testing contracts API:', error);
  }
}

testContractsAPI();