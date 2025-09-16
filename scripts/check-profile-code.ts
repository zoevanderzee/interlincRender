
#!/usr/bin/env tsx

/**
 * Script to check profile code functionality
 */
import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import { users } from '../shared/schema';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// Initialize database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function checkProfileCodes() {
  try {
    console.log('🔍 Checking profile code functionality...');
    
    // Get all users with profile codes
    const usersWithCodes = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        profileCode: users.profileCode,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(users)
      .where(eq(users.role, 'contractor'));
    
    console.log(`\n📊 Found ${usersWithCodes.length} contractor users`);
    
    const withCodes = usersWithCodes.filter(u => u.profileCode);
    const withoutCodes = usersWithCodes.filter(u => !u.profileCode);
    
    console.log(`✅ ${withCodes.length} contractors have profile codes`);
    console.log(`❌ ${withoutCodes.length} contractors missing profile codes`);
    
    if (withCodes.length > 0) {
      console.log('\n🏷️  Profile codes found:');
      withCodes.forEach(user => {
        console.log(`  - ${user.username} (${user.firstName} ${user.lastName}): ${user.profileCode}`);
      });
    }
    
    if (withoutCodes.length > 0) {
      console.log('\n⚠️  Contractors without profile codes:');
      withoutCodes.forEach(user => {
        console.log(`  - ${user.username} (${user.firstName} ${user.lastName})`);
      });
    }
    
    // Check for duplicate codes
    const codes = withCodes.map(u => u.profileCode).filter(Boolean);
    const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
    
    if (duplicates.length > 0) {
      console.log('\n🚨 Duplicate profile codes found:', duplicates);
    } else {
      console.log('\n✅ No duplicate profile codes found');
    }
    
  } catch (error) {
    console.error('❌ Error checking profile codes:', error);
    process.exit(1);
  }
}

checkProfileCodes().then(() => {
  console.log('\n✅ Profile code check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
