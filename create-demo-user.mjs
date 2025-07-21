// Create demo user with proper password hash
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';

async function createDemoUser() {
  console.log("Creating demo user for testing...");
  
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    console.log("Password hash created:", hashedPassword.substring(0, 20) + "...");
    
    const registerResponse = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'demo',
        password: 'password123',
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User', 
        role: 'business'
      })
    });

    if (registerResponse.ok) {
      const userData = await registerResponse.json();
      console.log("✅ Demo user created successfully");
      console.log("   Username: demo");
      console.log("   Password: password123");
      console.log("   Email: demo@example.com");
      console.log("   Role: business");
    } else {
      const error = await registerResponse.json();
      console.log("Registration failed:", error);
    }

  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

createDemoUser();