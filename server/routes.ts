import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { randomBytes } from "crypto";
import {
  insertUserSchema,
  insertInviteSchema,
  insertContractSchema,
  insertMilestoneSchema,
  insertPaymentSchema,
  insertDocumentSchema
} from "@shared/schema";
import { sendPasswordResetEmail } from "./services/email";
import Stripe from "stripe";
import stripeService from "./services/stripe";
import notificationService from "./services/notifications";
import { setupAuth } from "./auth";
import plaidRoutes from "./plaid-routes";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  const { requireAuth } = setupAuth(app);
  
  // API routes prefix
  const apiRouter = "/api";
  
  // Serve our static HTML login page
  app.get('/direct-login', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'client', 'public', 'login.html'));
  });
  
  // Public routes are defined above (login, register) in the auth.ts file
  
  // Protected routes - require authentication
  
  // User routes
  app.get(`${apiRouter}/users`, requireAuth, async (req: Request, res: Response) => {
    try {
      const role = req.query.role as string;
      const currentUser = req.user;
      let users: any[] = [];
      
      // If the current user is a business user
      if (currentUser && currentUser.role === "business") {
        if (role === "contractor" || role === "freelancer") {
          // Only return contractors/freelancers that have a contract with this business
          // or have been invited by this business
          const contractorsWithContracts = await storage.getContractorsByBusinessId(currentUser.id);
          const contractorsByInvites = await storage.getContractorsByBusinessInvites(currentUser.id);
          
          // Combine both sets of contractors and remove duplicates
          const contractorIds = new Set();
          const uniqueContractors: any[] = [];
          
          [...contractorsWithContracts, ...contractorsByInvites].forEach(contractor => {
            // Double-check that the user actually has the contractor role
            if (!contractorIds.has(contractor.id) && contractor.role === 'contractor') {
              contractorIds.add(contractor.id);
              uniqueContractors.push(contractor);
            }
          });
          
          users = uniqueContractors;
        } else if (!role || role === "business") {
          // For business users, only return themselves
          if (currentUser) {
            users = [currentUser];
          }
        }
      } 
      // If the current user is a contractor/freelancer
      else if (currentUser.role === "contractor" || currentUser.role === "freelancer") {
        if (role === "business") {
          // Only return businesses that have a contract with this contractor
          users = await storage.getBusinessesByContractorId(currentUser.id);
        } else if (!role || role === "contractor" || role === "freelancer") {
          // Contractors can only see themselves
          users = [currentUser];
        }
      }
      // Admin users (if implemented) can see everyone
      else if (currentUser.role === "admin") {
        if (role) {
          users = await storage.getUsersByRole(role);
        } else {
          const contractors = await storage.getUsersByRole("contractor");
          const businessUsers = await storage.getUsersByRole("business");
          users = [...contractors, ...businessUsers];
        }
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  app.get(`${apiRouter}/users/:id`, requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });
  
  app.post(`${apiRouter}/users`, async (req: Request, res: Response) => {
    try {
      const userInput = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(userInput);
      res.status(201).json(newUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });
  
  // Invite routes
  app.get(`${apiRouter}/invites`, async (req: Request, res: Response) => {
    try {
      const businessId = req.query.businessId ? parseInt(req.query.businessId as string) : null;
      const email = req.query.email as string;
      const pending = req.query.pending === 'true';
      
      let invites;
      if (businessId) {
        invites = await storage.getInvitesByBusinessId(businessId);
      } else if (email) {
        const invite = await storage.getInviteByEmail(email);
        invites = invite ? [invite] : [];
      } else if (pending) {
        invites = await storage.getPendingInvites();
      } else {
        // Default case, return empty array
        invites = [];
      }
      
      res.json(invites);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invites" });
    }
  });
  
  app.get(`${apiRouter}/invites/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const invite = await storage.getInvite(id);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      res.json(invite);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invite" });
    }
  });
  
  app.post(`${apiRouter}/invites`, async (req: Request, res: Response) => {
    try {
      const inviteInput = insertInviteSchema.parse(req.body);
      const newInvite = await storage.createInvite(inviteInput);
      
      // Send invitation email
      try {
        const { sendInvitationEmail } = await import('./services/email');
        // Get application URL, handling both Replit and local environments
        let appUrl = `${req.protocol}://${req.get('host')}`;
        
        // Check if running in Replit
        if (process.env.REPLIT_DEV_DOMAIN) {
          // Use the Replit-specific domain from environment
          appUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
        }
        
        console.log(`Generated invite URL using appUrl: ${appUrl}`);
        await sendInvitationEmail(newInvite, appUrl);
        console.log(`Invitation email sent to ${newInvite.email}`);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Continue with the response even if email fails
      }
      
      res.status(201).json(newInvite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invite data", errors: error.errors });
      }
      console.error('Error creating invite:', error);
      res.status(500).json({ message: "Error creating invite" });
    }
  });
  
  app.patch(`${apiRouter}/invites/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedInvite = await storage.updateInvite(id, updateData);
      
      if (!updatedInvite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      res.json(updatedInvite);
    } catch (error) {
      res.status(500).json({ message: "Error updating invite" });
    }
  });
  
  // Contract routes
  app.get(`${apiRouter}/contracts`, async (req: Request, res: Response) => {
    try {
      const businessId = req.query.businessId ? parseInt(req.query.businessId as string) : null;
      const contractorId = req.query.contractorId ? parseInt(req.query.contractorId as string) : null;
      
      let contracts = [];
      if (businessId) {
        contracts = await storage.getContractsByBusinessId(businessId);
      } else if (contractorId) {
        contracts = await storage.getContractsByContractorId(contractorId);
      } else {
        // Simplified approach: fetch all contracts directly from the database
        // This is more efficient and doesn't require user authentication
        contracts = await storage.getAllContracts();
      }
      
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Error fetching contracts" });
    }
  });
  
  app.get(`${apiRouter}/contracts/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContract(id);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      res.json(contract);
    } catch (error) {
      res.status(500).json({ message: "Error fetching contract" });
    }
  });
  
  app.post(`${apiRouter}/contracts`, async (req: Request, res: Response) => {
    try {
      console.log("[Contract Creation] Request body:", JSON.stringify(req.body));
      const contractInput = insertContractSchema.parse(req.body);
      console.log("[Contract Creation] Validated input:", JSON.stringify(contractInput));
      const newContract = await storage.createContract(contractInput);
      console.log("[Contract Creation] Contract created:", JSON.stringify(newContract));
      res.status(201).json(newContract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[Contract Creation] Validation error:", JSON.stringify(error.errors));
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
      console.error("[Contract Creation] Error:", error);
      res.status(500).json({ message: "Error creating contract" });
    }
  });
  
  app.patch(`${apiRouter}/contracts/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedContract = await storage.updateContract(id, updateData);
      
      if (!updatedContract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      res.json(updatedContract);
    } catch (error) {
      res.status(500).json({ message: "Error updating contract" });
    }
  });
  
  // Milestone routes
  app.get(`${apiRouter}/milestones`, async (req: Request, res: Response) => {
    try {
      const contractId = req.query.contractId ? parseInt(req.query.contractId as string) : null;
      const upcoming = req.query.upcoming === 'true';
      
      let milestones;
      if (contractId) {
        milestones = await storage.getMilestonesByContractId(contractId);
      } else if (upcoming) {
        milestones = await storage.getUpcomingMilestones(5); // Limit to 5 for dashboard
      } else {
        // Default behavior
        milestones = [];
      }
      
      res.json(milestones);
    } catch (error) {
      res.status(500).json({ message: "Error fetching milestones" });
    }
  });
  
  app.get(`${apiRouter}/milestones/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const milestone = await storage.getMilestone(id);
      
      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }
      
      res.json(milestone);
    } catch (error) {
      res.status(500).json({ message: "Error fetching milestone" });
    }
  });
  
  app.post(`${apiRouter}/milestones`, async (req: Request, res: Response) => {
    try {
      const milestoneInput = insertMilestoneSchema.parse(req.body);
      const newMilestone = await storage.createMilestone(milestoneInput);
      res.status(201).json(newMilestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid milestone data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating milestone" });
    }
  });
  
  app.patch(`${apiRouter}/milestones/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedMilestone = await storage.updateMilestone(id, updateData);
      
      if (!updatedMilestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }
      
      res.json(updatedMilestone);
    } catch (error) {
      res.status(500).json({ message: "Error updating milestone" });
    }
  });
  
  // Payment routes
  app.get(`${apiRouter}/payments`, async (req: Request, res: Response) => {
    try {
      const contractId = req.query.contractId ? parseInt(req.query.contractId as string) : null;
      const payments = await storage.getAllPayments(contractId);
      
      // Add virtual pending payments based on contract values
      const allContracts = contractId 
        ? [await storage.getContract(contractId)].filter(Boolean) 
        : await storage.getAllContracts();
      
      // For each contract, create a virtual pending payment if there are no payments
      // or if the total payment amount doesn't match the contract value
      const pendingContractPayments = allContracts.map(contract => {
        // Skip if not a valid contract
        if (!contract) return null;
        
        // Convert contract value to number
        const contractValueNum = parseFloat(contract.value.toString());
        
        // Calculate total existing payments for this contract
        const existingPaymentsTotal = payments
          .filter(payment => payment.contractId === contract.id)
          .reduce((total, payment) => total + parseFloat(payment.amount.toString()), 0);
        
        // If there are no payments or the total doesn't match the contract value,
        // create a virtual pending payment
        if (existingPaymentsTotal < contractValueNum) {
          const remainingAmount = contractValueNum - existingPaymentsTotal;
          return {
            id: -contract.id, // Use a negative ID to indicate this is a virtual payment
            contractId: contract.id,
            milestoneId: 0, // No milestone associated yet
            amount: remainingAmount.toFixed(2),
            status: 'pending',
            scheduledDate: contract.startDate || new Date(),
            completedDate: null,
            notes: `Pending contract payment for ${contract.contractName}`,
            contractName: contract.contractName, // Add contract name for display purposes
            isVirtual: true // Mark as virtual so we know it's not a real payment record
          };
        }
        return null;
      }).filter(Boolean);
      
      // Combine actual payments with virtual payments
      const allPayments = [...payments, ...pendingContractPayments];
      
      res.json(allPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Error fetching payments" });
    }
  });
  
  app.get(`${apiRouter}/payments/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Error fetching payment" });
    }
  });
  
  app.post(`${apiRouter}/payments`, async (req: Request, res: Response) => {
    try {
      const paymentInput = insertPaymentSchema.parse(req.body);
      const newPayment = await storage.createPayment(paymentInput);
      res.status(201).json(newPayment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating payment" });
    }
  });
  
  app.patch(`${apiRouter}/payments/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedPayment = await storage.updatePayment(id, updateData);
      
      if (!updatedPayment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(updatedPayment);
    } catch (error) {
      res.status(500).json({ message: "Error updating payment" });
    }
  });
  
  // Document routes
  app.get(`${apiRouter}/documents`, async (req: Request, res: Response) => {
    try {
      const contractId = req.query.contractId ? parseInt(req.query.contractId as string) : null;
      
      let documents = [];
      if (contractId) {
        // If contractId is provided, return documents for that contract
        documents = await storage.getDocumentsByContractId(contractId);
      } else {
        // If no contractId provided, return all documents from all contracts
        // Get all contracts first
        const contracts = await storage.getContractsByBusinessId(9); // Assuming businessId 9 for Creativ Linc
        
        // Fetch documents for each contract
        for (const contract of contracts) {
          const contractDocuments = await storage.getDocumentsByContractId(contract.id);
          documents = [...documents, ...contractDocuments];
        }
      }
      
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Error fetching documents" });
    }
  });
  
  app.get(`${apiRouter}/documents/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Error fetching document" });
    }
  });
  
  app.post(`${apiRouter}/documents`, async (req: Request, res: Response) => {
    try {
      const documentInput = insertDocumentSchema.parse(req.body);
      const newDocument = await storage.createDocument(documentInput);
      res.status(201).json(newDocument);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating document" });
    }
  });
  
  // Dashboard summary endpoint - temporarily removed auth for development
  app.get(`${apiRouter}/dashboard`, async (req: Request, res: Response) => {
    try {
      // Get the current user
      const userId = req.user?.id;
      const userRole = req.user?.role || 'business'; // Default to business if not specified
      
      // For development/testing, let's get all contracts regardless of user
      const allContracts = await storage.getAllContracts();
      
      // Use all contracts as we're in development mode
      // In production, we would filter by user ID
      const userContracts = allContracts;
      
      // Active contracts are those with status 'active'
      const activeContracts = userContracts.filter(contract => contract.status === 'active');
      
      // Pending approvals are contracts with status 'pending_approval'
      const pendingApprovals = userContracts.filter(contract => contract.status === 'pending_approval');
      
      // Get the upcoming payments (5 most recent)
      const upcomingPayments = await storage.getUpcomingPayments(5);
      
      // Get the upcoming milestones (5 most recent)
      const upcomingMilestones = await storage.getUpcomingMilestones(5);
      
      // For each contract, ensure there are payments that reflect the contract value
      // If not, create a virtual pending payment for the dashboard
      const pendingContractPayments = userContracts.map(contract => {
        // Convert contract value to number
        const contractValueNum = parseFloat(contract.value.toString());
        
        // Check if there are any existing payments for this contract
        const existingPaymentsTotal = upcomingPayments
          .filter(payment => payment.contractId === contract.id)
          .reduce((total, payment) => total + parseFloat(payment.amount.toString()), 0);
        
        // If there are no payments or the total doesn't match the contract value,
        // create a virtual pending payment
        if (existingPaymentsTotal < contractValueNum) {
          const remainingAmount = contractValueNum - existingPaymentsTotal;
          return {
            id: -contract.id, // Use a negative ID to indicate this is a virtual payment
            contractId: contract.id,
            milestoneId: 0, // No milestone associated yet
            amount: remainingAmount.toFixed(2),
            status: 'pending',
            scheduledDate: contract.startDate || new Date(),
            completedDate: null,
            notes: `Pending contract payment for ${contract.contractName}`,
            contractName: contract.contractName, // Add contract name for display purposes
            isVirtual: true // Mark as virtual so we know it's not a real payment record
          };
        }
        return null;
      }).filter(Boolean);
      
      // Add the virtual payments to the upcoming payments
      const allUpcomingPayments = [...upcomingPayments, ...pendingContractPayments];
      
      // Get pending invites
      const pendingInvites = userRole === 'business' 
        ? await storage.getInvitesByBusinessId(userId || 0) 
        : [];
      
      // Calculate total payments processed
      const allPayments = await storage.getAllPayments(null);
      const completedPayments = allPayments.filter(payment => payment.status === 'completed');
      const totalPaymentsValue = completedPayments.reduce((sum, payment) => {
        return sum + (parseFloat(payment.amount) || 0);
      }, 0);
      
      // Calculate total pending payments (from contracts)
      const totalPendingValue = userContracts.reduce((sum, contract) => {
        return sum + parseFloat(contract.value.toString() || '0');
      }, 0);
      
      // Get count of active contractors (for business users)
      const activeContractorsCount = userRole === 'business' 
        ? (await storage.getContractorsByBusinessId(userId || 0)).length 
        : 0;
      
      // For development, fetch all contractors to populate the UI
      const allContractors = await storage.getUsersByRole('contractor');
      
      const dashboardData = {
        stats: {
          activeContractsCount: activeContracts.length,
          pendingApprovalsCount: pendingApprovals.length,
          paymentsProcessed: totalPaymentsValue,
          totalPendingValue: totalPendingValue, // Add total pending value from contracts
          activeContractorsCount: allContractors.length,
          pendingInvitesCount: pendingInvites.length
        },
        contracts: userContracts,
        contractors: allContractors,  // Add contractors data
        milestones: upcomingMilestones,
        payments: allUpcomingPayments, // Include virtual payments
        invites: pendingInvites
      };
      
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });
  
  // Stripe integration routes
  
  // Create payment intent for a specific payment
  app.post(`${apiRouter}/payments/:id/create-intent`, requireAuth, async (req: Request, res: Response) => {
    try {
      const paymentId = parseInt(req.params.id);
      const payment = await storage.getPayment(paymentId);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Check if payment already has a Stripe payment intent
      if (payment.stripePaymentIntentId) {
        // If payment intent exists, retrieve it and return client secret
        const existingIntent = await stripeService.retrievePaymentIntent(payment.stripePaymentIntentId);
        return res.json({ 
          clientSecret: existingIntent.client_secret,
          paymentIntentId: payment.stripePaymentIntentId,
          status: existingIntent.status
        });
      }
      
      // Create a new payment intent
      const paymentIntent = await stripeService.processMilestonePayment(payment);
      
      // Update payment with Stripe payment intent details
      await storage.updatePaymentStripeDetails(
        paymentId, 
        paymentIntent.id, 
        'requires_payment_method'
      );
      
      res.json({
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ message: "Error creating payment intent" });
    }
  });
  
  // Webhook for Stripe events
  app.post(`${apiRouter}/stripe-webhook`, async (req: Request, res: Response) => {
    try {
      const event = req.body;
      
      // Handle payment_intent.succeeded event
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const paymentId = paymentIntent.metadata.paymentId;
        
        if (paymentId) {
          // Update payment status
          await storage.updatePaymentStripeDetails(
            parseInt(paymentId),
            paymentIntent.id,
            paymentIntent.status
          );
          
          // Check if this was a Connect payment
          if (paymentIntent.transfer_data && paymentIntent.metadata.connectAccountId) {
            console.log('Processing Connect payment success', paymentId, paymentIntent.id);
            
            // For Connect payments, we might need to track the transfer separately
            if (paymentIntent.transfer) {
              await storage.updatePaymentTransferDetails(
                parseInt(paymentId),
                paymentIntent.transfer,
                'pending', // Transfer is created but not yet complete
                parseFloat(paymentIntent.application_fee_amount) / 100 // Convert from cents
              );
            }
          }
        }
      }
      
      // Handle payment_intent.payment_failed event
      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const paymentId = paymentIntent.metadata.paymentId;
        
        if (paymentId) {
          await storage.updatePaymentStripeDetails(
            parseInt(paymentId),
            paymentIntent.id,
            paymentIntent.status
          );
        }
      }
      
      // Handle transfer.created event
      if (event.type === 'transfer.created') {
        const transfer = event.data.object;
        
        // Look up payment by metadata in the transfer
        if (transfer.metadata && transfer.metadata.paymentId) {
          const paymentId = transfer.metadata.paymentId;
          
          await storage.updatePaymentTransferDetails(
            parseInt(paymentId),
            transfer.id,
            'created',
            0 // Application fee is already recorded from the payment intent
          );
        }
      }
      
      // Handle transfer.paid event
      if (event.type === 'transfer.paid') {
        const transfer = event.data.object;
        
        // Look up payment by metadata in the transfer
        if (transfer.metadata && transfer.metadata.paymentId) {
          const paymentId = transfer.metadata.paymentId;
          
          await storage.updatePaymentTransferDetails(
            parseInt(paymentId),
            transfer.id,
            'paid',
            0 // Application fee is already recorded
          );
        }
      }
      
      // Handle transfer.failed event
      if (event.type === 'transfer.failed') {
        const transfer = event.data.object;
        
        // Look up payment by metadata in the transfer
        if (transfer.metadata && transfer.metadata.paymentId) {
          const paymentId = transfer.metadata.paymentId;
          
          await storage.updatePaymentTransferDetails(
            parseInt(paymentId),
            transfer.id,
            'failed',
            0 // Application fee is already recorded
          );
        }
      }
      
      // Handle charge.succeeded event (for ACH payments)
      if (event.type === 'charge.succeeded') {
        const charge = event.data.object;
        
        // Look up payment by metadata in the charge
        if (charge.metadata && charge.metadata.paymentId) {
          const paymentId = charge.metadata.paymentId;
          
          // Update payment status to completed
          const payment = await storage.updatePaymentStatus(
            parseInt(paymentId),
            'completed',
            {
              stripePaymentIntentId: charge.id,
              stripePaymentIntentStatus: charge.status
            }
          );
          
          console.log(`ACH Payment ${paymentId} marked as completed`);
          
          // Send notifications to relevant parties
          if (payment) {
            try {
              // Get the contract to determine business and contractor IDs
              const contract = await storage.getContract(payment.contractId);
              if (contract) {
                // Notify business user
                await notificationService.sendPaymentNotification(
                  payment, 
                  'completed', 
                  contract.businessId,
                  'The funds have been successfully transferred.'
                );
                
                // Notify contractor user
                await notificationService.sendPaymentNotification(
                  payment, 
                  'completed', 
                  contract.contractorId,
                  'The payment has been processed and funds will be available in your account soon.'
                );
                
                console.log(`Sent completion notifications for payment ${paymentId}`);
              }
            } catch (notifyError) {
              console.error(`Error sending payment notifications: ${notifyError}`);
            }
          }
          
          // Handle transfer to contractor if this was a Connect payment
          if (charge.transfer && charge.transfer_data && charge.transfer_data.destination) {
            const transferAmount = charge.transfer_data.amount || (charge.amount - (charge.application_fee_amount || 0));
            const applicationFee = charge.application_fee_amount || 0;
            
            await storage.updatePaymentTransferDetails(
              parseInt(paymentId),
              charge.transfer,
              'pending', // Transfer is created but not yet paid
              applicationFee
            );
            
            console.log(`ACH Payment ${paymentId} transfer ${charge.transfer} recorded`);
          }
        }
      }
      
      // Handle charge.pending event (for ACH payments)
      if (event.type === 'charge.pending') {
        const charge = event.data.object;
        
        // Look up payment by metadata in the charge
        if (charge.metadata && charge.metadata.paymentId) {
          const paymentId = charge.metadata.paymentId;
          
          // Update payment status to pending
          const payment = await storage.updatePaymentStatus(
            parseInt(paymentId),
            'pending',
            {
              stripePaymentIntentId: charge.id,
              stripePaymentIntentStatus: charge.status
            }
          );
          
          console.log(`ACH Payment ${paymentId} marked as pending`);
          
          // Send notifications to relevant parties
          if (payment) {
            try {
              // Get the contract to determine business and contractor IDs
              const contract = await storage.getContract(payment.contractId);
              if (contract) {
                // Notify business user
                await notificationService.sendPaymentNotification(
                  payment, 
                  'pending', 
                  contract.businessId,
                  'Your payment is being processed and funds will be transferred shortly.'
                );
                
                // Notify contractor user
                await notificationService.sendPaymentNotification(
                  payment, 
                  'pending', 
                  contract.contractorId,
                  'A payment is being processed and will be available in your account soon.'
                );
                
                console.log(`Sent pending notifications for payment ${paymentId}`);
              }
            } catch (notifyError) {
              console.error(`Error sending payment notifications: ${notifyError}`);
            }
          }
        }
      }
      
      // Handle charge.failed event (for ACH payments)
      if (event.type === 'charge.failed') {
        const charge = event.data.object;
        
        // Look up payment by metadata in the charge
        if (charge.metadata && charge.metadata.paymentId) {
          const paymentId = charge.metadata.paymentId;
          
          // Update payment status to failed
          const payment = await storage.updatePaymentStatus(
            parseInt(paymentId),
            'failed',
            {
              stripePaymentIntentId: charge.id,
              stripePaymentIntentStatus: charge.status,
              failureReason: charge.failure_message || 'Payment failed'
            }
          );
          
          console.log(`ACH Payment ${paymentId} marked as failed: ${charge.failure_message}`);
          
          // Send notifications to relevant parties
          if (payment) {
            try {
              // Get the contract to determine business and contractor IDs
              const contract = await storage.getContract(payment.contractId);
              if (contract) {
                const failureReason = charge.failure_message || 'The payment could not be processed';
                
                // Notify business user
                await notificationService.sendPaymentNotification(
                  payment, 
                  'failed', 
                  contract.businessId,
                  `The payment failed: ${failureReason}. Please check your payment method and try again.`
                );
                
                // Notify contractor user
                await notificationService.sendPaymentNotification(
                  payment, 
                  'failed', 
                  contract.contractorId,
                  'A scheduled payment has failed. The business has been notified to address the issue.'
                );
                
                console.log(`Sent failure notifications for payment ${paymentId}`);
              }
            } catch (notifyError) {
              console.error(`Error sending payment failure notifications: ${notifyError}`);
            }
          }
        }
      }
      
      // Handle account.updated event
      if (event.type === 'account.updated') {
        const account = event.data.object;
        console.log('Processing account.updated event:', account.id);
        
        // If user_id is in metadata, update the user's account status
        if (account.metadata && account.metadata.userId) {
          const userId = account.metadata.userId;
          console.log('Updating Connect account status for user:', userId);
          
          // Update the user's Connect account status
          await storage.updateUserConnectAccount(
            parseInt(userId),
            account.id,
            account.charges_enabled
          );
          
          console.log('Connect account status updated, charges_enabled:', account.charges_enabled);
        } else {
          console.log('No userId in metadata, trying to find user by Connect account ID');
          
          // If no userId in metadata, try to find the user by Connect account ID
          try {
            const users = await storage.getUsersByConnectAccountId(account.id);
            if (users && users.length > 0) {
              const user = users[0];
              console.log('Found user by Connect account ID:', user.id);
              
              await storage.updateUserConnectAccount(
                user.id,
                account.id,
                account.charges_enabled
              );
              
              console.log('Connect account status updated for found user, charges_enabled:', account.charges_enabled);
            }
          } catch (err) {
            console.error('Error finding user by Connect account ID:', err);
          }
        }
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ message: "Error processing webhook" });
    }
  });
  
  // Reports API endpoint - integrates with real payment and project data
  app.get(`${apiRouter}/reports`, async (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange as string || 'year';
      
      // For development, return zero values to ensure no test data appears in the UI
      // Calculate stats based on time range
      const reportsData = {
        summary: {
          totalContracts: 0,
          totalContractors: 0,
          totalPayments: 0,
          totalMilestones: 0,
          avgContractValue: 0,
          completionRate: 0
        },
        paymentsByMonth: [],
        contractsByStatus: [
          { status: 'active', count: 0 },
          { status: 'completed', count: 0 },
          { status: 'pending', count: 0 }
        ],
        topContractors: []
      };
      
      res.json(reportsData);
    } catch (error) {
      console.error('Error generating reports:', error);
      res.status(500).json({ message: "Error generating reports" });
    }
  });

  // Update payment status from Stripe
  app.post(`${apiRouter}/payments/:id/update-status`, async (req: Request, res: Response) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { stripePaymentIntentId } = req.body;
      
      if (!stripePaymentIntentId) {
        return res.status(400).json({ message: "Stripe payment intent ID is required" });
      }
      
      const paymentIntent = await stripeService.retrievePaymentIntent(stripePaymentIntentId);
      
      await storage.updatePaymentStripeDetails(
        paymentId,
        stripePaymentIntentId,
        paymentIntent.status
      );
      
      const updatedPayment = await storage.getPayment(paymentId);
      res.json(updatedPayment);
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ message: "Error updating payment status" });
    }
  });
  
  // Stripe Connect endpoints for contractors
  
  // Create a Stripe Connect account for a contractor
  app.post(`${apiRouter}/contractors/:id/connect-account`, requireAuth, async (req: Request, res: Response) => {
    try {
      const contractorId = parseInt(req.params.id);
      const contractor = await storage.getUser(contractorId);
      
      if (!contractor) {
        return res.status(404).json({ message: "Contractor not found" });
      }
      
      // Check if the contractor already has a Connect account
      if (contractor.stripeConnectAccountId) {
        const accountStatus = await stripeService.checkConnectAccountStatus(contractor.stripeConnectAccountId);
        
        if (accountStatus) {
          return res.status(400).json({ 
            message: "Contractor already has a Connect account that is fully set up",
            accountId: contractor.stripeConnectAccountId
          });
        }
        
        // If account exists but not fully set up, generate new onboarding link
        try {
          const account = await stripeService.getConnectAccount(contractor.stripeConnectAccountId);
          
          const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/contractors/onboarding/refresh`,
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/contractors/onboarding/complete`,
            type: 'account_onboarding',
          });
          
          return res.json({ 
            accountId: account.id, 
            accountLink: accountLink.url,
            status: account.charges_enabled ? 'active' : 'pending'
          });
        } catch (error) {
          // If we get an error retrieving the account, create a new one
          console.log('Error retrieving Connect account, creating a new one:', error);
        }
      }
      
      // Create a new Connect account
      const connectAccount = await stripeService.createConnectAccount(contractor);
      
      // Update the contractor with the Connect account ID
      await storage.updateUserConnectAccount(contractorId, connectAccount.id);
      
      res.status(201).json({
        accountId: connectAccount.id,
        accountLink: connectAccount.accountLink,
        status: 'pending'
      });
    } catch (error) {
      console.error('Error creating Connect account:', error);
      res.status(500).json({ message: "Error creating Connect account" });
    }
  });
  
  // Get contractor Connect account status
  app.get(`${apiRouter}/contractors/:id/connect-status`, requireAuth, async (req: Request, res: Response) => {
    try {
      const contractorId = parseInt(req.params.id);
      const contractor = await storage.getUser(contractorId);
      
      if (!contractor) {
        return res.status(404).json({ message: "Contractor not found" });
      }
      
      if (!contractor.stripeConnectAccountId) {
        return res.json({ status: 'not_created' });
      }
      
      // Check if this is a simulated account (for testing)
      const isSimulated = contractor.stripeConnectAccountId.startsWith('acct_') && 
                          contractor.payoutEnabled === true;
      
      let accountStatus = false;
      
      if (isSimulated) {
        // For simulated accounts, use the stored payoutEnabled status
        accountStatus = contractor.payoutEnabled || false;
        console.log('Using simulated Connect account status:', accountStatus);
      } else {
        // For real accounts, check with Stripe
        accountStatus = await stripeService.checkConnectAccountStatus(contractor.stripeConnectAccountId);
        
        // Update the user record with the latest status
        await storage.updateUserConnectAccount(
          contractorId, 
          contractor.stripeConnectAccountId, 
          accountStatus
        );
      }
      
      res.json({
        status: accountStatus ? 'active' : 'pending',
        accountId: contractor.stripeConnectAccountId,
        payoutEnabled: accountStatus
      });
    } catch (error) {
      console.error('Error checking Connect account status:', error);
      res.status(500).json({ message: "Error checking Connect account status" });
    }
  });
  
  // Create a payment direct to contractor via Connect
  app.post(`${apiRouter}/payments/:id/pay-contractor`, requireAuth, async (req: Request, res: Response) => {
    try {
      const paymentId = parseInt(req.params.id);
      const payment = await storage.getPayment(paymentId);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Get contract to find contractor
      const contract = await storage.getContract(payment.contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Get contractor to check Connect account
      const contractor = await storage.getUser(contract.contractorId);
      if (!contractor) {
        return res.status(404).json({ message: "Contractor not found" });
      }
      
      // Check if contractor has a Connect account
      if (!contractor.stripeConnectAccountId) {
        return res.status(400).json({ message: "Contractor doesn't have a Connect account set up" });
      }
      
      // Check if this is a simulated account (for testing)
      const isSimulated = contractor.stripeConnectAccountId.startsWith('acct_') && 
                          contractor.payoutEnabled === true;
      
      let accountStatus = false;
      
      if (isSimulated) {
        // For simulated accounts, use the stored payoutEnabled status
        accountStatus = contractor.payoutEnabled || false;
        console.log('Using simulated Connect account status for payment:', accountStatus);
      } else {
        // For real accounts, check with Stripe
        accountStatus = await stripeService.checkConnectAccountStatus(contractor.stripeConnectAccountId);
      }
      
      if (!accountStatus) {
        return res.status(400).json({ message: "Contractor's Connect account is not fully set up" });
      }
      
      // Calculate platform fee (5% by default)
      const amount = parseFloat(payment.amount);
      const platformFee = amount * 0.05;
      
      let paymentIntent;
      
      if (isSimulated) {
        // For simulated accounts, create a regular payment intent without Connect
        console.log('Creating simulated direct payment for testing');
        
        // Generate a fake payment intent ID for simulation
        const fakePaymentIntentId = `pi_${randomBytes(16).toString('hex')}`;
        const fakeClientSecret = `${fakePaymentIntentId}_secret_${randomBytes(8).toString('hex')}`;
        
        // Simulate a payment intent object
        paymentIntent = {
          id: fakePaymentIntentId,
          clientSecret: fakeClientSecret,
          status: 'requires_payment_method'
        };
        
        // Generate a fake transfer ID for simulation
        const fakeTransferId = `tr_${randomBytes(16).toString('hex')}`;
        
        // Update payment with simulated Stripe payment intent details
        await storage.updatePaymentStripeDetails(
          paymentId, 
          paymentIntent.id, 
          'requires_payment_method'
        );
        
        // Update payment with simulated transfer details
        await storage.updatePaymentTransferDetails(
          paymentId,
          fakeTransferId,
          'pending',
          platformFee
        );
      } else {
        // Create direct payment to contractor using Stripe Connect
        paymentIntent = await stripeService.processDirectPayment(
          payment,
          contractor.stripeConnectAccountId,
          platformFee
        );
        
        // Update payment with Stripe payment intent details
        await storage.updatePaymentStripeDetails(
          paymentId, 
          paymentIntent.id, 
          'requires_payment_method'
        );
        
        // Update payment with transfer details
        await storage.updatePaymentTransferDetails(
          paymentId,
          '', // Transfer ID will be updated after payment completes
          'pending',
          platformFee
        );
      }
      
      res.json({
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.id,
        directToContractor: true,
        simulated: isSimulated
      });
    } catch (error) {
      console.error('Error creating direct payment:', error);
      res.status(500).json({ message: "Error creating direct payment" });
    }
  });
  
  // Subscription endpoint for companies
  app.post(`${apiRouter}/get-or-create-subscription`, async (req: Request, res: Response) => {
    try {
      // In a real application, this would check if the user is authenticated
      // and retrieve their user ID from the session
      // For this demo, we'll simulate user authentication
      const userId = 1; // Default to first user for demo
      
      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user already has a subscription
      // In a real app, you'd have a stripeSubscriptionId field on the user
      // For demo purposes, we're always creating a new subscription
      
      try {
        // Create a customer in Stripe if they don't have one
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user.id.toString()
          }
        });
        
        // Create a product for the subscription
        const product = await stripe.products.create({
          name: 'Premium Plan',
          description: 'Monthly subscription to CD Smart Contract Platform'
        });
        
        // Create a price for the product
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: 9900, // $99.00
          currency: 'usd',
          recurring: {
            interval: 'month'
          }
        });
        
        // Create the subscription
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [
            {
              price: price.id
            }
          ],
          payment_behavior: 'default_incomplete',
          payment_settings: {
            save_default_payment_method: 'on_subscription'
          },
          expand: ['latest_invoice.payment_intent']
        });
        
        // Extract client secret from subscription
        const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
        const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;
        
        // Update user with Stripe information
        await storage.updateUserStripeInfo(user.id, {
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id
        });
        
        // Return subscription details
        res.json({
          subscriptionId: subscription.id,
          clientSecret: paymentIntent.client_secret,
          customerId: customer.id
        });
      } catch (error: any) {
        console.error('Error creating subscription:', error.message);
        return res.status(400).json({ 
          message: "Error creating subscription", 
          error: error.message 
        });
      }
    } catch (error: any) {
      console.error('Error in subscription endpoint:', error);
      res.status(500).json({ 
        message: "Error processing subscription request",
        error: error.message 
      });
    }
  });
  
  // Register Plaid routes
  plaidRoutes(app, apiRouter, requireAuth);
  
  // Create a Stripe payment intent
  app.post(`${apiRouter}/create-payment-intent`, async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      
      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Invalid amount' });
      }
      
      // Create a PaymentIntent with the order amount and currency
      // Convert amount to whole number of cents (Stripe requires integer)
      const amountInCents = Math.round(parseFloat(amount));
      console.log('Creating payment intent for amount (cents):', amountInCents);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create a Stripe checkout session (for redirect flow)
  app.post(`${apiRouter}/create-checkout-session`, async (req: Request, res: Response) => {
    try {
      const { amount, description } = req.body;
      
      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Invalid amount' });
      }
      
      // Convert amount to whole number of cents (Stripe requires integer)
      const amountInCents = Math.round(parseFloat(amount) * 100); // Convert dollars to cents
      console.log('Creating checkout session for amount (cents):', amountInCents);
      
      // Create a checkout session with proper formatting and domain
      let baseUrl = '';
      
      // When deployed, use the Replit domain
      if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS}`;
      } 
      // For local development
      else {
        baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
      }
      
      console.log('Base URL for checkout redirects:', baseUrl);
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: description || 'Payment',
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/stripe-checkout?success=true`,
        cancel_url: `${baseUrl}/stripe-checkout?canceled=true`,
      });

      res.json({
        id: session.id,
        url: session.url,
      });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
