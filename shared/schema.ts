import { pgTable, text, serial, integer, boolean, timestamp, varchar, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("business"), // "business", "contractor", or "freelancer"
  workerType: text("worker_type"), // "contractor" or "freelancer" for external workers
  profileImageUrl: text("profile_image_url"),
  companyName: text("company_name"), // Company name for subcontractors
  companyLogo: text("company_logo"), // Company logo URL
  title: text("title"),
  industry: text("industry"), // Industry sector the company operates in
  foundedYear: integer("founded_year"), // Year the company was founded
  employeeCount: integer("employee_count"), // Number of employees
  website: text("website"), // Company website URL
  profileCode: text("profile_code"), // Unique code for easy worker identification (e.g., "JOHNSON-2025") - temporarily removed .unique() to unblock db:push
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID for payment processing
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe subscription ID for companies
  stripeConnectAccountId: text("stripe_connect_account_id"), // Stripe Connect account ID for embedded onboarding
  stripeConnectAccountType: text("stripe_connect_account_type"), // Stripe Connect account type (express, custom)
  subscriptionStatus: text("subscription_status").default("inactive"), // inactive, active, past_due, canceled, trialing
  subscriptionPlan: text("subscription_plan"), // business_plan, contractor_plan, etc.
  subscriptionStartDate: timestamp("subscription_start_date"), // When subscription started
  subscriptionEndDate: timestamp("subscription_end_date"), // When subscription ends (for fixed term subscriptions)
  subscriptionTrialEnd: timestamp("subscription_trial_end"), // Trial period end date
  trolleyCompanyProfileId: text("trolley_company_profile_id"), // Trolley company profile ID for Embedded Payouts
  trolleyRecipientId: text("trolley_recipient_id"), // Trolley recipient ID for contractors
  trolleySubmerchantId: text("trolley_submerchant_id"), // Trolley submerchant account ID for businesses
  trolleySubmerchantStatus: text("trolley_submerchant_status"), // Status of submerchant onboarding
  trolleySubmerchantAccessKey: text("trolley_submerchant_access_key"), // Trolley submerchant API access key
  trolleySubmerchantSecretKey: text("trolley_submerchant_secret_key"), // Trolley submerchant API secret key
  trolleyBankAccountStatus: text("trolley_bank_account_status"), // Bank account verification status (pending, verified, failed)
  trolleyBankAccountId: text("trolley_bank_account_id"), // Trolley bank account ID for pay-as-you-go
  trolleyBankAccountLast4: text("trolley_bank_account_last4"), // Last 4 digits of linked bank account
  trolleyVerificationToken: text("trolley_verification_token"), // Token for Trolley business verification
  trolleyVerificationStarted: timestamp("trolley_verification_started"), // When verification was initiated
  trolleyVerificationStatus: text("trolley_verification_status"), // Status of Trolley verification (pending, approved, rejected)
  trolleyVerificationCompletedAt: timestamp("trolley_verification_completed_at"), // When verification was completed
  payoutEnabled: boolean("payout_enabled").default(false), // Whether the contractor is ready to receive payments
  budgetCap: decimal("budget_cap", { precision: 15, scale: 2 }), // Maximum budget for outsourcing (for business accounts)
  budgetUsed: decimal("budget_used", { precision: 15, scale: 2 }).default("0"), // Amount of budget already allocated to projects
  budgetPeriod: text("budget_period").default("yearly"), // Budget period: monthly, quarterly, yearly
  budgetStartDate: timestamp("budget_start_date"), // When the current budget period began
  budgetEndDate: timestamp("budget_end_date"), // When the current budget period ends
  budgetResetEnabled: boolean("budget_reset_enabled").default(false), // Whether budget should automatically reset at the end of period
  paymentMethod: text("payment_method").default("pay_as_you_go"), // "pre_funded" or "pay_as_you_go"
  trolleyAccountBalance: decimal("trolley_account_balance", { precision: 15, scale: 2 }).default("0"), // Balance for pre-funded accounts
  resetPasswordToken: text("reset_password_token"), // Token for password reset
  resetPasswordExpires: timestamp("reset_password_expires"), // Expiration time for password reset token
  emailVerified: boolean("email_verified").default(false), // Whether user's email is verified
  emailVerificationToken: text("email_verification_token"), // Token for email verification
  emailVerificationExpires: timestamp("email_verification_expires"), // Expiration time for email verification token
  firebaseUid: text("firebase_uid") // Firebase user ID for linking accounts
});

