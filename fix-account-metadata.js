#!/usr/bin/env node

// Utility to fix contractor 115's account metadata
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia'
});

async function fixContractorMetadata() {
  try {
    console.log('🔧 Fixing contractor 115 account metadata...');
    
    // The real contractor account ID from the screenshot
    const realAccountId = 'acct_1S5ndhFNSwPKlTGJ';
    
    // Update metadata to include userId: 115
    const updatedAccount = await stripe.accounts.update(realAccountId, {
      metadata: {
        userId: '115',
        role: 'contractor', 
        version: 'v2',
        platform_env: 'production',
        created_at: new Date().toISOString(),
        fixed_metadata: 'true'
      }
    });
    
    console.log('✅ Successfully updated account metadata:');
    console.log(`Account ID: ${updatedAccount.id}`);
    console.log(`Metadata:`, updatedAccount.metadata);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const account = await stripe.accounts.retrieve(realAccountId);
    console.log(`✅ Account ${account.id} now has userId: ${account.metadata.userId}`);
    
  } catch (error) {
    console.error('❌ Error fixing metadata:', error);
  }
}

fixContractorMetadata();