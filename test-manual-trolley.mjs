import crypto from 'crypto';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function testTrolleyManually() {
  console.log('Manual Trolley API Test');
  console.log('Current environment shows:', process.env.TROLLEY_API_KEY?.substring(0, 15) + '...');
  
  // Test with environment first
  const envKey = process.env.TROLLEY_API_KEY;
  const envSecret = process.env.TROLLEY_API_SECRET;
  
  if (envKey && envSecret) {
    console.log('Testing environment credentials...');
    
    const method = 'GET';
    const path = '/v1/recipients';
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${timestamp}${method}${path}`;
    const signature = crypto.createHmac('sha256', envSecret).update(message).digest('hex');
    const authorization = `prsign ${envKey}:${signature}`;
    
    try {
      const response = await fetch('https://api.trolley.com/v1/recipients', {
        method: 'GET',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
          'X-PR-Timestamp': timestamp.toString()
        }
      });
      
      const data = await response.json();
      console.log('Status:', response.status);
      
      if (response.status === 200) {
        console.log('✅ Environment credentials work!');
        console.log('Recipients found:', data.recipients?.length || 0);
      } else if (response.status === 401) {
        console.log('❌ Environment credentials invalid:', data.errors?.[0]?.message);
        console.log('The environment still has old credentials that need updating');
      }
    } catch (error) {
      console.log('❌ Request failed:', error.message);
    }
  }
  
  rl.close();
}

testTrolleyManually();
