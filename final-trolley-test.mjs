import crypto from 'crypto';

async function testTrolleyWithNewCredentials() {
  console.log('Testing Trolley API with latest credentials...');
  
  // Check current environment
  const currentKey = process.env.TROLLEY_API_KEY;
  const currentSecret = process.env.TROLLEY_API_SECRET;
  
  console.log('Current key prefix:', currentKey?.substring(0, 15) + '...');
  console.log('Secret length:', currentSecret?.length);
  
  if (!currentKey || !currentSecret) {
    console.log('No credentials found in environment');
    return false;
  }
  
  // Test API connection
  const method = 'GET';
  const path = '/v1/recipients';
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Create authentication signature
  const message = `${timestamp}${method.toUpperCase()}${path}`;
  const signature = crypto.createHmac('sha256', currentSecret).update(message).digest('hex');
  const authorization = `prsign ${currentKey}:${signature}`;
  
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
      console.log('✅ Trolley API integration successful!');
      console.log('Recipients found:', data.recipients?.length || 0);
      console.log('Account access confirmed');
      return true;
    } else {
      console.log('❌ API Error:', data.errors?.[0]?.message || 'Unknown error');
      if (data.errors?.[0]?.code === 'invalid_api_key') {
        console.log('Credentials need to be updated with valid production keys');
      }
      return false;
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
    return false;
  }
}

// Run the test
testTrolleyWithNewCredentials().then(success => {
  if (success) {
    console.log('\n🎉 Trolley integration is ready for production use!');
  } else {
    console.log('\n⚠️ Trolley integration requires valid API credentials');
  }
});
