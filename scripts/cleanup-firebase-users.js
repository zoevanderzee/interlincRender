/**
 * Firebase User Cleanup Script
 * Removes Firebase Authentication users who never completed email verification
 * This allows them to re-register with the same email address
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccountPath = join(__dirname, '..', '.firebase-service-account.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

const auth = admin.auth();

/**
 * Lists all Firebase users and their verification status
 */
async function listAllUsers() {
  try {
    console.log('\n📋 Fetching all Firebase users...\n');
    
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;
    
    if (users.length === 0) {
      console.log('✅ No Firebase users found');
      return;
    }
    
    console.log(`Found ${users.length} Firebase user(s):\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${new Date(user.metadata.creationTime).toLocaleString()}`);
      console.log(`   Last Sign In: ${user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'Never'}\n`);
    });
    
    return users;
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    throw error;
  }
}

/**
 * Deletes unverified Firebase users
 */
async function deleteUnverifiedUsers() {
  try {
    const users = await listAllUsers();
    
    if (!users || users.length === 0) {
      return;
    }
    
    const unverifiedUsers = users.filter(user => !user.emailVerified);
    
    if (unverifiedUsers.length === 0) {
      console.log('✅ No unverified users found to delete');
      return;
    }
    
    console.log(`🧹 Found ${unverifiedUsers.length} unverified user(s) to delete:\n`);
    
    for (const user of unverifiedUsers) {
      try {
        await auth.deleteUser(user.uid);
        console.log(`✅ Deleted unverified user: ${user.email} (${user.uid})`);
      } catch (error) {
        console.error(`❌ Failed to delete user ${user.email}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Cleanup complete! Deleted ${unverifiedUsers.length} unverified user(s)`);
    console.log('   These email addresses can now be used for new registrations.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    throw error;
  }
}

/**
 * Deletes a specific user by email
 */
async function deleteUserByEmail(email) {
  try {
    console.log(`\n🔍 Looking for user with email: ${email}`);
    
    const user = await auth.getUserByEmail(email);
    console.log(`   Found user: ${user.uid}`);
    console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
    
    await auth.deleteUser(user.uid);
    console.log(`✅ Successfully deleted user: ${email}`);
    console.log('   This email address can now be used for new registration.');
    
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`✅ No Firebase user found with email: ${email}`);
      console.log('   This email address is available for registration.');
    } else {
      console.error(`❌ Error deleting user ${email}:`, error.message);
      throw error;
    }
  }
}

// Handle command line arguments
const command = process.argv[2];
const email = process.argv[3];

async function main() {
  try {
    switch (command) {
      case 'list':
        await listAllUsers();
        break;
        
      case 'cleanup':
        await deleteUnverifiedUsers();
        break;
        
      case 'delete':
        if (!email) {
          console.error('❌ Please provide an email address: npm run cleanup-firebase delete user@example.com');
          process.exit(1);
        }
        await deleteUserByEmail(email);
        break;
        
      default:
        console.log('📖 Firebase User Cleanup Tool\n');
        console.log('Commands:');
        console.log('  npm run cleanup-firebase list           - List all Firebase users');
        console.log('  npm run cleanup-firebase cleanup        - Delete all unverified users');  
        console.log('  npm run cleanup-firebase delete <email> - Delete specific user by email');
        console.log('\nExamples:');
        console.log('  npm run cleanup-firebase list');
        console.log('  npm run cleanup-firebase cleanup');
        console.log('  npm run cleanup-firebase delete user@example.com');
        break;
    }
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

main();