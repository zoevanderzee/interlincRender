import crypto from 'crypto';

// Test the Trolley connection using the updated environment
async function testTrolleyIntegration() {
  console.log('Testing Trolley API with current environment...');
  
  // Force read from process.env
  const currentKey = process.env.TROLLEY_API_KEY;
  const currentSecret = process.env.TROLLEY_API_SECRET;
  
  console.log('Current API Key prefix:', currentKey?.substring(0, 10) + '...');
  console.log('Current secret length:', currentSecret?.length);
  
  if (!currentKey || !currentSecret) {
    console.log('❌ Missing Trolley credentials in environment');
    return false;
  }
  
  const method = 'GET';
  const path = '/v1/recipients';
  const body = '';
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Create authentication exactly as Trolley expects
  const message = `${timestamp}${method.toUpperCase()}${path}${body}`;
  const signature = crypto.createHmac('sha256', currentSecret).update(message).digest('hex');
  const authorization = `prsign ${currentKey}:${signature}`;
  
  console.log('Making test API call...');
  
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
    console.log('API Response status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Trolley API connection successful!');
      console.log('Recipients count:', data.recipients?.length || 0);
      
      // Test recipient creation as well
      console.log('Testing recipient creation...');
      const createResponse = await fetch('https://api.trolley.com/v1/recipients', {
        method: 'POST',
        headers: {
          'Authorization': `prsign ${currentKey}:${crypto.createHmac('sha256', currentSecret).update(`${Math.floor(Date.now() / 1000)}POST/v1/recipients{"type":"individual","firstName":"Test","lastName":"User","email":"test@example.com"}`).digest('hex')}`,
          'Content-Type': 'application/json',
          'X-PR-Timestamp': Math.floor(Date.now() / 1000).toString(),
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          type: 'individual',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        })
      });
      
      console.log('Create recipient status:', createResponse.status);
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

testTrolleyIntegration();
