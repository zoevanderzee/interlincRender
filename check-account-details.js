#!/usr/bin/env node

// Check detailed account capabilities
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia'
});

async function checkAccountDetails() {
  try {
    const accountId = 'acct_1S81GTJwvMamdjAa';
    console.log(`🔍 Checking detailed capabilities for ${accountId}...\n`);
    
    const account = await stripe.accounts.retrieve(accountId);
    
    console.log('ACCOUNT DETAILS:');
    console.log(`ID: ${account.id}`);
    console.log(`Type: ${account.type}`);
    console.log(`Email: ${account.email}`);
    console.log(`Country: ${account.country}`);
    console.log(`Default Currency: ${account.default_currency}`);
    console.log(`Charges Enabled: ${account.charges_enabled}`);
    console.log(`Details Submitted: ${account.details_submitted}`);
    console.log(`Payouts Enabled: ${account.payouts_enabled}`);
    
    console.log('\nCAPABILITIES:');
    const capabilities = account.capabilities || {};
    Object.entries(capabilities).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\nREQUIREMENTS:');
    const requirements = account.requirements || {};
    console.log(`  Currently Due: ${JSON.stringify(requirements.currently_due || [])}`);
    console.log(`  Past Due: ${JSON.stringify(requirements.past_due || [])}`);
    console.log(`  Disabled Reason: ${requirements.disabled_reason || 'none'}`);
    
    console.log('\nMETADATA:');
    console.log(JSON.stringify(account.metadata, null, 2));
    
    // Check if it can receive transfers specifically
    const transfersCapability = capabilities.transfers;
    console.log(`\n🎯 TRANSFERS CAPABILITY: ${transfersCapability}`);
    
    if (transfersCapability !== 'active') {
      console.log('❌ This is the problem! Transfers capability is not active.');
      console.log('   This account cannot receive destination charges.');
    } else {
      console.log('✅ Transfers capability is active - account should be able to receive payments.');
    }
    
  } catch (error) {
    console.error('❌ Error checking account:', error.message);
  }
}

checkAccountDetails();