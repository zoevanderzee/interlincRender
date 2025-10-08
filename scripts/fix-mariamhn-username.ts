
import { storage } from '../server/storage';

async function fixUsername() {
  try {
    // Find the user by their current username with timestamp
    const user = await storage.getUserByUsername('mariamhn_1759772150018');
    
    if (!user) {
      console.error('User not found with username: mariamhn_1759772150018');
      return;
    }

    console.log('Found user:', {
      id: user.id,
      currentUsername: user.username,
      email: user.email
    });

    // Check if the desired username 'mariamhn' is available
    const existingUser = await storage.getUserByUsername('mariamhn');
    
    if (existingUser && existingUser.id !== user.id) {
      console.error('Username "mariamhn" is already taken by another user');
      return;
    }

    // Update the username to remove the timestamp suffix
    const updatedUser = await storage.updateUser(user.id, {
      username: 'mariamhn'
    });

    if (updatedUser) {
      console.log('✅ Successfully updated username!');
      console.log('New username:', updatedUser.username);
      console.log('User should log out and log back in to see the change');
    } else {
      console.error('❌ Failed to update username');
    }
  } catch (error) {
    console.error('Error fixing username:', error);
  }
}

fixUsername();
