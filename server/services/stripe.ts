import Stripe from 'stripe';
import { Payment, User } from '@shared/schema';

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, string>;
  transferData?: {
    destination: string;
    amount?: number;
  };
  applicationFeeAmount?: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  id: string;
}

export interface ConnectAccountResponse {
  id: string;
  accountLink: string;
}

/**
 * Creates a payment intent in Stripe
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResponse> {
  try {
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      metadata: params.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // If this is a Connect payment, add the transfer data
    if (params.transferData && params.transferData.destination) {
      paymentIntentParams.transfer_data = {
        destination: params.transferData.destination,
        amount: params.transferData.amount,
      };

      // Add application fee if provided
      if (params.applicationFeeAmount) {
        paymentIntentParams.application_fee_amount = params.applicationFeeAmount;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    return {
      clientSecret: paymentIntent.client_secret as string,
      id: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

/**
 * Retrieves a payment intent from Stripe
 */
export async function retrievePaymentIntent(id: string) {
  try {
    return await stripe.paymentIntents.retrieve(id);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw error;
  }
}

/**
 * Processes a milestone payment
 * Creates a payment intent and returns the client secret for the frontend
 */
export async function processMilestonePayment(payment: Payment): Promise<PaymentIntentResponse> {
  // Convert payment amount to cents (Stripe uses smallest currency unit)
  const amount = Math.round(parseFloat(payment.amount) * 100);
  
  return createPaymentIntent({
    amount,
    currency: 'usd', // Default to USD
    description: `Payment for milestone ID: ${payment.milestoneId}`,
    metadata: {
      paymentId: payment.id.toString(),
      contractId: payment.contractId.toString(),
      milestoneId: payment.milestoneId ? payment.milestoneId.toString() : '',
      paymentType: 'milestone'
    },
  });
}

/**
 * Updates the payment status based on the Stripe payment intent status
 */
export async function updatePaymentStatus(paymentIntentId: string): Promise<string> {
  const paymentIntent = await retrievePaymentIntent(paymentIntentId);
  return paymentIntent.status;
}

/**
 * Creates a Stripe Connect account for a contractor
 */
export async function createConnectAccount(contractor: User): Promise<ConnectAccountResponse> {
  try {
    // Create a connected account for the contractor as an individual
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB', // Default to GB to match your setup
      email: contractor.email,
      business_type: 'individual',
      individual: {
        first_name: contractor.firstName,
        last_name: contractor.lastName,
        email: contractor.email,
      },
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      metadata: {
        userId: contractor.id.toString(),
        role: 'contractor',
      },
    });

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/contractors/onboarding/refresh`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/contractors/onboarding/complete`,
      type: 'account_onboarding',
    });

    return {
      id: account.id,
      accountLink: accountLink.url,
    };
  } catch (error) {
    console.error('Error creating Connect account:', error);
    throw error;
  }
}

/**
 * Process a direct payment to a contractor through Stripe Connect
 */
export async function processDirectPayment(payment: Payment, contractorConnectId: string, platformFee: number = 0): Promise<PaymentIntentResponse> {
  // Convert amounts to cents (Stripe uses smallest currency unit)
  const amount = Math.round(parseFloat(payment.amount) * 100);
  const feeAmount = platformFee > 0 ? Math.round(platformFee * 100) : Math.round(amount * 0.05); // Default 5% fee
  
  return createPaymentIntent({
    amount,
    currency: 'usd', // Default to USD
    description: `Payment for milestone ID: ${payment.milestoneId}`,
    metadata: {
      paymentId: payment.id.toString(),
      contractId: payment.contractId.toString(),
      milestoneId: payment.milestoneId ? payment.milestoneId.toString() : '',
      connectAccountId: contractorConnectId
    },
    transferData: {
      destination: contractorConnectId,
      amount: amount - feeAmount, // Transfer amount minus platform fee
    },
    applicationFeeAmount: feeAmount,
  });
}

