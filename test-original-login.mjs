// Test the original login system
console.log("🔐 TESTING ORIGINAL LOGIN SYSTEM");
console.log("================================");

async function testOriginalLogin() {
  console.log("Testing with original authentication flow...");
  
  try {
    // Try to login with session-based auth
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'originaltest',
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
    console.log("✅ Login successful for:", userData.username);

    // Get the session cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      console.log("❌ No session cookie set");
      return false;
    }

    const cookieHeader = setCookieHeader.split(';')[0];
    
    // Test authenticated request using session cookie
    const userResponse = await fetch('http://localhost:5000/api/user', {
      headers: {
        'Cookie': cookieHeader
      }
    });

    if (!userResponse.ok) {
      const error = await userResponse.json();
      console.log("❌ Session auth failed:", error);
      return false;
    }

    const authUserData = await userResponse.json();
    console.log("✅ Session authentication successful");
    console.log(`   User: ${authUserData.username}`);
    console.log(`   Email: ${authUserData.email}`);
    
    return true;

  } catch (error) {
    console.log("❌ Test error:", error.message);
    return false;
  }
}

testOriginalLogin()
  .then(success => {
    if (success) {
      console.log("\n🎉 ORIGINAL AUTHENTICATION WORKS!");
      console.log("The session-based login system is functional");
    } else {
      console.log("\n❌ ORIGINAL AUTHENTICATION FAILED");
      console.log("The session-based login system has issues");
    }
  })
  .catch(err => console.error("Test error:", err));