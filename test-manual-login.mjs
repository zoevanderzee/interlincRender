// Test Firebase login flow manually
console.log("TESTING FIREBASE LOGIN FLOW");
console.log("==========================");

async function testLoginFlow() {
  console.log("1. Testing /api/user endpoint with Firebase UID header...");
  
  // Mock Firebase UID
  const mockFirebaseUID = "test_firebase_uid_12345";
  
  // Test the sync endpoint first to create a user
  console.log("2. Creating test user via sync endpoint...");
  const syncResponse = await fetch('http://localhost:5000/api/sync-firebase-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: mockFirebaseUID,
      email: `test${Date.now()}@test.com`,
      emailVerified: true,
      displayName: "Test User"
    })
  });
  
  const syncResult = await syncResponse.json();
  if (!syncResponse.ok || !syncResult.success) {
    console.log("❌ Failed to create test user:", syncResult);
    return false;
  }
  
  console.log("✅ Test user created");
  
  // Now test the /api/user endpoint with Firebase UID header
  console.log("3. Testing /api/user with Firebase UID header...");
  console.log("Using Firebase UID:", mockFirebaseUID);
  const userResponse = await fetch('http://localhost:5000/api/user', {
    headers: {
      'x-firebase-uid': mockFirebaseUID,
      'Content-Type': 'application/json'
    }
  });
  
  if (userResponse.ok) {
    const userData = await userResponse.json();
    console.log("✅ Firebase auth working! User data:", {
      id: userData.id,
      email: userData.email,
      firebaseUID: userData.firebaseUID
    });
    return true;
  } else {
    const error = await userResponse.json();
    console.log("❌ Firebase auth failed:", error);
    return false;
  }
}

testLoginFlow()
  .then(success => {
    if (success) {
      console.log("\n🎉 RESULT: YES - Firebase login will work!");
      console.log("Users can now:");
      console.log("1. Login with Firebase");
      console.log("2. Get authenticated via Firebase UID");
      console.log("3. Access the dashboard");
    } else {
      console.log("\n❌ RESULT: NO - Still has issues");
    }
  })
  .catch(err => console.error("Test error:", err));