// Project Invites table
export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  projectName: text("project_name").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, declined, expired
  workerType: text("worker_type").notNull().default("contractor"), // contractor or freelancer
  businessId: integer("business_id").notNull(), // The business that sent the invite
  projectId: integer("project_id"), // Optional project ID if the project already exists
  contractDetails: text("contract_details"), // JSON string with contract details
  message: text("message"), // Custom message to the contractor
  paymentAmount: text("payment_amount"), // Payment amount for the worker
  token: text("token"), // Token used for invite authentication
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // When the invite expires
});

// Smart Contracts table
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  contractName: text("contract_name").notNull(),
  contractCode: text("contract_code").notNull().unique(),
  businessId: integer("business_id").notNull(),
  projectId: integer("project_id").references(() => projects.id), // Link contract to project
  contractorId: integer("contractor_id"), // Made optional for initial project creation
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, active, completed, terminated, deleted
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  contractorBudget: decimal("contractor_budget", { precision: 10, scale: 2 }), // Budget allocated to the contractor for this project
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  moodboardFiles: text("moodboard_files").array().default([]), // Array of file URLs from object storage
  moodboardLinks: text("moodboard_links").array().default([]), // Array of external inspiration links
  createdAt: timestamp("created_at").defaultNow(),
});

// Deliverables table (formerly milestones - using "deliverable" terminology throughout)
// Database table remains "milestones" for backward compatibility, but all API/UI uses "deliverable"
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, submitted, completed, approved, rejected
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }).notNull(),
  progress: integer("progress").notNull().default(0), // 0-100 percentage
  submittedAt: timestamp("submitted_at"), // When contractor submitted the deliverable
  approvedAt: timestamp("approved_at"), // When business approved the deliverable
  autoPayEnabled: boolean("auto_pay_enabled").default(true), // Whether payment should be automatically triggered on approval
  deliverableUrl: text("deliverable_url"), // URL or path to submitted deliverable (legacy)
  deliverableFiles: jsonb("deliverable_files"), // Array of file objects {url, name, type, size}
  deliverableDescription: text("deliverable_description"), // Description for physical work that cannot be digitally evidenced
  submissionType: text("submission_type").default("digital"), // "digital" or "physical"
  approvalNotes: text("approval_notes"), // Business notes on approval/rejection
});

// Create deliverable alias for the milestones table - same table, deliverable-focused naming
export const deliverables = milestones;

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  milestoneId: integer("milestone_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, processing, completed, failed, auto_triggered
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe Payment Intent ID
  stripePaymentIntentStatus: text("stripe_payment_intent_status"), // Stripe Payment Intent Status
  stripeTransferId: text("stripe_transfer_id"), // Stripe Transfer ID for Connect payouts
  trolleyBatchId: text("trolley_batch_id"), // Trolley batch ID for Embedded Payouts
  trolleyPaymentId: text("trolley_payment_id"), // Trolley payment ID for tracking
  stripeTransferStatus: text("stripe_transfer_status"), // Status of the Stripe Transfer
  paymentProcessor: text("payment_processor").default("stripe"), // Payment processor used
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }).default("0"), // Platform fee
  triggeredBy: text("triggered_by").default("manual"), // manual, auto_approval, scheduled
  triggeredAt: timestamp("triggered_at"), // When the payment was automatically triggered
});

// Payment Compliance Logs table - for audit trail and structured data compliance
export const paymentLogs = pgTable("payment_logs", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull(),
  contractId: integer("contract_id").notNull(),
  milestoneId: integer("milestone_id").notNull(),
  businessId: integer("business_id").notNull(),
  contractorId: integer("contractor_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(), // Amount after platform fee
  currency: text("currency").default("USD"),
  triggerEvent: text("trigger_event").notNull(), // "milestone_approved", "manual_payment", "scheduled_payment"
  approvalTimestamp: timestamp("approval_timestamp").notNull(),
  paymentTimestamp: timestamp("payment_timestamp").notNull(),
  processorReference: text("processor_reference"), // Stripe payment intent ID
  transferReference: text("transfer_reference"), // Stripe transfer ID
  deliverableReference: text("deliverable_reference"), // Reference to submitted deliverable
  complianceData: jsonb("compliance_data"), // Structured data for tax/audit purposes
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  description: text("description"),
});

