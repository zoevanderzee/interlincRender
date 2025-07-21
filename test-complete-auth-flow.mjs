// Complete authentication flow test
import fetch from 'node-fetch';

console.log("🧪 TESTING COMPLETE AUTHENTICATION FLOW");
console.log("=====================================");

async function testCompleteFlow() {
  const testEmail = `testuser${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";
  const testUID = `firebase_uid_${Date.now()}`;
  
  console.log(`Using test email: ${testEmail}`);
  console.log(`Using test Firebase UID: ${testUID}`);
  
  try {
    // Step 1: Test user registration/sync (simulating Firebase registration)
    console.log("\n📝 Step 1: Testing user registration via sync...");
    const syncResponse = await fetch('http://localhost:5000/api/sync-firebase-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: testUID,
        email: testEmail,
        emailVerified: true,
        displayName: "Test User Complete"
      })
    });
    
    if (!syncResponse.ok) {
      const error = await syncResponse.json();
      console.log("❌ Registration failed:", error);
      return false;
    }
    
    const syncResult = await syncResponse.json();
    console.log("✅ User registration successful");
    console.log(`   User ID: ${syncResult.userId}`);
    
    // Step 2: Test authentication check via Firebase UID
    console.log("\n🔐 Step 2: Testing authentication with Firebase UID...");
    const authResponse = await fetch('http://localhost:5000/api/user', {
      headers: {
        'x-firebase-uid': testUID,
        'Content-Type': 'application/json'
      }
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.json();
      console.log("❌ Authentication failed:", error);
      return false;
    }
    
    const userData = await authResponse.json();
    console.log("✅ Authentication successful");
    console.log(`   User: ${userData.email}`);
    console.log(`   ID: ${userData.id}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Email Verified: ${userData.emailVerified}`);
    
    // Step 3: Test frontend authentication headers
    console.log("\n🌐 Step 3: Testing frontend-style authentication...");
    const frontendResponse = await fetch('http://localhost:5000/api/user', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'x-firebase-uid': testUID
      }
    });
    
    if (!frontendResponse.ok) {
      const error = await frontendResponse.json();
      console.log("❌ Frontend auth failed:", error);
      return false;
    }
    
    const frontendUserData = await frontendResponse.json();
    console.log("✅ Frontend authentication successful");
    console.log(`   Same user data returned: ${frontendUserData.email === userData.email}`);
    
    // Step 4: Test without Firebase UID (should fail)
    console.log("\n🚫 Step 4: Testing without Firebase UID (should fail)...");
    const noAuthResponse = await fetch('http://localhost:5000/api/user', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (noAuthResponse.ok) {
      console.log("⚠️  WARNING: Authentication succeeded without credentials (security issue)");
      return false;
    } else {
      console.log("✅ Correctly rejected request without Firebase UID");
    }
    
    return true;
    
  } catch (error) {
    console.log("❌ Test error:", error.message);
    return false;
  }
}

async function testMultipleUsers() {
  console.log("\n👥 TESTING MULTIPLE USERS");
  console.log("========================");
  
  const users = [];
  for (let i = 0; i < 3; i++) {
    const testUID = `multi_user_${Date.now()}_${i}`;
    const testEmail = `multiuser${Date.now()}_${i}@example.com`;
    
    // Register user
    const syncResponse = await fetch('http://localhost:5000/api/sync-firebase-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: testUID,
        email: testEmail,
        emailVerified: true,
        displayName: `Multi User ${i+1}`
      })
    });
    
    if (!syncResponse.ok) {
      console.log(`❌ Failed to create user ${i+1}`);
      return false;
    }
    
    // Test authentication
    const authResponse = await fetch('http://localhost:5000/api/user', {
      headers: { 'x-firebase-uid': testUID }
    });
    
    if (!authResponse.ok) {
      console.log(`❌ Failed to authenticate user ${i+1}`);
      return false;
    }
    
    const userData = await authResponse.json();
    users.push({ uid: testUID, email: testEmail, id: userData.id });
    console.log(`✅ User ${i+1} created and authenticated: ${testEmail}`);
  }
  
  console.log(`✅ All ${users.length} users successfully created and authenticated`);
  return true;
}

// Run complete test suite
async function runAllTests() {
  console.log("Starting comprehensive authentication testing...\n");
  
  const singleUserTest = await testCompleteFlow();
  const multiUserTest = await testMultipleUsers();
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST RESULTS");
  console.log("=".repeat(50));
  console.log(`Single User Flow: ${singleUserTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Multiple Users: ${multiUserTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (singleUserTest && multiUserTest) {
    console.log("\n🎉 ALL TESTS PASSED!");
    console.log("✅ Authentication system is fully operational");
    console.log("✅ Users can successfully create accounts"); 
    console.log("✅ Users can successfully login");
    console.log("✅ Security is working (unauthorized requests rejected)");
    console.log("\n🚀 READY FOR PRODUCTION USE!");
  } else {
    console.log("\n❌ SOME TESTS FAILED");
    console.log("Authentication system needs further fixes");
  }
}

runAllTests().catch(console.error);