import crypto from 'crypto';

const API_KEY = process.env.TROLLEY_API_KEY;
const API_SECRET = process.env.TROLLEY_API_SECRET;

console.log('=== Trolley API Diagnostic ===');
console.log('Key configured:', !!API_KEY);
console.log('Secret configured:', !!API_SECRET);
console.log('Key prefix:', API_KEY?.substring(0, 20) + '...');
console.log('Secret length:', API_SECRET?.length);
console.log();

if (!API_KEY || !API_SECRET) {
  console.log('❌ Credentials not configured');
  process.exit(1);
}

async function testAPI() {
  const method = 'GET';
  const path = '/v1/balances';
  const timestamp = Math.floor(Date.now() / 1000);
  const body = '';
  
  const message = timestamp + method.toUpperCase() + path + body;
  const signature = crypto.createHmac('sha256', API_SECRET).update(message).digest('hex');
  const authorization = `prsign ${API_KEY}:${signature}`;
  
  console.log('Testing API connection...');
  console.log('Endpoint: https://api.trolley.com' + path);
  console.log('Timestamp:', timestamp);
  
  try {
    const response = await fetch('https://api.trolley.com' + path, {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
        'X-PR-Timestamp': timestamp.toString(),
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('Response:', response.status);
    
    if (response.status === 200) {
      console.log('✅ SUCCESS: Trolley API is working');
      console.log('Account balances retrieved successfully');
      console.log('Integration ready for production use');
    } else {
      console.log('❌ AUTHENTICATION FAILED');
      console.log('Error:', data.errors?.[0]?.message);
      console.log();
      console.log('Required Actions:');
      console.log('1. Log into your Trolley dashboard');
      console.log('2. Navigate to Settings > API Keys');
      console.log('3. Ensure you are in LIVE mode (not sandbox)');
      console.log('4. Verify the API key status is "Active"');
      console.log('5. Check that your account is fully verified');
    }
  } catch (error) {
    console.log('❌ CONNECTION ERROR:', error.message);
  }
}

testAPI();
