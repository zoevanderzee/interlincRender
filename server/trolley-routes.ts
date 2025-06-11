import { Express, Request, Response } from 'express';
import { trolleyService } from './trolley-service';
import { db } from './db';
import { users, milestones, payments } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Trolley Payment Routes
 * Handles contractor payment processing through Trolley
 */

interface AuthenticatedRequest extends Request {
  user?: { id: number; role: string };
}

export default function trolleyRoutes(app: Express, apiPath: string, authMiddleware: any) {
  const trolleyBasePath = `${apiPath}/trolley`;

  // Setup company profile for business user
  app.post(`${trolleyBasePath}/setup-company-profile`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get user details
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userData = user[0];
      
      // Check if user is a business user
      if (userData.role !== 'business') {
        return res.status(403).json({ message: 'Only business users can setup company profiles' });
      }

      // Check if user already has a company profile
      if (userData.trolleyCompanyProfileId) {
        return res.status(400).json({ 
          message: 'Company profile already exists',
          companyId: userData.trolleyCompanyProfileId 
        });
      }

      // Create company profile with Trolley
      const companyProfile = await trolleyService.createCompanyProfile({
        name: userData.companyName || `${userData.firstName} ${userData.lastName} Company`,
        email: userData.email,
        country: 'US', // Default to US, could be configurable
        currency: 'USD'
      });

      // Update user with Trolley company ID
      await db.update(users)
        .set({ trolleyCompanyProfileId: companyProfile.id })
        .where(eq(users.id, userId));

      res.json({ 
        success: true,
        companyId: companyProfile.id,
        message: 'Company profile created successfully'
      });

    } catch (error: any) {
      console.error('Error setting up company profile:', error);
      res.status(500).json({ 
        message: 'Failed to setup company profile',
        error: error.message 
      });
    }
  });

  // Create Trolley recipient for contractor
  app.post(`${trolleyBasePath}/recipients`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
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
        return res.status(400).json({ 
          message: 'Contractor already has a Trolley recipient profile',
          recipientId: contractorData.trolleyRecipientId 
        });
      }

      // Create Trolley recipient
      const recipient = await trolleyService.createRecipient({
        email: contractorData.email,
        firstName: contractorData.firstName || '',
        lastName: contractorData.lastName || '',
        country: 'GB' // Default to GB, could be configurable
      });

      // Update contractor with Trolley recipient ID
      await db.update(users)
        .set({ trolleyRecipientId: recipient.id })
        .where(eq(users.id, contractorId));

      console.log(`Created Trolley recipient ${recipient.id} for contractor ${contractorId}`);
      
      res.json({ 
        success: true, 
        recipientId: recipient.id,
        message: 'Trolley recipient profile created successfully' 
      });
    } catch (error) {
      console.error('Error creating Trolley recipient:', error);
      res.status(500).json({ message: 'Failed to create Trolley recipient' });
    }
  });

  // Process payment for approved milestone
  app.post(`${trolleyBasePath}/payments`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { milestoneId, amount, currency = 'GBP' } = req.body;
      const userId = req.user?.id;

      if (!milestoneId || !amount) {
        return res.status(400).json({ message: 'Milestone ID and amount are required' });
      }

      // Get milestone details
      const milestone = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
      if (!milestone.length) {
        return res.status(404).json({ message: 'Milestone not found' });
      }

      const milestoneData = milestone[0];

      // Verify milestone belongs to user's contract (security check)
      // This would need contract validation logic based on your schema

      // Get contractor details from milestone/contract relationship
      // This would need to be implemented based on your contract-contractor relationship

      // For now, assuming we have the contractor ID from milestone data
      const contractorId = milestoneData.contractId; // This would need proper relationship lookup
      
      const contractor = await db.select().from(users).where(eq(users.id, contractorId)).limit(1);
      if (!contractor.length) {
        return res.status(404).json({ message: 'Contractor not found' });
      }

      const contractorData = contractor[0];

      if (!contractorData.trolleyRecipientId) {
        return res.status(400).json({ 
          message: 'Contractor does not have a Trolley recipient profile. Please create one first.' 
        });
      }

      // Create Trolley payment
      const payment = await trolleyService.createPayment({
        recipientId: contractorData.trolleyRecipientId,
        amount: amount.toString(),
        currency,
        description: `Payment for milestone: ${milestoneData.name}`,
        externalId: `milestone_${milestoneId}_${Date.now()}`
      });

      // Log payment in database
      await db.insert(payments).values({
        contractId: milestoneData.contractId,
        milestoneId: milestoneId,
        amount: amount.toString(),
        status: 'processing',
        scheduledDate: new Date(),
        completedDate: new Date(),
        notes: `Trolley payment: ${payment.id}`,
        trolleyPaymentId: payment.id,
        paymentProcessor: 'trolley',
        triggeredBy: 'manual',
        triggeredAt: new Date()
      });

      console.log(`Created Trolley payment ${payment.id} for milestone ${milestoneId}`);
      
      res.json({ 
        success: true, 
        paymentId: payment.id,
        status: payment.status,
        message: 'Payment processed successfully' 
      });
    } catch (error) {
      console.error('Error processing Trolley payment:', error);
      res.status(500).json({ message: 'Failed to process payment' });
    }
  });

  // Get payment status
  app.get(`${trolleyBasePath}/payments/:paymentId`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { paymentId } = req.params;
      
      const payment = await trolleyService.getPayment(paymentId);
      
      res.json(payment);
    } catch (error) {
      console.error('Error fetching Trolley payment:', error);
      res.status(500).json({ message: 'Failed to fetch payment details' });
    }
  });

  // Get contractor's Trolley recipient details
  app.get(`${trolleyBasePath}/recipients/:contractorId`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contractorId } = req.params;
      
      const contractor = await db.select().from(users).where(eq(users.id, parseInt(contractorId))).limit(1);
      if (!contractor.length) {
        return res.status(404).json({ message: 'Contractor not found' });
      }

      const contractorData = contractor[0];
      
      if (!contractorData.trolleyRecipientId) {
        return res.status(404).json({ message: 'Contractor does not have a Trolley recipient profile' });
      }

      const recipient = await trolleyService.getRecipient(contractorData.trolleyRecipientId);
      
      res.json(recipient);
    } catch (error) {
      console.error('Error fetching Trolley recipient:', error);
      res.status(500).json({ message: 'Failed to fetch recipient details' });
    }
  });

  // Get payment history for contractor
  app.get(`${trolleyBasePath}/payments/contractor/:contractorId`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contractorId } = req.params;
      
      const contractor = await db.select().from(users).where(eq(users.id, parseInt(contractorId))).limit(1);
      if (!contractor.length) {
        return res.status(404).json({ message: 'Contractor not found' });
      }

      const contractorData = contractor[0];
      
      if (!contractorData.trolleyRecipientId) {
        return res.status(404).json({ message: 'Contractor does not have a Trolley recipient profile' });
      }

      const payments = await trolleyService.getPaymentsByRecipient(contractorData.trolleyRecipientId);
      
      res.json(payments);
    } catch (error) {
      console.error('Error fetching Trolley payment history:', error);
      res.status(500).json({ message: 'Failed to fetch payment history' });
    }
  });

  // Webhook endpoint for Trolley payment status updates
  app.post(`${trolleyBasePath}/webhook`, async (req: Request, res: Response) => {
    try {
      const { event, payment } = req.body;
      
      console.log(`Received Trolley webhook: ${event} for payment ${payment.id}`);
      
      // Update payment status in database based on webhook event
      await db.update(payments)
        .set({ 
          status: payment.status,
          completedDate: payment.status === 'completed' ? new Date() : undefined
        })
        .where(eq(payments.trolleyPaymentId, payment.id));

      res.json({ success: true });
    } catch (error) {
      console.error('Error processing Trolley webhook:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });
}