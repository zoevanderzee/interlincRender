
import type { Express } from "express";
import { Request, Response } from "express";
import { db } from "./db";
import { users, milestones, payments, contracts } from "../shared/schema";
import { eq } from "drizzle-orm";
import { stripeConnectService } from "./services/stripe-connect";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export default function stripeConnectRoutes(app: Express, apiPath: string, authMiddleware: any) {
  const stripePath = `${apiPath}/stripe-connect`;

  /**
   * Create Stripe Connect account for contractor
   * Replaces Trolley recipient creation
   */
  app.post(`${stripePath}/contractor/create-account`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userData = user[0];
      if (userData.role !== 'contractor') {
        return res.status(403).json({ message: 'Only contractors can create Connect accounts' });
      }

      // Check if contractor already has Stripe Connect account
      if (userData.stripeConnectAccountId) {
        const accountStatus = await stripeConnectService.getAccountStatus(userData.stripeConnectAccountId);
        return res.json({
          accountId: userData.stripeConnectAccountId,
          status: accountStatus,
          message: 'Connect account already exists'
        });
      }

      // Create new Stripe Connect account
      const connectAccount = await stripeConnectService.createContractorAccount({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        businessType: 'individual'
      });

      // Save Connect account ID to user
      await db.update(users).set({
        stripeConnectAccountId: connectAccount.id,
        stripeConnectStatus: 'pending'
      }).where(eq(users.id, userId));

      res.json({
        accountId: connectAccount.id,
        status: connectAccount,
        message: 'Stripe Connect account created successfully'
      });

    } catch (error: any) {
      console.error('Error creating Stripe Connect account:', error);
      res.status(500).json({ message: 'Failed to create Connect account', error: error.message });
    }
  });

  /**
   * Generate onboarding link for contractor
   * Replaces Trolley widget URL
   */
  app.post(`${stripePath}/contractor/onboarding-link`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userData = user[0];
      if (!userData.stripeConnectAccountId) {
        return res.status(400).json({ message: 'No Connect account found. Create account first.' });
      }

      const onboardingLink = await stripeConnectService.createOnboardingLink(
        userData.stripeConnectAccountId,
        `${process.env.FRONTEND_URL}/contractor-onboarding?refresh=true`,
        `${process.env.FRONTEND_URL}/contractor-onboarding?success=true`
      );

      res.json({
        onboardingUrl: onboardingLink,
        accountId: userData.stripeConnectAccountId
      });

    } catch (error: any) {
      console.error('Error creating onboarding link:', error);
      res.status(500).json({ message: 'Failed to create onboarding link', error: error.message });
    }
  });

  /**
   * Create Stripe customer for business user
   * Replaces Trolley submerchant creation
   */
  app.post(`${stripePath}/business/create-customer`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userData = user[0];
      if (userData.role !== 'business') {
        return res.status(403).json({ message: 'Only business users can create customer accounts' });
      }

      // Check if business already has Stripe customer
      if (userData.stripeCustomerId) {
        return res.json({
          customerId: userData.stripeCustomerId,
          message: 'Stripe customer already exists'
        });
      }

      // Create Stripe customer
      const customerId = await stripeConnectService.createBusinessCustomer({
        email: userData.email,
        name: userData.username,
        companyName: userData.companyName
      });

      // Save customer ID to user
      await db.update(users).set({
        stripeCustomerId: customerId
      }).where(eq(users.id, userId));

      res.json({
        customerId,
        message: 'Stripe customer created successfully'
      });

    } catch (error: any) {
      console.error('Error creating Stripe customer:', error);
      res.status(500).json({ message: 'Failed to create customer', error: error.message });
    }
  });

  /**
   * Create setup intent for business to add payment method
   * Replaces Trolley bank account setup
   */
  app.post(`${stripePath}/business/setup-payment`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userData = user[0];
      if (!userData.stripeCustomerId) {
        return res.status(400).json({ message: 'No Stripe customer found. Create customer first.' });
      }

      const setupIntent = await stripeConnectService.createBusinessSetupIntent(userData.stripeCustomerId);

      res.json({
        clientSecret: setupIntent.clientSecret,
        setupIntentId: setupIntent.setupIntentId,
        customerId: userData.stripeCustomerId
      });

    } catch (error: any) {
      console.error('Error creating setup intent:', error);
      res.status(500).json({ message: 'Failed to create setup intent', error: error.message });
    }
  });

  /**
   * Process deliverable payment via destination charge
   * This is the core payment function that replaces Trolley batch processing
   * 
   * Triggered when business approves a deliverable
   */
  app.post(`${stripePath}/pay-deliverable`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { milestoneId, contractId } = req.body;
      if (!milestoneId || !contractId) {
        return res.status(400).json({ message: 'Milestone ID and Contract ID required' });
      }

      // Get milestone details
      const milestone = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
      if (!milestone.length) {
        return res.status(404).json({ message: 'Milestone not found' });
      }

      const milestoneData = milestone[0];
      if (milestoneData.status !== 'approved') {
        return res.status(400).json({ message: 'Milestone must be approved before payment' });
      }

      // Get contract and contractor details
      const contract = await db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
      if (!contract.length) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      const contractData = contract[0];
      const contractor = await db.select().from(users).where(eq(users.id, contractData.contractorId!)).limit(1);
      const business = await db.select().from(users).where(eq(users.id, contractData.businessId)).limit(1);

      if (!contractor.length || !business.length) {
        return res.status(404).json({ message: 'Contractor or business not found' });
      }

      const contractorData = contractor[0];
      const businessData = business[0];

      // Verify contractor has Stripe Connect account
      if (!contractorData.stripeConnectAccountId) {
        return res.status(400).json({ message: 'Contractor must complete Stripe Connect onboarding first' });
      }

      // Verify business has Stripe customer and payment method
      if (!businessData.stripeCustomerId) {
        return res.status(400).json({ message: 'Business must set up payment methods first' });
      }

      // Get business payment methods
      const paymentMethods = await stripeConnectService.getBusinessPaymentMethods(businessData.stripeCustomerId);
      if (!paymentMethods.length) {
        return res.status(400).json({ message: 'Business must add a payment method first' });
      }

      // Process payment via destination charge
      const paymentResult = await stripeConnectService.processDeliverablePayment({
        milestoneId,
        contractorAccountId: contractorData.stripeConnectAccountId,
        businessCustomerId: businessData.stripeCustomerId,
        amount: Math.round(milestoneData.paymentAmount * 100), // Convert to cents
        description: `Payment for deliverable: ${milestoneData.name}`,
        businessPaymentMethodId: paymentMethods[0].id // Use default payment method
      });

      if (!paymentResult.success) {
        return res.status(400).json({ message: paymentResult.error });
      }

      // Create payment record
      const paymentRecord = await db.insert(payments).values({
        contractId,
        milestoneId,
        amount: milestoneData.paymentAmount,
        status: 'processing',
        scheduledDate: new Date(),
        notes: `Stripe destination charge: ${paymentResult.paymentIntentId}`,
        stripePaymentIntentId: paymentResult.paymentIntentId,
        paymentProcessor: 'stripe_connect'
      }).returning();

      console.log(`💳 Deliverable payment initiated: $${milestoneData.paymentAmount} from ${businessData.email} to ${contractorData.email}`);

      res.json({
        success: true,
        payment: paymentRecord[0],
        stripePaymentIntentId: paymentResult.paymentIntentId,
        message: 'Payment processed successfully - funds will arrive in contractor account automatically'
      });

    } catch (error: any) {
      console.error('Error processing deliverable payment:', error);
      res.status(500).json({ message: 'Payment processing failed', error: error.message });
    }
  });

  /**
   * Webhook endpoint for Stripe Connect events
   * Handles payment confirmations and account updates
   */
  app.post(`${stripePath}/webhook`, async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      // Verify webhook signature
      if (!stripeConnectService.verifyWebhookSignature(req.body, signature)) {
        return res.status(401).json({ message: 'Invalid signature' });
      }

      const event = req.body;
      console.log('Received Stripe Connect webhook:', event.type);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await stripeConnectService.handlePaymentSuccess(event.data.object.id);
          break;

        case 'account.updated':
          await handleAccountUpdate(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;

        default:
          console.log('Unhandled webhook event type:', event.type);
      }

      res.json({ received: true });

    } catch (error: any) {
      console.error('Error processing Stripe webhook:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper function to handle account updates
  async function handleAccountUpdate(account: any) {
    try {
      // Update contractor's Connect account status
      await db.update(users).set({
        stripeConnectStatus: account.details_submitted && account.payouts_enabled ? 'active' : 'pending'
      }).where(eq(users.stripeConnectAccountId, account.id));

      console.log(`Updated Connect account status: ${account.id} -> ${account.details_submitted ? 'active' : 'pending'}`);
    } catch (error) {
      console.error('Error updating account status:', error);
    }
  }

  // Helper function to handle payment failures
  async function handlePaymentFailed(paymentIntent: any) {
    try {
      const milestoneId = parseInt(paymentIntent.metadata.milestone_id);
      
      // Update payment record to failed
      await db.update(payments).set({
        status: 'failed'
      }).where(eq(payments.milestoneId, milestoneId));

      console.log(`Payment failed for milestone ${milestoneId}: ${paymentIntent.id}`);
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }
}
