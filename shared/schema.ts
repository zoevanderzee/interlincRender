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
  profileCode: text("profile_code").unique(), // Unique code for easy worker identification (e.g., "JOHNSON-2025")
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID for payment processing
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe subscription ID for companies
  stripeConnectAccountId: text("stripe_connect_account_id"), // Stripe Connect account ID for contractors
  payoutEnabled: boolean("payout_enabled").default(false), // Whether the contractor is ready to receive payments
  budgetCap: decimal("budget_cap", { precision: 15, scale: 2 }), // Maximum budget for outsourcing (for business accounts)
  budgetUsed: decimal("budget_used", { precision: 15, scale: 2 }).default("0"), // Amount of budget already allocated to projects
  budgetPeriod: text("budget_period").default("yearly"), // Budget period: monthly, quarterly, yearly
  budgetStartDate: timestamp("budget_start_date"), // When the current budget period began
  budgetEndDate: timestamp("budget_end_date"), // When the current budget period ends
  budgetResetEnabled: boolean("budget_reset_enabled").default(false), // Whether budget should automatically reset at the end of period
  resetPasswordToken: text("reset_password_token"), // Token for password reset
  resetPasswordExpires: timestamp("reset_password_expires") // Expiration time for password reset token
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
  contractorId: integer("contractor_id"), // Made optional for initial project creation
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, active, completed, terminated
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Milestones table
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, overdue, approved
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }).notNull(),
  progress: integer("progress").notNull().default(0), // 0-100 percentage
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  milestoneId: integer("milestone_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, processing, completed, failed
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe Payment Intent ID
  stripePaymentIntentStatus: text("stripe_payment_intent_status"), // Stripe Payment Intent Status
  stripeTransferId: text("stripe_transfer_id"), // Stripe Transfer ID for Connect payouts
  stripeTransferStatus: text("stripe_transfer_status"), // Status of the Stripe Transfer
  paymentProcessor: text("payment_processor").default("stripe"), // Payment processor used
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }).default("0"), // Platform fee
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

// Work Requests table
export const workRequests = pgTable("work_requests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  businessId: integer("business_id").notNull(), // Business that sent the request
  recipientEmail: text("recipient_email"), // Email of the recipient - optional for shareable links
  status: text("status").notNull().default("pending"), // pending, accepted, declined, expired
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
const baseInviteSchema = createInsertSchema(invites).omit({ id: true, createdAt: true });
export const insertInviteSchema = baseInviteSchema.extend({
  // Make expiresAt transform string dates
  expiresAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
  // Ensure workerType is always provided with a default
  workerType: z.string().default("contractor")
});

// Make contractorId optional in the insert schema and properly handle date strings
const baseContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true });
export const insertContractSchema = baseContractSchema.extend({
  // Make contractorId optional
  contractorId: baseContractSchema.shape.contractorId.optional(),
  // Handle date strings from frontend forms
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, completedDate: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });
export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true, createdAt: true, isVerified: true });

// Work Request schema with proper date handling
const baseWorkRequestSchema = createInsertSchema(workRequests).omit({ 
  id: true, 
  createdAt: true, 
  tokenHash: true, 
  contractId: true 
});
export const insertWorkRequestSchema = baseWorkRequestSchema.extend({
  // Handle date strings from frontend forms
  dueDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  expiresAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
  attachmentUrls: z.array(z.string()).optional().transform(val => val ? val : []),
});

// Work Request update schema (includes tokenHash for updates)
export const updateWorkRequestSchema = insertWorkRequestSchema.extend({
  tokenHash: z.string().optional(),
  contractId: z.number().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invites.$inferSelect;

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

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
  token: text("token").notNull().unique(), // Unique token for this business's onboarding link
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

// Create types
export type InsertBusinessOnboardingLink = z.infer<typeof insertBusinessOnboardingLinkSchema>;
export type BusinessOnboardingLink = typeof businessOnboardingLinks.$inferSelect;

export type InsertBusinessOnboardingUsage = z.infer<typeof insertBusinessOnboardingUsageSchema>;
export type BusinessOnboardingUsage = typeof businessOnboardingUsage.$inferSelect;
