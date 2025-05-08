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
        username: 'Creativlinc',
        password: 'Password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed with status: ${loginResponse.status}`);
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

    // Check session status
    console.log('\nChecking session status...');
    const sessionResponse = await fetch('http://localhost:5000/api/session-debug', {
      headers: {
        'Cookie': cookies[0]
      }
    });

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('Session status:', JSON.stringify(sessionData, null, 2));
    } else {
      const errorText = await sessionResponse.text();
      console.error('Session check failed:', errorText);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkSession();