#!/usr/bin/env node

/**
 * Fix Real Account Metadata
 * Add userId: '115' to account acct_1S5ndhFNSwPKlTGJ so system can find it
 */

const { stripe } = require('./server/services/stripe.ts');

async function fixRealAccountMetadata() {
  const realAccountId = 'acct_1S5ndhFNSwPKlTGJ';
  const contractorUserId = '115';
  
  try {
    console.log(`🔧 Attempting to fix metadata on real account ${realAccountId}...`);
    
    // First, try to retrieve the account to verify access
    const account = await stripe.accounts.retrieve(realAccountId);
    console.log(`✅ Account retrieved successfully:`, {
      id: account.id,
      type: account.type,
      country: account.country,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      current_metadata: account.metadata
    });
    
    // Update metadata to include userId
    console.log(`🔧 Adding userId: '${contractorUserId}' to account metadata...`);
    
    const updatedAccount = await stripe.accounts.update(realAccountId, {
      metadata: {
        ...account.metadata,
        userId: contractorUserId,
        platform_env: 'production',
        role: 'contractor',
        updated_at: new Date().toISOString(),
        version: 'v2'
      }
    });
    
    console.log(`✅ METADATA FIXED! Account ${realAccountId} now has:`, {
      metadata: updatedAccount.metadata
    });
    
    console.log(`\n🎯 NEXT: The system should now find the real account for contractor ${contractorUserId}`);
    
  } catch (error) {
    console.error(`❌ Failed to update account ${realAccountId}:`, {
      error: error.message,
      type: error.type,
      code: error.code
    });
    
    if (error.code === 'resource_missing') {
      console.log(`\n🚨 ACCOUNT NOT ACCESSIBLE - This means:`);
      console.log(`   1. Account is in different environment (test vs live)`);
      console.log(`   2. Account not connected to this platform`);
      console.log(`   3. OAuth connection missing/broken`);
      console.log(`\n💡 SOLUTION: Need to re-connect contractor via OAuth`);
    }
  }
}

// Run the fix
fixRealAccountMetadata().catch(console.error);