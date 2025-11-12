import type { Express } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertWorkRequestSchema, updateWorkRequestSchema } from "@shared/schema";
import { setupAuth } from "../auth";

export function registerProjectRoutes(app: Express) {
  const { requireAuth } = setupAuth(app);
  
  // Handle /projects/new specifically before the parameterized route
  app.get("/api/projects/new", async (req, res) => {
    // This is not a valid API endpoint - new project creation should be POST /api/projects
    // Return an appropriate response
    res.status(404).json({ error: "Route not found. Use POST /api/projects to create a new project." });
  });

  // Handle /projects/new/work-requests specifically 
  app.get("/api/projects/new/work-requests", async (req, res) => {
    // This is not a valid API endpoint
    res.status(404).json({ error: "Route not found. Work requests require a valid project ID." });
  });

  // Get all projects for a business (used by Projects page)
  app.get("/api/projects", async (req, res) => {
    try {
      let userId = req.user?.id;
      
      // Use X-User-ID header fallback if session auth failed
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const projects = await storage.getBusinessProjects(userId);
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get a single project by ID
  app.get("/api/projects/:id", async (req, res) => {
    try {
      let userId = req.user?.id;
      
      // Use X-User-ID header fallback if session auth failed
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const projectId = parseInt(req.params.id);
      
      // Validate that projectId is a valid number
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID. Must be a number." });
      }
      
      const project = await storage.getProject(projectId);
      
      console.log(`[PROJECT_DETAILS] projectId=${projectId} userId=${userId} found=${!!project} businessId=${project?.businessId}`);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Verify user has access to this project (business owner)
      if (project.businessId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Create a new project
  app.post("/api/projects", async (req, res) => {
    try {
      const { name, businessId, description, budget, deadline } = req.body;

      if (!name || !businessId) {
        return res.status(400).json({
          ok: false,
          message: "Name and businessId are required"
        });
      }

      const project = await storage.createProject({
        name,
        businessId,
        description,
        budget: budget ? budget.toString() : null,
        deadline: deadline ? new Date(deadline) : null
      });

      console.log(`[PROJECT_CREATED] id=${project.id} business=${businessId} name=${name}`);

      res.json({
        ok: true,
        data: project
      });

    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({
        ok: false,
        message: "Internal server error"
      });
    }
  });

  // Step B: Add worker to project (create work request)
  app.post("/api/projects/:projectId/work-requests", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const workRequestData = req.body;

      // Validate input data
      const validation = insertWorkRequestSchema.safeParse({
        ...workRequestData,
        projectId
      });

      if (!validation.success) {
        return res.status(422).json({
          ok: false,
          code: "WR_VALIDATION",
          message: "Invalid work request data",
          details: validation.error.errors
        });
      }

      const { contractorUserId, title, description, deliverableDescription, dueDate, amount, currency } = validation.data;

      // Load project and verify permissions
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({
          ok: false,
          message: "Project not found"
        });
      }

      // Verify contractor exists
      const contractor = await storage.getUser(contractorUserId);
      if (!contractor) {
        return res.status(404).json({
          ok: false,
          message: "Contractor not found"
        });
      }

      console.log(`[WR_CREATE] project=${projectId} business=${project.businessId} contractor=${contractorUserId}`);

      // Create work request using the new schema
      const workRequest = await storage.createWorkRequest({
        projectId,
        contractorUserId,
        title,
        description,
        deliverableDescription,
        dueDate,
        amount: amount.toString(),
        currency: currency || "USD",
        status: "assigned"
      });

      res.json({
        ok: true,
        workRequestId: workRequest.id,
        status: "assigned"
      });

    } catch (error) {
      console.error(`[WR_CREATE] Error:`, error);
      res.status(500).json({
        ok: false,
        code: "WR-SERVER-001",
        message: "Internal server error"
      });
    }
  });

  // Step C: Approve deliverable (triggers payout)
  app.post("/api/work-requests/:id/approve", async (req, res) => {
    try {
      const workRequestId = parseInt(req.params.id);

      // Get work request
      const workRequest = await storage.getWorkRequest(workRequestId);
      if (!workRequest) {
        return res.status(404).json({
          ok: false,
          message: "Work request not found"
        });
      }

      // Update status to approved (idempotent)
      if (workRequest.status === "approved") {
        return res.json({
          ok: true,
          status: "approved",
          message: "Already approved"
        });
      }

      // Transition status: assigned|in_review → approved
      if (!["assigned", "in_review"].includes(workRequest.status)) {
        return res.status(400).json({
          ok: false,
          message: `Cannot approve work request with status: ${workRequest.status}`
        });
      }

      // Update status
      await storage.updateWorkRequestStatus(workRequestId, "approved");

      // Emit event for payout service
      console.log(`[WORK_REQUEST_APPROVED] workRequestId=${workRequestId} amount=${workRequest.amount}`);
      // TODO: Emit WorkRequestApproved(id) event for payout service

      res.json({
        ok: true,
        status: "approved"
      });

    } catch (error) {
      console.error("Error approving work request:", error);
      res.status(500).json({
        ok: false,
        code: "WR-SERVER-001",
        message: "Internal server error"
      });
    }
  });

  // Get project work requests
  app.get("/api/projects/:projectId/work-requests", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Validate that projectId is a valid number
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID. Must be a number." });
      }
      const workRequests = await storage.getProjectWorkRequests(projectId);
      
      // Enhance work requests with contractor information
      const enhancedWorkRequests = await Promise.all(
        workRequests.map(async (wr) => {
          if (wr.contractorUserId) {
            try {
              const contractor = await storage.getUser(wr.contractorUserId);
              if (contractor) {
                return {
                  ...wr,
                  contractorName: contractor.firstName && contractor.lastName 
                    ? `${contractor.firstName} ${contractor.lastName}`
                    : contractor.username,
                  contractorEmail: contractor.email
                };
              }
            } catch (error) {
              console.error(`Error fetching contractor ${wr.contractorUserId}:`, error);
            }
          }
          return wr;
        })
      );
      
      res.json(enhancedWorkRequests);
    } catch (error) {
      console.error("Error fetching work requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Accept work request (contractor accepts the work)
  app.post("/api/work-requests/:id/accept", async (req, res) => {
    try {
      const workRequestId = parseInt(req.params.id);
      
      // Use the same authentication pattern as other endpoints
      let currentUserId = req.user?.id;
      
      // Fallback to X-User-ID header like other endpoints in this system
      if (!currentUserId && req.headers['x-user-id']) {
        currentUserId = parseInt(req.headers['x-user-id'] as string);
      }

      console.log(`[ACCEPT DEBUG] Request ID: ${workRequestId}, User ID: ${currentUserId}, Headers:`, req.headers['x-user-id']);

      if (!currentUserId) {
        return res.status(401).json({
          ok: false,
          message: "Authentication required"
        });
      }

      // Get work request
      const workRequest = await storage.getWorkRequest(workRequestId);
      if (!workRequest) {
        return res.status(404).json({
          ok: false,
          message: "Work request not found"
        });
      }

      // Work requests are always project-based
      const isProject = !!workRequest.projectId;
      
      console.log(`[WR_ACCEPT] workRequestId=${workRequestId} isProject=${isProject} projectId=${workRequest.projectId || 'none'}`);

      // Verify this contractor is assigned to this work request
      if (workRequest.contractorUserId !== currentUserId) {
        return res.status(403).json({
          ok: false,
          message: "You can only accept work requests assigned to you"
        });
      }

      // Check if already accepted
      if (workRequest.status === "accepted") {
        return res.json({
          ok: true,
          status: "accepted",
          message: "Already accepted",
          type: "project"
        });
      }

      // Only allow accepting "pending" work requests
      if (workRequest.status !== "pending") {
        return res.status(400).json({
          ok: false,
          message: `Cannot accept work request with status: ${workRequest.status}`
        });
      }

      // Update status to accepted
      await storage.updateWorkRequestStatus(workRequestId, "accepted");

      // Get project and business info for contract creation
      const project = await storage.getProject(workRequest.projectId);
      if (!project) {
        throw new Error("Project not found for work request");
      }

      const business = await storage.getUser(project.businessId);
      if (!business) {
        throw new Error("Business not found for project");
      }

      // Create contract when work request is accepted
      const contractType = "PROJECT";
      const contractCode = `${contractType}-${workRequestId}-${Date.now().toString(36).toUpperCase()}`;
      const contractName = `${workRequest.title} - ${business.companyName || business.firstName + ' ' + business.lastName}`;
      
      const contract = await storage.createContract({
        contractName,
        contractCode,
        businessId: project.businessId,
        projectId: workRequest.projectId,
        contractorId: currentUserId,
        description: workRequest.description || `Contract for work request: ${workRequest.title}`,
        status: "active",
        value: workRequest.amount,
        contractorBudget: workRequest.amount,
        startDate: new Date(),
        endDate: workRequest.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days if no due date
      });

      // Create a deliverable/milestone automatically when work request is accepted
      const milestone = await storage.createMilestone({
        contractId: contract.id,
        name: workRequest.title,
        description: workRequest.deliverableDescription || workRequest.description || `Deliverable for: ${workRequest.title}`,
        dueDate: workRequest.dueDate ? new Date(workRequest.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentAmount: workRequest.amount,
        status: 'assigned',
        progress: 0,
        autoPayEnabled: true,
        submissionType: 'digital'
      });

      console.log(`[WORK_REQUEST_ACCEPTED] type=${contractType} workRequestId=${workRequestId} contractorId=${currentUserId} contractId=${contract.id} milestoneId=${milestone.id} amount=${workRequest.amount}`);

      res.json({
        ok: true,
        status: "accepted",
        message: `${contractType} work request accepted successfully`,
        type: "project",
        contractId: contract.id,
        milestoneId: milestone.id
      });

    } catch (error) {
      console.error("Error accepting work request:", error);
      res.status(500).json({
        ok: false,
        code: "WR-SERVER-002",
        message: "Internal server error"
      });
    }
  });

  // Decline work request (contractor declines the work)
  app.post("/api/work-requests/:id/decline", async (req, res) => {
    try {
      const workRequestId = parseInt(req.params.id);
      
      // Use the same authentication pattern as other endpoints
      let currentUserId = req.user?.id;
      
      // Fallback to X-User-ID header like other endpoints in this system
      if (!currentUserId && req.headers['x-user-id']) {
        currentUserId = parseInt(req.headers['x-user-id'] as string);
      }

      if (!currentUserId) {
        return res.status(401).json({
          ok: false,
          message: "Authentication required"
        });
      }

      // Get work request
      const workRequest = await storage.getWorkRequest(workRequestId);
      if (!workRequest) {
        return res.status(404).json({
          ok: false,
          message: "Work request not found"
        });
      }

      // Verify this contractor is assigned to this work request
      if (workRequest.contractorUserId !== currentUserId) {
        return res.status(403).json({
          ok: false,
          message: "You can only decline work requests assigned to you"
        });
      }

      // Check if already declined
      if (workRequest.status === "declined") {
        return res.json({
          ok: true,
          status: "declined",
          message: "Already declined"
        });
      }

      // Only allow declining "assigned" or "accepted" work requests
      if (!["assigned", "accepted"].includes(workRequest.status)) {
        return res.status(400).json({
          ok: false,
          message: `Cannot decline work request with status: ${workRequest.status}`
        });
      }

      // Update status to declined
      await storage.updateWorkRequestStatus(workRequestId, "declined");

      console.log(`[WORK_REQUEST_DECLINED] workRequestId=${workRequestId} contractorId=${currentUserId} amount=${workRequest.amount}`);

      res.json({
        ok: true,
        status: "declined",
        message: "Work request declined successfully"
      });

    } catch (error) {
      console.error("Error declining work request:", error);
      res.status(500).json({
        ok: false,
        code: "WR-SERVER-003",
        message: "Internal server error"
      });
    }
  });

  // Business accept work request (triggers Trolley payment)
  app.post("/api/work-requests/:id/business-accept", async (req, res) => {
    try {
      const workRequestId = parseInt(req.params.id);
      const { allocatedBudget, triggerPayment } = req.body;

      // Use the same authentication pattern as other endpoints
      let currentUserId = req.user?.id;
      
      // Fallback to X-User-ID header like other endpoints in this system
      if (!currentUserId && req.headers['x-user-id']) {
        currentUserId = parseInt(req.headers['x-user-id'] as string);
      }

      if (!currentUserId) {
        return res.status(401).json({
          ok: false,
          message: "Authentication required"
        });
      }

      // Get work request
      const workRequest = await storage.getWorkRequest(workRequestId);
      if (!workRequest) {
        return res.status(404).json({
          ok: false,
          message: "Work request not found"
        });
      }

      // Get project and verify business ownership
      const project = await storage.getProject(workRequest.projectId);
      if (!project || project.businessId !== currentUserId) {
        return res.status(403).json({
          ok: false,
          message: "You can only accept work requests for your own projects"
        });
      }

      // Check if already accepted
      if (workRequest.status === "accepted") {
        return res.json({
          ok: true,
          status: "accepted",
          message: "Already accepted"
        });
      }

      // Only allow accepting "pending" work requests
      if (workRequest.status !== "pending") {
        return res.status(400).json({
          ok: false,
          message: `Cannot accept work request with status: ${workRequest.status}`
        });
      }

      // Update status to accepted
      await storage.updateWorkRequestStatus(workRequestId, "accepted");

      // Create contract for the accepted work request
      const business = await storage.getUser(currentUserId);
      const contractor = await storage.getUser(workRequest.contractorUserId);
      
      if (business && contractor) {
        const contractCode = `WR-${workRequestId}-${Date.now().toString(36).toUpperCase()}`;
        const contractName = `${workRequest.title} - ${business.companyName || business.firstName + ' ' + business.lastName}`;
        
        const contract = await storage.createContract({
          contractName,
          contractCode,
          businessId: currentUserId,
          projectId: workRequest.projectId,
          contractorId: workRequest.contractorUserId,
          description: workRequest.description || `Contract for work request: ${workRequest.title}`,
          status: "active",
          value: workRequest.amount,
          contractorBudget: workRequest.amount,
          startDate: new Date(),
          endDate: workRequest.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        // Create milestone
        const milestone = await storage.createMilestone({
          contractId: contract.id,
          name: workRequest.title,
          description: workRequest.deliverableDescription || workRequest.description || `Deliverable for: ${workRequest.title}`,
          dueDate: workRequest.dueDate ? new Date(workRequest.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentAmount: workRequest.amount,
          status: 'assigned',
          progress: 0,
          autoPayEnabled: true,
          submissionType: 'digital'
        });

        console.log(`[BUSINESS_ACCEPT] Created contract ${contract.id} and milestone ${milestone.id} for work request ${workRequestId}`);
      }

      // If triggerPayment is true, initiate Trolley payment process
      if (triggerPayment) {
        console.log(`[BUSINESS_ACCEPT] Triggering Trolley payment for work request ${workRequestId}: $${allocatedBudget}`);
        // TODO: Emit event for Trolley payment service
        // TODO: Create payment record in database
      }

      res.json({
        ok: true,
        status: "accepted",
        allocatedBudget: allocatedBudget,
        paymentTriggered: triggerPayment,
        message: "Work request accepted and contract created successfully"
      });

    } catch (error) {
      console.error("Error accepting work request (business):", error);
      res.status(500).json({
        ok: false,
        message: "Internal server error"
      });
    }
  });

  // Business reject work request
  app.post("/api/work-requests/:id/business-reject", async (req, res) => {
    try {
      const workRequestId = parseInt(req.params.id);
      const { reason } = req.body;

      // Use the same authentication pattern as other endpoints
      let currentUserId = req.user?.id;
      
      // Fallback to X-User-ID header like other endpoints in this system
      if (!currentUserId && req.headers['x-user-id']) {
        currentUserId = parseInt(req.headers['x-user-id'] as string);
      }

      if (!currentUserId) {
        return res.status(401).json({
          ok: false,
          message: "Authentication required"
        });
      }

      // Get work request
      const workRequest = await storage.getWorkRequest(workRequestId);
      if (!workRequest) {
        return res.status(404).json({
          ok: false,
          message: "Work request not found"
        });
      }

      // Get project and verify business ownership
      const project = await storage.getProject(workRequest.projectId);
      if (!project || project.businessId !== currentUserId) {
        return res.status(403).json({
          ok: false,
          message: "You can only reject work requests for your own projects"
        });
      }

      // Update status to rejected
      await storage.updateWorkRequestStatus(workRequestId, "rejected");

      // TODO: Send notification to contractor about rejection
      console.log(`[BUSINESS_REJECT] Work request ${workRequestId} rejected by business. Reason: ${reason}`);

      res.json({
        ok: true,
        status: "rejected",
        reason: reason
      });

    } catch (error) {
      console.error("Error rejecting work request (business):", error);
      res.status(500).json({
        ok: false,
        message: "Internal server error"
      });
    }
  });

  // Create PaymentIntent for work request (called before opening payment modal)
  app.post("/api/work-requests/:id/create-payment-intent", async (req, res) => {
    try {
      const workRequestId = parseInt(req.params.id);

      // Use the same authentication pattern as other endpoints
      let currentUserId = req.user?.id;
      
      // Fallback to X-User-ID header like other endpoints in this system
      if (!currentUserId && req.headers['x-user-id']) {
        currentUserId = parseInt(req.headers['x-user-id'] as string);
      }

      if (!currentUserId) {
        return res.status(401).json({
          ok: false,
          message: "Authentication required"
        });
      }

      // Get work request
      const workRequest = await storage.getWorkRequest(workRequestId);
      if (!workRequest) {
        return res.status(404).json({
          ok: false,
          message: "Work request not found"
        });
      }

      // Get project and verify business ownership
      const project = await storage.getProject(workRequest.projectId);
      if (!project || project.businessId !== currentUserId) {
        return res.status(403).json({
          ok: false,
          message: "You can only create payment intents for your own work requests"
        });
      }

      // Idempotency check - if already paid, return error
      if (workRequest.status === "paid") {
        return res.status(400).json({
          ok: false,
          message: "Work request already paid"
        });
      }

      // IDEMPOTENCY PROTECTION: Check if PaymentIntent already exists for this work request
      // Use workRequestId as the unique idempotency key
      const existingPayments = await storage.getPayments();
      const existingPayment = existingPayments.find(p => 
        p.workRequestId === workRequestId &&
        p.businessId === currentUserId &&
        p.stripePaymentIntentId
      );

      if (existingPayment && existingPayment.stripePaymentIntentId) {
        // Retrieve the existing PaymentIntent from Stripe
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
          apiVersion: '2025-02-24.acacia',
          typescript: true
        });

        try {
          const existingIntent = await stripe.paymentIntents.retrieve(existingPayment.stripePaymentIntentId);
          
          // If the intent is still in a usable state, return it (idempotent response)
          if (existingIntent.status !== 'succeeded' && existingIntent.status !== 'canceled') {
            console.log(`[CREATE_PAYMENT_INTENT] Returning existing PaymentIntent for work request ${workRequestId}: ${existingIntent.id}`);
            return res.json({
              ok: true,
              clientSecret: existingIntent.client_secret,
              paymentIntentId: existingIntent.id,
              amount: workRequest.amount,
              currency: workRequest.currency || 'gbp',
              existing: true
            });
          }
        } catch (stripeError) {
          console.warn(`[CREATE_PAYMENT_INTENT] Could not retrieve existing PaymentIntent, creating new one`, stripeError);
        }
      }

      // Get contractor details
      const contractor = await storage.getUser(workRequest.contractorUserId);
      if (!contractor || !contractor.stripeConnectAccountId) {
        return res.status(400).json({
          ok: false,
          message: 'Contractor payment setup incomplete',
          needsSetup: true
        });
      }

      // Get business Connect account (for metadata tracking)
      const businessUser = await storage.getUser(currentUserId);
      const businessAccountId = businessUser?.stripeConnectAccountId || 'platform';

      console.log(`[CREATE_PAYMENT_INTENT] Creating PaymentIntent for work request ${workRequestId}, amount: ${workRequest.amount}`);

      // Create Stripe PaymentIntent with destination charge
      const { createPaymentIntent } = await import('../services/stripe.js');

      const paymentIntent = await createPaymentIntent({
        amount: parseFloat(workRequest.amount),
        currency: workRequest.currency || 'gbp',
        description: `Payment for: ${workRequest.title}`,
        metadata: {
          work_request_id: workRequestId.toString(),
          contractor_id: contractor.id.toString(),
          business_id: currentUserId.toString(),
          payment_type: 'work_request_payment'
        },
        transferData: {
          destination: contractor.stripeConnectAccountId
        },
        businessAccountId: businessAccountId
      });

      console.log(`[CREATE_PAYMENT_INTENT] PaymentIntent created: ${paymentIntent.id}`);

      // Create a preliminary payment record to track this PaymentIntent (for idempotency)
      // This will be updated when payment completes
      // CRITICAL: Store workRequestId for deterministic idempotency and linkage
      try {
        await storage.createPayment({
          contractId: null,
          milestoneId: null,
          workRequestId: workRequestId, // IDEMPOTENCY KEY
          businessId: currentUserId,
          contractorId: workRequest.contractorUserId,
          amount: workRequest.amount,
          status: 'pending',
          scheduledDate: new Date(),
          completedDate: null,
          notes: `Payment for work request: ${workRequest.title}`,
          stripePaymentIntentId: paymentIntent.id,
          stripePaymentIntentStatus: 'requires_payment_method',
          paymentProcessor: 'stripe',
          triggeredBy: 'work_request_payment_intent_created',
          triggeredAt: new Date()
        });
      } catch (paymentError) {
        console.warn(`[CREATE_PAYMENT_INTENT] Could not create preliminary payment record`, paymentError);
      }

      res.json({
        ok: true,
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.id,
        amount: workRequest.amount,
        currency: workRequest.currency || 'gbp'
      });

    } catch (error) {
      console.error("Error creating payment intent for work request:", error);
      res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : "Internal server error"
      });
    }
  });

  // Process payment after Stripe payment succeeds for work request
  app.post("/api/work-requests/:id/process-payment", async (req, res) => {
    try {
      const workRequestId = parseInt(req.params.id);
      const { paymentIntentId } = req.body; // SECURITY: Removed allocatedBudget - derive from trusted sources only

      // Use the same authentication pattern as other endpoints
      let currentUserId = req.user?.id;
      
      // Fallback to X-User-ID header like other endpoints in this system
      if (!currentUserId && req.headers['x-user-id']) {
        currentUserId = parseInt(req.headers['x-user-id'] as string);
      }

      if (!currentUserId) {
        return res.status(401).json({
          ok: false,
          message: "Authentication required"
        });
      }

      // Get work request
      const workRequest = await storage.getWorkRequest(workRequestId);
      if (!workRequest) {
        return res.status(404).json({
          ok: false,
          message: "Work request not found"
        });
      }

      // Get project and verify business ownership
      const project = await storage.getProject(workRequest.projectId);
      if (!project || project.businessId !== currentUserId) {
        return res.status(403).json({
          ok: false,
          message: "You can only process payments for your own work requests"
        });
      }

      // Idempotency check - if already paid, return success
      if (workRequest.status === "paid") {
        return res.json({
          ok: true,
          status: "paid",
          message: "Work request already paid"
        });
      }

      console.log(`[WORK_REQUEST_PAYMENT] workRequestId=${workRequestId} paymentIntentId=${paymentIntentId} businessId=${currentUserId}`);

      // Verify payment intent with Stripe
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: '2025-02-24.acacia',
        typescript: true
      });

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Verify payment is completed
      if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'requires_capture') {
        return res.status(400).json({
          ok: false,
          message: `Payment not completed. Status: ${paymentIntent.status}`
        });
      }

      // Verify payment amount matches work request amount (convert to cents for comparison)
      const workRequestAmountInCents = Math.round(parseFloat(workRequest.amount) * 100);
      if (paymentIntent.amount !== workRequestAmountInCents) {
        console.error(`[WORK_REQUEST_PAYMENT] Amount mismatch: PaymentIntent=${paymentIntent.amount} WorkRequest=${workRequestAmountInCents}`);
        return res.status(400).json({
          ok: false,
          message: `Payment amount mismatch. Expected ${workRequestAmountInCents} cents, got ${paymentIntent.amount} cents`
        });
      }

      // SECURITY: Derive amount ONLY from trusted server sources - work request DB record and Stripe PaymentIntent
      // DO NOT accept client-supplied amounts
      const trustedAmount = workRequest.amount; // From database
      const stripeConfirmedAmountCents = paymentIntent.amount; // From Stripe API
      const stripeConfirmedAmount = (stripeConfirmedAmountCents / 100).toFixed(2); // Convert cents to dollars

      console.log(`[WORK_REQUEST_PAYMENT] Amount verification: DB=${trustedAmount}, Stripe=${stripeConfirmedAmount}`);

      // Find associated contract for this work request (query by contractor and business)
      const businessContracts = await storage.getBusinessContracts(currentUserId);
      const relatedContract = businessContracts.find(c => 
        c.projectId === workRequest.projectId && 
        c.contractorId === workRequest.contractorUserId
      );

      // SECURITY: Find payment record using deterministic workRequestId linkage
      // This ensures we're processing the correct PaymentIntent for this exact work request
      const existingPayments = await storage.getPayments();
      const existingPayment = existingPayments.find(p => 
        p.workRequestId === workRequestId &&
        p.stripePaymentIntentId === paymentIntentId
      );

      // Verify the PaymentIntent belongs to this work request (security check)
      if (!existingPayment) {
        console.error(`[WORK_REQUEST_PAYMENT] No payment record found for workRequestId=${workRequestId} and paymentIntentId=${paymentIntentId}`);
        return res.status(400).json({
          ok: false,
          message: "Payment record not found. This PaymentIntent may not belong to this work request."
        });
      }

      // Verify metadata matches (additional security layer)
      const paymentIntentMetadata = paymentIntent.metadata;
      if (paymentIntentMetadata?.work_request_id !== workRequestId.toString()) {
        console.error(`[WORK_REQUEST_PAYMENT] Metadata mismatch: PaymentIntent work_request_id=${paymentIntentMetadata?.work_request_id}, expected=${workRequestId}`);
        return res.status(400).json({
          ok: false,
          message: "PaymentIntent metadata does not match work request ID"
        });
      }

      // Update existing payment record to completed status
      console.log(`[WORK_REQUEST_PAYMENT] Updating payment record ${existingPayment.id} to completed`);
      const payment = await storage.updatePayment(existingPayment.id, {
        contractId: relatedContract?.id || null,
        status: 'completed',
        completedDate: new Date(),
        stripePaymentIntentStatus: paymentIntent.status,
        amount: trustedAmount // SECURITY: Use DB amount verified against Stripe
      });

      // Update work request status to paid
      await storage.updateWorkRequestStatus(workRequestId, "paid");

      // Generate invoices for both business and contractor
      const { invoiceGenerator } = await import('../services/invoice-generator.js');
      try {
        await invoiceGenerator.generateInvoiceForPayment({
          paymentId: payment.id,
          stripePaymentIntentId: paymentIntentId,
          stripeTransactionId: paymentIntent.latest_charge as string || undefined
        });
        console.log(`[WORK_REQUEST_PAYMENT] Invoices generated for payment ${payment.id}`);
      } catch (invoiceError) {
        console.error(`[WORK_REQUEST_PAYMENT] Failed to generate invoices:`, invoiceError);
        // Don't fail the entire request if invoice generation fails
      }

      // Update contract and milestone status if they exist
      if (relatedContract) {
        if (relatedContract.status === 'active') {
          await storage.updateContract(relatedContract.id, { status: 'completed' });
          console.log(`[WORK_REQUEST_PAYMENT] Contract ${relatedContract.id} marked as completed`);
        }

        // Find and update associated milestones
        const milestones = await storage.getMilestonesByContractId(relatedContract.id);
        for (const milestone of milestones) {
          if (milestone.status !== 'approved') {
            await storage.updateMilestone(milestone.id, { status: 'approved' });
            console.log(`[WORK_REQUEST_PAYMENT] Milestone ${milestone.id} marked as approved`);
          }
        }
      }

      res.json({
        ok: true,
        status: "paid",
        paymentId: payment.id,
        message: "Payment processed successfully and invoices generated"
      });

    } catch (error) {
      console.error("Error processing work request payment:", error);
      res.status(500).json({
        ok: false,
        message: "Internal server error"
      });
    }
  });
}