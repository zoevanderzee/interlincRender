import fetch from 'node-fetch';

async function createTestUser() {
  try {
    console.log('Creating test user...');
    const response = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpassword',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'business'
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Registration failed with status: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('Test user created successfully:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestUser();