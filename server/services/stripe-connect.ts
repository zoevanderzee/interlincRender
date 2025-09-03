
import Stripe from 'stripe';
import { db } from '../db';
import { users, milestones, payments, contracts } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Stripe Connect Payment Service
 * Replaces Trolley - handles direct contractor payments via destination charges
 * No platform fees - businesses pay contractors directly
 */

interface StripeConnectAccount {
  id: string;
  type: 'express' | 'standard';
  email: string;
  details_submitted: boolean;
  payouts_enabled: boolean;
  charges_enabled: boolean;
}

interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  transferId?: string;
  error?: string;
  amount?: number;
  contractorAccountId?: string;
}

class StripeConnectService {
  private stripe: Stripe;

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia'
    });

    console.log('Stripe Connect service initialized');
  }

  /**
   * Create Stripe Connect Express account for contractor
   * This replaces Trolley recipient creation
   */
  async createContractorAccount(contractorData: {
    email: string;
    firstName?: string;
    lastName?: string;
    businessType?: 'individual' | 'company';
  }): Promise<StripeConnectAccount> {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email: contractorData.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_type: contractorData.businessType || 'individual',
        individual: contractorData.businessType === 'individual' ? {
          email: contractorData.email,
          first_name: contractorData.firstName,
          last_name: contractorData.lastName
        } : undefined,
        business_profile: {
          url: 'https://interlinc.com'
        }
      });

      console.log(`Created Stripe Connect account: ${account.id} for ${contractorData.email}`);
      
      return {
        id: account.id,
        type: account.type as 'express',
        email: contractorData.email,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
        charges_enabled: account.charges_enabled
      };
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      throw error;
    }
  }

  /**
   * Create onboarding link for contractor to complete setup
   * This replaces Trolley widget URL generation
   */
  async createOnboardingLink(accountId: string, refreshUrl?: string, returnUrl?: string): Promise<string> {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl || `${process.env.FRONTEND_URL}/contractor-onboarding?refresh=true`,
        return_url: returnUrl || `${process.env.FRONTEND_URL}/contractor-onboarding?success=true`,
        type: 'account_onboarding'
      });

      console.log(`Generated onboarding link for account: ${accountId}`);
      return accountLink.url;
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      throw error;
    }
  }

  /**
   * Get Stripe Connect account status
   * Checks if contractor can receive payments
   */
  async getAccountStatus(accountId: string): Promise<{
    isReady: boolean;
    detailsSubmitted: boolean;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    requirements: string[];
  }> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      
      return {
        isReady: account.details_submitted && account.payouts_enabled && account.charges_enabled,
        detailsSubmitted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        requirements: account.requirements?.currently_due || []
      };
    } catch (error) {
      console.error('Error getting account status:', error);
      throw error;
    }
  }

  /**
   * Create customer for business user
   * Stores payment methods for charging businesses
   */
  async createBusinessCustomer(businessData: {
    email: string;
    name: string;
    companyName?: string;
  }): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email: businessData.email,
        name: businessData.companyName || businessData.name,
        metadata: {
          user_type: 'business',
          platform: 'interlinc'
        }
      });

      console.log(`Created Stripe customer: ${customer.id} for business ${businessData.email}`);
      return customer.id;
    } catch (error) {
      console.error('Error creating business customer:', error);
      throw error;
    }
  }

  /**
   * Create setup intent for business to add payment method
   */
  async createBusinessSetupIntent(customerId: string): Promise<{
    clientSecret: string;
    setupIntentId: string;
  }> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card', 'sepa_debit', 'bacs_debit', 'us_bank_account'],
        usage: 'off_session'
      });

      return {
        clientSecret: setupIntent.client_secret!,
        setupIntentId: setupIntent.id
      };
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }

  /**
   * Process milestone payment via destination charge
   * This replaces Trolley batch payment processing
   * 
   * Flow: Business approves deliverable → Charge business → Transfer to contractor
   */
  async processDeliverablePayment(paymentData: {
    milestoneId: number;
    contractorAccountId: string;
    businessCustomerId: string;
    amount: number; // in cents
    currency?: string;
    description: string;
    businessPaymentMethodId: string;
  }): Promise<PaymentResult> {
    try {
      const { 
        milestoneId, 
        contractorAccountId, 
        businessCustomerId, 
        amount, 
        currency = 'usd',
        description,
        businessPaymentMethodId 
      } = paymentData;

      // Verify contractor account can receive payments
      const accountStatus = await this.getAccountStatus(contractorAccountId);
      if (!accountStatus.isReady) {
        return {
          success: false,
          error: 'Contractor account not ready to receive payments'
        };
      }

      // Create destination charge - charges business and transfers to contractor
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        customer: businessCustomerId,
        payment_method: businessPaymentMethodId,
        confirm: true,
        return_url: `${process.env.FRONTEND_URL}/payments/success`,
        
        // Destination charge configuration - funds go directly to contractor
        transfer_data: {
          destination: contractorAccountId
        },
        
        // No application fee - businesses pay contractors directly
        // application_fee_amount: 0,
        
        description,
        metadata: {
          milestone_id: milestoneId.toString(),
          payment_type: 'deliverable_payment',
          platform: 'interlinc'
        }
      });

      console.log(`Destination charge created: ${paymentIntent.id} - $${amount/100} from business to ${contractorAccountId}`);

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        amount,
        contractorAccountId
      };
    } catch (error: any) {
      console.error('Error processing deliverable payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment methods for business customer
   */
  async getBusinessPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return paymentMethods.data;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(payload: Buffer, signature: string): boolean {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return false;
      }

      this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return true;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(paymentIntentId: string): Promise<void> {
    try {
      // Get payment intent details
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      const milestoneId = parseInt(paymentIntent.metadata.milestone_id);

      // Update milestone to paid status
      await db.update(milestones).set({
        status: 'paid',
        paidAt: new Date()
      }).where(eq(milestones.id, milestoneId));

      // Update payment record
      await db.update(payments).set({
        status: 'completed',
        completedDate: new Date(),
        stripePaymentIntentId: paymentIntentId
      }).where(eq(payments.milestoneId, milestoneId));

      console.log(`✅ Deliverable payment completed: Milestone ${milestoneId}, PaymentIntent ${paymentIntentId}`);
    } catch (error) {
      console.error('Error handling payment success:', error);
    }
  }
}

export const stripeConnectService = new StripeConnectService();
export type { StripeConnectAccount, PaymentResult };
