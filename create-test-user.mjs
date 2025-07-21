// Create a proper test user for the original login system
console.log("Creating test user for original login system...");

async function createTestUser() {
  try {
    const registerResponse = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'originaltest',
        password: 'OriginalTest123!',
        email: 'originaltest@example.com',
        firstName: 'Original',
        lastName: 'Test',
        role: 'contractor'
      })
    });

    console.log("Register response status:", registerResponse.status);
    
    if (!registerResponse.ok) {
      const error = await registerResponse.json();
      console.log("Registration failed:", error);
      return false;
    }

    const userData = await registerResponse.json();
    console.log("✅ Test user created successfully");
    console.log(`   Username: ${userData.username}`);
    console.log(`   Email: ${userData.email}`);
    
    return true;

  } catch (error) {
    console.log("❌ Error creating test user:", error.message);
    return false;
  }
}

createTestUser();