// Bank Accounts table for ACH Payments
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accountId: text("account_id").notNull(), // Plaid account ID
  accountName: text("account_name").notNull(), // User-friendly name for the account
  accountType: text("account_type").notNull(), // checking, savings, etc.
  accountSubtype: text("account_subtype"), // personal, business, etc.
  accountMask: text("account_mask"), // Last 4 digits of account number
  institutionName: text("institution_name"), // Bank name
  plaidAccessToken: text("plaid_access_token").notNull(), // Plaid access token for this account
  plaidItemId: text("plaid_item_id").notNull(), // Plaid item ID
  stripeBankAccountId: text("stripe_bank_account_id"), // Stripe bank account ID
  isVerified: boolean("is_verified").default(false), // Whether the account is verified
  isDefault: boolean("is_default").default(false), // Whether this is the default account
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"), // Additional metadata
});

// Business Workers table (join table for businesses and contractors)
export const businessWorkers = pgTable("business_workers", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => users.id),
  contractorUserId: integer("contractor_user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  status: text("status").notNull().default("active"), // active, inactive
  role: text("role").default("contractor"), // contractor role
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  status: text("status").notNull().default("active"), // active, completed, archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work Requests table (updated to follow specification)
export const workRequests = pgTable("work_requests", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  contractorUserId: integer("contractor_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  deliverableDescription: text("deliverable_description"),
  dueDate: timestamp("due_date"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("assigned"), // assigned, in_review, approved, paid, canceled
  createdAt: timestamp("created_at").defaultNow(),
});

// Work Request Submissions table
export const workRequestSubmissions = pgTable("work_request_submissions", {
  id: serial("id").primaryKey(),
  workRequestId: integer("work_request_id").notNull().references(() => workRequests.id),
  contractorId: integer("contractor_id").notNull().references(() => users.id),
  businessId: integer("business_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  notes: text("notes"), // Additional notes from contractor
  attachmentUrls: jsonb("attachment_urls"), // Array of file URLs
  submissionType: text("submission_type").notNull().default("digital"), // "digital" or "physical"
  status: text("status").notNull().default("pending"), // pending, approved, rejected, revision_requested
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"), // Feedback from business owner
});

// Insert schemas - manually defined to include all fields
export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  role: z.string().default("business"),
  workerType: z.string().optional(),
  profileImageUrl: z.string().optional(),
  companyName: z.string().optional(),
  companyLogo: z.string().optional(),
  title: z.string().optional(),
  industry: z.string().optional(),
  foundedYear: z.number().optional(),
  employeeCount: z.number().optional(),
  website: z.string().optional(),
  profileCode: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  stripeConnectAccountId: z.string().optional(),
  stripeConnectAccountType: z.string().optional(),
  subscriptionStatus: z.string().default("inactive"),
  subscriptionPlan: z.string().optional(),
  subscriptionStartDate: z.date().optional(),
  subscriptionEndDate: z.date().optional(),
  subscriptionTrialEnd: z.date().optional(),
  trolleyCompanyProfileId: z.string().optional(),
  trolleyRecipientId: z.string().optional(),
  trolleySubmerchantId: z.string().optional(),
  trolleySubmerchantStatus: z.string().optional(),
  trolleySubmerchantAccessKey: z.string().optional(),
  trolleySubmerchantSecretKey: z.string().optional(),
  trolleyBankAccountStatus: z.string().optional(),
  trolleyBankAccountId: z.string().optional(),
  trolleyBankAccountLast4: z.string().optional(),
  trolleyVerificationToken: z.string().optional(),
  trolleyVerificationStarted: z.date().optional(),
  trolleyVerificationStatus: z.string().optional(),
  trolleyVerificationCompletedAt: z.date().optional(),
  payoutEnabled: z.boolean().default(false),
  budgetCap: z.string().optional(),
  budgetUsed: z.string().default("0"),
  budgetPeriod: z.string().default("yearly"),
  budgetStartDate: z.date().optional(),
  budgetEndDate: z.date().optional(),
  budgetResetEnabled: z.boolean().default(false),
  paymentMethod: z.string().default("pay_as_you_go"),
  trolleyAccountBalance: z.string().default("0"),
  resetPasswordToken: z.string().optional(),
  resetPasswordExpires: z.date().optional(),
  emailVerified: z.boolean().default(false),
  emailVerificationToken: z.string().optional(),
  emailVerificationExpires: z.date().optional(),
  firebaseUid: z.string().optional(),
});
export const insertInviteSchema = z.object({
  email: z.string().email(),
  projectName: z.string().min(1),
  status: z.string().default("pending"),
  workerType: z.string().default("contractor"),
  businessId: z.number(),
  projectId: z.number().optional(),
  contractDetails: z.string().optional(),
  message: z.string().optional(),
  paymentAmount: z.string().optional(),
  token: z.string().optional(),
  expiresAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

// Make contractorId optional in the insert schema and properly handle date strings
export const insertContractSchema = z.object({
  contractName: z.string().min(1),
  contractCode: z.string().min(1),
  businessId: z.number(),
  projectId: z.number().optional(),
  contractorId: z.number().optional(),
  description: z.string().optional(),
  status: z.string().default("draft"),
  value: z.string(),
  contractorBudget: z.string().optional(),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
});

// Create milestone schema - manually defined
export const insertMilestoneSchema = z.object({
  contractId: z.number(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  dueDate: z.union([z.string(), z.date()]).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
  status: z.string().default("pending"),
  paymentAmount: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      return val;
    }
    return val.toString();
  }),
  progress: z.number().default(0),
  autoPayEnabled: z.boolean().default(true),
  deliverableUrl: z.string().optional(),
  deliverableFiles: z.any().optional(),
  deliverableDescription: z.string().optional(),
  submissionType: z.string().default("digital"),
  approvalNotes: z.string().optional(),
});

// Deliverable schemas - aliases for milestone schemas but with deliverable-focused naming
export const insertDeliverableSchema = insertMilestoneSchema;
export const insertPaymentSchema = z.object({
  contractId: z.number(),
  milestoneId: z.number(),
  amount: z.string(),
  status: z.string().default("scheduled"),
  scheduledDate: z.date(),
  notes: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  stripePaymentIntentStatus: z.string().optional(),
  stripeTransferId: z.string().optional(),
  stripeTransferStatus: z.string().optional(),
  paymentProcessor: z.string().default("stripe"),
  applicationFee: z.string().default("0"),
  triggeredBy: z.string().default("manual"),
});

export const insertDocumentSchema = z.object({
  contractId: z.number(),
  fileName: z.string(),
  fileType: z.string(),
  filePath: z.string(),
  uploadedBy: z.number(),
  description: z.string().optional(),
});

export const insertBankAccountSchema = z.object({
  userId: z.number(),
  accountId: z.string(),
  accountName: z.string(),
  accountType: z.string(),
  accountSubtype: z.string().optional(),
  accountMask: z.string().optional(),
  institutionName: z.string().optional(),
  plaidAccessToken: z.string(),
  plaidItemId: z.string(),
  stripeBankAccountId: z.string().optional(),
  isDefault: z.boolean().default(false),
  metadata: z.any().optional(),
});

// Business Workers schema
export const insertBusinessWorkerSchema = z.object({
  businessId: z.number(),
  contractorUserId: z.number(),
  status: z.string().default("active"),
  role: z.string().default("contractor"),
});

// Projects schema  
export const insertProjectSchema = z.object({
  businessId: z.number(),
  name: z.string(),
  description: z.string().optional(),
  budget: z.string().optional(),
  status: z.string().default("active"),
  updatedAt: z.date().optional(),
});

// Work Request schema with proper date handling (updated for specification)
export const insertWorkRequestSchema = z.object({
  projectId: z.number(),
  contractorUserId: z.number(),
  title: z.string(),
  description: z.string(),
  deliverableDescription: z.string().optional(),
  dueDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  amount: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      return val;
    }
    return val.toString();
  }),
  currency: z.string().default("USD"),
  status: z.string().default("assigned"),
});

