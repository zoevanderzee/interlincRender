
import Stripe from 'stripe';
import { storage } from '../storage';

/**
 * Handle contractor Connect account webhooks
 * These webhooks ensure contractor earnings are always up-to-date
 */

export async function handleBalanceAvailable(event: Stripe.Event) {
  console.log('[Contractor Webhook] balance.available event received');
  
  // Balance is now available for payout
  const balance = event.data.object as Stripe.Balance;
  
  // Find contractor by Connect account ID from event account
  const accountId = event.account as string;
  if (!accountId) {
    console.log('[Contractor Webhook] No account ID in event');
    return;
  }

  const contractors = await storage.getUsersByConnectAccountId(accountId);
  if (contractors.length === 0) {
    console.log(`[Contractor Webhook] No contractor found for account: ${accountId}`);
    return;
  }

  const contractor = contractors[0];
  console.log(`[Contractor Webhook] Balance available for contractor ${contractor.id}`);
  
  // Trigger reconciliation to update cached earnings
  const { reconcileContractorEarnings } = await import('./contractor-earnings');
  await reconcileContractorEarnings(accountId);
}

export async function handlePayoutPaid(event: Stripe.Event) {
  console.log('[Contractor Webhook] payout.paid event received');
  
  const payout = event.data.object as Stripe.Payout;
  const accountId = event.account as string;
  
  if (!accountId) {
    console.log('[Contractor Webhook] No account ID in event');
    return;
  }

  const contractors = await storage.getUsersByConnectAccountId(accountId);
  if (contractors.length === 0) {
    console.log(`[Contractor Webhook] No contractor found for account: ${accountId}`);
    return;
  }

  const contractor = contractors[0];
  console.log(`[Contractor Webhook] Payout paid for contractor ${contractor.id}:`, {
    amount: payout.amount / 100,
    currency: payout.currency,
    payoutId: payout.id
  });
  
  // Trigger reconciliation to update total earnings
  const { reconcileContractorEarnings } = await import('./contractor-earnings');
  await reconcileContractorEarnings(accountId);
}

export async function handlePayoutFailed(event: Stripe.Event) {
  console.log('[Contractor Webhook] payout.failed event received');
  
  const payout = event.data.object as Stripe.Payout;
  const accountId = event.account as string;
  
  if (!accountId) return;

  const contractors = await storage.getUsersByConnectAccountId(accountId);
  if (contractors.length === 0) return;

  const contractor = contractors[0];
  console.error(`[Contractor Webhook] Payout FAILED for contractor ${contractor.id}:`, {
    amount: payout.amount / 100,
    currency: payout.currency,
    payoutId: payout.id,
    failureCode: payout.failure_code,
    failureMessage: payout.failure_message
  });
  
  // Create notification for contractor
  await storage.createNotification({
    userId: contractor.id,
    title: 'Payout Failed',
    message: `A payout of ${payout.amount / 100} ${payout.currency.toUpperCase()} failed. Please check your bank account details.`,
    type: 'payout_failed',
    relatedId: null
  });
}
