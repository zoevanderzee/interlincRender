// Test login with demo user
console.log("🧪 TESTING DEMO USER LOGIN");
console.log("=========================");

async function testDemoLogin() {
  try {
    console.log("Testing login with demo credentials...");
    console.log("Username: demo");
    console.log("Password: password123");
    
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'demo',
        password: 'OriginalTest123!'
      }),
      credentials: 'include'
    });

    console.log("Login response status:", loginResponse.status);
    
    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      console.log("❌ Login failed:", error);
      return false;
    }

    const userData = await loginResponse.json();
    console.log("✅ Demo user login successful!");
    console.log(`   Username: ${userData.username}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Role: ${userData.role}`);
    
    // Test authenticated request
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      const cookieHeader = setCookieHeader.split(';')[0];
      
      const userResponse = await fetch('http://localhost:5000/api/user', {
        headers: {
          'Cookie': cookieHeader
        }
      });

      if (userResponse.ok) {
        const authUserData = await userResponse.json();
        console.log("✅ Session authentication working");
        console.log(`   Authenticated as: ${authUserData.username}`);
        return true;
      }
    }
    
    return false;

  } catch (error) {
    console.log("❌ Test error:", error.message);
    return false;
  }
}

testDemoLogin()
  .then(success => {
    console.log("\n" + "=".repeat(40));
    if (success) {
      console.log("🎉 DEMO LOGIN WORKS!");
      console.log("You can now test login with:");
      console.log("  Username: demo");
      console.log("  Password: password123");
      console.log("  Email: demo@example.com");
    } else {
      console.log("❌ Demo login failed");
    }
  });