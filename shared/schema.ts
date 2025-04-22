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
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID for payment processing
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe subscription ID for companies
  stripeConnectAccountId: text("stripe_connect_account_id"), // Stripe Connect account ID for contractors
  payoutEnabled: boolean("payout_enabled").default(false), // Whether the contractor is ready to receive payments
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertInviteSchema = createInsertSchema(invites).omit({ id: true, createdAt: true });

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
