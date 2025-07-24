import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testNotifications() {
  try {
    console.log('Creating sample notifications...');
    
    // Create sample notifications
    const response = await fetch(`${BASE_URL}/api/notifications/create-samples`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': '113'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Sample notifications created:', result);

    // Get notification count
    const countResponse = await fetch(`${BASE_URL}/api/notifications/count`, {
      headers: {
        'X-User-ID': '113'
      }
    });

    if (!countResponse.ok) {
      throw new Error(`HTTP error! status: ${countResponse.status}`);
    }

    const countResult = await countResponse.json();
    console.log('✅ Notification count:', countResult);
    
    // Get notifications
    const notificationsResponse = await fetch(`${BASE_URL}/api/notifications`, {
      headers: {
        'X-User-ID': '113'
      }
    });

    if (!notificationsResponse.ok) {
      throw new Error(`HTTP error! status: ${notificationsResponse.status}`);
    }

    const notifications = await notificationsResponse.json();
    console.log('✅ Notifications:');
    notifications.forEach((notification, index) => {
      console.log(`  ${index + 1}. ${notification.title}`);
      console.log(`     ${notification.message}`);
      console.log(`     Read: ${notification.isRead ? 'Yes' : 'No'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNotifications();