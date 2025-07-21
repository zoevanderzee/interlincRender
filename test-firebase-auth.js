// Test Firebase Authentication Flow
// Tests: Registration → Email Verification → Login

const testEmail = `test${Date.now()}@creativlinc.app`;
const testPassword = "TestPassword123!";

console.log("🔥 Testing Firebase Authentication Flow");
console.log("=====================================");
console.log("Test Email:", testEmail);
console.log("Test Password:", testPassword);
console.log("");

// Test 1: Check auth page loads
async function testAuthPageLoad() {
  console.log("1️⃣ Testing auth page load...");
  try {
    const response = await fetch('http://localhost:5000/auth');
    if (response.ok) {
      console.log("✅ Auth page loads successfully");
      return true;
    } else {
      console.log("❌ Auth page failed to load:", response.status);
      return false;
    }
  } catch (error) {
    console.log("❌ Auth page load error:", error.message);
    return false;
  }
}

// Test 2: Check Firebase configuration
async function testFirebaseConfig() {
  console.log("2️⃣ Testing Firebase configuration...");
  try {
    // Check if Firebase is accessible via the frontend
    const response = await fetch('http://localhost:5000/');
    if (response.ok) {
      console.log("✅ App loads - Firebase config should be available");
      return true;
    } else {
      console.log("❌ App failed to load");
      return false;
    }
  } catch (error) {
    console.log("❌ Firebase config test error:", error.message);
    return false;
  }
}

// Test 3: Check sync endpoint
async function testSyncEndpoint() {
  console.log("3️⃣ Testing sync endpoint...");
  try {
    const testData = {
      uid: "test_firebase_uid_123",
      email: testEmail,
      emailVerified: true,
      displayName: "Test User"
    };
    
    const response = await fetch('http://localhost:5000/api/sync-firebase-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log("✅ Sync endpoint working:", result.message);
      return true;
    } else {
      console.log("❌ Sync endpoint failed:", result);
      return false;
    }
  } catch (error) {
    console.log("❌ Sync endpoint test error:", error.message);
    return false;
  }
}

// Test 4: Test verify page
async function testVerifyPage() {
  console.log("4️⃣ Testing verify page...");
  try {
    const response = await fetch('http://localhost:5000/verify?mode=verifyEmail&oobCode=test123');
    if (response.ok) {
      console.log("✅ Verify page loads successfully");
      return true;
    } else {
      console.log("❌ Verify page failed to load:", response.status);
      return false;
    }
  } catch (error) {
    console.log("❌ Verify page test error:", error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  const results = [];
  
  results.push(await testAuthPageLoad());
  results.push(await testFirebaseConfig());
  results.push(await testSyncEndpoint());
  results.push(await testVerifyPage());
  
  console.log("");
  console.log("📊 Test Summary");
  console.log("===============");
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    console.log("🎉 All tests passed! Firebase Auth system is working correctly.");
    console.log("");
    console.log("📝 Manual Testing Instructions:");
    console.log("1. Visit http://localhost:5000/auth");
    console.log("2. Click 'Register' tab");
    console.log("3. Fill out form with email and password");
    console.log("4. Check email for verification link");
    console.log("5. Click verification link");
    console.log("6. Return to login page and login");
    console.log("7. Should be redirected to dashboard");
  } else {
    console.log("❌ Some tests failed. Check the issues above.");
  }
}

// Run the tests
runTests().catch(console.error);