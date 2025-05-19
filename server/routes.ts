import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import * as nodeCrypto from "crypto";
import {
  insertUserSchema,
  insertInviteSchema,
  insertContractSchema,
  insertMilestoneSchema,
  insertPaymentSchema,
  insertDocumentSchema,
  insertWorkRequestSchema,
  updateWorkRequestSchema
} from "@shared/schema";
import { sendPasswordResetEmail, generateWorkRequestToken } from "./services/email";
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
          // Return contractors/freelancers that have a contract with this business,
          // have been invited by this business, or connected via connection requests
          const contractorsWithContracts = await storage.getContractorsByBusinessId(currentUser.id);
          const contractorsByInvites = await storage.getContractorsByBusinessInvites(currentUser.id);
          
          // Get contractors who accepted connection requests from this business
          let contractorsByConnections: any[] = [];
          try {
            // Get all contractors who have accepted connection requests from this business
            const connections = await storage.getConnectionRequests({
              businessId: currentUser.id,
              status: 'accepted'
            });
            
            if (connections && connections.length > 0) {
              for (const connection of connections) {
                if (connection.contractorId) {
                  const contractor = await storage.getUser(connection.contractorId);
                  if (contractor) {
                    contractorsByConnections.push(contractor);
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error fetching connected contractors:", error);
          }
          
          // Combine all sources and remove duplicates
          const contractorIds = new Set();
          const uniqueContractors: any[] = [];
          
          [...contractorsWithContracts, ...contractorsByInvites, ...contractorsByConnections].forEach(contractor => {
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
      console.log("[Invite Creation] Request body:", JSON.stringify(req.body));
      
      // Extend invitation expiry if not provided
      if (!req.body.expiresAt) {
        // Set expiry date to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        req.body.expiresAt = expiresAt.toISOString();
      }
      
      // Ensure workerType is set if not provided
      if (!req.body.workerType) {
        req.body.workerType = "contractor"; // Default to contractor if not specified
      }
      
      console.log("[Invite Creation] Processed request body:", JSON.stringify(req.body));
      const inviteInput = insertInviteSchema.parse(req.body);
      console.log("[Invite Creation] Validated input:", JSON.stringify(inviteInput));
      
      const newInvite = await storage.createInvite(inviteInput);
      console.log("[Invite Creation] Invite created:", JSON.stringify(newInvite));
      
      // Send invitation email
      try {
        const { sendInvitationEmail, initializeEmailService } = await import('./services/email');
        
        // Make sure email service is initialized
        initializeEmailService();
        
        // Get application URL, handling both Replit and local environments
        let appUrl = `${req.protocol}://${req.get('host')}`;
        
        // Check if running in Replit
        if (process.env.REPLIT_DEV_DOMAIN) {
          // Use the Replit-specific domain from environment
          appUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
        }
        
        console.log(`Generated invite URL using appUrl: ${appUrl}`);
        
        // Send the invitation email with more detailed logging
        console.log(`Attempting to send invitation email to ${newInvite.email} for project '${newInvite.projectName}'`);
        const emailResult = await sendInvitationEmail(newInvite, appUrl);
        
        console.log(`Invitation email sent successfully to ${newInvite.email}:`, 
          emailResult.provider === 'sendgrid' 
            ? 'via SendGrid' 
            : `via Nodemailer, message ID: ${emailResult.info?.messageId || 'unknown'}`);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        console.error('Error details:', emailError instanceof Error ? emailError.message : 'Unknown error');
        // Continue with the response even if email fails
        // In production, you might want to queue these for retry
      }
      
      res.status(201).json(newInvite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[Invite Creation] Validation error:", JSON.stringify(error.errors));
        return res.status(400).json({ message: "Invalid invite data", errors: error.errors });
      }
      console.error('[Invite Creation] Error:', error);
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
  
  // Generate a direct invitation link
  app.post(`${apiRouter}/invites/:id/generate-link`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const invite = await storage.getInvite(id);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Generate a token for this invite
      const token = nodeCrypto.randomBytes(32).toString('hex');
      
      // Get the app URL
      const appUrl = `${req.protocol}://${req.get('host')}`;
      
      // Create a simplified direct link format using our dedicated contractor invite page
      // IMPORTANT: This links to our updated contractor-invite page which expects 'invite' parameter (not inviteId)
      // The URL is structured to match what our contractor-invite.tsx component expects
      console.log("[Invite Link] Creating URL with", { 
        inviteId: id, 
        token, 
        email: invite.email,
        workerType: invite.workerType || 'contractor',
        projectName: invite.projectName || ''
      });
      
      const inviteUrl = `${appUrl}/contractor-invite?invite=${id}&email=${encodeURIComponent(invite.email)}&token=${token}&workerType=${encodeURIComponent(invite.workerType || 'contractor')}&projectName=${encodeURIComponent(invite.projectName || '')}`;
      
      console.log("[Invite Link] Generated URL:", inviteUrl);
      
      // Store the token in the database using updateInvite
      await storage.updateInvite(id, { token });
      
      console.log(`[Invite Link] Generated link for invite ID ${invite.id} with token ${token}`);
      
      res.status(201).json({
        inviteId: invite.id,
        token: token,
        inviteUrl,
        success: true
      });
    } catch (error) {
      console.error("Error generating invitation link:", error);
      res.status(500).json({ message: "Error generating invitation link" });
    }
  });
  
  // Contract routes
  app.get(`${apiRouter}/contracts`, async (req: Request, res: Response) => {
    try {
      const businessId = req.query.businessId ? parseInt(req.query.businessId as string) : null;
      const contractorId = req.query.contractorId ? parseInt(req.query.contractorId as string) : null;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'business';
      
      console.log(`Fetching contracts for user ID ${userId} with role ${userRole}`);
      
      let contracts = [];
      
      // First, for debugging, get all contracts to see what's in the system
      const allContracts = await storage.getAllContracts();
      console.log(`DEBUG: All contracts in system: ${JSON.stringify(allContracts.map(c => ({ id: c.id, name: c.contractName, businessId: c.businessId })))}`);
      
      if (businessId) {
        // Filter by specific business ID from query param
        console.log(`Filtering by specific business ID from query param: ${businessId}`);
        contracts = await storage.getContractsByBusinessId(businessId);
      } else if (contractorId) {
        // Filter by specific contractor ID from query param
        console.log(`Filtering by specific contractor ID from query param: ${contractorId}`);
        contracts = await storage.getContractsByContractorId(contractorId);
      } else if (userId) {
        if (userRole === 'business') {
          // For business users, only show their own contracts
          console.log(`Getting contracts for business user ID: ${userId}`);
          contracts = await storage.getContractsByBusinessId(userId);
        } else if (userRole === 'contractor') {
          // For contractors, only show contracts they're assigned to
          console.log(`Getting contracts for contractor user ID: ${userId}`);
          contracts = await storage.getContractsByContractorId(userId);
        } else {
          // For unknown roles with valid user IDs, still filter by their ID as a business
          console.log(`Getting contracts for user with unknown role. User ID: ${userId}`);
          contracts = await storage.getContractsByBusinessId(userId);
        }
      } else {
        // If somehow no authentication exists, return empty array for security
        console.log("No authenticated user found, returning empty contracts array");
        contracts = [];
      }
      
      // Log filtered contracts for debugging
      console.log(`Filtered contracts for user ${userId}: ${JSON.stringify(contracts.map(c => ({ id: c.id, name: c.contractName, businessId: c.businessId })))}`);
      
      
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
      
      // Detailed debugging for authentication
      console.log(`GET /contracts/${id} - Request headers:`, req.headers);
      console.log(`GET /contracts/${id} - Cookie:`, req.headers.cookie);
      console.log(`GET /contracts/${id} - X-User-ID:`, req.headers['x-user-id']);
      console.log(`GET /contracts/${id} - User from session:`, req.user);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Get user ID from session or X-User-ID header
      const userId = req.user?.id || (req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : null);
      
      if (!userId) {
        console.log("No user ID found when accessing contract detail");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Load the full user if not already loaded
      let user = req.user;
      let userRole = 'business';
      
      if (!user && userId) {
        try {
          user = await storage.getUser(userId);
          if (user) {
            console.log(`Using X-User-ID header fallback authentication for user ID: ${userId}`);
            userRole = user.role || 'business';
          }
        } catch (error) {
          console.error('Error loading user from X-User-ID header:', error);
        }
      } else if (user) {
        userRole = user.role || 'business';
      }
      
      console.log(`User ${userId} with role ${userRole} is accessing contract ${id}`);
      
      // Allow access if user is the business owner or the assigned contractor
      const hasAccess =
        (userRole === 'business' && contract.businessId === userId) || 
        (userRole === 'contractor' && contract.contractorId === userId);
        
      if (!hasAccess) {
        console.log(`User ${userId} with role ${userRole} tried to access contract ${id} without permission`);
        return res.status(403).json({ message: "You don't have permission to view this project" });
      }
      
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Error fetching contract" });
    }
  });
  
  app.post(`${apiRouter}/contracts`, requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("[Contract Creation] Request body:", JSON.stringify(req.body));
      const contractInput = insertContractSchema.parse(req.body);
      const userId = req.user?.id;
      
      // If creating a business contract, check budget availability
      if (req.user?.role === 'business' && userId) {
        // Parse contract value to a number, it's stored as a string in Decimal format
        const contractValue = parseFloat(contractInput.value.toString());
        
        // Check if this contract would exceed the budget limit
        const isBudgetAvailable = await storage.checkBudgetAvailable(userId, contractValue);
        
        if (!isBudgetAvailable) {
          return res.status(400).json({
            message: "Budget exceeded",
            error: "This contract would exceed your allocated budget. Please adjust your budget cap or contract value."
          });
        }
        
        // If budget is available, increase the budget used amount
        await storage.increaseBudgetUsed(userId, contractValue);
      }
      
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
  
  app.delete(`${apiRouter}/contracts/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContract(id);
      
      if (!contract) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get user ID from session or X-User-ID header
      const userId = req.user?.id || (req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : null);
      
      if (!userId) {
        console.log("No user ID found when deleting contract");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Check if user has permission (is the business owner of the contract)
      if (userId !== contract.businessId) {
        console.log(`User ${userId} tried to delete contract ${id} owned by business ${contract.businessId}`);
        return res.status(403).json({ message: "You don't have permission to delete this project" });
      }
      
      console.log(`User ${userId} is deleting contract ${id}`);
      
      // Check if this is a force delete (permanent deletion)
      const forceDelete = req.query.force === 'true';
      
      if (forceDelete && contract.status === 'deleted') {
        // Permanently delete the contract from the database
        console.log(`Permanently deleting contract ${id}`);
        const deleted = await storage.permanentlyDeleteContract(id);
        
        if (!deleted) {
          return res.status(400).json({ 
            message: "Cannot permanently delete this project." 
          });
        }
        
        return res.status(200).json({ message: "Project permanently deleted" });
      } else {
        // Normal soft delete (mark as deleted)
        const deleted = await storage.deleteContract(id);
        
        if (!deleted) {
          return res.status(400).json({ 
            message: "Cannot delete this project. Make sure it doesn't have any contractors assigned." 
          });
        }
        
        res.status(200).json({ message: "Project deleted successfully" });
      }
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Error deleting project" });
    }
  });
  
  // Milestone routes
  app.get(`${apiRouter}/milestones`, async (req: Request, res: Response) => {
    try {
      const contractId = req.query.contractId ? parseInt(req.query.contractId as string) : null;
      const upcoming = req.query.upcoming === 'true';
      
      let milestones;
      if (contractId) {
        // Check if the contract is deleted
        const contract = await storage.getContract(contractId);
        if (contract && contract.status === 'deleted') {
          return res.json([]); // Return empty array for deleted contracts
        }
        milestones = await storage.getMilestonesByContractId(contractId);
      } else if (upcoming) {
        milestones = await storage.getUpcomingMilestones(5); // Limit to 5 for dashboard
        
        // Get all active contracts to filter milestones
        const allContracts = await storage.getAllContracts();
        const activeContractIds = allContracts
          .filter(contract => contract && contract.status !== 'deleted')
          .map(contract => contract.id);
          
        // Filter out milestones for deleted contracts
        milestones = milestones.filter(milestone => 
          activeContractIds.includes(milestone.contractId));
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
      const userId = req.user?.id || (req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : null);
      const userRole = req.user?.role || 'business'; // Default to business if not specified
      
      const contractId = req.query.contractId ? parseInt(req.query.contractId as string) : null;
      let payments = await storage.getAllPayments(contractId);
      
      // Log debugging information
      console.log(`Fetching payments for user ID ${userId} with role ${userRole}`);
      
      if (!userId) {
        console.log("No authenticated user, returning empty payments array");
        return res.json([]);
      }
      
      // Get all contracts for the current user
      let userContracts = [];
      if (userRole === 'business') {
        userContracts = await storage.getContractsByBusinessId(userId);
      } else if (userRole === 'contractor') {
        userContracts = await storage.getContractsByContractorId(userId);
      }
      
      console.log(`Found ${userContracts.length} contracts for user ${userId}`);
      
      // Get IDs of all the user's contracts (both active and deleted)
      const userContractIds = userContracts.map(contract => contract.id);
      
      // First filter: only keep payments for this user's contracts
      payments = payments.filter(payment => userContractIds.includes(payment.contractId));
      console.log(`After filtering for user's contracts: ${payments.length} payments remaining`);
      
      // Second filter: exclude payments for deleted contracts
      const activeContracts = userContracts.filter(contract => contract.status !== 'deleted');
      const activeContractIds = activeContracts.map(contract => contract.id);
      
      payments = payments.filter(payment => activeContractIds.includes(payment.contractId));
      console.log(`After filtering out deleted contracts: ${payments.length} payments remaining`);
      
      // Only create virtual pending payments for ACTIVE contracts
      const pendingContractPayments = activeContracts
        .filter(contract => contract.status !== 'deleted') // Double-check no deleted contracts slip through
        .map(contract => {
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
        }).filter(Boolean); // Remove null entries
      
      console.log(`Generated ${pendingContractPayments.length} virtual pending payments`);
      
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
      const userId = req.user?.id;
      const userRole = req.user?.role || 'business';
      
      let documents = [];
      if (contractId) {
        // If contractId is provided, return documents for that contract
        documents = await storage.getDocumentsByContractId(contractId);
      } else if (userId && userRole === 'business') {
        // If user is logged in and is a business, get contracts for that user
        const contracts = await storage.getContractsByBusinessId(userId);
        
        // Fetch documents for each contract
        for (const contract of contracts) {
          const contractDocuments = await storage.getDocumentsByContractId(contract.id);
          documents = [...documents, ...contractDocuments];
        }
      } else if (userId && userRole === 'contractor') {
        // If user is logged in and is a contractor, get contracts for that contractor
        const contracts = await storage.getContractsByContractorId(userId);
        
        // Fetch documents for each contract
        for (const contract of contracts) {
          const contractDocuments = await storage.getDocumentsByContractId(contract.id);
          documents = [...documents, ...contractDocuments];
        }
      } else {
        // For development only - if not logged in, return an empty array
        // In production, this would return a 401 Unauthorized
        documents = [];
      }
      
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Error fetching documents" });
    }
  });
  
  // Deleted Projects folder in Data Room
  app.get(`${apiRouter}/deleted-contracts`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userRole = req.user?.role || 'business';
      if (userRole !== 'business') {
        return res.status(403).json({ message: 'Only business users can access deleted projects' });
      }
      
      const deletedContracts = await storage.getDeletedContractsByBusinessId(userId);
      console.log(`Retrieved ${deletedContracts.length} deleted contracts for business ${userId}`);
      
      res.json(deletedContracts);
    } catch (error) {
      console.error('Error fetching deleted contracts:', error);
      res.status(500).json({ message: 'Error fetching deleted contracts' });
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
  
  // Dashboard summary endpoint
  app.get(`${apiRouter}/dashboard`, requireAuth, async (req: Request, res: Response) => {
    try {
      // Get the current user
      const userId = req.user?.id;
      const userRole = req.user?.role || 'business'; // Default to business if not specified
      
      let userContracts = [];
      
      // Filter contracts by user ID if available
      if (userId && userRole === 'business') {
        userContracts = await storage.getContractsByBusinessId(userId);
      } else if (userId && userRole === 'contractor') {
        userContracts = await storage.getContractsByContractorId(userId);
      } else {
        // For development/testing only when not logged in
        userContracts = await storage.getAllContracts();
      }
      
      // Active contracts are those with status 'active'
      const activeContracts = userContracts.filter(contract => contract.status === 'active');
      
      // Pending approvals are contracts with status 'pending_approval'
      const pendingApprovals = userContracts.filter(contract => contract.status === 'pending_approval');
      
      // Get the upcoming payments (5 most recent)
      let upcomingPayments = await storage.getUpcomingPayments(5);
      
      // Get active contract IDs to filter payments
      const activeContractIds = userContracts
        .filter(contract => contract.status !== 'deleted')
        .map(contract => contract.id);
      
      // Filter out payments for deleted contracts
      upcomingPayments = upcomingPayments.filter(payment => 
        activeContractIds.includes(payment.contractId));
      
      // Get the upcoming milestones (5 most recent)
      let upcomingMilestones = await storage.getUpcomingMilestones(5);
      
      // Filter out milestones for deleted contracts using the activeContractIds
      upcomingMilestones = upcomingMilestones.filter(milestone => 
        activeContractIds.includes(milestone.contractId));
      
      // For each active contract, ensure there are payments that reflect the contract value
      // If not, create a virtual pending payment for the dashboard
      const pendingContractPayments = userContracts
        .filter(contract => contract.status !== 'deleted')
        .map(contract => {
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
      
      // Skip invites in dashboard for now - they're causing the error
      let pendingInvites = [];
      try {
        // Only try to get invites if we have a business user
        if (userRole === 'business' && userId) {
          // Use the business onboarding link count instead of invites
          const businessLink = await storage.getBusinessOnboardingLink(userId);
          // We will just display this as a count for now
          pendingInvites = businessLink ? [businessLink] : [];
        }
      } catch (inviteError) {
        console.log("Non-critical error fetching invites for dashboard:", inviteError);
        // Continue with empty invites array
      }
      
      const dashboardData = {
        stats: {
          activeContractsCount: activeContracts.length,
          pendingApprovalsCount: pendingApprovals.length,
          paymentsProcessed: totalPaymentsValue,
          totalPendingValue: totalPendingValue, // Add total pending value from contracts
          activeContractorsCount: activeContractorsCount, // Use the proper active contractors count
          pendingInvitesCount: pendingInvites.length
        },
        contracts: userContracts,
        contractors: allContractors,  // Add contractors data
        milestones: upcomingMilestones,
        payments: allUpcomingPayments, // Include virtual payments
        // Only include minimal invite data to prevent errors
        invites: pendingInvites.map(item => ({
          id: typeof item.id === 'number' ? item.id : 0,
          email: typeof item.token === 'string' ? 'company-invite@creativlinc.com' : '',
          status: 'active',
          workerType: item.workerType || 'contractor',
          projectName: 'Company Onboarding'
        }))
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Error fetching dashboard data", error: String(error) });
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
  
  // Business Onboarding Link APIs
  // Debug endpoint to check authentication status
  app.get(`${apiRouter}/session-debug`, async (req: Request, res: Response) => {
    console.log("Session debug request received, auth status:", req.isAuthenticated());
    
    if (req.isAuthenticated()) {
      res.json({
        isAuthenticated: true,
        user: {
          id: req.user?.id,
          username: req.user?.username,
          role: req.user?.role
        },
        session: req.session
      });
    } else {
      res.json({
        isAuthenticated: false,
        session: req.session
      });
    }
  });
  
  // Business invite link - temporarily remove requireAuth for debugging
  app.post(`${apiRouter}/business/invite-link`, async (req: Request, res: Response) => {
    console.log("Business invite link request received, auth status:", req.isAuthenticated());
    
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated", debug: true });
    }
    
    try {
      // Only business users can create invite links
      if (req.user!.role !== 'business') {
        return res.status(403).json({ message: "Only business accounts can generate invite links" });
      }
      
      const { workerType = 'contractor' } = req.body;
      
      // Create or update the business invite link
      const link = await storage.createBusinessOnboardingLink(req.user!.id, workerType);
      
      // Get the app URL
      const appUrl = `${req.protocol}://${req.get('host')}`;
      
      // Create a simpler, direct link format
      const businessName = req.user?.company || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim();
      const inviteUrl = `${appUrl}/auth?invite=contractor&email=direct&token=${link.token}&businessId=${req.user!.id}&workerType=${workerType}`;
      
      res.json({
        token: link.token,
        workerType: link.workerType,
        active: link.active,
        url: inviteUrl
      });
    } catch (error: any) {
      console.error("Error generating business invite link:", error);
      res.status(500).json({ message: "Error generating business invite link" });
    }
  });

  app.get(`${apiRouter}/business/verify-token`, async (req: Request, res: Response) => {
    try {
      const { token, businessId } = req.query;
      
      console.log("Verifying token:", { token, businessId, query: req.query });
      
      if (!token || !businessId) {
        return res.status(400).json({ 
          valid: false, 
          message: "Token and businessId are required" 
        });
      }
      
      // Verify the token is valid
      const tokenInfo = await storage.verifyOnboardingToken(token as string);
      
      console.log("Token info result:", tokenInfo);
      
      if (!tokenInfo || tokenInfo.businessId !== parseInt(businessId as string)) {
        return res.status(400).json({ 
          valid: false, 
          message: "Invalid or expired token" 
        });
      }
      
      // Get business info to return with verification
      const business = await storage.getUser(parseInt(businessId as string));
      
      res.json({
        valid: true,
        businessId: tokenInfo.businessId,
        workerType: tokenInfo.workerType,
        businessName: business ? `${business.company || business.firstName + ' ' + business.lastName}` : "Business"
      });
    } catch (error) {
      console.error("Error verifying business token:", error);
      res.status(500).json({ 
        valid: false, 
        message: "Error verifying business token" 
      });
    }
  });
  
  app.get(`${apiRouter}/business/invite-link`, requireAuth, async (req: Request, res: Response) => {
    try {
      // Only business users can view their invite links
      if (req.user!.role !== 'business') {
        return res.status(403).json({ message: "Only business accounts can access invite links" });
      }
      
      const link = await storage.getBusinessOnboardingLink(req.user!.id);
      
      if (!link) {
        return res.status(404).json({ message: "No active invite link found" });
      }
      
      // Get the app URL
      const appUrl = `${req.protocol}://${req.get('host')}`;
      
      // Return the link with the same simplified URL format
      const businessName = req.user?.company || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim();
      const inviteUrl = `${appUrl}/auth?invite=contractor&email=direct&token=${link.token}&businessId=${req.user!.id}&workerType=${link.workerType}`;
      
      res.json({
        token: link.token,
        workerType: link.workerType,
        active: link.active,
        url: inviteUrl
      });
    } catch (error: any) {
      console.error("Error fetching business invite link:", error);
      res.status(500).json({ message: "Error fetching business invite link" });
    }
  });

  app.delete(`${apiRouter}/business/invite-link`, requireAuth, async (req: Request, res: Response) => {
    try {
      // Only business users can deactivate their invite links
      if (req.user!.role !== 'business') {
        return res.status(403).json({ message: "Only business accounts can manage invite links" });
      }
      
      // Deactivate the invite link by setting active to false
      await storage.updateBusinessOnboardingLink(req.user!.id, { active: false });
      
      res.status(200).json({ message: "Invite link deactivated successfully" });
    } catch (error: any) {
      console.error("Error deactivating business invite link:", error);
      res.status(500).json({ message: "Error deactivating business invite link" });
    }
  });

  // Verify business invite token
  app.post(`${apiRouter}/business/verify-invite`, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      // Check for the fallback token format: "fallback-token-{userId}" or "permanent-link-{userId}"
      if (token.startsWith('fallback-token-') || token.startsWith('permanent-link-')) {
        // Extract the user ID from the token
        const userId = parseInt(token.split('-').pop() || '0');
        
        if (!userId) {
          return res.status(400).json({ message: "Invalid fallback token format" });
        }
        
        // Get the business user's info
        const business = await storage.getUser(userId);
        
        if (!business || business.role !== 'business') {
          return res.status(404).json({ message: "Invalid business user ID in token" });
        }
        
        console.log("Using fallback token verification for business ID:", userId);
        
        // Return the business info with default worker type
        return res.json({
          valid: true,
          businessId: business.id,
          businessName: business.company || `${business.firstName || ''} ${business.lastName || ''}`.trim(),
          workerType: 'contractor'
        });
      }
      
      // Standard token verification
      const linkInfo = await storage.verifyOnboardingToken(token);
      
      if (!linkInfo) {
        return res.status(404).json({ message: "Invalid or expired invite link" });
      }
      
      // Get the business name to show in the registration page
      const business = await storage.getUser(linkInfo.businessId);
      
      res.json({
        valid: true,
        businessId: linkInfo.businessId,
        businessName: business ? (business.companyName || `${business.firstName || ''} ${business.lastName || ''}`).trim() : "Unknown Business",
        workerType: linkInfo.workerType
      });
    } catch (error: any) {
      console.error("Error verifying business invite link:", error);
      res.status(500).json({ message: "Error verifying business invite link" });
    }
  });
  
  // Reports API endpoint - integrates with real payment and project data
  app.get(`${apiRouter}/reports`, requireAuth, async (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange as string || 'year';
      
      // Get the authenticated user ID - use X-User-ID header as a fallback
      let userId: number | undefined;
      let userRole: string = 'business';
      
      // First try to get user from the session
      if (req.user) {
        userId = req.user.id;
        userRole = req.user.role || 'business';
      } else {
        // Fallback to X-User-ID header
        const userIdHeader = req.headers['x-user-id'];
        if (userIdHeader) {
          userId = parseInt(userIdHeader.toString(), 10);
          
          // Get user role from storage
          try {
            const user = await storage.getUser(userId);
            if (user) {
              userRole = user.role || 'business';
            }
          } catch (err) {
            console.error('Error getting user from X-User-ID header:', err);
          }
        }
      }
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log(`Generating reports for user ${userId} with role ${userRole}`);
      
      // Get all contracts for the current user
      let contracts = [];
      if (userRole === 'business') {
        contracts = await storage.getContractsByBusinessId(userId);
      } else if (userRole === 'contractor') {
        contracts = await storage.getContractsByContractorId(userId);
      } else {
        contracts = await storage.getAllContracts();
      }
      
      // Filter out deleted contracts
      contracts = contracts.filter(contract => contract.status !== 'deleted');
      
      // Get only payments related to the user's contracts
      const contractIds = contracts.map(contract => contract.id);
      console.log(`Filtering payments for contract IDs: ${contractIds.join(', ')}`);
      
      // Only get payments for the filtered contracts
      let payments = await storage.getAllPayments(null);
      if (contractIds.length > 0) {
        payments = payments.filter(payment => contractIds.includes(payment.contractId));
      } else {
        payments = []; // No contracts means no payments
      }
      
      // Get only milestones related to the user's contracts
      let milestones = await storage.getAllMilestones();
      if (contractIds.length > 0) {
        milestones = milestones.filter(milestone => contractIds.includes(milestone.contractId));
      } else {
        milestones = []; // No contracts means no milestones
      }
      
      // Get contractors associated with the user's contracts
      const contractors = await storage.getUsersByRole('contractor');
      
      // Get the list of contractor IDs from the user's contracts
      const contractorIds = contracts
        .filter(contract => contract.contractorId !== null)
        .map(contract => contract.contractorId as number);
      
      // Filter contractors to only include those associated with the user's contracts
      const filteredContractors = contractorIds.length > 0
        ? contractors.filter(contractor => contractorIds.includes(contractor.id))
        : [];
      
      // Calculate contract status counts
      const activeContracts = contracts.filter(contract => contract.status === 'active');
      const completedContracts = contracts.filter(contract => contract.status === 'completed');
      const pendingContracts = contracts.filter(contract => 
        contract.status === 'pending_approval' || contract.status === 'pending');
      
      // Calculate average contract value
      const totalContractValue = contracts.reduce((total, contract) => 
        total + parseFloat(contract.value?.toString() || '0'), 0);
      const avgContractValue = contracts.length > 0 ? totalContractValue / contracts.length : 0;
      
      // Calculate completion rate
      const completionRate = contracts.length > 0 
        ? (completedContracts.length / contracts.length) * 100 
        : 0;
      
      // Group payments by month
      const paymentsByMonth = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = new Date().getFullYear();
      
      // Initialize months with zero values
      months.forEach((month, index) => {
        paymentsByMonth.push({
          month,
          value: 0
        });
      });
      
      // Sum payments by month
      payments.forEach(payment => {
        // Use scheduledDate since createdAt might not exist on payment object
        const paymentDate = new Date(payment.scheduledDate || new Date());
        if (paymentDate.getFullYear() === currentYear) {
          const monthIndex = paymentDate.getMonth();
          paymentsByMonth[monthIndex].value += parseFloat(payment.amount?.toString() || '0');
        }
      });
      
      // Get top contractors by payment amount
      const contractorPayments = new Map();
      payments.forEach(payment => {
        const contract = contracts.find(c => c.id === payment.contractId);
        if (contract && contract.contractorId) {
          const contractorId = contract.contractorId;
          const amount = parseFloat(payment.amount?.toString() || '0');
          
          if (contractorPayments.has(contractorId)) {
            contractorPayments.set(contractorId, contractorPayments.get(contractorId) + amount);
          } else {
            contractorPayments.set(contractorId, amount);
          }
        }
      });
      
      // Convert to array and sort by amount
      const topContractorsArray = Array.from(contractorPayments.entries())
        .map(([contractorId, amount]) => {
          const contractor = filteredContractors.find(c => c.id === contractorId);
          return {
            id: contractorId,
            name: contractor ? `${contractor.firstName} ${contractor.lastName}` : 'Unknown',
            amount
          };
        })
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      
      const reportsData = {
        summary: {
          totalContracts: contracts.length,
          totalContractors: filteredContractors.length,
          totalPayments: payments.length,
          totalMilestones: milestones.length,
          avgContractValue: Math.round(avgContractValue * 100) / 100,
          completionRate: Math.round(completionRate * 100) / 100
        },
        paymentsByMonth,
        contractsByStatus: [
          { status: 'active', count: activeContracts.length },
          { status: 'completed', count: completedContracts.length },
          { status: 'pending', count: pendingContracts.length }
        ],
        topContractors: topContractorsArray
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
        const fakePaymentIntentId = `pi_${nodeCrypto.randomBytes(16).toString('hex')}`;
        const fakeClientSecret = `${fakePaymentIntentId}_secret_${nodeCrypto.randomBytes(8).toString('hex')}`;
        
        // Simulate a payment intent object
        paymentIntent = {
          id: fakePaymentIntentId,
          clientSecret: fakeClientSecret,
          status: 'requires_payment_method'
        };
        
        // Generate a fake transfer ID for simulation
        const fakeTransferId = `tr_${nodeCrypto.randomBytes(16).toString('hex')}`;
        
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
  
  // Budget Management Routes
  
  // Get budget information for the current user
  app.get(`${apiRouter}/budget`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get the user with budget information
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return budget-related information
      res.json({
        budgetCap: user.budgetCap || null,
        budgetUsed: user.budgetUsed || '0',
        budgetPeriod: user.budgetPeriod || 'yearly',
        budgetStartDate: user.budgetStartDate || null,
        budgetEndDate: user.budgetEndDate || null,
        budgetResetEnabled: user.budgetResetEnabled || false,
        remainingBudget: user.budgetCap 
          ? (parseFloat(user.budgetCap.toString()) - parseFloat(user.budgetUsed?.toString() || '0')).toFixed(2)
          : null
      });
    } catch (error) {
      console.error("Error fetching budget information:", error);
      res.status(500).json({ message: "Error fetching budget information" });
    }
  });
  
  // Set budget cap for the current user
  app.post(`${apiRouter}/budget`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Validate request body
      const { budgetCap, budgetPeriod, startDate, endDate, resetEnabled } = req.body;
      
      if (!budgetCap || isNaN(parseFloat(budgetCap))) {
        return res.status(400).json({ message: "Valid budget cap is required" });
      }
      
      // Parse dates if provided
      const parsedStartDate = startDate ? new Date(startDate) : undefined;
      const parsedEndDate = endDate ? new Date(endDate) : undefined;
      
      // Set budget cap
      const user = await storage.setBudgetCap(
        userId, 
        parseFloat(budgetCap), 
        budgetPeriod || 'yearly',
        parsedStartDate,
        parsedEndDate
      );
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update reset flag if provided
      if (resetEnabled !== undefined) {
        await storage.updateUser(userId, { budgetResetEnabled: resetEnabled });
      }
      
      // Return updated budget information
      res.json({
        budgetCap: user.budgetCap,
        budgetUsed: user.budgetUsed || '0',
        budgetPeriod: user.budgetPeriod,
        budgetStartDate: user.budgetStartDate,
        budgetEndDate: user.budgetEndDate,
        budgetResetEnabled: resetEnabled !== undefined ? resetEnabled : user.budgetResetEnabled,
        remainingBudget: user.budgetCap 
          ? (parseFloat(user.budgetCap.toString()) - parseFloat(user.budgetUsed?.toString() || '0')).toFixed(2)
          : null
      });
    } catch (error) {
      console.error("Error setting budget cap:", error);
      res.status(500).json({ message: "Error setting budget cap" });
    }
  });
  
  // Reset budget used amount to zero
  app.post(`${apiRouter}/budget/reset`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const user = await storage.resetBudgetUsed(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        budgetCap: user.budgetCap,
        budgetUsed: '0',
        budgetPeriod: user.budgetPeriod,
        budgetStartDate: user.budgetStartDate,
        budgetEndDate: user.budgetEndDate,
        budgetResetEnabled: user.budgetResetEnabled,
        remainingBudget: user.budgetCap ? parseFloat(user.budgetCap.toString()).toFixed(2) : null
      });
    } catch (error) {
      console.error("Error resetting budget used:", error);
      res.status(500).json({ message: "Error resetting budget used" });
    }
  });
  
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

  // Work Request routes
  app.get(`${apiRouter}/work-requests`, requireAuth, async (req: Request, res: Response) => {
    try {
      const businessId = req.query.businessId ? parseInt(req.query.businessId as string) : null;
      const email = req.query.email as string;
      const pending = req.query.pending === 'true';
      const token = req.query.token as string;
      const currentUser = req.user;
      
      let workRequests = [];
      
      // If token is provided, get the specific work request by token
      if (token) {
        // Hash the provided token for lookup
        const tokenHash = nodeCrypto.createHash('sha256').update(token).digest('hex');
        const workRequest = await storage.getWorkRequestByToken(tokenHash);
        workRequests = workRequest ? [workRequest] : [];
      }
      // If businessId is provided, get work requests for that business
      else if (businessId) {
        // Make sure the user has permissions (is the business owner or an admin)
        if (currentUser && (currentUser.id === businessId || currentUser.role === 'admin')) {
          workRequests = await storage.getWorkRequestsByBusinessId(businessId);
        } else {
          return res.status(403).json({ message: "Unauthorized to access these work requests" });
        }
      }
      // If email is provided, get work requests for that email
      else if (email) {
        // Allow users to see their own work requests by email
        if (currentUser && (currentUser.email === email || currentUser.role === 'admin')) {
          // Pass the email to the storage layer to find work requests by recipient email
          workRequests = await storage.getWorkRequestsByEmail(email);
        } else {
          return res.status(403).json({ message: "Unauthorized to access these work requests" });
        }
      }
      // If pending flag is provided, get all pending work requests (admin only)
      else if (pending && currentUser && currentUser.role === 'admin') {
        workRequests = await storage.getPendingWorkRequests();
      }
      // Default to getting work requests based on the user's role
      else if (currentUser) {
        if (currentUser.role === 'business') {
          workRequests = await storage.getWorkRequestsByBusinessId(currentUser.id);
        } else if (currentUser.role === 'contractor' || currentUser.role === 'freelancer') {
          workRequests = await storage.getWorkRequestsByEmail(currentUser.email);
        }
      }
      
      res.json(workRequests);
    } catch (error) {
      console.error("Error fetching work requests:", error);
      res.status(500).json({ message: "Error fetching work requests" });
    }
  });
  
  app.get(`${apiRouter}/work-requests/:id`, requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const workRequest = await storage.getWorkRequest(id);
      
      if (!workRequest) {
        return res.status(404).json({ message: "Work request not found" });
      }
      
      // Check permissions - only the business that created it, the email recipient, or admin can view
      const currentUser = req.user;
      if (currentUser && (
        currentUser.id === workRequest.businessId || 
        currentUser.email === workRequest.recipientEmail ||
        currentUser.role === 'admin'
      )) {
        res.json(workRequest);
      } else {
        res.status(403).json({ message: "Unauthorized to access this work request" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching work request" });
    }
  });
  
  app.post(`${apiRouter}/work-requests`, requireAuth, async (req: Request, res: Response) => {
    try {
      // Only business users can create work requests
      const currentUser = req.user;
      if (!currentUser || currentUser.role !== 'business') {
        return res.status(403).json({ message: "Only business users can create work requests" });
      }
      
      // Parse and validate the input
      const workRequestInput = insertWorkRequestSchema.parse(req.body);
      
      // Make sure the businessId matches the current user
      if (workRequestInput.businessId !== currentUser.id) {
        return res.status(403).json({ message: "Cannot create work requests for other businesses" });
      }
      
      // Generate a secure token for this work request
      const { token, tokenHash } = generateWorkRequestToken();
      
      // Create the work request with the token hash
      const newWorkRequest = await storage.createWorkRequest(workRequestInput, tokenHash);
      
      // Get application URL, handling both Replit and local environments
      let appUrl = `${req.protocol}://${req.get('host')}`;
      
      // Check if running in Replit
      if (process.env.REPLIT_DEV_DOMAIN) {
        appUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      }
      
      // Use the business name from the current user
      const businessName = currentUser.companyName || currentUser.firstName + ' ' + currentUser.lastName || currentUser.username;
      
      // Generate the shareable link
      const shareableLink = `${appUrl}/work-requests/respond?token=${token}`;
      
      // Send the email invitation if recipientEmail is provided
      if (newWorkRequest.recipientEmail) {
        try {
          const { sendWorkRequestEmail } = await import('./services/email');
          
          console.log(`Sending work request email to ${newWorkRequest.recipientEmail}`);
          await sendWorkRequestEmail(newWorkRequest, token, businessName, appUrl);
          console.log(`Work request email sent to ${newWorkRequest.recipientEmail}`);
        } catch (emailError) {
          console.error('Failed to send work request email:', emailError);
          // Continue with the response even if email fails
        }
      }
      
      // Return the created work request along with the shareable link
      res.status(201).json({
        workRequest: newWorkRequest,
        shareableLink
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid work request data", errors: error.errors });
      }
      console.error('Error creating work request:', error);
      res.status(500).json({ message: "Error creating work request" });
    }
  });
  
  app.patch(`${apiRouter}/work-requests/:id`, requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const currentUser = req.user;
      
      // Get the existing work request
      const existingWorkRequest = await storage.getWorkRequest(id);
      if (!existingWorkRequest) {
        return res.status(404).json({ message: "Work request not found" });
      }
      
      // Permission check - only the business that created it or an admin can update it
      if (!(currentUser && (currentUser.id === existingWorkRequest.businessId || currentUser.role === 'admin'))) {
        return res.status(403).json({ message: "Unauthorized to update this work request" });
      }
      
      // Update the work request
      const updatedWorkRequest = await storage.updateWorkRequest(id, updateData);
      
      if (!updatedWorkRequest) {
        return res.status(404).json({ message: "Work request not found" });
      }
      
      res.json(updatedWorkRequest);
    } catch (error) {
      res.status(500).json({ message: "Error updating work request" });
    }
  });
  
  // Endpoint for accepting a work request and linking it to a contract
  app.post(`${apiRouter}/work-requests/:id/accept`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { token, contractId } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required to verify work request" });
      }
      
      // Get the work request
      const workRequest = await storage.getWorkRequest(id);
      if (!workRequest) {
        return res.status(404).json({ message: "Work request not found" });
      }
      
      // Verify the token
      const isValidToken = await import('./services/email').then(
        ({ verifyWorkRequestToken }) => verifyWorkRequestToken(token, workRequest.tokenHash)
      );
      
      if (!isValidToken) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      // Check if the work request is still pending and not expired
      if (workRequest.status !== 'pending') {
        return res.status(400).json({ message: `Work request is already ${workRequest.status}` });
      }
      
      if (workRequest.expiresAt && new Date(workRequest.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Work request has expired" });
      }
      
      // If a contractId is provided, link to that contract
      if (contractId) {
        const contract = await storage.getContract(contractId);
        if (!contract) {
          return res.status(404).json({ message: "Contract not found" });
        }
        
        // Link work request to contract and change status to 'accepted'
        const updatedWorkRequest = await storage.linkWorkRequestToContract(id, contractId);
        return res.json(updatedWorkRequest);
      } else {
        // If no contractId is provided, just update the status to 'accepted'
        const updatedWorkRequest = await storage.updateWorkRequest(id, { status: 'accepted' });
        return res.json(updatedWorkRequest);
      }
    } catch (error) {
      console.error('Error accepting work request:', error);
      res.status(500).json({ message: "Error accepting work request" });
    }
  });
  
  // Endpoint for declining a work request
  app.post(`${apiRouter}/work-requests/:id/decline`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { token, reason } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required to verify work request" });
      }
      
      // Get the work request
      const workRequest = await storage.getWorkRequest(id);
      if (!workRequest) {
        return res.status(404).json({ message: "Work request not found" });
      }
      
      // Verify the token
      const isValidToken = await import('./services/email').then(
        ({ verifyWorkRequestToken }) => verifyWorkRequestToken(token, workRequest.tokenHash)
      );
      
      if (!isValidToken) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      // Check if the work request is still pending and not expired
      if (workRequest.status !== 'pending') {
        return res.status(400).json({ message: `Work request is already ${workRequest.status}` });
      }
      
      // Update the work request status to 'declined'
      const updatedWorkRequest = await storage.updateWorkRequest(id, { 
        status: 'declined',
        // Store the reason in the description field since that exists in the schema
        description: reason || 'Request declined' // Optional reason for declining
      });
      
      res.json(updatedWorkRequest);
    } catch (error) {
      console.error('Error declining work request:', error);
      res.status(500).json({ message: "Error declining work request" });
    }
  });
  
  // Endpoint to generate a shareable link for an existing work request
  app.post(`${apiRouter}/work-requests/:id/generate-link`, requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.user;
      
      // Get the work request
      const workRequest = await storage.getWorkRequest(id);
      if (!workRequest) {
        return res.status(404).json({ message: "Work request not found" });
      }
      
      // Permission check - only the business that created it or an admin can generate a link
      if (!(currentUser && (currentUser.id === workRequest.businessId || currentUser.role === 'admin'))) {
        return res.status(403).json({ message: "Unauthorized to generate a link for this work request" });
      }
      
      // Generate a new token if needed (if token was not originally stored)
      let token;
      
      if (!workRequest.tokenHash) {
        // Generate a new token
        const tokenData = generateWorkRequestToken();
        token = tokenData.token;
        
        // Use the updateWorkRequestSchema to ensure tokenHash is accepted
        const updateData = updateWorkRequestSchema.parse({ tokenHash: tokenData.tokenHash });
        await storage.updateWorkRequest(id, updateData);
      } else {
        // We can't retrieve the original token since we only store the hash
        // So we'll generate a new token and update the hash
        const tokenData = generateWorkRequestToken();
        token = tokenData.token;
        
        // Use the updateWorkRequestSchema to ensure tokenHash is accepted
        const updateData = updateWorkRequestSchema.parse({ tokenHash: tokenData.tokenHash });
        await storage.updateWorkRequest(id, updateData);
      }
      
      // Get application URL, handling both Replit and local environments
      let appUrl = `${req.protocol}://${req.get('host')}`;
      
      // Check if running in Replit
      if (process.env.REPLIT_DEV_DOMAIN) {
        appUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      }
      
      // Generate the shareable link
      const shareableLink = `${appUrl}/work-requests/respond?token=${token}`;
      
      res.json({ shareableLink });
    } catch (error) {
      console.error('Error generating shareable link:', error);
      res.status(500).json({ message: "Error generating shareable link" });
    }
  });
  
  // Endpoint to verify a work request token without accepting/declining
  app.post(`${apiRouter}/work-requests/verify-token`, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      // Hash the token for lookup
      const tokenHash = nodeCrypto.createHash('sha256').update(token).digest('hex');
      
      // Find the work request by token hash
      const workRequest = await storage.getWorkRequestByToken(tokenHash);
      
      if (!workRequest) {
        return res.status(404).json({ message: "Invalid or expired token" });
      }
      
      // Check if the work request is expired
      if (workRequest.expiresAt && new Date(workRequest.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Work request has expired" });
      }
      
      // Return basic information about the work request
      res.json({
        valid: true,
        workRequestId: workRequest.id,
        status: workRequest.status,
        title: workRequest.title, // Use title field from work request
        businessId: workRequest.businessId,
        expired: workRequest.expiresAt && new Date(workRequest.expiresAt) < new Date()
      });
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(500).json({ message: "Error verifying token" });
    }
  });
  
  // Profile Code Routes
  app.get(`${apiRouter}/profile-code`, requireAuth, async (req: Request, res: Response) => {
    try {
      // Retrieve a user's profile code
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return the profile code (might be null if not generated yet)
      res.json({
        code: user.profileCode,
        userId: user.id,
        createdAt: user.updatedAt // Using updatedAt as a proxy for when the code was created/updated
      });
    } catch (error: any) {
      console.error('Error retrieving profile code:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiRouter}/profile-code/generate`, requireAuth, async (req: Request, res: Response) => {
    try {
      // Generate a new profile code for the authenticated user
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only contractors and freelancers can have profile codes
      const userRole = req.user?.role;
      if (userRole !== 'contractor' && userRole !== 'freelancer') {
        return res.status(403).json({ message: "Only contractors and freelancers can generate profile codes" });
      }
      
      // Generate a new profile code
      const profileCode = await storage.generateProfileCode(userId);
      
      res.json({ 
        code: profileCode,
        userId: userId,
        createdAt: new Date()
      });
    } catch (error: any) {
      console.error('Error generating profile code:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiRouter}/profile-code/regenerate`, requireAuth, async (req: Request, res: Response) => {
    try {
      // Regenerate a profile code for the authenticated user
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only contractors and freelancers can have profile codes
      const userRole = req.user?.role;
      if (userRole !== 'contractor' && userRole !== 'freelancer') {
        return res.status(403).json({ message: "Only contractors and freelancers can regenerate profile codes" });
      }
      
      // Generate a new profile code
      const profileCode = await storage.regenerateProfileCode(userId);
      
      res.json({ 
        code: profileCode,
        userId: userId,
        createdAt: new Date()
      });
    } catch (error: any) {
      console.error('Error regenerating profile code:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiRouter}/contractors/find-by-profile-code/:profileCode`, async (req: Request, res: Response) => {
    try {
      const { profileCode } = req.params;
      
      if (!profileCode) {
        return res.status(400).json({ message: "Profile code is required" });
      }
      
      // Check for X-User-ID header for auth fallback
      const userId = req.header('X-User-ID') || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get user from storage to check role
      const currentUser = await storage.getUser(parseInt(userId.toString()));
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only businesses can search for contractors by profile code
      if (currentUser.role !== 'business') {
        return res.status(403).json({ message: "Only businesses can search for contractors by profile code" });
      }
      
      // Find the contractor by profile code
      const contractor = await storage.getUserByProfileCode(profileCode);
      
      if (!contractor) {
        return res.status(404).json({ message: "No contractor found with this profile code" });
      }
      
      // Return limited contractor information
      res.json({
        id: contractor.id,
        username: contractor.username,
        firstName: contractor.firstName,
        lastName: contractor.lastName,
        companyName: contractor.companyName,
        title: contractor.title,
        // Don't include email, password, or other sensitive information
      });
    } catch (error: any) {
      console.error('Error finding contractor by profile code:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Connection Request Routes
  app.post(`${apiRouter}/connection-requests`, async (req: Request, res: Response) => {
    try {
      // Create a new connection request
      const { profileCode, message } = req.body;
      
      if (!profileCode) {
        return res.status(400).json({ message: "Profile code is required" });
      }
      
      // Check for X-User-ID header for auth fallback
      const userId = req.header('X-User-ID') || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get user from storage to check role
      const currentUser = await storage.getUser(parseInt(userId.toString()));
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only businesses can create connection requests
      if (currentUser && currentUser.role !== 'business') {
        return res.status(403).json({ message: "Only businesses can create connection requests" });
      }
      
      // First check if the profile code is valid
      const contractor = await storage.getUserByProfileCode(profileCode);
      
      if (!contractor) {
        return res.status(404).json({ message: "Invalid profile code. Please check and try again." });
      }
      
      // Check if this contractor is already connected to this business
      // via contracts
      const businessId = parseInt(userId.toString());
      const existingContracts = await storage.getContractsByBusinessId(businessId);
      const alreadyConnected = existingContracts.some(contract => contract.contractorId === contractor.id);
      
      if (alreadyConnected) {
        return res.status(400).json({ message: "You are already connected with this contractor." });
      }
      
      // Create the connection request
      const createdRequest = await storage.createConnectionRequest({
        businessId: businessId,
        profileCode: profileCode,
        message: message || null,
        status: 'pending'
      });
      
      res.status(201).json(createdRequest);
    } catch (error: any) {
      console.error('Error creating connection request:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiRouter}/connection-requests`, requireAuth, async (req: Request, res: Response) => {
    try {
      // Get all connection requests for the authenticated user
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      let connectionRequests = [];
      
      if (userRole === 'business') {
        // If business, get requests sent by this business
        connectionRequests = await storage.getConnectionRequestsByBusinessId(userId);
      } else if (userRole === 'contractor' || userRole === 'freelancer') {
        // If contractor, get requests where this contractor is the recipient
        connectionRequests = await storage.getConnectionRequestsByContractorId(userId);
      }
      
      res.json(connectionRequests);
    } catch (error: any) {
      console.error('Error fetching connection requests:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.patch(`${apiRouter}/connection-requests/:id`, requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ message: "Valid status (accepted or declined) is required" });
      }
      
      // Get the connection request
      const connectionRequest = await storage.getConnectionRequest(parseInt(id));
      
      if (!connectionRequest) {
        return res.status(404).json({ message: "Connection request not found" });
      }
      
      // Check if the user is authorized to update this request
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      // Only the contractor can accept/decline requests
      if ((userRole !== 'contractor' && userRole !== 'freelancer') || 
          connectionRequest.contractorId !== userId) {
        return res.status(403).json({ message: "You are not authorized to update this connection request" });
      }
      
      // Update the request status
      const updatedRequest = await storage.updateConnectionRequest(parseInt(id), { status });
      
      // If the request is accepted, update the contractor's workerType to "contractor" if they're currently a "freelancer"
      if (status === 'accepted') {
        try {
          // Get the contractor's current data
          const contractor = await storage.getUser(userId);
          
          // If they exist, update them to contractor regardless of current type
          if (contractor) {
            await storage.updateUser(userId, { workerType: 'contractor' });
            console.log(`Updated user ${userId} type to contractor after connection acceptance (previous type: ${contractor.workerType || 'null'})`);
          }
        } catch (updateError) {
          console.error('Error updating contractor type:', updateError);
          // Don't fail the request if this update fails, just log it
        }
      }
      
      res.json(updatedRequest);
    } catch (error: any) {
      console.error('Error updating connection request:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get company onboarding links
  app.get(`${apiRouter}/business-onboarding-link`, requireAuth, async (req: Request, res: Response) => {
    try {
      const businessId = req.user?.id;
      
      if (!businessId || req.user?.role !== 'business') {
        return res.status(403).json({ message: "Only business accounts can access onboarding links" });
      }
      
      // Get the business onboarding link
      const link = await storage.getBusinessOnboardingLink(businessId);
      
      if (!link) {
        return res.status(404).json({ message: "No onboarding link found" });
      }
      
      // Get application URL, handling both Replit and local environments
      let appUrl = `${req.protocol}://${req.get('host')}`;
      
      // Check if running in Replit
      if (process.env.REPLIT_DEV_DOMAIN) {
        // Use the Replit-specific domain from environment
        appUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      }
      
      // Create the full invitation URL
      const inviteUrl = `${appUrl}/auth?invite=contractor&email=direct&token=${link.token}&businessId=${businessId}&workerType=${link.workerType}`;
      
      res.json({
        token: link.token,
        workerType: link.workerType,
        inviteUrl,
        createdAt: link.createdAt
      });
    } catch (error: any) {
      console.error('Error retrieving business onboarding link:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create or update company onboarding link
  app.post(`${apiRouter}/business-onboarding-link`, requireAuth, async (req: Request, res: Response) => {
    try {
      const businessId = req.user?.id;
      const { workerType } = req.body;
      
      if (!businessId || req.user?.role !== 'business') {
        return res.status(403).json({ message: "Only business accounts can create onboarding links" });
      }
      
      // Create or update the business onboarding link
      const link = await storage.createBusinessOnboardingLink(businessId, workerType || 'contractor');
      
      // Get application URL, handling both Replit and local environments
      let appUrl = `${req.protocol}://${req.get('host')}`;
      
      // Check if running in Replit
      if (process.env.REPLIT_DEV_DOMAIN) {
        // Use the Replit-specific domain from environment
        appUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      }
      
      // Create the full invitation URL
      const inviteUrl = `${appUrl}/auth?invite=contractor&email=direct&token=${link.token}&businessId=${businessId}&workerType=${link.workerType}`;
      
      res.status(201).json({
        token: link.token,
        workerType: link.workerType,
        inviteUrl,
        createdAt: link.createdAt
      });
    } catch (error: any) {
      console.error('Error creating business onboarding link:', error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
