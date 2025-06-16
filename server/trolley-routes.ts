import type { Express } from "express";
import { Request, Response } from "express";
import { db } from "./db";
import { users, milestones, payments, contracts } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { trolleyService, type TrolleyRecipient, type CreateRecipientRequest } from "./trolley-service";

/**
 * Trolley Payment Routes
 * Handles contractor payment processing through Trolley batch API
 */

interface AuthenticatedRequest extends Request {
  user?: { id: number; role: string; };
}

export default function trolleyRoutes(app: Express, apiPath: string, authMiddleware: any) {
  const trolleyBasePath = `${apiPath}/trolley`;

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
}