import type { Express } from "express";
import { Request, Response } from "express";
import { db } from "./db";
import { users, milestones, payments, contracts } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { trolleyService, type TrolleyRecipient, type CreateRecipientRequest } from "./trolley-service";
import { trolleySdk } from "./trolley-sdk-service";

/**
 * Trolley Payment Routes
 * Handles contractor payment processing through Trolley batch API
 */

interface AuthenticatedRequest extends Request {
  user?: any;
}

export default function trolleyRoutes(app: Express, apiPath: string, authMiddleware: any) {
  const trolleyBasePath = `${apiPath}/trolley`;

  // Create submerchant account and generate business onboarding widget
  app.post(`${trolleyBasePath}/business-onboarding-link`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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
        return res.status(403).json({ message: 'Only business users can access onboarding' });
      }

      // CRITICAL FIX: Create SUBMERCHANT account, not recipient account
      // Businesses need submerchant profiles to make payments to contractors
      console.log(`🔴 CREATING SUBMERCHANT ACCOUNT for business: ${userData.email}`);
      
      try {
        // Create submerchant account with business information
        const submerchantData = {
          merchant: {
            name: userData.companyName || userData.username,
            currency: 'USD'
          },
          onboarding: {
            businessWebsite: userData.website || 'https://example.com',
            businessLegalName: userData.companyName || userData.username,
            businessAsName: userData.companyName || userData.username,
            businessTaxId: 'PENDING', // Will be collected in widget
            businessCategory: 'business_service',
            businessCountry: 'US',
            businessCity: 'PENDING',
            businessAddress: 'PENDING',
            businessZip: 'PENDING',
            businessRegion: 'PENDING',
            businessTotalMonthly: '10000',
            businessPpm: '100',
            businessIntlPercentage: '15',
            expectedPayoutCountries: 'US'
          }
        };

        const submerchant = await trolleySdk.createSubmerchant(submerchantData);
        
        // Save submerchant details to user account
        await db.update(users).set({
          trolleyCompanyProfileId: submerchant.merchant.id,
          trolleySubmerchantId: submerchant.merchant.id,
          trolleySubmerchantAccessKey: submerchant.merchant.accessKey,
          trolleySubmerchantSecretKey: submerchant.merchant.secretKey,
          trolleySubmerchantStatus: 'pending'
        }).where(eq(users.id, userData.id));

        console.log(`✅ SUBMERCHANT CREATED: ${submerchant.merchant.id} for ${userData.email}`);

        // Generate SUBMERCHANT widget URL (not recipient widget)
        const onboardingUrl = trolleySdk.generateSubmerchantWidgetUrl({
          submerchantId: submerchant.merchant.id,
          accessKey: submerchant.merchant.accessKey,
          secretKey: submerchant.merchant.secretKey,
          businessEmail: userData.email
        });

        res.json({
          onboardingUrl,
          submerchantId: submerchant.merchant.id,
          message: 'Complete your business profile setup. This will collect all required business information and banking details.'
        });

      } catch (trolleyError: any) {
        console.error('❌ SUBMERCHANT CREATION FAILED:', trolleyError);
        
        // If submerchant already exists, try to get existing widget
        if (trolleyError.message?.includes('already exists')) {
          const onboardingUrl = trolleySdk.generateWidgetUrlForExisting(userData.email);
          return res.json({
            onboardingUrl,
            message: 'Continue your existing business setup process.'
          });
        }
        
        throw trolleyError;
      }

    } catch (error) {
      console.error('Error creating submerchant onboarding:', error);
      res.status(500).json({ message: 'Failed to generate business onboarding link' });
    }
  });

  // Handle verification callback from Trolley
  app.get(`${trolleyBasePath}/business-verification-callback`, async (req: Request, res: Response) => {
    try {
      const { token, company_id, status } = req.query;

      if (!token) {
        return res.redirect('/business-setup?error=missing_token');
      }

      // Find user by verification token
      const user = await db.select().from(users).where(eq(users.trolleyVerificationToken, token as string)).limit(1);
      if (!user.length) {
        return res.redirect('/business-setup?error=invalid_token');
      }

      const userData = user[0];

      if (status === 'approved' && company_id) {
        // Update user with approved Trolley company profile
        await db.update(users).set({
          trolleyCompanyProfileId: company_id as string,
          trolleyVerificationStatus: 'approved',
          trolleyVerificationCompletedAt: new Date(),
          trolleyVerificationToken: null, // Clear token after use
          // Automatically set bank account as verified since it's included in business verification
          trolleyBankAccountStatus: 'verified',
          trolleyBankAccountId: 'verified',
          trolleyBankAccountLast4: '****'
        }).where(eq(users.id, userData.id));

        // Redirect to success page
        res.redirect('/business-setup?status=approved');
      } else if (status === 'pending') {
        // Update status to pending
        await db.update(users).set({
          trolleyVerificationStatus: 'pending',
          trolleyVerificationToken: null
        }).where(eq(users.id, userData.id));

        res.redirect('/business-setup?status=pending');
      } else {
        // Verification failed or cancelled
        await db.update(users).set({
          trolleyVerificationStatus: 'failed',
          trolleyVerificationToken: null
        }).where(eq(users.id, userData.id));

        res.redirect('/business-setup?status=failed');
      }

    } catch (error) {
      console.error('Error handling verification callback:', error);
      res.redirect('/business-setup?error=callback_error');
    }
  });

  // Webhook endpoint for Trolley verification updates
  app.post(`${trolleyBasePath}/webhook`, async (req: Request, res: Response) => {
    try {
      const { event, data } = req.body;

      // Verify webhook signature (implement based on Trolley's docs)
      // const signature = req.headers['x-trolley-signature'];
      // if (!verifyWebhookSignature(req.body, signature)) {
      //   return res.status(401).json({ message: 'Invalid signature' });
      // }

      switch (event) {
        case 'company.verification.approved':
          const { company_id, reference_id } = data;
          
          // Find user by reference ID (verification token)
          const approvedUser = await db.select().from(users).where(eq(users.trolleyVerificationToken, reference_id)).limit(1);
          if (approvedUser.length) {
            await db.update(users).set({
              trolleyCompanyProfileId: company_id,
              trolleyVerificationStatus: 'approved',
              trolleyVerificationCompletedAt: new Date(),
              trolleyVerificationToken: null,
              // Automatically set bank account as verified since it's included in business verification
              trolleyBankAccountStatus: 'verified',
              trolleyBankAccountId: data.bank_account_id || 'verified',
              trolleyBankAccountLast4: data.bank_account_last4 || '****'
            }).where(eq(users.id, approvedUser[0].id));
          }
          break;

        case 'company.verification.rejected':
          const rejectedUser = await db.select().from(users).where(eq(users.trolleyVerificationToken, data.reference_id)).limit(1);
          if (rejectedUser.length) {
            await db.update(users).set({
              trolleyVerificationStatus: 'rejected',
              trolleyVerificationToken: null
            }).where(eq(users.id, rejectedUser[0].id));
          }
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  // Create or get recipient for contractor
  app.post(`${trolleyBasePath}/recipients`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { contractorId } = req.body;
      if (!contractorId) {
        return res.status(400).json({ message: 'Contractor ID is required' });
      }

      // Get contractor details
      const contractor = await db.select().from(users).where(eq(users.id, contractorId)).limit(1);
      if (!contractor.length) {
        return res.status(404).json({ message: 'Contractor not found' });
      }

      const contractorData = contractor[0];

      // Check if contractor already has a Trolley recipient ID
      if (contractorData.trolleyRecipientId) {
        try {
          const existingRecipient = await trolleyService.getRecipient(contractorData.trolleyRecipientId);
          return res.json(existingRecipient);
        } catch (error) {
          console.log('Existing recipient not found, creating new one');
        }
      }

      // Create new recipient
      const recipientRequest: CreateRecipientRequest = {
        type: 'individual',
        firstName: contractorData.firstName || '',
        lastName: contractorData.lastName || '',
        email: contractorData.email
      };

      const recipient = await trolleyService.createRecipient(recipientRequest);

      // Update contractor with Trolley recipient ID
      await db.update(users)
        .set({ trolleyRecipientId: recipient.id })
        .where(eq(users.id, contractorId));

      res.json(recipient);

    } catch (error: any) {
      console.error('Error creating Trolley recipient:', error);
      res.status(500).json({ 
        message: 'Failed to create recipient',
        error: error.message 
      });
    }
  });

  // Get recipient details
  app.get(`${trolleyBasePath}/recipients/:contractorId`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contractorId } = req.params;
      
      const contractor = await db.select().from(users).where(eq(users.id, parseInt(contractorId))).limit(1);
      if (!contractor.length || !contractor[0].trolleyRecipientId) {
        return res.status(404).json({ message: 'Trolley recipient not found for contractor' });
      }

      const recipient = await trolleyService.getRecipient(contractor[0].trolleyRecipientId);
      res.json(recipient);

    } catch (error: any) {
      console.error('Error fetching Trolley recipient:', error);
      res.status(500).json({ 
        message: 'Failed to fetch recipient',
        error: error.message 
      });
    }
  });

  // Process milestone payment automatically
  app.post(`${trolleyBasePath}/payments`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { milestoneId, contractId } = req.body;
      if (!milestoneId || !contractId) {
        return res.status(400).json({ message: 'Milestone ID and Contract ID are required' });
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
      if (!contractData.contractorId) {
        return res.status(400).json({ message: 'No contractor assigned to this contract' });
      }

      // Get contractor details
      const contractor = await db.select().from(users).where(eq(users.id, contractData.contractorId)).limit(1);
      if (!contractor.length) {
        return res.status(404).json({ message: 'Contractor not found' });
      }

      const contractorData = contractor[0];
      if (!contractorData.trolleyRecipientId) {
        return res.status(400).json({ message: 'Contractor not set up for payments. Please onboard them first.' });
      }

      // Create and process payment
      const paymentResult = await trolleyService.createAndProcessPayment({
        recipientId: contractorData.trolleyRecipientId,
        amount: milestoneData.paymentAmount,
        currency: 'USD',
        memo: `Payment for milestone: ${milestoneData.name}`,
        externalId: `milestone_${milestoneId}`,
        description: `Milestone payment for contract ${contractData.contractName}`
      });

      // Create payment record in database
      const paymentRecord = await db.insert(payments).values({
        contractId: contractId,
        milestoneId: milestoneId,
        amount: milestoneData.paymentAmount,
        status: 'processing',
        scheduledDate: new Date(),
        notes: `Trolley batch: ${paymentResult.batch.id}`,
        trolleyBatchId: paymentResult.batch.id,
        trolleyPaymentId: paymentResult.payment.id,
        paymentProcessor: 'trolley'
      }).returning();

      res.json({
        success: true,
        payment: paymentRecord[0],
        trolleyBatch: paymentResult.batch,
        trolleyPayment: paymentResult.payment
      });

    } catch (error: any) {
      console.error('Error processing payment:', error);
      res.status(500).json({ 
        message: 'Failed to process payment',
        error: error.message 
      });
    }
  });

  // Get payment status
  app.get(`${trolleyBasePath}/payments/:paymentId`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { paymentId } = req.params;
      
      const payment = await db.select().from(payments).where(eq(payments.id, parseInt(paymentId))).limit(1);
      if (!payment.length) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      const paymentData = payment[0];
      
      // Get Trolley payment status if available
      let trolleyPayment = null;
      let trolleyBatch = null;
      
      if (paymentData.trolleyPaymentId) {
        try {
          trolleyPayment = await trolleyService.getPayment(paymentData.trolleyPaymentId);
        } catch (error) {
          console.log('Could not fetch Trolley payment details');
        }
      }
      
      if (paymentData.trolleyBatchId) {
        try {
          trolleyBatch = await trolleyService.getBatch(paymentData.trolleyBatchId);
        } catch (error) {
          console.log('Could not fetch Trolley batch details');
        }
      }

      res.json({
        payment: paymentData,
        trolleyPayment,
        trolleyBatch
      });

    } catch (error: any) {
      console.error('Error fetching payment status:', error);
      res.status(500).json({ 
        message: 'Failed to fetch payment status',
        error: error.message 
      });
    }
  });

  // Get payments for a contractor
  app.get(`${trolleyBasePath}/payments/contractor/:contractorId`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contractorId } = req.params;
      
      const contractor = await db.select().from(users).where(eq(users.id, parseInt(contractorId))).limit(1);
      if (!contractor.length) {
        return res.status(404).json({ message: 'Contractor not found' });
      }

      const contractorData = contractor[0];
      
      // Get database payments
      const contractorContracts = await db.select().from(contracts).where(eq(contracts.contractorId, parseInt(contractorId)));
      const contractIds = contractorContracts.map(c => c.id);
      
      let dbPayments = [];
      if (contractIds.length > 0) {
        dbPayments = await db.select().from(payments).where(
          eq(payments.contractId, contractIds[0]) // This would need to be an OR for multiple contracts
        );
      }

      // Get Trolley payments if recipient exists
      let trolleyPayments = [];
      if (contractorData.trolleyRecipientId) {
        try {
          trolleyPayments = await trolleyService.getPaymentsByRecipient(contractorData.trolleyRecipientId);
        } catch (error) {
          console.log('Could not fetch Trolley payments for contractor');
        }
      }

      res.json({
        dbPayments,
        trolleyPayments
      });

    } catch (error: any) {
      console.error('Error fetching contractor payments:', error);
      res.status(500).json({ 
        message: 'Failed to fetch contractor payments',
        error: error.message 
      });
    }
  });

  // Generate Widget URL for contractor onboarding
  app.post(`${trolleyBasePath}/widget-url`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contractorEmail, theme = 'light', collectTaxInfo = true } = req.body;
      
      if (!contractorEmail) {
        return res.status(400).json({ message: 'Contractor email is required' });
      }

      const widgetUrl = trolleyService.generateWidgetUrl(contractorEmail, {
        theme,
        collectTaxInfo,
        successUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/onboarding/success`,
        cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/onboarding/cancel`
      });

      res.json({ widgetUrl });

    } catch (error: any) {
      console.error('Error generating widget URL:', error);
      res.status(500).json({ 
        message: 'Failed to generate widget URL',
        error: error.message 
      });
    }
  });

  // Webhook handler for Trolley events
  app.post(`${trolleyBasePath}/webhook`, async (req: Request, res: Response) => {
    try {
      const event = req.body;
      console.log('Received Trolley webhook:', event);

      // Handle different webhook events
      switch (event.type) {
        case 'batch.completed':
          await handleBatchCompleted(event.data);
          break;
        case 'batch.failed':
          await handleBatchFailed(event.data);
          break;
        case 'payment.completed':
          await handlePaymentCompleted(event.data);
          break;
        case 'payment.failed':
          await handlePaymentFailed(event.data);
          break;
        case 'recipient.created':
          await handleRecipientCreated(event.data);
          break;
        case 'business.verified':
        case 'submerchant.approved':
        case 'verification.completed':
          await handleBusinessVerified(event.data);
          break;
        default:
          console.log('Unhandled webhook event type:', event.type);
      }

      res.status(200).json({ received: true });

    } catch (error: any) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper functions for webhook processing
  async function handleBatchCompleted(batchData: any) {
    try {
      // Update all payments in this batch to completed
      await db.update(payments)
        .set({ 
          status: 'completed',
          completedDate: new Date()
        })
        .where(eq(payments.trolleyBatchId, batchData.id));
      
      console.log(`Batch ${batchData.id} completed`);
    } catch (error) {
      console.error('Error handling batch completion:', error);
    }
  }

  async function handleBatchFailed(batchData: any) {
    try {
      // Update all payments in this batch to failed
      await db.update(payments)
        .set({ status: 'failed' })
        .where(eq(payments.trolleyBatchId, batchData.id));
      
      console.log(`Batch ${batchData.id} failed`);
    } catch (error) {
      console.error('Error handling batch failure:', error);
    }
  }

  async function handlePaymentCompleted(paymentData: any) {
    try {
      // Update specific payment to completed
      await db.update(payments)
        .set({ 
          status: 'completed',
          completedDate: new Date()
        })
        .where(eq(payments.trolleyPaymentId, paymentData.id));
      
      console.log(`Payment ${paymentData.id} completed`);
    } catch (error) {
      console.error('Error handling payment completion:', error);
    }
  }

  async function handlePaymentFailed(paymentData: any) {
    try {
      // Update specific payment to failed
      await db.update(payments)
        .set({ status: 'failed' })
        .where(eq(payments.trolleyPaymentId, paymentData.id));
      
      console.log(`Payment ${paymentData.id} failed`);
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }

  async function handleRecipientCreated(recipientData: any) {
    try {
      // Update user with recipient ID if not already set
      await db.update(users)
        .set({ trolleyRecipientId: recipientData.id })
        .where(eq(users.email, recipientData.email));
      
      console.log(`Recipient created: ${recipientData.id} for ${recipientData.email}`);
    } catch (error) {
      console.error('Error handling recipient creation:', error);
    }
  }

  async function handleBusinessVerified(data: any) {
    try {
      console.log('Processing business verification webhook:', data);
      
      // Extract business/submerchant ID and email from webhook data
      const { submerchant_id, email, status } = data;
      
      if (!submerchant_id && !email) {
        console.error('No submerchant ID or email in verification webhook');
        return;
      }

      // Find user by submerchant ID or email
      let user;
      if (submerchant_id) {
        const userResult = await db.select().from(users)
          .where(eq(users.trolleySubmerchantId, submerchant_id))
          .limit(1);
        user = userResult[0];
      } else if (email) {
        const userResult = await db.select().from(users)
          .where(eq(users.email, email))
          .limit(1);
        user = userResult[0];
      }

      if (!user) {
        console.error('No user found for business verification webhook');
        return;
      }

      // Update user's Trolley status to approved
      await db.update(users)
        .set({ trolleySubmerchantStatus: status || 'approved' })
        .where(eq(users.id, user.id));
      
      console.log(`Updated user ${user.id} Trolley status to: ${status || 'approved'}`);

    } catch (error) {
      console.error('Error handling business verification webhook:', error);
    }
  }

  // Manual sync endpoint to check Trolley status and update database
  app.post(`${trolleyBasePath}/sync-status`, async (req: Request, res: Response) => {
    try {
      // Get user ID from session or headers
      const userId = req.user?.id || (req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : null);
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const user = userResult[0];
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.role !== 'business') {
        return res.status(403).json({ message: 'Only business accounts can sync Trolley status' });
      }

      // ACTUALLY check with Trolley API to verify account status
      console.log(`Checking real Trolley account status for: ${user.email}`);
      
      try {
        // Use Trolley API to find the business account by email
        const recipients = await trolleySdk.client.recipient.search({
          term: user.email,
          type: 'business'
        });
        
        if (recipients && recipients.length > 0) {
          const business = recipients[0];
          const businessId = business.id;
          const status = business.status;
          
          console.log(`Found Trolley business:`, { id: businessId, status, email: user.email });
          
          // Update with REAL Trolley business ID and status
          await db.update(users)
            .set({ 
              trolleySubmerchantStatus: status,
              trolleyCompanyProfileId: businessId.toString(),
              trolleyVerificationStatus: status === 'active' ? 'approved' : 'pending'
            })
            .where(eq(users.id, userId));
          
          console.log(`Updated user ${userId} with REAL Trolley business ID: ${businessId}`);
          
          res.json({
            success: true,
            message: `Account verification synced from Trolley`,
            status: status,
            businessId: businessId,
            isVerified: status === 'active'
          });
        } else {
          // Account not found in Trolley
          console.log(`No Trolley business account found for: ${user.email}`);
          res.json({
            success: false,
            message: 'No Trolley business account found. Please complete verification first.',
            status: 'not_found'
          });
        }
      } catch (trolleyError) {
        console.error('Error checking Trolley business status:', trolleyError);
        res.status(500).json({
          success: false,
          message: 'Failed to verify account with Trolley API',
          error: trolleyError instanceof Error ? trolleyError.message : 'Unknown error'
        });
      }

    } catch (error) {
      console.error('Error syncing Trolley status:', error);
      res.status(500).json({ 
        message: 'Failed to sync status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}