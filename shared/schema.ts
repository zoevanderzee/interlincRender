import { pgTable, text, serial, integer, boolean, timestamp, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("contractor"), // "business", "contractor", or "freelancer"
  workerType: text("worker_type"), // "contractor" or "freelancer" for external workers
  profileImageUrl: text("profile_image_url"),
  companyName: text("company_name"),
  title: text("title"),
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID for payment processing
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe subscription ID for companies
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
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // When the invite expires
});

// Smart Contracts table
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  contractName: text("contract_name").notNull(),
  contractCode: text("contract_code").notNull().unique(),
  businessId: integer("business_id").notNull(),
  contractorId: integer("contractor_id").notNull(),
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
  paymentProcessor: text("payment_processor").default("stripe"), // Payment processor used
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertInviteSchema = createInsertSchema(invites).omit({ id: true, createdAt: true });
export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, completedDate: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });

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
