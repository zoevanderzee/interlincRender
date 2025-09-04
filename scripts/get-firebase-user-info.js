
const admin = require('firebase-admin');
const { storage } = require('../server/storage');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../.firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

async function getUserInfo() {
  const firebaseUID = 'K1L54cjRphbhPRntEzvGW3kQUjh2';
  
  try {
    console.log(`\n🔍 Looking up Firebase user: ${firebaseUID}\n`);
    
    // Get Firebase user data
    const userRecord = await admin.auth().getUser(firebaseUID);
    
    console.log('📋 Firebase User Information:');
    console.log('================================');
    console.log(`UID: ${userRecord.uid}`);
    console.log(`Email: ${userRecord.email}`);
    console.log(`Email Verified: ${userRecord.emailVerified ? '✅ Yes' : '❌ No'}`);
    console.log(`Display Name: ${userRecord.displayName || 'Not set'}`);
    console.log(`Disabled: ${userRecord.disabled ? '❌ Yes' : '✅ No'}`);
    console.log(`Provider Data: ${JSON.stringify(userRecord.providerData, null, 2)}`);
    console.log(`Created: ${new Date(userRecord.metadata.creationTime).toLocaleString()}`);
    console.log(`Last Sign In: ${userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime).toLocaleString() : 'Never'}`);
    console.log(`Custom Claims: ${JSON.stringify(userRecord.customClaims || {}, null, 2)}`);
    
    // Now check PostgreSQL database for matching user
    console.log('\n🔍 Checking PostgreSQL database for matching user...\n');
    
    // Try to find user by Firebase UID
    const dbUser = await storage.getUserByFirebaseUID(firebaseUID);
    
    if (dbUser) {
      console.log('📋 PostgreSQL User Information:');
      console.log('=================================');
      console.log(`ID: ${dbUser.id}`);
      console.log(`Username: ${dbUser.username}`);
      console.log(`Email: ${dbUser.email}`);
      console.log(`Role: ${dbUser.role}`);
      console.log(`Worker Type: ${dbUser.workerType || 'Not set'}`);
      console.log(`Company Name: ${dbUser.companyName || 'Not set'}`);
      console.log(`First Name: ${dbUser.firstName}`);
      console.log(`Last Name: ${dbUser.lastName}`);
      console.log(`Email Verified (DB): ${dbUser.emailVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`Subscription Status: ${dbUser.subscriptionStatus}`);
      console.log(`Created At: ${new Date(dbUser.createdAt).toLocaleString()}`);
      console.log(`Firebase UID (DB): ${dbUser.firebaseUid || 'Not set'}`);
    } else {
      console.log('❌ No matching user found in PostgreSQL database');
      
      // Try to find by email instead
      if (userRecord.email) {
        console.log(`\n🔍 Searching by email: ${userRecord.email}`);
        const userByEmail = await storage.getUserByEmail(userRecord.email);
        
        if (userByEmail) {
          console.log('📋 Found user by email in PostgreSQL:');
          console.log('=====================================');
          console.log(`ID: ${userByEmail.id}`);
          console.log(`Username: ${userByEmail.username}`);
          console.log(`Email: ${userByEmail.email}`);
          console.log(`Role: ${userByEmail.role}`);
          console.log(`Firebase UID (DB): ${userByEmail.firebaseUid || 'NOT SYNCED'}`);
          console.log(`⚠️ Note: This user exists in DB but Firebase UID is not synced`);
        } else {
          console.log('❌ No user found by email either');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error fetching user information:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('❌ This Firebase UID does not exist');
    }
  }
}

getUserInfo().then(() => {
  console.log('\n✅ User lookup complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
