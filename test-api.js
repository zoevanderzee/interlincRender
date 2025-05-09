const fetch = require('node-fetch');
const fs = require('fs');

async function testAPIAuth() {
  console.log('=== Testing API Authentication Flow ===');
  
  // Step 1: Login
  console.log('\n1. Attempting to login...');
  const loginRes = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'testuser',
      password: 'password123'
    })
  });
  
  if (!loginRes.ok) {
    console.error(`Login failed with status: ${loginRes.status}`);
    const errorText = await loginRes.text();
    console.error(`Error: ${errorText}`);
    return;
  }
  
  const userData = await loginRes.json();
  console.log('Login successful:', {
    id: userData.id,
    username: userData.username,
    name: `${userData.firstName} ${userData.lastName}`,
    role: userData.role
  });
  
  // Save cookies from the response
  const cookies = loginRes.headers.raw()['set-cookie'];
  console.log('Cookies from login response:', cookies);
  
  if (!cookies || cookies.length === 0) {
    console.error('No session cookie was set during login!');
    return;
  }
  
  // Format cookie header for subsequent requests
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
  console.log('Cookie header for next requests:', cookieHeader);
  
  // Step 2: Fetch user data using the cookie
  console.log('\n2. Fetching user data with session cookie...');
  const userRes = await fetch('http://localhost:5000/api/user', {
    headers: {
      'Cookie': cookieHeader
    }
  });
  
  if (!userRes.ok) {
    console.error(`User data fetch failed with status: ${userRes.status}`);
    const errorText = await userRes.text();
    console.error(`Error: ${errorText}`);
    return;
  }
  
  const userDataResult = await userRes.json();
  console.log('User data fetch successful:', {
    id: userDataResult.id,
    username: userDataResult.username
  });
  
  // Step 3: Fetch dashboard with the cookie
  console.log('\n3. Fetching dashboard data with session cookie...');
  const dashboardRes = await fetch('http://localhost:5000/api/dashboard', {
    headers: {
      'Cookie': cookieHeader
    }
  });
  
  if (!dashboardRes.ok) {
    console.error(`Dashboard fetch failed with status: ${dashboardRes.status}`);
    const errorText = await dashboardRes.text();
    console.error(`Error: ${errorText}`);
    return;
  }
  
  const dashboardData = await dashboardRes.json();
  console.log('Dashboard fetch successful:', {
    stats: dashboardData.stats,
    contractsCount: dashboardData.contracts?.length || 0,
    contractorsCount: dashboardData.contractors?.length || 0,
  });
  
  // Step 4: Fetch budget with the cookie
  console.log('\n4. Fetching budget data with session cookie...');
  const budgetRes = await fetch('http://localhost:5000/api/budget', {
    headers: {
      'Cookie': cookieHeader
    }
  });
  
  if (!budgetRes.ok) {
    console.error(`Budget fetch failed with status: ${budgetRes.status}`);
    const errorText = await budgetRes.text();
    console.error(`Error: ${errorText}`);
    return;
  }
  
  const budgetData = await budgetRes.json();
  console.log('Budget fetch successful:', budgetData);
  
  // Step 5: Logout
  console.log('\n5. Testing logout with session cookie...');
  const logoutRes = await fetch('http://localhost:5000/api/logout', {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader
    }
  });
  
  if (!logoutRes.ok) {
    console.error(`Logout failed with status: ${logoutRes.status}`);
    const errorText = await logoutRes.text();
    console.error(`Error: ${errorText}`);
    return;
  }
  
  console.log('Logout successful');
  
  // Step 6: Try to access the user endpoint after logout
  console.log('\n6. Trying to access protected endpoint after logout...');
  const userAfterLogoutRes = await fetch('http://localhost:5000/api/user', {
    headers: {
      'Cookie': cookieHeader
    }
  });
  
  if (userAfterLogoutRes.status === 401) {
    console.log('Successfully received 401 after logout, authentication flow is working correctly!');
  } else {
    console.error(`Expected 401 status after logout, but got: ${userAfterLogoutRes.status}`);
    const responseText = await userAfterLogoutRes.text();
    console.error(`Response: ${responseText}`);
  }
}

testAPIAuth().catch(error => {
  console.error('Test failed with error:', error);
});