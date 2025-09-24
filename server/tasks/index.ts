import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertTaskSchema, insertTaskSubmissionSchema } from "@shared/schema";
import { setupAuth } from "../auth";
import { createSecurePaymentV2 } from "../services/stripe.js";

// Task creation schema - use insertTaskSchema directly (already includes projectId)
const createTaskSchema = insertTaskSchema;

// Task submission schema - for contractor submissions
const submitTaskSchema = insertTaskSubmissionSchema.omit({
  taskId: true, // Will be provided in route params
  contractorId: true, // Will be extracted from authenticated user  
  status: true, // Always starts as 'submitted'
  approverId: true, // Set during approval
  paymentId: true // Set after payment processing
});

// Approval/rejection schema
const reviewTaskSubmissionSchema = z.object({
  notes: z.string().optional()
});

export function registerTaskRoutes(app: Express) {
  const { requireAuth } = setupAuth(app);

  // Active subscription requirement middleware (same as other protected routes)
  const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let userId = req.user?.id;

      // Use X-User-ID header fallback if session auth failed (DEV ONLY - TODO: Remove in production)
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user has active subscription
      if (!user.subscriptionStatus ||
          !['active', 'trialing'].includes(user.subscriptionStatus)) {
        console.log(`SUBSCRIPTION BLOCK: User ${userId} (${user.username}) has subscription status: ${user.subscriptionStatus || 'inactive'}`);
        return res.status(402).json({
          message: 'Active subscription required',
          subscriptionStatus: user.subscriptionStatus || 'inactive',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      console.log(`SUBSCRIPTION OK: User ${userId} (${user.username}) has active subscription: ${user.subscriptionStatus}`);
      next();
    } catch (error) {
      console.error('Error checking subscription requirement:', error);
      res.status(500).json({ message: 'Error validating subscription' });
    }
  };

  // =====================================
  // BUSINESS USER ENDPOINTS (Create/Manage Tasks)
  // =====================================

  // Create a new task under a project
  app.post("/api/projects/:projectId/tasks", requireAuth, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      let userId = req.user?.id;
      
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify user has access to this project (business user check)
      const project = await storage.getProject(projectId);
      if (!project || project.businessId !== userId) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }

      // Validate task data
      const taskData = createTaskSchema.parse({
        ...req.body,
        projectId
      });

      // Create the task
      const task = await storage.createTask(taskData);
      
      if (!task) {
        return res.status(500).json({ error: "Failed to create task" });
      }

      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors
        });
      }
      
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all tasks for business user (across all projects)
  app.get("/api/tasks", requireAuth, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      let userId = req.user?.id;
      
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get user to determine role
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let tasks;
      
      if (user.role === 'business') {
        // Business users see tasks from their projects
        tasks = await storage.getTasksByBusinessId(userId);
      } else {
        // Contractors see tasks assigned to them
        tasks = await storage.getTasksByContractorId(userId);
      }

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get tasks for a specific project
  app.get("/api/projects/:projectId/tasks", requireAuth, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      let userId = req.user?.id;
      
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify user has access to this project
      const project = await storage.getProject(projectId);
      if (!project || project.businessId !== userId) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }

      // Get tasks for this project
      const tasks = await storage.getTasksByProjectId(projectId);

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =====================================
  // CONTRACTOR ENDPOINTS (Submit Work)
  // =====================================

  // Submit work for a task (contractor only)
  app.post("/api/tasks/:taskId/submit", requireAuth, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      let userId = req.user?.id;
      
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }

      // Get user to verify they're a contractor
      const user = await storage.getUser(userId);
      if (!user || !['contractor', 'freelancer'].includes(user.role)) {
        return res.status(403).json({ error: "Only contractors can submit task work" });
      }

      // Get the task and verify access
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Verify contractor is assigned to this task
      if (task.contractorId !== userId) {
        return res.status(403).json({ error: "You are not assigned to this task" });
      }

      // Validate submission data
      const submissionData = submitTaskSchema.parse(req.body);

      // Create the task submission
      const submission = await storage.createTaskSubmission({
        ...submissionData,
        taskId,
        contractorId: userId
      });

      if (!submission) {
        return res.status(500).json({ error: "Failed to create task submission" });
      }

      // Update task status to 'submitted'
      await storage.updateTaskStatus(taskId, 'submitted');

      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors
        });
      }
      
      console.error("Error submitting task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =====================================
  // APPROVAL ENDPOINTS (Business Review/Payment)
  // =====================================

  // Approve task submission (business only) - triggers payment
  app.post("/api/tasks/:taskId/approve", requireAuth, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      let userId = req.user?.id;
      
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }

      // Get user to verify they're a business user
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'business') {
        return res.status(403).json({ error: "Only business users can approve tasks" });
      }

      // Get the task and verify ownership through project
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Verify business owns this task (through project ownership)
      const project = await storage.getProject(task.projectId);
      if (!project || project.businessId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get the latest task submission (ordered by most recent first)
      const submissions = await storage.getTaskSubmissionsByTaskId(taskId);
      const latestSubmission = submissions
        .filter(s => s.status === 'submitted')
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
      
      if (!latestSubmission) {
        return res.status(400).json({ error: "No submitted work found for this task" });
      }

      // Validate review data
      const reviewData = reviewTaskSubmissionSchema.parse(req.body);

      try {
        // Create payment with idempotency key
        const idempotencyKey = `task_sub_${latestSubmission.id}`;
        
        console.log(`[TASK_APPROVAL] Creating payment for task submission ${latestSubmission.id} with idempotency: ${idempotencyKey}`);
        
        const paymentResult = await createSecurePaymentV2({
          contractorUserId: task.contractorId!,
          amount: parseFloat(task.amount) * 100, // Convert to cents
          currency: task.currency.toLowerCase(),
          description: `Task payment: ${task.title}`,
          metadata: {
            task_id: task.id.toString(),
            task_submission_id: latestSubmission.id.toString(),
            project_id: task.projectId.toString(),
            idempotency_key: idempotencyKey,
            payment_type: 'task_approval'
          }
        });

        console.log(`[TASK_APPROVAL] Payment created: ${paymentResult.payment_intent_id}`);

        // Step 3: TODO - Link payment ID to submission in database
        // await storage.updateTaskSubmissionPaymentId(approvedSubmission.id, paymentResult.payment_intent_id);

        res.json({
          success: true,
          submission: approvedSubmission,
          payment: {
            payment_intent_id: paymentResult.payment_intent_id,
            status: paymentResult.status,
            destination_account: paymentResult.destination_account
          },
          message: "Task approved and payment created successfully"
        });
        
      } catch (paymentError: any) {
        console.error(`[TASK_APPROVAL] Payment failed for submission ${latestSubmission.id}:`, paymentError);
        
        // Still approve the submission (approval first, payment second approach)
        const approvedSubmission = await storage.approveTaskSubmission(latestSubmission.id, userId);
        
        res.json({
          success: true,
          submission: approvedSubmission,
          paymentError: paymentError.message,
          message: "Task approved but payment failed - manual payment required"
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors
        });
      }
      
      console.error("Error approving task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reject task submission (business only)
  app.post("/api/tasks/:taskId/reject", requireAuth, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      let userId = req.user?.id;
      
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }

      // Get user to verify they're a business user
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'business') {
        return res.status(403).json({ error: "Only business users can reject tasks" });
      }

      // Get the task and verify ownership through project
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Verify business owns this task (through project ownership)
      const project = await storage.getProject(task.projectId);
      if (!project || project.businessId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get the latest task submission (ordered by most recent first)
      const submissions = await storage.getTaskSubmissionsByTaskId(taskId);
      const latestSubmission = submissions
        .filter(s => s.status === 'submitted')
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
      
      if (!latestSubmission) {
        return res.status(400).json({ error: "No submitted work found for this task" });
      }

      // Validate review data
      const reviewData = reviewTaskSubmissionSchema.parse(req.body);

      // Reject the submission
      const rejectedSubmission = await storage.rejectTaskSubmission(
        latestSubmission.id, 
        reviewData.notes,
        userId
      );
      
      if (!rejectedSubmission) {
        return res.status(500).json({ error: "Failed to reject task submission" });
      }

      res.json({
        success: true,
        submission: rejectedSubmission,
        message: "Task rejected"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors
        });
      }
      
      console.error("Error rejecting task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get task submissions for a specific task (business can see all, contractors see their own)
  app.get("/api/tasks/:taskId/submissions", requireAuth, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      let userId = req.user?.id;
      
      if (!userId && req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string);
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }

      // Get the task
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Get user to check role-based access
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let hasAccess = false;
      
      if (user.role === 'business') {
        // Business user must own the project
        const project = await storage.getProject(task.projectId);
        hasAccess = project && project.businessId === userId;
      } else {
        // Contractor must be assigned to this task
        hasAccess = task.contractorId === userId;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get task submissions
      const submissions = await storage.getTaskSubmissionsByTaskId(taskId);

      res.json(submissions);
    } catch (error) {
      console.error("Error fetching task submissions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}