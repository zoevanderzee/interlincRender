import Stripe from 'stripe';
import { Payment, User } from '@shared/schema';

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia',
  typescript: true
});

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, string>;
  transferData: {
    destination: string; // REQUIRED: Contractor Connect account for destination charge
  };
  businessAccountId: string; // REQUIRED: Business Connect account ID for "on behalf of" creation
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

    // SECURITY: Ensure no customer IDs are ever used
    if ('businessCustomerId' in params || 'paymentMethodId' in params || 'saveCard' in params) {
      throw new Error('SECURITY VIOLATION: Customer IDs not allowed. Connect-only payment flow requires businessAccountId and transferData only.');
    }

    // REQUIRED: Validate destination account supports destination charges
    let accountType: string = 'unknown';
    try {
      const account = await stripe.accounts.retrieve(params.transferData.destination);
      if (!account.charges_enabled) {
        throw new Error('Destination account is not enabled for charges');
      }
      accountType = account.type || 'unknown';
      console.log(`[V2 Destination Charge] Account ${account.id} is type '${accountType}' - charges enabled: ${account.charges_enabled}`);

      // Both Express and Standard accounts support destination charges
      if (!['express', 'standard'].includes(accountType)) {
        console.warn(`Account ${account.id} is type '${accountType}', may not support destination charges`);
      }
    } catch (accountError) {
      throw new Error('Invalid or disabled destination account');
    }

    // Create Payment Intent using correct Connect destination charge pattern
    // IMPORTANT: For card payments, on_behalf_of must be omitted when using transfer_data.destination
    // due to Stripe's settlement country requirements
    console.log(`[V2 Connect Payment] Creating destination charge: Platform → Contractor ${params.transferData.destination} (Business: ${params.businessAccountId})`);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      payment_method_types: ['card'],
      // REMOVED: on_behalf_of (incompatible with card payments when different from destination)
      transfer_data: {
        destination: params.transferData.destination, // Contractor Connect account receives funds
      },
      description: params.description,
      metadata: {
        ...params.metadata,
        contractor_account_id: params.transferData.destination,
        business_account_id: params.businessAccountId, // Business tracked in metadata
        account_type: accountType,
        version: 'v2_destination_charge',
        flow_type: 'platform_to_contractor',
        payment_pattern: 'card_destination_charge'
      },
      capture_method: 'automatic',
      confirmation_method: 'automatic'
    }); // Created on platform account, funds go directly to contractor

    // Check contractor payout settings for automatic transfers
    try {
      const contractorAccount = await stripe.accounts.retrieve(params.transferData.destination);
      if (contractorAccount.settings?.payouts?.schedule?.interval !== 'manual') {
        console.log(`[V2 Payment] Contractor ${params.transferData.destination} has automatic payouts - funds will auto-transfer to bank`);
      } else {
        console.log(`[V2 Payment] Contractor ${params.transferData.destination} has manual payouts - funds will remain in Connect balance`);
      }
    } catch (error) {
      console.error(`[V2 Payment] Error checking contractor payout settings:`, error);
    }

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
      const cardPaymentsActive = capabilities?.card_payments === 'active';
      const transfersActive = capabilities?.transfers === 'active';

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
 * BULLETPROOF V2 Direct Payment Creation - Contractor ID Only (Never Account ID from Client)
 * Uses Stripe API as source of truth to resolve contractor account ID
 * NO MANUAL TRANSFERS - funds go directly to connected account at charge time
 */
export async function createSecurePaymentV2(params: {
  contractorUserId: number;  // ONLY accept contractor ID - never account ID from client
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
  businessAccountId: string; // REQUIRED: Business Connect account for "on behalf of" creation
}): Promise<{ payment_intent_id: string; status: string; client_secret: string; destination_account: string }> {
  try {
    const { contractorUserId, amount, currency = 'gbp', description, metadata, businessAccountId } = params;

    console.log(`[SECURE PAYMENT V2] Creating payment for contractor ${contractorUserId}, amount: ${amount} ${currency}`);

    // STEP 1: RESOLVE CONTRACTOR ACCOUNT ID USING STRIPE API (NEVER TRUST DATABASE)
    const accountResolution = await resolveContractorAccountId(contractorUserId);

    if (!accountResolution.isValid) {
      throw new Error(accountResolution.error || 'Contractor account not valid for payments');
    }

    const destination = accountResolution.accountId;
    console.log(`[SECURE PAYMENT V2] ✅ Resolved contractor ${contractorUserId} → Stripe account ${destination}`);

    // STEP 2: CREATE PAYMENT INTENT WITH VERIFIED DESTINATION - NO CUSTOMER ACCOUNTS
    const paymentIntentParams = {
      amount: amount,
      currency: currency,
      description: description || 'Secure payment via V2 Connect',
      metadata: {
        ...metadata,
        contractor_user_id: contractorUserId.toString(),
        destination_account: destination,
        version: 'v2_secure',
        payment_type: 'verified_destination_charge',
        created_at: new Date().toISOString(),
        security_level: 'bulletproof'
      },
      transferData: {
        destination: destination
      },
      businessAccountId: businessAccountId // REQUIRED: Create on behalf of business Connect account
    };

    // Always use standard flow - NO saved card support in Connect-only mode
    const paymentIntent = await createPaymentIntent(paymentIntentParams);

    return {
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status || 'requires_payment_method',
      client_secret: paymentIntent.clientSecret,
      destination_account: destination
    };
  } catch (error: any) {
    console.error('[SECURE PAYMENT V2] Error creating secure payment:', error);

    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'account_invalid') {
        throw new Error('Invalid destination account - contractor setup may be incomplete');
      }
      throw new Error(`Payment failed: ${error.message}`);
    }

    throw new Error(error.message || 'Payment creation failed. Please try again.');
  }
}

