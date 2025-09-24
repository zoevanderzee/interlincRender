#!/usr/bin/env node

// List all accounts we have access to
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia'
});

async function listAllAccounts() {
  try {
    console.log('🔍 Listing all Connect accounts we have access to...\n');
    
    const accounts = await stripe.accounts.list({ limit: 100 });
    
    console.log(`Found ${accounts.data.length} accounts:\n`);
    
    accounts.data.forEach((account, index) => {
      console.log(`${index + 1}. Account ID: ${account.id}`);
      console.log(`   Type: ${account.type}`);
      console.log(`   Charges Enabled: ${account.charges_enabled}`);
      console.log(`   Details Submitted: ${account.details_submitted}`);
      console.log(`   Metadata:`, account.metadata);
      console.log(`   Email: ${account.email || 'none'}`);
      console.log(`   Country: ${account.country || 'none'}`);
      console.log('   ---');
    });
    
    // Look specifically for contractor 115
    const contractor115Account = accounts.data.find(account => 
      account.metadata?.userId === '115' || account.metadata?.platform_user_id === '115'
    );
    
    if (contractor115Account) {
      console.log(`\n✅ Found contractor 115 account: ${contractor115Account.id}`);
    } else {
      console.log(`\n❌ No account found with userId: '115'`);
    }
    
  } catch (error) {
    console.error('❌ Error listing accounts:', error.message);
  }
}

listAllAccounts();