// Work Request update schema (for status updates)
export const updateWorkRequestSchema = z.object({
  status: z.enum(["assigned", "in_review", "approved", "paid", "canceled"]).optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBusinessWorker = z.infer<typeof insertBusinessWorkerSchema>;
export type BusinessWorker = typeof businessWorkers.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invites.$inferSelect;

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

// Deliverable types - aliases for milestone types with deliverable-focused naming
export type InsertDeliverable = z.infer<typeof insertDeliverableSchema>;
export type Deliverable = typeof deliverables.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;

export type InsertWorkRequest = z.infer<typeof insertWorkRequestSchema>;
export type WorkRequest = typeof workRequests.$inferSelect;

// Business Onboarding Links table - for contractor/freelancer registration
export const businessOnboardingLinks = pgTable("business_onboarding_links", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => users.id),
  token: text("token").notNull(), // Unique token for this business's onboarding link (temporarily removed .unique() to unblock db:push)
  workerType: text("worker_type").notNull().default("contractor"), // Default type of worker to invite
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  active: boolean("active").notNull().default(true)
});

// Track which users registered via business onboarding links
export const businessOnboardingUsage = pgTable("business_onboarding_usage", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => users.id),
  workerId: integer("worker_id").notNull().references(() => users.id),
  token: text("token").notNull(), // The token that was used
  registeredAt: timestamp("registered_at").notNull().defaultNow()
});

