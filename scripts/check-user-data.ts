
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkUserData() {
  try {
    console.log('🔍 Checking user data in database...\n');
    
    // Get all users
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      subscriptionStatus: users.subscriptionStatus,
      emailVerified: users.emailVerified,
      firebaseUid: users.firebaseUid,
      createdAt: users.createdAt
    }).from(users);
    
    console.log(`📊 Total users in database: ${allUsers.length}\n`);
    
    if (allUsers.length === 0) {
      console.log('❌ NO USERS FOUND - Database is empty!');
      console.log('This explains why you\'re getting a random contractor account.');
      console.log('Your business account from preview doesn\'t exist in production.');
      return;
    }
    
    // Show all users
    console.log('👥 All users in database:');
    console.log('==========================');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Subscription: ${user.subscriptionStatus}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Firebase UID: ${user.firebaseUid || 'None'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('   -------------------------');
    });
    
    // Check for business users specifically
    const businessUsers = allUsers.filter(u => u.role === 'business');
    const contractorUsers = allUsers.filter(u => u.role === 'contractor');
    
    console.log(`\n📈 Summary:`);
    console.log(`   Business users: ${businessUsers.length}`);
    console.log(`   Contractor users: ${contractorUsers.length}`);
    
    // Check if user ID 86 exists (from localStorage)
    const currentUser = allUsers.find(u => u.id === 86);
    if (currentUser) {
      console.log(`\n✅ User ID 86 (zoevdzee) found:`);
      console.log(`   Role: ${currentUser.role}`);
      console.log(`   Subscription: ${currentUser.subscriptionStatus}`);
      console.log(`   This should be your business account!`);
    } else {
      console.log(`\n❌ User ID 86 NOT FOUND in database!`);
      console.log(`   Your localStorage still references this user but they don't exist.`);
      console.log(`   This is why authentication is failing.`);
    }
    
    // Check Firebase UIDs
    const usersWithFirebase = allUsers.filter(u => u.firebaseUid);
    console.log(`\n🔥 Firebase integration:`);
    console.log(`   Users with Firebase UID: ${usersWithFirebase.length}`);
    
    if (usersWithFirebase.length > 0) {
      console.log('   Firebase UIDs:');
      usersWithFirebase.forEach(user => {
        console.log(`   - ${user.username}: ${user.firebaseUid}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking user data:', error);
  }
}

checkUserData().then(() => process.exit(0));
