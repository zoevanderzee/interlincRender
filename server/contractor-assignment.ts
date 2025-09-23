
import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { z } from "zod";

// Validation schema for contractor assignment
const assignContractorSchema = z.object({
  projectId: z.number().optional(), // For project-based assignment
  contractId: z.number().optional(), // For contract-based assignment
  contractorUserId: z.number(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  deliverableDescription: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.string().default("USD")
});

export function registerContractorAssignmentRoutes(app: Express, apiRouter: string, requireAuth: any): void {
  
  // Single unified endpoint for contractor assignment
  app.post(`${apiRouter}/contractors/assign`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await storage.getUser(Number(userId));
      if (!user || user.role !== 'business') {
        return res.status(403).json({ message: 'Only business users can assign contractors' });
      }

      // Validate input
      const validatedData = assignContractorSchema.parse(req.body);
      
      // Verify contractor is connected to this business
      const isConnected = await storage.isContractorLinkedToBusiness(
        Number(userId), 
        validatedData.contractorUserId
      );
      
      if (!isConnected) {
        return res.status(403).json({ 
          message: 'Contractor must be connected to your business first',
          code: 'CONTRACTOR_NOT_CONNECTED'
        });
      }

      // Get contractor details to verify they have Stripe Connect setup
      const contractor = await storage.getUser(validatedData.contractorUserId);
      if (!contractor) {
        return res.status(404).json({ message: 'Contractor not found' });
      }

      if (!contractor.stripeConnectAccountId) {
        return res.status(400).json({ 
          message: 'Contractor must complete Stripe Connect setup before assignment',
          code: 'STRIPE_CONNECT_REQUIRED'
        });
      }

      // Create the assignment based on whether it's project or contract based
      let result;
      
      if (validatedData.projectId) {
        // Project-based assignment - create work request
        const workRequestData = {
          businessId: Number(userId),
          projectId: validatedData.projectId,
          contractorUserId: validatedData.contractorUserId,
          title: validatedData.title,
          description: validatedData.description || '',
          deliverableDescription: validatedData.deliverableDescription || '',
          dueDate: new Date(validatedData.dueDate),
          amount: validatedData.amount,
          currency: validatedData.currency,
          status: 'pending',
          recipientEmail: contractor.email
        };

        // Generate token for the work request
        const crypto = await import('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        result = await storage.createWorkRequest(workRequestData, tokenHash);

        // Immediately use the consistency method to create/link contract
        const consistency = await storage.ensureContractWorkRequestConsistency(
          validatedData.contractorUserId, 
          validatedData.title
        );

        if (consistency.contract) {
          console.log(`✅ Auto-created/linked contract ${consistency.contract.id} for work request ${result.id}`);
        }
        
        return res.json({
          success: true,
          type: 'work_request',
          workRequestId: result.id,
          message: 'Contractor assigned to project successfully',
          contractorInfo: {
            id: contractor.id,
            name: contractor.firstName && contractor.lastName 
              ? `${contractor.firstName} ${contractor.lastName}` 
              : contractor.username,
            email: contractor.email,
            stripeConnectReady: true
          }
        });
        
      } else if (validatedData.contractId) {
        // Contract-based assignment - update existing contract
        const updatedContract = await storage.updateContract(validatedData.contractId, {
          contractorId: validatedData.contractorUserId
        });

        if (!updatedContract) {
          return res.status(404).json({ message: 'Contract not found' });
        }

        // Create a milestone for this assignment
        const milestoneData = {
          contractId: validatedData.contractId,
          name: validatedData.title,
          description: validatedData.description || '',
          dueDate: new Date(validatedData.dueDate),
          paymentAmount: validatedData.amount.toString(),
          status: 'assigned',
          progress: 0
        };

        const milestone = await storage.createMilestone(milestoneData);

        return res.json({
          success: true,
          type: 'contract_assignment',
          contractId: updatedContract.id,
          milestoneId: milestone.id,
          message: 'Contractor assigned to contract successfully',
          contractorInfo: {
            id: contractor.id,
            name: contractor.firstName && contractor.lastName 
              ? `${contractor.firstName} ${contractor.lastName}` 
              : contractor.username,
            email: contractor.email,
            stripeConnectReady: true
          }
        });
        
      } else {
        return res.status(400).json({ 
          message: 'Either projectId or contractId must be provided',
          code: 'MISSING_PROJECT_OR_CONTRACT'
        });
      }

    } catch (error) {
      console.error('Error in contractor assignment:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid assignment data',
          errors: error.errors,
          code: 'VALIDATION_ERROR'
        });
      }

      res.status(500).json({ 
        message: 'Failed to assign contractor',
        code: 'ASSIGNMENT_ERROR'
      });
    }
  });

  // Get connected contractors for a business (with Stripe Connect status)
  app.get(`${apiRouter}/contractors/connected`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await storage.getUser(Number(userId));
      if (!user || user.role !== 'business') {
        return res.status(403).json({ message: 'Only business users can view connected contractors' });
      }

      // Get contractors connected through the connection requests system
      const connectedContractors = await storage.getContractorsByBusinessId(Number(userId));
      
      // Enhance with Stripe Connect status
      const contractorsWithStatus = connectedContractors.map(contractor => ({
        id: contractor.id,
        firstName: contractor.firstName,
        lastName: contractor.lastName,
        username: contractor.username,
        email: contractor.email,
        title: contractor.title,
        companyName: contractor.companyName,
        profileImage: contractor.profileImage,
        hourlyRate: contractor.hourlyRate,
        stripeConnectReady: !!contractor.stripeConnectAccountId,
        payoutEnabled: contractor.payoutEnabled || false,
        workerType: contractor.workerType || 'contractor'
      }));

      res.json({
        contractors: contractorsWithStatus,
        total: contractorsWithStatus.length,
        stripeConnectReady: contractorsWithStatus.filter(c => c.stripeConnectReady).length
      });

    } catch (error) {
      console.error('Error fetching connected contractors:', error);
      res.status(500).json({ message: 'Failed to fetch connected contractors' });
    }
  });
}
