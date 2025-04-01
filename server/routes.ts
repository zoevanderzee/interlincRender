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
  
  const httpServer = createServer(app);
  return httpServer;
}
