import { pgTable, serial, text, boolean, timestamp, integer, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - unified for all user types
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("contractor"), // "contractor", "business"
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  bio: text("bio"),
  location: text("location"),
  skills: text("skills"), // comma-separated for contractors
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }), // for contractors
  
  // Business-specific fields
  companyName: text("company_name"), // For business users
  industry: text("industry"), // For business users
  companySize: text("company_size"), // "1-10", "11-50", "51-200", "201+"
  
  // Stripe-related fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  payoutEnabled: boolean("payout_enabled").default(false),
  
  // Budget Management
  budgetCap: decimal("budget_cap", { precision: 10, scale: 2 }), // Maximum budget allowed
  budgetUsed: decimal("budget_used", { precision: 10, scale: 2 }).default("0.00"), // Current budget used
  budgetPeriod: text("budget_period"), // "monthly", "quarterly", "yearly", "project"
  budgetStartDate: timestamp("budget_start_date"),
  budgetEndDate: timestamp("budget_end_date"),
  
  // Trolley fields for contractor payments
  trolleySubmerchantId: text("trolley_submerchant_id"), // Trolley submerchant account ID
  trolleySubmerchantStatus: text("trolley_submerchant_status"), // pending, approved, rejected
  trolleyRecipientId: text("trolley_recipient_id"), // Trolley recipient ID for contractors
  paymentMethod: text("payment_method"), // 'pre_funded', 'pay_as_you_go'
  trolleyAccountBalance: decimal("trolley_account_balance", { precision: 10, scale: 2 }).default("0.00"),
  
  // Profile & Connections
  profileCode: text("profile_code").unique(), // 6-digit code for easy sharing
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  
  // Password reset functionality
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  
  // Firebase integration
  firebaseUID: text("firebase_uid"),
  
  createdAt: timestamp("created_at").defaultNow()
});

// Invites table
export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  workerType: text("worker_type").notNull().default("contractor"), // contractor, employee
  role: text("role").notNull().default("contractor"), // matches user role
  status: text("status").notNull().default("pending"), // pending, accepted, expired
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Contracts table
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => users.id),
  contractorId: integer("contractor_id").references(() => users.id), // Optional during creation
  contractName: text("contract_name").notNull(),
  description: text("description").notNull(),
  totalBudget: decimal("total_budget", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"), // draft, active, completed, cancelled
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  paymentStructure: text("payment_structure").notNull().default("deliverable"), // deliverable, hourly, fixed
  contractorFirstName: text("contractor_first_name"),
  contractorLastName: text("contractor_last_name"),
  contractorEmail: text("contractor_email"),
  contractUrl: text("contract_url"), // URL to the signed contract document
  createdAt: timestamp("created_at").defaultNow()
});

// Deliverables table
export const deliverables = pgTable("deliverables", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date").notNull(),
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, completed, approved
  approvalDate: timestamp("approval_date"),
  approvedBy: integer("approved_by").references(() => users.id),
  completionDate: timestamp("completion_date"),
  deliverableUrl: text("deliverable_url"), // URL to deliverable files
  workSubmissionId: integer("work_submission_id"), // Link to work submission if any
  
  // File attachment fields  
  attachmentUrls: jsonb("attachment_urls"), // Array of file URLs
  attachmentNames: jsonb("attachment_names"), // Array of file names
  attachmentSizes: jsonb("attachment_sizes"), // Array of file sizes
  submissionType: text("submission_type").default("digital"), // "digital" or "physical"
  approvalNotes: text("approval_notes"), // Business notes on approval/rejection
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  deliverableId: integer("deliverable_id").notNull().references(() => deliverables.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeTransferId: text("stripe_transfer_id"),
  trolleyPaymentId: text("trolley_payment_id"), // Trolley payment reference
  trolleyBatchId: text("trolley_batch_id"), // Trolley batch reference  
  failureReason: text("failure_reason"),
  contractorId: integer("contractor_id").notNull().references(() => users.id),
  businessId: integer("business_id").notNull().references(() => users.id),
  paymentMethod: text("payment_method").default("trolley"), // stripe, trolley, manual
  triggeredBy: text("triggered_by").default("manual"), // manual, auto_approval, scheduled
  triggeredAt: timestamp("triggered_at"), // When the payment was automatically triggered
});

// Payment Compliance Logs table - for audit trail and structured data compliance
export const paymentLogs = pgTable("payment_logs", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull(),
  contractId: integer("contract_id").notNull(),
  deliverableId: integer("deliverable_id").notNull().references(() => deliverables.id),
  businessId: integer("business_id").notNull(),
  contractorId: integer("contractor_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(), // Amount after platform fee
  currency: text("currency").default("USD"),
  triggerEvent: text("trigger_event").notNull(), // "deliverable_approved", "manual_payment", "scheduled_payment"
  approvalTimestamp: timestamp("approval_timestamp").notNull(),
  paymentTimestamp: timestamp("payment_timestamp").notNull(),
  processorReference: text("processor_reference"), // Stripe payment intent ID
  transferReference: text("transfer_reference"), // Stripe transfer ID
  trolleyPaymentReference: text("trolley_payment_reference"), // Trolley payment reference
  trolleyBatchReference: text("trolley_batch_reference"), // Trolley batch reference
  businessName: text("business_name"),
  contractorName: text("contractor_name"),
  contractorEmail: text("contractor_email"),
  deliverableName: text("deliverable_name"),
  deliverableDescription: text("deliverable_description"),
  createdAt: timestamp("created_at").defaultNow()
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(), // contract, deliverable, invoice, etc.
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow()
});

