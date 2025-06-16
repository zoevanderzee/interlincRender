import crypto from 'crypto';

async function testTrolleyConnection() {
  const apiKey = process.env.TROLLEY_API_KEY;
  const apiSecret = process.env.TROLLEY_API_SECRET;
  
  console.log('Testing with API Key:', apiKey);
  console.log('API Secret length:', apiSecret ? apiSecret.length : 'not found');
  
  // Generate auth header
  const method = 'GET';
  const path = '/v1/recipients';
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const message = `${method}\n${path}\n\n${timestamp}\n${nonce}`;
  const signature = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');
  const authHeader = `prsign accessKey="${apiKey}"; timestamp="${timestamp}"; nonce="${nonce}"; version="1"; signature="${signature}"`;
  
  try {
    const response = await fetch('https://api.trolley.com/v1/recipients', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'X-PR-Version': '1'
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (response.status === 200) {
      console.log('✅ Trolley API connection successful!');
    } else {
      console.log('❌ Trolley API error:', data);
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
}

testTrolleyConnection();
