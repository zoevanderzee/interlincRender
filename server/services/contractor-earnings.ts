
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia',
  typescript: true
});

export interface ContractorEarnings {
  pendingEarnings: number;
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  lastUpdated: Date;
}

export interface EarningsTransaction {
  id: string;
  amount: number;
  currency: string;
  type: 'charge' | 'payout' | 'refund' | 'fee';
  status: 'pending' | 'available' | 'paid';
  created: Date;
  description: string;
  payoutId?: string;
}

/**
 * Get contractor earnings from their Connect account balance
 * This is the ONLY source of truth for contractor earnings
 */
export async function getContractorEarnings(contractorConnectAccountId: string): Promise<ContractorEarnings> {
  try {
    console.log(`[Contractor Earnings] Fetching for account: ${contractorConnectAccountId}`);

    // Get the balance from the contractor's Connect account
    const balance = await stripe.balance.retrieve({
      stripeAccount: contractorConnectAccountId
    });

    // Available balance = funds that can be paid out
    const availableAmount = balance.available.reduce((sum, bal) => {
      return sum + bal.amount;
    }, 0);

    // Pending balance = funds held by Stripe (not yet available for payout)
    const pendingAmount = balance.pending.reduce((sum, bal) => {
      return sum + bal.amount;
    }, 0);

    // Get all payouts to calculate total lifetime earnings
    const payouts = await stripe.payouts.list({
      limit: 100,
      stripeAccount: contractorConnectAccountId
    });

    // Sum all paid/in_transit payouts for total earnings
    const totalEarnings = payouts.data
      .filter(p => p.status === 'paid' || p.status === 'in_transit')
      .reduce((sum, payout) => sum + payout.amount, 0);

    // Get the actual currency from the Connect account
    const currency = balance.available[0]?.currency?.toUpperCase() || 'GBP';

    return {
      pendingEarnings: (pendingAmount + availableAmount) / 100, // Convert from cents
      totalEarnings: totalEarnings / 100,
      availableBalance: availableAmount / 100,
      pendingBalance: pendingAmount / 100,
      currency, // Will be GBP, USD, EUR, etc. based on Connect account
      lastUpdated: new Date()
    };
  } catch (error: any) {
    console.error(`[Contractor Earnings] Error fetching earnings:`, error);
    throw new Error(`Failed to fetch contractor earnings: ${error.message}`);
  }
}

/**
 * Get detailed transaction history from contractor's Connect account
 */
export async function getContractorTransactions(
  contractorConnectAccountId: string,
  limit: number = 50
): Promise<EarningsTransaction[]> {
  try {
    console.log(`[Contractor Transactions] Fetching for account: ${contractorConnectAccountId}`);

    // Get balance transactions (charges, refunds, fees, etc.)
    const balanceTransactions = await stripe.balanceTransactions.list({
      limit,
      stripeAccount: contractorConnectAccountId
    });

    const transactions: EarningsTransaction[] = balanceTransactions.data.map(txn => {
      // Determine status based on transaction type and payout
      let status: 'pending' | 'available' | 'paid' = 'pending';
      if (txn.status === 'available') {
        status = txn.payout ? 'paid' : 'available';
      }

      return {
        id: txn.id,
        amount: txn.net / 100, // Net amount after fees
        currency: txn.currency,
        type: txn.type as any,
        status,
        created: new Date(txn.created * 1000),
        description: txn.description || `${txn.type} transaction`,
        payoutId: txn.payout as string | undefined
      };
    });

    return transactions;
  } catch (error: any) {
    console.error(`[Contractor Transactions] Error fetching transactions:`, error);
    throw new Error(`Failed to fetch contractor transactions: ${error.message}`);
  }
}

/**
 * Get payout history for contractor
 */
export async function getContractorPayouts(
  contractorConnectAccountId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    console.log(`[Contractor Payouts] Fetching for account: ${contractorConnectAccountId}`);

    const payouts = await stripe.payouts.list({
      limit,
      stripeAccount: contractorConnectAccountId
    });

    return payouts.data.map(payout => ({
      id: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency,
      status: payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000),
      created: new Date(payout.created * 1000),
      description: payout.description,
      method: payout.method,
      type: payout.type
    }));
  } catch (error: any) {
    console.error(`[Contractor Payouts] Error fetching payouts:`, error);
    throw new Error(`Failed to fetch contractor payouts: ${error.message}`);
  }
}

/**
 * Reconcile contractor earnings by re-fetching from Stripe
 * Use this to recover from missed webhooks or sync issues
 */
export async function reconcileContractorEarnings(contractorConnectAccountId: string): Promise<ContractorEarnings> {
  console.log(`[Contractor Earnings] Reconciling earnings for: ${contractorConnectAccountId}`);
  return getContractorEarnings(contractorConnectAccountId);
}