// Create insert schemas
export const insertBusinessOnboardingLinkSchema = createInsertSchema(businessOnboardingLinks);
export const insertBusinessOnboardingUsageSchema = createInsertSchema(businessOnboardingUsage);

// Connection Requests table
export const connectionRequests = pgTable("connection_requests", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => users.id),
  contractorId: integer("contractor_id").references(() => users.id), // Optional during creation if using profile code
  profileCode: text("profile_code"), // Worker's profile code if direct ID not available
  status: text("status").notNull().default("pending"), // pending, accepted, declined, expired
  message: text("message"), // Custom message to the contractor
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Create connection request schema
export const insertConnectionRequestSchema = createInsertSchema(connectionRequests).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  contractorId: true // Will be added conditionally
});

// Types for connection requests
export type InsertConnectionRequest = z.infer<typeof insertConnectionRequestSchema>;
export type ConnectionRequest = typeof connectionRequests.$inferSelect;

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'work_request_declined', 'payment_completed', etc.
  relatedId: integer("related_id"), // ID of the related entity (work request, payment, etc.)
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Work Submissions table
export const workSubmissions = pgTable("work_submissions", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  contractorId: integer("contractor_id").notNull().references(() => users.id),
  businessId: integer("business_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  notes: text("notes"), // Additional notes from contractor
  attachmentUrls: jsonb("attachment_urls"), // Array of file URLs
  status: text("status").notNull().default("pending"), // pending, approved, rejected, revision_requested
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"), // Feedback from business owner
  milestoneId: integer("milestone_id").references(() => milestones.id) // Optional milestone reference
});

// Create notification schema
export const insertNotificationSchema = z.object({
  userId: z.number(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  relatedId: z.number().optional(),
  isRead: z.boolean().default(false),
});

// Create work submission schema
export const insertWorkSubmissionSchema = z.object({
  contractId: z.number(),
  contractorId: z.number(),
  businessId: z.number(),
  title: z.string(),
  description: z.string(),
  notes: z.string().optional(),
  attachmentUrls: z.any().optional(),
  status: z.string().default("pending"),
  reviewNotes: z.string().optional(),
  milestoneId: z.number().optional(),
});

// Create work request submission schema
export const insertWorkRequestSubmissionSchema = z.object({
  workRequestId: z.number(),
  contractorId: z.number(),
  businessId: z.number(),
  title: z.string(),
  description: z.string(),
  notes: z.string().optional(),
  attachmentUrls: z.any().optional(),
  submissionType: z.string().default("digital"),
  status: z.string().default("pending"),
  reviewNotes: z.string().optional(),
});

// Types for notifications
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Types for work submissions
export type InsertWorkSubmission = z.infer<typeof insertWorkSubmissionSchema>;
export type WorkSubmission = typeof workSubmissions.$inferSelect;

// Types for work request submissions
export type InsertWorkRequestSubmission = z.infer<typeof insertWorkRequestSubmissionSchema>;
export type WorkRequestSubmission = typeof workRequestSubmissions.$inferSelect;

// Create types
export type InsertBusinessOnboardingLink = z.infer<typeof insertBusinessOnboardingLinkSchema>;
export type BusinessOnboardingLink = typeof businessOnboardingLinks.$inferSelect;

export type InsertBusinessOnboardingUsage = z.infer<typeof insertBusinessOnboardingUsageSchema>;
export type BusinessOnboardingUsage = typeof businessOnboardingUsage.$inferSelect;
