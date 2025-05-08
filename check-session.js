import fetch from 'node-fetch';
import fs from 'fs';

async function checkSession() {
  try {
    // First, login to get a session cookie
    console.log('Attempting to login...');
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'jay999',
        password: 'password'
      }),
      credentials: 'include'
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.text();
      throw new Error(`Login failed with status: ${loginResponse.status} - ${errorData}`);
    }

    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData);

    // Get cookies from the response
    const cookies = loginResponse.headers.raw()['set-cookie'];
    console.log('Cookies from login response:', cookies);

    if (!cookies || cookies.length === 0) {
      throw new Error('No cookies received from login');
    }

    // Save cookies to file for inspection
    fs.writeFileSync('cookies.txt', cookies.join('\n'));
    console.log('Cookies saved to cookies.txt');

    // Now try to access the user endpoint with the same cookie
    console.log('\nAttempting to access user data...');
    const userResponse = await fetch('http://localhost:5000/api/user', {
      headers: {
        'Cookie': cookies[0]
      }
    });

    console.log('User response status:', userResponse.status);
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('User data:', JSON.stringify(userData, null, 2));
    } else {
      const errorText = await userResponse.text();
      console.error('User request failed:', errorText);
    }

    // Now try to access the dashboard with the same cookie
    console.log('\nAttempting to access dashboard...');
    const dashboardResponse = await fetch('http://localhost:5000/api/dashboard', {
      headers: {
        'Cookie': cookies[0]
      }
    });

    console.log('Dashboard response status:', dashboardResponse.status);
    
    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('Dashboard data:', JSON.stringify(dashboardData, null, 2));
    } else {
      const errorText = await dashboardResponse.text();
      console.error('Dashboard request failed:', errorText);
    }

    // Test logout to make sure it properly clears the session
    console.log('\nTesting logout...');
    const logoutResponse = await fetch('http://localhost:5000/api/logout', {
      method: 'POST',
      headers: {
        'Cookie': cookies[0]
      }
    });

    console.log('Logout response status:', logoutResponse.status);
    
    // Try user endpoint again - should fail after logout
    console.log('\nAttempting to access user after logout...');
    const userAfterLogoutResponse = await fetch('http://localhost:5000/api/user', {
      headers: {
        'Cookie': cookies[0]
      }
    });

    console.log('User after logout response status:', userAfterLogoutResponse.status);
    
    if (userAfterLogoutResponse.ok) {
      const userData = await userAfterLogoutResponse.json();
      console.log('User data after logout (should be empty):', JSON.stringify(userData, null, 2));
    } else {
      const errorText = await userAfterLogoutResponse.text();
      console.log('User request after logout correctly failed with:', userAfterLogoutResponse.status);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkSession();