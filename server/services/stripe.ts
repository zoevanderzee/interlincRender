
import Stripe from 'stripe';
import { Payment, User } from '@shared/schema';

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
  typescript: true
});

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
  paymentMethodTypes?: string[];
}

export interface PaymentIntentResponse {
  clientSecret: string;
  id: string;
  status?: string;
}

export interface ConnectAccountResponse {
  id: string;
  accountLink?: string;
  loginLink?: string;
}

export interface ConnectAccountStatus {
  charges_enabled: boolean;
  details_submitted: boolean;
  payouts_enabled: boolean;
  requirements: Stripe.Account.Requirements | null;
  capabilities: Stripe.Account.Capabilities | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  disabled_reason: string | null;
}

/**
 * V2 Enhanced Payment Intent Creation with comprehensive error handling
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResponse> {
  try {
    // Convert amount to cents and ensure minimum amounts per currency
    const currency = params.currency.toLowerCase();
    
    // Enhanced currency validation for Connect accounts
    console.log(`[Payment Intent V2] Creating payment for ${params.amount} ${currency.toUpperCase()}`);
    
    const minimumAmounts = {
      'usd': 50, // 50 cents = $0.50
      'gbp': 30, // 30 pence = £0.30
      'eur': 50, // 50 cents = €0.50
      'cad': 50, // 50 cents = CAD$0.50
      'aud': 50, // 50 cents = AUD$0.50
    };

    const minAmount = minimumAmounts[currency] || 50;
    const amountInCents = Math.round(params.amount * 100);

    if (amountInCents < minAmount) {
      const currencySymbols = { usd: '$', gbp: '£', eur: '€', cad: 'C$', aud: 'A$' };
      const symbol = currencySymbols[currency] || '';
      const minDisplay = (minAmount / 100).toFixed(2);
      throw new Error(`Minimum payment amount is ${symbol}${minDisplay} ${currency.toUpperCase()}`);
    }

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: currency,
      description: params.description,
      metadata: params.metadata || {},
      payment_method_types: params.paymentMethodTypes || ['card'],
      capture_method: 'automatic',
      confirmation_method: 'automatic'
    };

    // Enhanced Connect payment handling
    if (params.transferData && params.transferData.destination) {
      // Validate destination account first
      try {
        const account = await stripe.accounts.retrieve(params.transferData.destination);
        if (!account.charges_enabled) {
          throw new Error('Destination account is not enabled for charges');
        }
      } catch (accountError) {
        throw new Error('Invalid or disabled destination account');
      }

      // Use either transfer_data.amount OR application_fee_amount, not both
      if (params.transferData.amount) {
        // If transfer amount is specified, use it (amount going to connected account)
        paymentIntentParams.transfer_data = {
          destination: params.transferData.destination,
          amount: params.transferData.amount
        };
      } else if (params.applicationFeeAmount) {
        // If only application fee is specified, transfer everything except the fee
        paymentIntentParams.transfer_data = {
          destination: params.transferData.destination
        };
        paymentIntentParams.application_fee_amount = params.applicationFeeAmount;
      } else {
        // Default: transfer everything to connected account (no platform fee)
        paymentIntentParams.transfer_data = {
          destination: params.transferData.destination
        };
      }

      // Add Connect-specific metadata
      paymentIntentParams.metadata = {
        ...paymentIntentParams.metadata,
        connect_payment: 'true',
        destination_account: params.transferData.destination
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    return {
      clientSecret: paymentIntent.client_secret as string,
      id: paymentIntent.id,
      status: paymentIntent.status
    };
  } catch (error: any) {
    console.error('Error creating V2 payment intent:', error);
    
    // Enhanced error handling with specific error codes
    if (error.type === 'StripeCardError') {
      throw new Error(`Payment failed: ${error.message}`);
    } else if (error.type === 'StripeInvalidRequestError') {
      throw new Error(`Invalid request: ${error.message}`);
    } else if (error.type === 'StripeAPIError') {
      throw new Error('Payment service temporarily unavailable. Please try again.');
    } else if (error.type === 'StripeConnectionError') {
      throw new Error('Network error. Please check your connection and try again.');
    } else if (error.type === 'StripeRateLimitError') {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }
    
    throw error;
  }
}

/**
 * V2 Enhanced Connect Account Creation with full capability management
 */
