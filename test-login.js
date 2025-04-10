import fetch from 'node-fetch';

async function testLogin() {
  const response = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'test_business',
      password: 'password123',
    }),
  });

  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', data);
}

testLogin().catch(console.error);
