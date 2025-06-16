import crypto from 'crypto';

// Test with Trolley sandbox environment to verify authentication mechanism
async function testTrolleySandbox() {
  console.log('Testing Trolley authentication mechanism...');
  
  // Use Trolley's documented sandbox test credentials
  const testKey = 'test_key_123';  // Example format
  const testSecret = 'test_secret_456';  // Example format
  
  const method = 'GET';
  const path = '/v1/recipients';
  const body = '';
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Create message exactly as documented
  const message = `${timestamp}${method.toUpperCase()}${path}${body}`;
  const signature = crypto.createHmac('sha256', testSecret).update(message).digest('hex');
  const authorization = `prsign ${testKey}:${signature}`;
  
  console.log('Message format:', message.substring(0, 50) + '...');
  console.log('Auth format:', authorization.substring(0, 30) + '...');
  
  try {
    const response = await fetch('https://api.trolley.com/v1/recipients', {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
        'X-PR-Timestamp': timestamp.toString(),
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', data);
    
    // Now test the current environment
    console.log('\nTesting current environment credentials...');
    const currentKey = process.env.TROLLEY_API_KEY;
    const currentSecret = process.env.TROLLEY_API_SECRET;
    
    if (currentKey && currentSecret) {
      const timestamp2 = Math.floor(Date.now() / 1000);
      const message2 = `${timestamp2}${method.toUpperCase()}${path}${body}`;
      const signature2 = crypto.createHmac('sha256', currentSecret).update(message2).digest('hex');
      const authorization2 = `prsign ${currentKey}:${signature2}`;
      
      const response2 = await fetch('https://api.trolley.com/v1/recipients', {
        method: 'GET',
        headers: {
          'Authorization': authorization2,
          'Content-Type': 'application/json',
          'X-PR-Timestamp': timestamp2.toString(),
          'Accept': 'application/json'
        }
      });
      
      const data2 = await response2.json();
      console.log('Current env response status:', response2.status);
      console.log('Current env response:', data2);
    }
    
  } catch (error) {
    console.log('Connection error:', error.message);
  }
}

testTrolleySandbox();