export async function createConnectAccountV2(contractor: User, options: {
  country?: string;
  business_type?: 'individual' | 'company';
  capabilities?: string[];
  settings?: Stripe.AccountCreateParams.Settings;
} = {}): Promise<ConnectAccountResponse> {
  try {
    const {
      country = 'GB',
      business_type = 'individual',
      capabilities = ['card_payments', 'transfers', 'us_bank_account_ach_payments'],
      settings
    } = options;

    // Enhanced account configuration for V2
    const accountConfig: Stripe.AccountCreateParams = {
      type: 'express',
      country,
      email: contractor.email,
      business_type,
      capabilities: {},
      metadata: {
        userId: contractor.id.toString(),
        role: contractor.role || 'contractor',
        version: 'v2',
        created_at: new Date().toISOString()
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'daily'
          }
        },
        ...settings
      }
    };

    // Request all specified capabilities
    capabilities.forEach(capability => {
      accountConfig.capabilities![capability] = { requested: true };
    });

    // Set up business/individual information
    if (business_type === 'individual') {
      accountConfig.individual = {
        first_name: contractor.firstName,
        last_name: contractor.lastName,
        email: contractor.email
      };
    } else {
      accountConfig.company = {
        name: contractor.companyName || `${contractor.firstName} ${contractor.lastName}`
      };
    }

    const account = await stripe.accounts.create(accountConfig);

    console.log(`V2 Connect account created: ${account.id} for user ${contractor.id}`);

    return {
      id: account.id
    };
  } catch (error: any) {
    console.error('Error creating V2 Connect account:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      throw new Error(`Account creation failed: ${error.message}`);
    }
    
    throw new Error('Failed to create payment processing account. Please try again.');
  }
}

/**
 * V2 Enhanced Account Status Checking with detailed capability information
 */
export async function getConnectAccountStatusV2(accountId: string): Promise<ConnectAccountStatus> {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    const requirements = account.requirements;
    const capabilities = account.capabilities;

    console.log(`[Connect Status V2] Account ${accountId}:`, {
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      capabilities: capabilities,
      requirements: requirements
    });

    // Determine verification status based on multiple factors
    let verification_status: 'pending' | 'verified' | 'rejected' = 'pending';
    
    // Check for blocking requirements first
    const hasBlockingRequirements = requirements?.disabled_reason ||
                                   (requirements?.currently_due?.length || 0) > 0 ||
                                   (requirements?.past_due?.length || 0) > 0;

    if (hasBlockingRequirements) {
      verification_status = 'rejected';
    } else if (account.charges_enabled && account.details_submitted && account.payouts_enabled) {
      // Check if critical capabilities are active
      const cardPaymentsActive = capabilities?.card_payments?.status === 'active';
      const transfersActive = capabilities?.transfers?.status === 'active';
      
      verification_status = (cardPaymentsActive && transfersActive) ? 'verified' : 'pending';
    }

    return {
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      requirements: requirements || null,
      capabilities: capabilities || null,
      verification_status,
      disabled_reason: requirements?.disabled_reason || null
    };
  } catch (error: any) {
    console.error('Error checking V2 Connect account status:', error);
    
    if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
      throw new Error('Connect account not found');
    }
    
    throw new Error('Failed to check account status');
  }
}

/**
 * Validate Connect account for payment processing
 */
export async function validateConnectAccountForPayment(accountId: string): Promise<boolean> {
  try {
    const status = await getConnectAccountStatusV2(accountId);
    
    const isValid = status.verification_status === 'verified' && 
                   status.charges_enabled && 
                   status.payouts_enabled &&
                   !status.disabled_reason;

    console.log(`[Connect Validation] Account ${accountId} valid for payments:`, isValid);
    
    return isValid;
  } catch (error) {
    console.error(`[Connect Validation] Failed to validate account ${accountId}:`, error);
    return false;
  }
}

/**
 * V2 Enhanced Direct Transfer Creation with validation
 */
export async function createDirectTransferV2(params: {
  destination: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{ transfer_id: string; status: string }> {
  try {
    const { destination, amount, currency = 'usd', description, metadata } = params;

    // Validate destination account
    const account = await stripe.accounts.retrieve(destination);
    if (!account.payouts_enabled) {
      throw new Error('Destination account is not enabled for payouts');
    }

    // Create the transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      destination,
      description: description || 'Direct transfer',
      metadata: {
        ...metadata,
        version: 'v2',
        created_at: new Date().toISOString()
      }
    });

    console.log(`V2 Direct transfer created: ${transfer.id} for $${amount} to ${destination}`);

    return {
      transfer_id: transfer.id,
      status: transfer.object === 'transfer' ? 'created' : 'pending'
    };
  } catch (error: any) {
    console.error('Error creating V2 direct transfer:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'insufficient_funds') {
        throw new Error('Insufficient funds for transfer');
      } else if (error.code === 'account_invalid') {
        throw new Error('Invalid destination account');
      }
      throw new Error(`Transfer failed: ${error.message}`);
    }
    
    throw new Error('Transfer creation failed. Please try again.');
  }
}

/**
 * V2 Enhanced Capability Management
 */
export async function updateAccountCapabilities(
  accountId: string, 
  capabilities: Record<string, { requested: boolean }>
): Promise<{ success: boolean; capabilities: Stripe.Account.Capabilities | null }> {
  try {
    const account = await stripe.accounts.update(accountId, {
      capabilities
    });

    console.log(`V2 Capabilities updated for account ${accountId}:`, capabilities);

    return {
      success: true,
      capabilities: account.capabilities || null
    };
  } catch (error: any) {
    console.error('Error updating V2 capabilities:', error);
    
    throw new Error(`Failed to update payment capabilities: ${error.message}`);
  }
}

