import { storage } from '../server/storage';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Function to hash passwords
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  try {
    console.log('Updating admin password...');
    
    // Get the admin user
    const admin = await storage.getUserByUsername('cdmanagement');
    
    if (!admin) {
      console.error('Admin user not found!');
      return;
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword('admin123');
    
    // Update the admin user with the new password
    const updatedUser = await storage.updateUser(admin.id, {
      password: hashedPassword
    });
    
    if (updatedUser) {
      console.log(`✅ Successfully updated password for user: ${admin.username} (${admin.id})`);
      console.log('You can now login with:');
      console.log('Username: cdmanagement');
      console.log('Password: admin123');
    } else {
      console.error('❌ Failed to update user password');
    }
  } catch (error) {
    console.error('Error updating admin password:', error);
  }
}

main();