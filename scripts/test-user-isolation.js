// Script to test user isolation in the API
const fetch = require('node-fetch');

async function testUserIsolation() {
  try {
    console.log('Testing user isolation for contracts API...');
    
    // User 1 login (Creativlinc)
    const user1Login = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Creativlinc',
        password: 'password123', // Replace with actual password
      }),
      credentials: 'include',
    });
    
    if (!user1Login.ok) {
      throw new Error(`Failed to login as User 1: ${user1Login.statusText}`);
    }
    
    const user1Cookie = user1Login.headers.get('set-cookie');
    const user1Data = await user1Login.json();
    console.log('User 1 login successful:', user1Data.username);
    
    // Fetch User 1's contracts
    const user1Contracts = await fetch('http://localhost:3000/api/contracts', {
      headers: {
        'Cookie': user1Cookie,
      },
      credentials: 'include',
    });
    
    const user1ContractsData = await user1Contracts.json();
    console.log('User 1 contracts:', user1ContractsData);
    
    // User 2 login (Dangerousdog!)
    const user2Login = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Dangerousdog!',
        password: 'password123', // Replace with actual password
      }),
      credentials: 'include',
    });
    
    if (!user2Login.ok) {
      throw new Error(`Failed to login as User 2: ${user2Login.statusText}`);
    }
    
    const user2Cookie = user2Login.headers.get('set-cookie');
    const user2Data = await user2Login.json();
    console.log('User 2 login successful:', user2Data.username);
    
    // Fetch User 2's contracts
    const user2Contracts = await fetch('http://localhost:3000/api/contracts', {
      headers: {
        'Cookie': user2Cookie,
      },
      credentials: 'include',
    });
    
    const user2ContractsData = await user2Contracts.json();
    console.log('User 2 contracts:', user2ContractsData);
    
    // Verify users can only see their own contracts
    if (user1ContractsData.some(c => c.businessId === user2Data.id)) {
      console.error('❌ ISOLATION FAILURE: User 1 can see User 2 contracts');
    } else {
      console.log('✅ User 1 can only see their own contracts');
    }
    
    if (user2ContractsData.some(c => c.businessId === user1Data.id)) {
      console.error('❌ ISOLATION FAILURE: User 2 can see User 1 contracts');
    } else {
      console.log('✅ User 2 can only see their own contracts');
    }
    
    // Test dashboard endpoint as well
    const user1Dashboard = await fetch('http://localhost:3000/api/dashboard', {
      headers: {
        'Cookie': user1Cookie,
      },
      credentials: 'include',
    });
    
    const user1DashboardData = await user1Dashboard.json();
    console.log('User 1 dashboard contract count:', user1DashboardData.contracts.length);
    
    const user2Dashboard = await fetch('http://localhost:3000/api/dashboard', {
      headers: {
        'Cookie': user2Cookie,
      },
      credentials: 'include',
    });
    
    const user2DashboardData = await user2Dashboard.json();
    console.log('User 2 dashboard contract count:', user2DashboardData.contracts.length);
    
    // Verify dashboard data is also properly isolated
    if (user1DashboardData.contracts.some(c => c.businessId === user2Data.id)) {
      console.error('❌ ISOLATION FAILURE: User 1 dashboard can see User 2 contracts');
    } else {
      console.log('✅ User 1 dashboard only shows their own contracts');
    }
    
    if (user2DashboardData.contracts.some(c => c.businessId === user1Data.id)) {
      console.error('❌ ISOLATION FAILURE: User 2 dashboard can see User 1 contracts');
    } else {
      console.log('✅ User 2 dashboard only shows their own contracts');
    }
    
    console.log('User isolation test completed.');
  } catch (error) {
    console.error('Error testing user isolation:', error);
  }
}

testUserIsolation();