/**
 * V2 Enhanced Bank Account Management
 */
export async function addBankAccountV2(
  accountId: string,
  bankAccountData: {
    routing_number: string;
    account_number: string;
    account_holder_type: 'individual' | 'company';
    currency?: string;
  }
): Promise<{ bank_account_id: string; last4: string }> {
  try {
    const { routing_number, account_number, account_holder_type, currency = 'usd' } = bankAccountData;

    const bankAccount = await stripe.accounts.createExternalAccount(accountId, {
      external_account: {
        object: 'bank_account',
        country: 'US',
        currency,
        routing_number,
        account_number,
        account_holder_type
      }
    });

    console.log(`V2 Bank account added: ${bankAccount.id} for account ${accountId}`);

    if (bankAccount.object === 'bank_account') {
      return {
        bank_account_id: bankAccount.id,
        last4: bankAccount.last4
      };
    }

    throw new Error('Failed to create bank account');
  } catch (error: any) {
    console.error('Error adding V2 bank account:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'routing_number_invalid') {
        throw new Error('Invalid routing number provided');
      } else if (error.code === 'account_number_invalid') {
        throw new Error('Invalid account number provided');
      }
      throw new Error(`Bank account validation failed: ${error.message}`);
    }
    
    throw new Error('Failed to add bank account. Please verify your information.');
  }
}

/**
 * V2 Enhanced Document Upload for verification
 */
export async function uploadVerificationDocument(
  accountId: string,
  documentData: {
    purpose: 'identity_document' | 'additional_verification';
    file_data: string; // base64 encoded
    file_type: 'front' | 'back' | 'additional';
  }
): Promise<{ file_id: string; status: string }> {
  try {
    const { purpose, file_data, file_type } = documentData;

    // Create file upload
    const file = await stripe.files.create({
      purpose,
      file: {
        data: Buffer.from(file_data, 'base64'),
        name: `${purpose}_${file_type}.jpg`,
        type: 'application/octet-stream'
      }
    });

    // Update account with document
    const updateData: any = {};
    
    if (purpose === 'identity_document') {
      updateData.individual = {
        verification: {
          document: file_type === 'front' ? { front: file.id } : { back: file.id }
        }
      };
    }

    await stripe.accounts.update(accountId, updateData);

    console.log(`V2 Document uploaded: ${file.id} for account ${accountId}`);

    return {
      file_id: file.id,
      status: 'uploaded'
    };
  } catch (error: any) {
    console.error('Error uploading V2 verification document:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      throw new Error(`Document upload failed: ${error.message}`);
    }
    
    throw new Error('Failed to upload verification document. Please try again.');
  }
}

/**
 * Legacy methods for backward compatibility
 */
export async function retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.retrieve(id);
}

export async function processMilestonePayment(payment: Payment): Promise<PaymentIntentResponse> {
  const amount = Math.round(parseFloat(payment.amount) * 100);
  
  return createPaymentIntent({
    amount,
    currency: 'usd',
    description: `Payment for milestone ID: ${payment.milestoneId}`,
    metadata: {
      paymentId: payment.id.toString(),
      contractId: payment.contractId.toString(),
      milestoneId: payment.milestoneId ? payment.milestoneId.toString() : '',
      paymentType: 'milestone'
    },
  });
}

export async function updatePaymentStatus(paymentIntentId: string): Promise<string> {
  const paymentIntent = await retrievePaymentIntent(paymentIntentId);
  return paymentIntent.status;
}

// Legacy Connect methods - deprecated in favor of V2 methods
export async function createConnectAccount(contractor: User): Promise<ConnectAccountResponse> {
  console.warn('Using legacy createConnectAccount - consider upgrading to createConnectAccountV2');
  return createConnectAccountV2(contractor);
}

export async function checkConnectAccountStatus(accountId: string): Promise<boolean> {
  console.warn('Using legacy checkConnectAccountStatus - consider upgrading to getConnectAccountStatusV2');
  const status = await getConnectAccountStatusV2(accountId);
  return status.verification_status === 'verified';
}

export async function getConnectAccount(accountId: string): Promise<Stripe.Account> {
  return await stripe.accounts.retrieve(accountId);
}

export default {
  // V2 Enhanced Methods
  createPaymentIntent,
  createConnectAccountV2,
  getConnectAccountStatusV2,
  createDirectTransferV2,
  updateAccountCapabilities,
  addBankAccountV2,
  uploadVerificationDocument,
  
  // Legacy Methods
  retrievePaymentIntent,
  processMilestonePayment,
  updatePaymentStatus,
  createConnectAccount,
  checkConnectAccountStatus,
  getConnectAccount
};
