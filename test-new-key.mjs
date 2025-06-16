import crypto from 'crypto';

async function testTrolleyConnection() {
  const apiKey = 'ALPtDYZcPETO6U7JEA2KKN4Y';
  const apiSecret = process.env.TROLLEY_API_SECRET;
  
  console.log('Testing with new API Key:', apiKey);
  console.log('API Secret length:', apiSecret ? apiSecret.length : 'not found');
  
  const method = 'GET';
  const path = '/v1/recipients';
  const body = '';
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Message format: timestamp + method + path + body
  const message = `${timestamp}${method.toUpperCase()}${path}${body}`;
  const signature = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');
  
  const authorization = `prsign ${apiKey}:${signature}`;
  
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
      console.log('✅ Trolley API connection successful!');
      console.log('Recipients found:', data.recipients ? data.recipients.length : 0);
      return true;
    } else {
      console.log('❌ Trolley API error:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return false;
  }
}

testTrolleyConnection();
