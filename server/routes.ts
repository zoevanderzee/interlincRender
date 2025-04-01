import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertUserSchema,
  insertInviteSchema,
  insertContractSchema,
  insertMilestoneSchema,
  insertPaymentSchema,
  insertDocumentSchema
} from "@shared/schema";
import Stripe from "stripe";
import stripeService from "./services/stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes prefix
  const apiRouter = "/api";
  
  // User routes
  app.get(`${apiRouter}/users`, async (req: Request, res: Response) => {
    try {
      const role = req.query.role as string;
      const users = await storage.getUsersByRole(role || "");
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  app.get(`${apiRouter}/users/:id`, async (req: Request, res: Response) => {
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
      res.status(201).json(newInvite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invite data", errors: error.errors });
      }
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
      
      let contracts;
      if (businessId) {
        contracts = await storage.getContractsByBusinessId(businessId);
      } else if (contractorId) {
        contracts = await storage.getContractsByContractorId(contractorId);
      } else {
        // For this demo, return all contracts if no filter
        contracts = Array.from((await Promise.all(Array.from({ length: 10 }, (_, i) => storage.getContract(i + 1)))).filter(Boolean));
      }
      
      res.json(contracts);
    } catch (error) {
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
      const contractInput = insertContractSchema.parse(req.body);
      const newContract = await storage.createContract(contractInput);
      res.status(201).json(newContract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
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
      const upcoming = req.query.upcoming === 'true';
      
      let payments;
      if (contractId) {
        payments = await storage.getPaymentsByContractId(contractId);
      } else if (upcoming) {
        payments = await storage.getUpcomingPayments(5); // Limit to 5 for dashboard
      } else {
        // Default behavior
        payments = [];
      }
      
      res.json(payments);
    } catch (error) {
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
        documents = await storage.getDocumentsByContractId(contractId);
      }
      
      res.json(documents);
    } catch (error) {
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
  
  // Dashboard summary endpoint
  app.get(`${apiRouter}/dashboard`, async (_req: Request, res: Response) => {
    try {
      // Get counts and stats for dashboard
      const contractors = await storage.getUsersByRole("contractor");
      const activeContracts = (await storage.getContractsByBusinessId(1)).filter(c => c.status === "active");
      const pendingApprovals = (await storage.getContractsByBusinessId(1)).filter(c => c.status === "pending_approval");
      const upcomingPayments = await storage.getUpcomingPayments(5);
      const upcomingMilestones = await storage.getUpcomingMilestones(5);
      const pendingInvites = await storage.getPendingInvites();
      
      // Calculate total payments
      const totalPaymentsValue = upcomingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      
      const dashboardData = {
        stats: {
          activeContractsCount: activeContracts.length,
          pendingApprovalsCount: pendingApprovals.length,
          paymentsProcessed: totalPaymentsValue,
          activeContractorsCount: contractors.length,
          pendingInvitesCount: pendingInvites.length
        },
        contracts: [...activeContracts, ...pendingApprovals].slice(0, 3),
        milestones: upcomingMilestones,
        payments: upcomingPayments,
        invites: pendingInvites.slice(0, 3)
      };
      
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });
  
  // Stripe integration routes
  
  // Create payment intent for a specific payment
  app.post(`${apiRouter}/payments/:id/create-intent`, async (req: Request, res: Response) => {
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
          await storage.updatePaymentStripeDetails(
            parseInt(paymentId),
            paymentIntent.id,
            paymentIntent.status
          );
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
      
      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ message: "Error processing webhook" });
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
  
  const httpServer = createServer(app);
  return httpServer;
}