/**
 * Creates a transfer to a connected account
 */
export async function createTransfer(payment: Payment, contractorConnectId: string): Promise<string> {
  try {
    const amount = Math.round(parseFloat(payment.amount) * 100);
    const transfer = await stripe.transfers.create({
      amount,
      currency: 'usd',
      destination: contractorConnectId,
      description: `Payment for contract #${payment.contractId}, milestone #${payment.milestoneId}`,
      metadata: {
        paymentId: payment.id.toString(),
        contractId: payment.contractId.toString(),
        milestoneId: payment.milestoneId ? payment.milestoneId.toString() : '',
      },
    });
    
    return transfer.id;
  } catch (error) {
    console.error('Error creating transfer:', error);
    throw error;
  }
}

/**
 * Get Stripe Connect account details
 */
export async function getConnectAccount(accountId: string) {
  try {
    return await stripe.accounts.retrieve(accountId);
  } catch (error) {
    console.error('Error retrieving Connect account:', error);
    throw error;
  }
}

/**
 * Check if a Connect account is properly set up
 */
export async function checkConnectAccountStatus(accountId: string): Promise<boolean> {
  try {
    const account = await getConnectAccount(accountId);
    return account.charges_enabled && account.details_submitted;
  } catch (error) {
    console.error('Error checking Connect account status:', error);
    return false;
  }
}

/**
 * Create a bank account payment method from a Plaid processor token
 * This links a user's bank account to Stripe for ACH payments
 */
export async function createBankAccountPaymentMethod(
  customerId: string,
  processorToken: string
): Promise<string> {
  try {
    // Create a bank account token from the processor token
    const bankAccount = await stripe.customers.createSource(
      customerId,
      {
        source: processorToken
      }
    );
    
    return bankAccount.id;
  } catch (error) {
    console.error('Error creating bank account payment method:', error);
    throw error;
  }
}

/**
 * Process an ACH payment from a bank account to a contractor
 */
export async function processACHPayment(
  payment: Payment,
  customerId: string,
  bankAccountId: string,
  contractorConnectId?: string
): Promise<PaymentIntentResponse> {
  // Convert payment amount to cents
  const amount = Math.round(parseFloat(payment.amount) * 100);
  const description = `ACH Payment for contract #${payment.contractId}, milestone #${payment.milestoneId}`;
  
  try {
    // Create the charge options
    const chargeOptions: Stripe.ChargeCreateParams = {
      amount: amount,
      currency: 'usd',
      customer: customerId,
      source: bankAccountId,
      description: description,
      metadata: {
        paymentId: payment.id.toString(),
        contractId: payment.contractId.toString(),
        milestoneId: payment.milestoneId ? payment.milestoneId.toString() : '',
      }
    };
    
    // If we have a Connect account for the contractor, add transfer data
    if (contractorConnectId) {
      const platformFee = Math.round(amount * 0.05); // 5% platform fee
      
      chargeOptions.transfer_data = {
        destination: contractorConnectId,
        amount: amount - platformFee
      };
      
      chargeOptions.application_fee_amount = platformFee;
    }
    
    // Create the charge - for ACH, this returns 'pending' initially
    const charge = await stripe.charges.create(chargeOptions);
    
    // For our API, we return a client secret and ID format similar to payment intents
    return {
      clientSecret: `${charge.id}_secret`, // ACH doesn't use client secret, but we maintain API consistency
      id: charge.id
    };
  } catch (error) {
    console.error('Error processing ACH payment:', error);
    throw error;
  }
}

export default {
  createPaymentIntent,
  retrievePaymentIntent,
  processMilestonePayment,
  updatePaymentStatus,
  createConnectAccount,
  processDirectPayment,
  createTransfer,
  getConnectAccount,
  checkConnectAccountStatus,
  createBankAccountPaymentMethod,
  processACHPayment
};