/**
 * LEGACY: V2 Enhanced Direct Payment Creation using Payment Intents with destination charges
 * @deprecated Use createSecurePaymentV2 instead for bulletproof security
 */
export async function createDirectPaymentV2(params: {
  destination: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{ payment_intent_id: string; status: string; client_secret: string }> {
  console.warn('[DEPRECATED] createDirectPaymentV2 is deprecated - use createSecurePaymentV2 instead');

  try {
    const { destination, amount, currency = 'gbp', description, metadata } = params;

    console.log(`[V2 Direct Payment] Creating destination charge for ${amount} ${currency} to ${destination}`);

    // Create Payment Intent with destination charge - NO manual transfers
    const paymentIntent = await createPaymentIntent({
      amount: amount,
      currency: currency,
      description: description || 'Direct payment via V2 Connect',
      metadata: {
        ...metadata,
        version: 'v2',
        payment_type: 'destination_charge',
        created_at: new Date().toISOString()
      },
      transferData: {
        destination: destination
      }
    });

    console.log(`V2 Payment Intent created: ${paymentIntent.id} for ${amount} ${currency} to ${destination}`);

    return {
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status || 'requires_payment_method',
      client_secret: paymentIntent.clientSecret
    };
  } catch (error: any) {
    console.error('Error creating V2 direct payment:', error);

    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'account_invalid') {
        throw new Error('Invalid destination account');
      }
      throw new Error(`Payment failed: ${error.message}`);
    }

    throw new Error('Payment creation failed. Please try again.');
  }
}

/**
 * BULLETPROOF: Resolve contractor's Stripe account ID using Stripe API as source of truth
 * NEVER trust database account IDs - they can be stale/wrong
 * This function queries Stripe directly and verifies contractor binding
 */
export async function resolveContractorAccountId(contractorUserId: number): Promise<{
  accountId: string;
  isValid: boolean;
  error?: string;
}> {
  try {
    console.log(`[SECURE RESOLVE] Finding Stripe account for contractor ${contractorUserId}`);

    // Step 1: Search ALL Connect accounts using auto-pagination
    console.log(`[SECURE RESOLVE] Searching through all Connect accounts...`);
    let checkedCount = 0;
    let foundAccount: { accountId: string; isValid: boolean; error?: string } | null = null;

    // Step 2: Find account with our contractor's user ID in metadata (backward compatible)
    await stripe.accounts.list({ limit: 100 }).autoPagingEach(async (account) => {
      if (foundAccount) return false; // Stop iteration if we found the account

      checkedCount++;
      const metadata = account.metadata || {};
      // Support both new userId format and legacy platform_user_id format
      const platformUserId = metadata.userId || metadata.platform_user_id;

      console.log(`[SECURE RESOLVE] Checking account ${account.id}, metadata:`, {
        userId: metadata.userId,
        platform_user_id: metadata.platform_user_id,
        resolved_id: platformUserId,
        platform_env: metadata.platform_env,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted
      });

      // Verify this account belongs to our contractor
      if (platformUserId === contractorUserId.toString()) {
        console.log(`[SECURE RESOLVE] ✅ FOUND MATCH! Account ${account.id} belongs to contractor ${contractorUserId}`);

        // Step 3: Verify account is ready for payments
        const isValid = account.charges_enabled &&
                       account.details_submitted &&
                       account.payouts_enabled &&
                       (!account.requirements?.disabled_reason);

        if (!isValid) {
          console.log(`[SECURE RESOLVE] ❌ Account ${account.id} not ready for payments:`, {
            charges_enabled: account.charges_enabled,
            details_submitted: account.details_submitted,
            payouts_enabled: account.payouts_enabled,
            disabled_reason: account.requirements?.disabled_reason
          });

          foundAccount = {
            accountId: account.id,
            isValid: false,
            error: 'Contractor account not ready for payments - onboarding incomplete'
          };
        } else {
          console.log(`[SECURE RESOLVE] ✅ Account ${account.id} is VALID and ready for payments`);
          foundAccount = {
            accountId: account.id,
            isValid: true
          };
        }

        return false; // Stop iteration after finding match
      }
    });

    if (foundAccount) {
      return foundAccount;
    }

    console.log(`[SECURE RESOLVE] ❌ No Stripe account found for contractor ${contractorUserId} after checking ${checkedCount} accounts`);
    return {
      accountId: '',
      isValid: false,
      error: 'Contractor has not completed Stripe Connect setup'
    };

  } catch (error: any) {
    console.error(`[SECURE RESOLVE] Error resolving account for contractor ${contractorUserId}:`, error);
    return {
      accountId: '',
      isValid: false,
      error: 'Failed to verify contractor account - please try again'
    };
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
  // V2 Enhanced Methods - DESTINATION CHARGES ONLY
  createPaymentIntent,
  createConnectAccountV2,
  getConnectAccountStatusV2,
  createDirectPaymentV2,
  updateAccountCapabilities,
  addBankAccountV2,
  uploadVerificationDocument,
  createSecurePaymentV2,

  // Legacy Methods
  retrievePaymentIntent,
  processMilestonePayment,
  updatePaymentStatus,
  createConnectAccount,
  checkConnectAccountStatus,
  getConnectAccount
};