// Bank Accounts table
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bankName: text("bank_name").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  routingNumber: text("routing_number").notNull(),
  accountType: text("account_type").notNull().default("checking"), // checking, savings
  isVerified: boolean("is_verified").default(false),
  plaidAccessToken: text("plaid_access_token"),
  plaidItemId: text("plaid_item_id"),
  createdAt: timestamp("created_at").defaultNow()
});

// Work Requests table - for posting available work
export const workRequests = pgTable("work_requests", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open, in_progress, completed, cancelled
  budgetMin: decimal("budget_min", { precision: 10, scale: 2 }), // Minimum budget amount
  budgetMax: decimal("budget_max", { precision: 10, scale: 2 }), // Maximum budget amount
  dueDate: timestamp("due_date"), // When the work is due
  skills: text("skills"), // Required skills for the work (comma-separated)
  attachmentUrls: jsonb("attachment_urls"), // URLs to any attachments
  tokenHash: text("token_hash"), // Hash for secure access to the work request
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // When the request expires
  contractId: integer("contract_id") // If a contract was created from this request
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

// Insert schemas  
export const insertUserSchema = createInsertSchema(users, {
  id: z.number().optional(),
});

export const insertInviteSchema = createInsertSchema(invites, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
  expiresAt: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  workerType: z.string().default("contractor")
});

export const insertContractSchema = createInsertSchema(contracts, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
  contractorId: z.number().optional(),
  startDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  endDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

export const insertDeliverableSchema = createInsertSchema(deliverables, {
  id: z.number().optional(),
  dueDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  paymentAmount: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? val.toString() : val
  ),
});

export const insertPaymentSchema = createInsertSchema(payments, {
  id: z.number().optional(),
  completedDate: z.date().optional(),
});

export const insertDocumentSchema = createInsertSchema(documents, {
  id: z.number().optional(),
  uploadedAt: z.date().optional(),
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
  isVerified: z.boolean().optional(),
});

export const insertWorkRequestSchema = createInsertSchema(workRequests, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
  tokenHash: z.string().optional(),
  contractId: z.number().optional(),
  dueDate: z.union([z.string(), z.date()]).optional().transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : undefined
  ),
  expiresAt: z.union([z.string(), z.date()]).optional().transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : undefined
  ),
  attachmentUrls: z.array(z.string()).optional().transform(val => val || []),
});

// Work Request update schema (includes tokenHash for updates)
export const updateWorkRequestSchema = insertWorkRequestSchema.extend({
  tokenHash: z.string().optional(),
  contractId: z.number().optional(),
});

// Business Onboarding Links table
export const businessOnboardingLinks = pgTable("business_onboarding_links", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  workerType: text("worker_type").notNull().default("contractor"), // contractor, employee
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  usageCount: integer("usage_count").notNull().default(0),
  maxUsage: integer("max_usage") // null means unlimited
});

// Track which users registered via business onboarding links
export const businessOnboardingUsage = pgTable("business_onboarding_usage", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => users.id),
  workerId: integer("worker_id").notNull().references(() => users.id),
  token: text("token").notNull(), // The token that was used
  registeredAt: timestamp("registered_at").notNull().defaultNow()
});

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
  deliverableId: integer("deliverable_id").references(() => deliverables.id) // Optional deliverable reference
});

// Create insert schemas for remaining tables
export const insertBusinessOnboardingLinkSchema = createInsertSchema(businessOnboardingLinks);
export const insertBusinessOnboardingUsageSchema = createInsertSchema(businessOnboardingUsage);

export const insertConnectionRequestSchema = createInsertSchema(connectionRequests, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  contractorId: z.number().optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
});

export const insertWorkSubmissionSchema = createInsertSchema(workSubmissions, {
  id: z.number().optional(),
  submittedAt: z.date().optional(),
  reviewedAt: z.date().optional(),
});

export const insertWorkRequestSubmissionSchema = createInsertSchema(workRequestSubmissions, {
  id: z.number().optional(),
  submittedAt: z.date().optional(),
  reviewedAt: z.date().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invites.$inferSelect;

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

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

export type InsertBusinessOnboardingLink = z.infer<typeof insertBusinessOnboardingLinkSchema>;
export type BusinessOnboardingLink = typeof businessOnboardingLinks.$inferSelect;

export type InsertBusinessOnboardingUsage = z.infer<typeof insertBusinessOnboardingUsageSchema>;
export type BusinessOnboardingUsage = typeof businessOnboardingUsage.$inferSelect;

export type InsertConnectionRequest = z.infer<typeof insertConnectionRequestSchema>;
export type ConnectionRequest = typeof connectionRequests.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertWorkSubmission = z.infer<typeof insertWorkSubmissionSchema>;
export type WorkSubmission = typeof workSubmissions.$inferSelect;

export type InsertWorkRequestSubmission = z.infer<typeof insertWorkRequestSubmissionSchema>;
export type WorkRequestSubmission = typeof workRequestSubmissions.$inferSelect;