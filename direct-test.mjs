import crypto from 'crypto';

// Test with hypothetical new API key format that might be expected
async function testWithNewKeyFormat() {
  console.log('Testing Trolley API authentication formats...');
  
  // Since environment still shows old key, let's test the authentication mechanism itself
  const testKey = 'ALPtDYZc5NOOIWAJFVPDQP74'; // From your dashboard
  const testSecret = process.env.TROLLEY_API_SECRET; // Use current secret for now
  
  console.log('Test key format:', testKey);
  console.log('Secret length:', testSecret ? testSecret.length : 'not found');
  
  const method = 'GET';
  const path = '/v1/recipients';
  const body = '';
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Message format: timestamp + method + path + body
  const message = `${timestamp}${method.toUpperCase()}${path}${body}`;
  const signature = crypto.createHmac('sha256', testSecret).update(message).digest('hex');
  
  const authorization = `prsign ${testKey}:${signature}`;
  
  console.log('Testing with key from dashboard...');
  
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
    
    if (response.status === 200) {
      console.log('✅ Trolley API connection successful with dashboard key!');
      console.log('Recipients found:', data.recipients ? data.recipients.length : 0);
    } else {
      console.log('❌ Trolley API error with dashboard key:', data);
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
}

testWithNewKeyFormat();
