import fetch from 'node-fetch';

async function testLogin() {
  console.log('Testing login with test_business account...');
  const loginResponse = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'test_business',
      password: 'password123',
    }),
  });

  console.log('Login Status:', loginResponse.status);
  if (!loginResponse.ok) {
    const errorData = await loginResponse.json();
    console.error('Login error:', errorData);
    return;
  }
  
  const userData = await loginResponse.json();
  console.log('Logged in as:', userData.username, '(Role:', userData.role, ')');
  
  // Test retrieving payment data
  console.log('\nFetching payments data...');
  const paymentsResponse = await fetch('http://localhost:5000/api/payments', {
    headers: {
      'Cookie': loginResponse.headers.get('set-cookie')
    }
  });
  
  console.log('Payments Status:', paymentsResponse.status);
  const payments = await paymentsResponse.json();
  console.log('Found', payments.length, 'payments');
  
  if (payments.length > 0) {
    console.log('Sample payment:', {
      id: payments[0].id,
      contractId: payments[0].contractId,
      amount: payments[0].amount,
      status: payments[0].status,
      notes: payments[0].notes
    });
    
    // Test initiating a payment with Connect
    const paymentId = payments[0].id;
    console.log('\nTesting Connect payment flow for payment ID:', paymentId);
    const connectResponse = await fetch('http://localhost:5000/api/payments/' + paymentId + '/pay-contractor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': loginResponse.headers.get('set-cookie')
      }
    });
    
    console.log('Connect payment Status:', connectResponse.status);
    const connectData = await connectResponse.json();
    console.log('Connect payment response:', connectData);
  }
}

testLogin().catch(console.error);
