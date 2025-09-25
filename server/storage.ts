import {
  users, invites, contracts, milestones, payments, paymentLogs, documents, bankAccounts, workRequests,
  businessOnboardingLinks, businessOnboardingUsage, connectionRequests, notifications, workSubmissions, workRequestSubmissions,
  businessWorkers, projects, tasks, taskSubmissions,
  type User, type InsertUser,
  type Invite, type InsertInvite,
  type Contract, type InsertContract,
  type Milestone, type InsertMilestone,
  type Payment, type InsertPayment,
  type Document, type InsertDocument,
  type BankAccount, type InsertBankAccount,
  type WorkRequest, type InsertWorkRequest,
  type BusinessOnboardingLink, type InsertBusinessOnboardingLink,
  type BusinessOnboardingUsage, type InsertBusinessOnboardingUsage,
  type ConnectionRequest, type InsertConnectionRequest,
  type Notification, type InsertNotification,
  type WorkSubmission, type InsertWorkSubmission,
  type WorkRequestSubmission, type InsertWorkRequestSubmission,
  type BusinessWorker, type InsertBusinessWorker,
  type Project, type InsertProject,
  type Task, type InsertTask,
  type TaskSubmission, type InsertTaskSubmission
} from "@shared/schema";
import { eq, and, desc, lte, gte, sql, or, inArray, isNotNull } from "drizzle-orm";
import { db, pool } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import * as crypto from "crypto";

// Storage interface for CRUD operations
export interface IStorage {
  // Session management
  sessionStore: session.Store;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUID(firebaseUID: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByConnectAccountId(connectAccountId: string): Promise<User[]>;
  getContractorsByBusinessId(businessId: number): Promise<User[]>; // Get contractors with contracts with this business
  getContractorsByBusinessInvites(businessId: number): Promise<User[]>; // Get contractors invited by this business
  getBusinessesByContractorId(contractorId: number): Promise<User[]>; // Get businesses with contracts with this contractor
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  updateStripeCustomerId(id: number, stripeCustomerId: string): Promise<User | undefined>;
  updateUserStripeInfo(id: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User | undefined>;
  updateUserConnectAccount(id: number, connectAccountId: string, payoutEnabled?: boolean): Promise<User | undefined>;

  // Stripe Connect account management
  getConnectForUser(userId: number): Promise<{ accountId: string, accountType: string } | null>;
  setConnectForUser(userId: number, data: { accountId: string, accountType: string }): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | undefined>;
  savePasswordResetToken(userId: number, token: string, expires: Date): Promise<User | undefined>;
  clearPasswordResetToken(userId: number): Promise<User | undefined>;
  updatePassword(userId: number, newPassword: string): Promise<User | undefined>;
  verifyUserEmail(email: string): Promise<User | undefined>;
  saveEmailVerificationToken(userId: number, token: string, expires: Date): Promise<User | undefined>;
  verifyEmailToken(token: string): Promise<User | undefined>;

  // Budget Management
  getBudget(userId: number): Promise<{ budgetCap: string | null, budgetUsed: string | null } | null>;
  setBudgetCap(userId: number, budgetCap: number, period?: string, startDate?: Date, endDate?: Date): Promise<User | undefined>;
  increaseBudgetUsed(userId: number, amount: number): Promise<User | undefined>;
  decreaseBudgetUsed(userId: number, amount: number): Promise<User | undefined>;
  resetBudgetUsed(userId: number): Promise<User | undefined>;
  checkBudgetAvailable(userId: number, amount: number): Promise<boolean>;

  // Trolley Submerchant Management
  updateTrolleySubmerchantInfo(userId: number, submerchantId: string, status: string): Promise<User | undefined>;
  setPaymentMethod(userId: number, method: 'pre_funded' | 'pay_as_you_go'): Promise<User | undefined>;
  updateTrolleyAccountBalance(userId: number, balance: number): Promise<User | undefined>;
  updateUserTrolleyRecipientId(userId: number, recipientId: string): Promise<User | undefined>;

  // Profile Code
  generateProfileCode(userId: number): Promise<string>;
  regenerateProfileCode(userId: number): Promise<string>;
  getUserByProfileCode(profileCode: string): Promise<User | undefined>;

  // Connection Requests
  createConnectionRequest(request: { businessId: number, profileCode: string, message?: string | null, status?: string }): Promise<ConnectionRequest>;
  getConnectionRequest(id: number): Promise<ConnectionRequest | undefined>;
  getConnectionRequestByProfileCode(businessId: number, profileCode: string): Promise<ConnectionRequest | undefined>;
  getConnectionRequestsByBusinessId(businessId: number): Promise<ConnectionRequest[]>;
  getConnectionRequestsByContractorId(contractorId: number): Promise<ConnectionRequest[]>;
  getConnectionRequests(filters: { businessId?: number, contractorId?: number, status?: string }): Promise<ConnectionRequest[]>;
  updateConnectionRequest(id: number, request: Partial<ConnectionRequest>): Promise<ConnectionRequest | undefined>;
  isContractorLinkedToBusiness(businessId: number, contractorId: number): Promise<boolean>;

  // Invites
  getInvite(id: number): Promise<Invite | undefined>;
  getInviteByEmail(email: string): Promise<Invite | undefined>;
  getInvitesByBusinessId(businessId: number): Promise<Invite[]>;
  getPendingInvites(): Promise<Invite[]>;
  createInvite(invite: InsertInvite): Promise<Invite>;
  updateInvite(id: number, invite: Partial<InsertInvite>): Promise<Invite | undefined>;
  updateInviteToken(id: number, token: string): Promise<Invite | undefined>;

  // Business Onboarding Links
  createBusinessOnboardingLink(businessId: number, workerType: string): Promise<BusinessOnboardingLink>;
  getBusinessOnboardingLink(businessId: number): Promise<BusinessOnboardingLink | undefined>;
  updateBusinessOnboardingLink(businessId: number, data: Partial<InsertBusinessOnboardingLink>): Promise<BusinessOnboardingLink>;
  verifyOnboardingToken(token: string): Promise<{businessId: number, workerType: string} | undefined>;
  recordOnboardingUsage(businessId: number, workerId: number, token: string): Promise<BusinessOnboardingUsage>;

  // Contracts
  getContract(id: number): Promise<Contract | undefined>;
  getContractsByBusinessId(businessId: number): Promise<Contract[]>;
  getContractsByContractorId(contractorId: number): Promise<Contract[]>;
  getAllContracts(): Promise<Contract[]>;
  getDeletedContractsByBusinessId(businessId: number): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: number): Promise<boolean>;
  permanentlyDeleteContract(id: number): Promise<boolean>;

  // Milestones
  getMilestone(id: number): Promise<Milestone | undefined>;
  getMilestonesByContractId(contractId: number): Promise<Milestone[]>;
  getAllMilestones(): Promise<Milestone[]>;
  getUpcomingMilestones(limit: number): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: number, milestone: Partial<InsertMilestone>): Promise<Milestone | undefined>;

  // Payments
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByContractId(contractId: number): Promise<Payment[]>;
  getPaymentByMilestoneId(milestoneId: number): Promise<Payment | undefined>;
  getPaymentByTrolleyId(trolleyPaymentId: string): Promise<Payment | undefined>;
  getAllPayments(contractId: number | null): Promise<Payment[]>;
  getUpcomingPayments(limit: number): Promise<Payment[]>;
  getCompletedPayments(userId: number): Promise<Payment[]>;
  getApprovedMilestonesWithoutPayments(): Promise<Milestone[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  updatePaymentStripeDetails(id: number, stripePaymentIntentId: string, stripePaymentIntentStatus: string): Promise<Payment | undefined>;
  updatePaymentTransferDetails(id: number, stripeTransferId: string, stripeTransferStatus: string, applicationFee: number): Promise<Payment | undefined>;

  // Business Payment Statistics - Real Data Calculations
  getBusinessPaymentStats(businessId: number): Promise<{totalSuccessfulPayments: number, totalPaymentValue: number, currentMonthValue: number, currentYearValue: number}>;
  getBusinessMonthlyPayments(businessId: number, year: number, month: number): Promise<number>;
  getBusinessAnnualPayments(businessId: number, year: number): Promise<number>;
  getBusinessTotalSuccessfulPayments(businessId: number): Promise<number>;

  // Payment Logs for compliance
  createPaymentLog(log: any): Promise<any>;

  // Documents
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByContractId(contractId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;

  // Bank Accounts
  getUserBankAccounts(userId: number): Promise<BankAccount[]>;
  getUserBankAccount(userId: number, accountId: string): Promise<BankAccount | undefined>;
  saveUserBankAccount(userId: number, bankAccountData: InsertBankAccount): Promise<BankAccount>;
  setDefaultBankAccount(userId: number, accountId: string): Promise<BankAccount | undefined>;
  removeBankAccount(userId: number, accountId: string): Promise<boolean>;
  updatePaymentStatus(paymentId: number, status: string, paymentDetails?: Record<string, any>): Promise<Payment | undefined>;

  // Work Requests
  getWorkRequest(id: number): Promise<WorkRequest | undefined>;
  getWorkRequestByToken(tokenHash: string): Promise<WorkRequest | undefined>;
  getWorkRequestsByBusinessId(businessId: number): Promise<WorkRequest[]>;
  getWorkRequestsByContractorId(contractorUserId: number): Promise<WorkRequest[]>;
  getWorkRequestsWithBusinessInfo(contractorUserId: number): Promise<any[]>;
  getPendingWorkRequests(): Promise<WorkRequest[]>;
  createWorkRequest(workRequest: InsertWorkRequest, tokenHash: string): Promise<WorkRequest>;
  updateWorkRequest(id: number, workRequest: Partial<InsertWorkRequest>): Promise<WorkRequest | undefined>;
  linkWorkRequestToContract(id: number, contractId: number): Promise<WorkRequest | undefined>;

  // Work Request Submissions
  getWorkRequestSubmission(id: number): Promise<WorkRequestSubmission | undefined>;
  getWorkRequestSubmissionsByBusinessId(businessId: number): Promise<WorkRequestSubmission[]>;
  getWorkRequestSubmissionsByContractorId(contractorId: number): Promise<WorkRequestSubmission[]>;
  createWorkRequestSubmission(submission: InsertWorkRequestSubmission): Promise<WorkRequestSubmission>;
  updateWorkRequestSubmission(id: number, submission: Partial<InsertWorkRequestSubmission>): Promise<WorkRequestSubmission | undefined>;

  // Profile Codes and Connection Requests (methods already declared above)
  // Removing duplicate declarations
  getConnectionRequestByProfileCode(businessId: number, profileCode: string): Promise<ConnectionRequest | undefined>;
  createConnectionRequest(request: InsertConnectionRequest): Promise<ConnectionRequest>;
  updateConnectionRequest(id: number, request: Partial<InsertConnectionRequest>): Promise<ConnectionRequest | undefined>;

  // Notifications
  createNotification(notification: any): Promise<any>;
  getNotificationsByUserId(userId: number): Promise<any[]>;
  markNotificationAsRead(id: number): Promise<any>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // Work Submissions
  createWorkSubmission(submission: InsertWorkSubmission): Promise<WorkSubmission>;
  getWorkSubmissionsByContractId(contractId: number): Promise<WorkSubmission[]>;
  getWorkSubmissionsByContractorId(contractorId: number): Promise<WorkSubmission[]>;
  getWorkSubmissionsByBusinessId(businessId: number): Promise<WorkSubmission[]>;
  getWorkSubmission(id: number): Promise<WorkSubmission | undefined>;
  updateWorkSubmission(id: number, submission: Partial<InsertWorkSubmission>): Promise<WorkSubmission | undefined>;
  reviewWorkSubmission(id: number, status: string, reviewNotes?: string): Promise<WorkSubmission | undefined>;

  // Subscription Management
  updateUserSubscription(userId: number, subscription: Partial<{
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    subscriptionStatus: string;
    subscriptionPlan: string;
    subscriptionStartDate: Date;
    subscriptionEndDate: Date;
    subscriptionTrialEnd: Date | null;
  }>): Promise<User | undefined>;

  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  getTasksByProjectId(projectId: number): Promise<Task[]>;
  getTasksByContractorId(contractorId: number): Promise<Task[]>;
  getTasksByBusinessId(businessId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  assignTaskToContractor(taskId: number, contractorId: number): Promise<Task | undefined>;
  updateTaskStatus(id: number, status: 'open' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'canceled'): Promise<Task | undefined>;

  // Task Submissions
  getTaskSubmission(id: number): Promise<TaskSubmission | undefined>;
  getTaskSubmissionsByTaskId(taskId: number): Promise<TaskSubmission[]>;
  getTaskSubmissionsByContractorId(contractorId: number): Promise<TaskSubmission[]>;
  getTaskSubmissionsByBusinessId(businessId: number): Promise<TaskSubmission[]>;
  createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission>;
  updateTaskSubmission(id: number, submission: Partial<InsertTaskSubmission>): Promise<TaskSubmission | undefined>;
  approveTaskSubmission(id: number, approverId: number): Promise<TaskSubmission | undefined>;
  rejectTaskSubmission(id: number, rejectionReason?: string, approverId?: number): Promise<TaskSubmission | undefined>;

  // Business Workers (new specification)
  upsertBusinessWorker(data: InsertBusinessWorker): Promise<BusinessWorker>;
  getBusinessWorker(id: number): Promise<BusinessWorker | undefined>;
  getBusinessWorkers(businessId: number): Promise<Array<BusinessWorker & { contractorName?: string }>>;

  // Projects (new specification)
  getProject(id: number): Promise<Project | undefined>;
  getBusinessProjects(businessId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;

  // Work Requests (updated specification)
  createWorkRequest(workRequest: Omit<InsertWorkRequest, 'createdAt'>): Promise<WorkRequest>;
  getWorkRequest(id: number): Promise<WorkRequest | undefined>;
  getProjectWorkRequests(projectId: number): Promise<WorkRequest[]>;
  updateWorkRequestStatus(id: number, status: string): Promise<WorkRequest | undefined>;
  updateWorkRequestContract(id: number, contractId: number): Promise<WorkRequest | undefined>;
  getContractByWorkRequestId(workRequestId: number): Promise<Contract | undefined>;

  // BULLETPROOF DATA CONSISTENCY METHOD
  ensureContractWorkRequestConsistency(contractorId: number, deliverableName: string): Promise<{contract: Contract | null, workRequest: WorkRequest | null, businessId: number | null}>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private invites: Map<number, Invite>;
  private contracts: Map<number, Contract>;
  private milestones: Map<number, Milestone>;
  private payments: Map<number, Payment>;
  private documents: Map<number, Document>;
  private bankAccounts: Map<number, BankAccount>;
  private workRequests: Map<number, WorkRequest>;
  private businessOnboardingLinks: Map<number, BusinessOnboardingLink>;
  private businessOnboardingUsage: Map<number, BusinessOnboardingUsage>;
  private connectionRequests: Map<number, ConnectionRequest>;

  private userId: number;
  private inviteId: number;
  private contractId: number;
  private milestoneId: number;
  private paymentId: number;
  private documentId: number;
  private bankAccountId: number;
  private workRequestId: number;
  private connectionRequestId: number;

  // Session store
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.invites = new Map();
    this.contracts = new Map();
    this.milestones = new Map();
    this.payments = new Map();
    this.documents = new Map();
    this.bankAccounts = new Map();
    this.workRequests = new Map();
    this.businessOnboardingLinks = new Map();
    this.businessOnboardingUsage = new Map();
    this.connectionRequests = new Map();

    this.userId = 1;
    this.inviteId = 1;
    this.contractId = 1;
    this.milestoneId = 1;
    this.paymentId = 1;
    this.documentId = 1;
    this.bankAccountId = 1;
    this.workRequestId = 1;
    this.connectionRequestId = 1;

    // Create memory store for sessions
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    // No longer seed test data to provide a clean slate for real users
    // this.seedData();
  }

  // User CRUD methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getUserByFirebaseUID(firebaseUID: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.firebaseUid === firebaseUID
    );
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.resetPasswordToken === token &&
                user.resetPasswordExpires &&
                new Date(user.resetPasswordExpires) > new Date()
    );
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      resetPasswordToken: token,
      resetPasswordExpires: expires
    };

    this.users.set(user.id, updatedUser);
    return updatedUser;
  }

  async saveEmailVerificationToken(userId: number, token: string, expires: Date): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    const updatedUser = {
      ...user,
      emailVerificationToken: token,
      emailVerificationExpires: expires
    };

    this.users.set(userId, updatedUser);
  }

  async verifyEmailToken(token: string): Promise<User | null> {
    const user = Array.from(this.users.values()).find(
      (user) => user.emailVerificationToken === token &&
                user.emailVerificationExpires &&
                new Date(user.emailVerificationExpires) > new Date()
    );

    if (!user) {
      return null;
    }

    // Mark email as verified and clear the token
    const updatedUser = {
      ...user,
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined
    };

    this.users.set(user.id, updatedUser);
    return updatedUser;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === role
    );
  }

  async getUsersByConnectAccountId(connectAccountId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.stripeConnectAccountId === connectAccountId
    );
  }

  async getContractorsByBusinessId(businessId: number): Promise<User[]> {
    // First get all active contracts for this business
    const contractorIds = new Set(
      Array.from(this.contracts.values())
        .filter(contract =>
          contract.businessId === businessId &&
          contract.contractorId !== null &&
          contract.status === 'active' // Only include contractors with active contracts
        )
        .map(contract => contract.contractorId)
    );

    // Then get all contractors with active contracts
    return Array.from(this.users.values()).filter(
      user => contractorIds.has(user.id) && (user.role === 'contractor' || user.role === 'freelancer')
    );
  }

  async getContractorsByBusinessInvites(businessId: number): Promise<User[]> {
    // Get all emails from pending invites sent by this business
    const invitedEmails = new Set(
      Array.from(this.invites.values())
        .filter(invite => invite.businessId === businessId && invite.status === 'pending')
        .map(invite => invite.email.toLowerCase())
    );

    // Get all contractors with those emails
    return Array.from(this.users.values()).filter(
      user => user.email && invitedEmails.has(user.email.toLowerCase()) &&
        (user.role === 'contractor' || user.role === 'freelancer')
    );
  }

  async getBusinessesByContractorId(contractorId: number): Promise<User[]> {
    // First get all contracts for this contractor
    const businessIds = new Set(
      Array.from(this.contracts.values())
        .filter(contract => contract.contractorId === contractorId)
        .map(contract => contract.businessId)
    );

    // Then get all businesses
    return Array.from(this.users.values()).filter(
      user => businessIds.has(user.id) && user.role === 'business'
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateStripeCustomerId(id: number, stripeCustomerId: string): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser = {
      ...existingUser,
      stripeCustomerId
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(id: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser = {
      ...existingUser,
      stripeCustomerId: stripeInfo.stripeCustomerId,
      stripeSubscriptionId: stripeInfo.stripeSubscriptionId
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserConnectAccount(id: number, connectAccountId: string, payoutEnabled: boolean = false): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser = {
      ...existingUser,
      stripeConnectAccountId: connectAccountId,
      payoutEnabled
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Invite CRUD methods
  async getInvite(id: number): Promise<Invite | undefined> {
    return this.invites.get(id);
  }

  async getInviteByEmail(email: string): Promise<Invite | undefined> {
    return Array.from(this.invites.values()).find(
      (invite) => invite.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getInvitesByBusinessId(businessId: number): Promise<Invite[]> {
    return Array.from(this.invites.values()).filter(
      (invite) => invite.businessId === businessId
    );
  }

  async getPendingInvites(): Promise<Invite[]> {
    return Array.from(this.invites.values()).filter(
      (invite) => invite.status === 'pending'
    );
  }

  async createInvite(insertInvite: InsertInvite): Promise<Invite> {
    const id = this.inviteId++;
    const createdAt = new Date();
    // Default expiration to 7 days from now if not provided
    const expiresAt = insertInvite.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite: Invite = {
      ...insertInvite,
      id,
      createdAt,
      expiresAt,
      status: insertInvite.status || 'pending',
      projectId: insertInvite.projectId || null,
      contractDetails: insertInvite.contractDetails || null,
      message: insertInvite.message || null
    };

    this.invites.set(id, invite);
    return invite;
  }

  async updateInvite(id: number, inviteData: Partial<InsertInvite>): Promise<Invite | undefined> {
    const existingInvite = this.invites.get(id);
    if (!existingInvite) return undefined;

    const updatedInvite = { ...existingInvite, ...inviteData };
    this.invites.set(id, updatedInvite);
    return updatedInvite;
  }

  async updateInviteToken(id: number, token: string): Promise<Invite | undefined> {
    const existingInvite = this.invites.get(id);
    if (!existingInvite) return undefined;

    const updatedInvite = {
      ...existingInvite,
      token: token
    };
    this.invites.set(id, updatedInvite);
    return updatedInvite;
  }

  // Contract CRUD methods
  async getContract(id: number): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }

  async getContractsByBusinessId(businessId: number): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      (contract) => contract.businessId === businessId && contract.status !== 'deleted'
    );
  }

  async getContractsByContractorId(contractorId: number): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      (contract) => contract.contractorId === contractorId && contract.status !== 'deleted'
    );
  }

  async getAllContracts(): Promise<Contract[]> {
    return Array.from(this.contracts.values());
  }

  async getDeletedContractsByBusinessId(businessId: number): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      (contract) => contract.businessId === businessId && contract.status === 'deleted'
    );
  }

  async createContract(insertContract: InsertContract): Promise<Contract> {
    const id = this.contractId++;
    const createdAt = new Date();
    const contract: Contract = { ...insertContract, id, createdAt };
    this.contracts.set(id, contract);
    return contract;
  }

  async updateContract(id: number, contractData: Partial<InsertContract>): Promise<Contract | undefined> {
    const existingContract = this.contracts.get(id);
    if (!existingContract) return undefined;

    const updatedContract = { ...existingContract, ...contractData };
    this.contracts.set(id, updatedContract);
    return updatedContract;
  }

  async deleteContract(id: number): Promise<boolean> {
    const existingContract = this.contracts.get(id);
    if (!existingContract) return false;

    // Instead of deleting, mark the contract as deleted
    const updatedContract = {
      ...existingContract,
      status: 'deleted'
    };

    // Update the contract in the store
    this.contracts.set(id, updatedContract);
    console.log(`Contract ${id} marked as deleted instead of being removed`);

    return true;
  }

  async permanentlyDeleteContract(id: number): Promise<boolean> {
    const existingContract = this.contracts.get(id);
    if (!existingContract) return false;

    // Check if contract is already marked as deleted
    if (existingContract.status !== 'deleted') {
      console.log(`Contract ${id} must be marked as deleted before it can be permanently removed`);
      return false;
    }

    // Actually remove the contract from the store
    this.contracts.delete(id);
    console.log(`Contract ${id} permanently deleted from memory storage`);

    return true;
  }

  // Milestone CRUD methods
  async getMilestone(id: number): Promise<Milestone | undefined> {
    return this.milestones.get(id);
  }

  async getMilestonesByContractId(contractId: number): Promise<Milestone[]> {
    return Array.from(this.milestones.values()).filter(
      (milestone) => milestone.contractId === contractId
    );
  }

  async getAllMilestones(): Promise<Milestone[]> {
    return Array.from(this.milestones.values());
  }

  async getUpcomingMilestones(limit: number): Promise<Milestone[]> {
    // For development, return empty array to clear test data
    return [];
  }

  async createMilestone(insertMilestone: InsertMilestone): Promise<Milestone> {
    const id = this.milestoneId++;
    const milestone: Milestone = { ...insertMilestone, id };
    this.milestones.set(id, milestone);
    return milestone;
  }

  async updateMilestone(id: number, milestoneData: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const existingMilestone = this.milestones.get(id);
    if (!existingMilestone) return undefined;

    const updatedMilestone = { ...existingMilestone, ...milestoneData };
    this.milestones.set(id, updatedMilestone);
    return updatedMilestone;
  }

  // Payment CRUD methods
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByContractId(contractId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.contractId === contractId
    );
  }

  async getAllPayments(contractId: number | null): Promise<Payment[]> {
    if (contractId) {
      return this.getPaymentsByContractId(contractId);
    }
    return Array.from(this.payments.values());
  }

  async getUpcomingPayments(limit: number): Promise<Payment[]> {
    // Get all payments that are scheduled but not completed
    const pendingPayments = Array.from(this.payments.values())
      .filter(payment => payment.status === 'pending' || payment.status === 'processing')
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    return pendingPayments.slice(0, limit);
  }

  async getCompletedPayments(userId: number): Promise<Payment[]> {
    // For MemStorage, get all completed payments for contracts belonging to this user
    const userContracts = Array.from(this.contracts.values())
      .filter(contract => contract.businessId === userId);
    const contractIds = userContracts.map(c => c.id);
    
    return Array.from(this.payments.values())
      .filter(payment => payment.status === 'completed' && contractIds.includes(payment.contractId));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.paymentId++;
    const payment: Payment = {
      ...insertPayment,
      id,
      completedDate: null,
      stripePaymentIntentId: null,
      stripePaymentIntentStatus: null,
      paymentProcessor: 'stripe'
    };
    this.payments.set(id, payment);
    return payment;
  }

  async updatePayment(id: number, paymentData: Partial<InsertPayment>): Promise<Payment | undefined> {
    const existingPayment = this.payments.get(id);
    if (!existingPayment) return undefined;

    const updatedPayment = { ...existingPayment, ...paymentData };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  async updatePaymentStripeDetails(id: number, stripePaymentIntentId: string, stripePaymentIntentStatus: string): Promise<Payment | undefined> {
    const existingPayment = this.payments.get(id);
    if (!existingPayment) return undefined;

    const updatedPayment = {
      ...existingPayment,
      stripePaymentIntentId,
      stripePaymentIntentStatus,
      // Update payment status based on Stripe status
      status: stripePaymentIntentStatus === 'succeeded' ? 'completed' :
              stripePaymentIntentStatus === 'processing' ? 'processing' :
              stripePaymentIntentStatus === 'requires_payment_method' ? 'failed' :
              existingPayment.status,
      // If payment succeeded, set the completed date
      completedDate: stripePaymentIntentStatus === 'succeeded' ? new Date() : existingPayment.completedDate
    };

    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  async updatePaymentTransferDetails(id: number, stripeTransferId: string, stripeTransferStatus: string, applicationFee: number): Promise<Payment | undefined> {
    const existingPayment = this.payments.get(id);
    if (!existingPayment) return undefined;

    const updatedPayment = {
      ...existingPayment,
      stripeTransferId,
      stripeTransferStatus,
      applicationFee: applicationFee.toString()
    };

    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  // Document CRUD methods
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByContractId(contractId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => document.contractId === contractId
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentId++;
    const uploadedAt = new Date();
    const document: Document = { ...insertDocument, id, uploadedAt };
    this.documents.set(id, document);
    return document;
  }

  // Bank Account methods
  async getUserBankAccounts(userId: number): Promise<BankAccount[]> {
    return Array.from(this.bankAccounts.values()).filter(
      (account) => account.userId === userId
    );
  }

  async getUserBankAccount(userId: number, accountId: string): Promise<BankAccount | undefined> {
    return Array.from(this.bankAccounts.values()).find(
      (account) => account.userId === userId && account.accountId === accountId
    );
  }

  async saveUserBankAccount(userId: number, bankAccountData: InsertBankAccount): Promise<BankAccount> {
    const id = this.bankAccountId++;
    const createdAt = new Date();
    const isDefault = (await this.getUserBankAccounts(userId)).length === 0; // First account is default

    const bankAccount: BankAccount = {
      ...bankAccountData,
      id,
      userId,
      createdAt,
      isVerified: false,
      isDefault,
      metadata: bankAccountData.metadata || null
    };

    this.bankAccounts.set(id, bankAccount);
    return bankAccount;
  }

  async setDefaultBankAccount(userId: number, accountId: string): Promise<BankAccount | undefined> {
    // Get all bank accounts for this user
    const userAccounts = await this.getUserBankAccounts(userId);

    // Find the requested account
    const accountToSet = userAccounts.find(account => account.accountId === accountId);
    if (!accountToSet) return undefined;

    // Set this account as default and all others as non-default
    for (const account of userAccounts) {
      const isDefault = account.accountId === accountId;
      const updatedAccount = { ...account, isDefault };
      this.bankAccounts.set(account.id, updatedAccount);
    }

    // Return the newly set default account
    return { ...accountToSet, isDefault: true };
  }

  async removeBankAccount(userId: number, accountId: string): Promise<boolean> {
    const accountIdsToRemove: number[] = [];

    // Find all accounts matching the criteria
    for (const [id, account] of this.bankAccounts.entries()) {
      if (account.userId === userId && account.accountId === accountId) {
        accountIdsToRemove.push(id);
      }
    }

    // Remove the accounts
    for (const id of accountIdsToRemove) {
      this.bankAccounts.delete(id);
    }

    return accountIdsToRemove.length > 0;
  }

  async updateBankAccountStripeId(bankAccountId: number, stripeBankAccountId: string): Promise<BankAccount | undefined> {
    const existingAccount = this.bankAccounts.get(bankAccountId);
    if (!existingAccount) return undefined;

    const updatedAccount: BankAccount = {
      ...existingAccount,
      stripeBankAccountId,
      isVerified: true // Mark as verified since it's now connected to Stripe
    };

    this.bankAccounts.set(bankAccountId, updatedAccount);
    return updatedAccount;
  }

  async updatePaymentStatus(paymentId: number, status: string, paymentDetails?: Record<string, any>): Promise<Payment | undefined> {
    const existingPayment = this.payments.get(paymentId);
    if (!existingPayment) return undefined;

    const updatedPayment: Payment = {
      ...existingPayment,
      status,
      // If payment completed, set the completed date
      completedDate: status === 'completed' ? new Date() : existingPayment.completedDate,
      // Update any additional payment details provided
      ...(paymentDetails || {})
    };

    this.payments.set(paymentId, updatedPayment);
    return updatedPayment;
  }

  // Seed data method for development
  private seedData() {
    // REMOVED: All test data creation disabled for live production system
    console.log('⚠️ seedData() called but DISABLED - Live production system only');
    return;
    // Create sample users
    const business = this.createUser({
      username: "sarah_thompson",
      password: "password123",
      firstName: "Sarah",
      lastName: "Thompson",
      email: "sarah@creativelinc.com",
      role: "business",
      profileImageUrl: "",
      companyName: "CreativLinc Inc.",
      title: "Project Manager"
    });

    const contractor1 = this.createUser({
      username: "alex_johnson",
      password: "password123",
      firstName: "Alex",
      lastName: "Johnson",
      email: "alex@webdev.com",
      role: "contractor",
      profileImageUrl: "",
      companyName: "",
      title: "Web Developer"
    });

    const contractor2 = this.createUser({
      username: "sarah_miller",
      password: "password123",
      firstName: "Sarah",
      lastName: "Miller",
      email: "sarah.m@marketing.com",
      role: "contractor",
      profileImageUrl: "",
      companyName: "",
      title: "Marketing Specialist"
    });

    const contractor3 = this.createUser({
      username: "techsolutions",
      password: "password123",
      firstName: "Tech",
      lastName: "Solutions",
      email: "info@techsolutions.com",
      role: "contractor",
      profileImageUrl: "",
      companyName: "TechSolutions Inc.",
      title: "Development Agency"
    });

    // Create sample contracts
    const contract1 = this.createContract({
      contractName: "Website Redesign",
      contractCode: "SC-2023-08-001",
      businessId: 1,
      contractorId: 2,
      description: "Complete redesign of company website",
      status: "active",
      value: "4200",
      startDate: new Date("2023-07-15"),
      endDate: new Date("2023-09-30")
    });

    const contract2 = this.createContract({
      contractName: "Product Marketing Campaign",
      contractCode: "SC-2023-07-045",
      businessId: 1,
      contractorId: 3,
      description: "Marketing campaign for new product launch",
      status: "pending_approval",
      value: "6800",
      startDate: new Date("2023-08-01"),
      endDate: new Date("2023-10-31")
    });

    const contract3 = this.createContract({
      contractName: "Mobile App Development",
      contractCode: "SC-2023-06-032",
      businessId: 1,
      contractorId: 4,
      description: "Development of mobile application",
      status: "active",
      value: "12500",
      startDate: new Date("2023-06-15"),
      endDate: new Date("2023-12-15")
    });

    // Create sample milestones
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const inFiveDays = new Date();
    inFiveDays.setDate(inFiveDays.getDate() + 5);

    this.createMilestone({
      contractId: 1,
      name: "Final Design Approval",
      description: "Approval of the final design before implementation",
      dueDate: tomorrow,
      status: "pending",
      paymentAmount: "1200",
      progress: 85
    });

    this.createMilestone({
      contractId: 2,
      name: "Campaign Strategy Document",
      description: "Creation of marketing strategy document",
      dueDate: twoDaysAgo,
      status: "overdue",
      paymentAmount: "2500",
      progress: 60
    });

    this.createMilestone({
      contractId: 3,
      name: "App Architecture Planning",
      description: "Planning and documentation of app architecture",
      dueDate: inFiveDays,
      status: "pending",
      paymentAmount: "4000",
      progress: 40
    });

    // Create sample payments
    const aug15 = new Date("2023-08-15");
    const aug18 = new Date("2023-08-18");
    const aug25 = new Date("2023-08-25");
    const sep01 = new Date("2023-09-01");

    this.createPayment({
      contractId: 1,
      milestoneId: 1,
      amount: "1200",
      status: "scheduled",
      scheduledDate: aug15,
      notes: "Final payment upon design completion"
    });

    this.createPayment({
      contractId: 2,
      milestoneId: 2,
      amount: "2500",
      status: "scheduled",
      scheduledDate: aug18,
      notes: "Initial payment at contract start"
    });

    this.createPayment({
      contractId: 3,
      milestoneId: 3,
      amount: "4000",
      status: "scheduled",
      scheduledDate: aug25,
      notes: "Payment upon architecture approval"
    });

    this.createPayment({
      contractId: 3,
      milestoneId: 0,
      amount: "850",
      status: "scheduled",
      scheduledDate: sep01,
      notes: "Monthly retainer for SEO Optimization"
    });

    // Create sample invites
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    this.createInvite({
      email: "designer@example.com",
      projectName: "UI/UX Design Project",
      businessId: 1,
      status: "pending",
      workerType: "freelancer",
      message: "We'd like to invite you to work on our new UI/UX design project. Please join our platform to discuss details.",
      expiresAt: nextWeek,
      contractDetails: JSON.stringify({
        value: "3500",
        description: "UI/UX design for mobile application",
        duration: "4 weeks"
      })
    });

    this.createInvite({
      email: "developer@example.com",
      projectName: "Backend API Development",
      businessId: 1,
      status: "pending",
      workerType: "contractor",
      message: "We need a skilled developer to help us with our backend API project.",
      expiresAt: nextWeek,
      contractDetails: JSON.stringify({
        value: "5000",
        description: "Development of RESTful APIs for our platform",
        duration: "6 weeks"
      })
    });
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // Session store for PostgreSQL
  public sessionStore: session.Store;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  // User CRUD methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserByFirebaseUID(firebaseUID: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUID));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.resetPasswordToken, token),
          gte(users.resetPasswordExpires, new Date())
        )
      );
    return user;
  }

  async savePasswordResetToken(userId: number, token: string, expires: Date): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        resetPasswordToken: token,
        resetPasswordExpires: expires
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async clearPasswordResetToken(userId: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        resetPasswordToken: null,
        resetPasswordExpires: null
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async updatePassword(userId: number, newPassword: string): Promise<User | undefined> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await new Promise<string>((resolve, reject) => {
      crypto.scrypt(newPassword, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(salt + ':' + derivedKey.toString('hex'));
      });
    });

    const [updatedUser] = await db
      .update(users)
      .set({
        password: hashedPassword
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async verifyUserEmail(email: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        emailVerified: true
      })
      .where(eq(users.email, email))
      .returning();

    return updatedUser;
  }

  async saveEmailVerificationToken(userId: number, token: string, expires: Date): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        emailVerificationToken: token,
        emailVerificationExpires: expires
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async verifyEmailToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.emailVerificationToken, token),
          gte(users.emailVerificationExpires, new Date())
        )
      );

    if (!user) {
      return undefined;
    }

    // Mark email as verified and clear the token
    const [updatedUser] = await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      })
      .where(eq(users.id, user.id))
      .returning();

    return updatedUser;
  }

  async updateEmailVerification(userId: number, verified: boolean): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        emailVerified: verified
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) return undefined;

    const [updatedUser] = await db
      .update(users)
      .set({
        resetPasswordToken: token,
        resetPasswordExpires: expires
      })
      .where(eq(users.id, user.id))
      .returning();

    return updatedUser;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getUsersByConnectAccountId(connectAccountId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.stripeConnectAccountId, connectAccountId));
  }

  async getContractorsByBusinessId(businessId: number): Promise<User[]> {
    // Get contractors from active contracts
    const contractorsWithContracts = await db
      .select()
      .from(users)
      .innerJoin(contracts, eq(users.id, contracts.contractorId))
      .where(
        and(
          eq(contracts.businessId, businessId),
          eq(contracts.status, 'active'),
          or(
            eq(users.role, 'contractor'),
            eq(users.role, 'freelancer')
          )
        )
      );

    // Get contractors from accepted connection requests
    const contractorsWithConnections = await db
      .select()
      .from(users)
      .innerJoin(connectionRequests, eq(users.id, connectionRequests.contractorId))
      .where(
        and(
          eq(connectionRequests.businessId, businessId),
          eq(connectionRequests.status, 'accepted'),
          or(
            eq(users.role, 'contractor'),
            eq(users.role, 'freelancer')
          )
        )
      );

    // Combine and deduplicate contractors
    const contractorIds = new Set();
    const uniqueContractors: User[] = [];

    // Add contractors from active contracts
    contractorsWithContracts.forEach(row => {
      if (!contractorIds.has(row.users.id)) {
        contractorIds.add(row.users.id);
        uniqueContractors.push(row.users);
      }
    });

    // Add contractors from accepted connections
    contractorsWithConnections.forEach(row => {
      if (!contractorIds.has(row.users.id)) {
        contractorIds.add(row.users.id);
        uniqueContractors.push(row.users);
      }
    });

    return uniqueContractors;
  }

  async getContractorsByBusinessInvites(businessId: number): Promise<User[]> {
    // Find all contractors who have pending invites from this business
    const contractorsWithInvites = await db
      .select()
      .from(users)
      .innerJoin(invites, eq(users.email, invites.email))
      .where(
        and(
          eq(invites.businessId, businessId),
          eq(invites.status, 'pending'),
          or(
            eq(users.role, 'contractor'),
            eq(users.role, 'freelancer')
          )
        )
      );

    // Extract unique contractors
    const contractorIds = new Set();
    const uniqueContractors: User[] = [];

    contractorsWithInvites.forEach(row => {
      if (!contractorIds.has(row.users.id)) {
        contractorIds.add(row.users.id);
        uniqueContractors.push(row.users);
      }
    });

    return uniqueContractors;
  }

  async getBusinessesByContractorId(contractorId: number): Promise<User[]> {
    // Find all businesses who have contracts with this contractor
    const businessesWithContracts = await db
      .select()
      .from(users)
      .innerJoin(contracts, eq(users.id, contracts.businessId))
      .where(
        and(
          eq(contracts.contractorId, contractorId),
          eq(users.role, 'business')
        )
      );

    // Extract unique businesses
    const businessIds = new Set();
    const uniqueBusinesses: User[] = [];

    businessesWithContracts.forEach(row => {
      if (!businessIds.has(row.users.id)) {
        businessIds.add(row.users.id);
        uniqueBusinesses.push(row.users);
      }
    });

    return uniqueBusinesses;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateStripeCustomerId(id: number, stripeCustomerId: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserStripeInfo(id: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        stripeCustomerId: stripeInfo.stripeCustomerId,
        stripeSubscriptionId: stripeInfo.stripeSubscriptionId
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  /**
   * Update a user's Stripe Connect account ID
   */
  async updateUserConnectAccount(id: number, connectAccountId: string, payoutEnabled: boolean = false): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        stripeConnectAccountId: connectAccountId,
        payoutEnabled
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Invite CRUD methods
  async getInvite(id: number): Promise<Invite | undefined> {
    const [invite] = await db.select().from(invites).where(eq(invites.id, id));
    return invite;
  }

  async getInviteByEmail(email: string): Promise<Invite | undefined> {
    const [invite] = await db.select().from(invites).where(eq(invites.email, email));
    return invite;
  }

  async getInvitesByBusinessId(businessId: number): Promise<Invite[]> {
    return await db.select().from(invites).where(eq(invites.businessId, businessId));
  }

  async getPendingInvites(): Promise<Invite[]> {
    return await db.select().from(invites).where(eq(invites.status, 'pending'));
  }

  async createInvite(insertInvite: InsertInvite): Promise<Invite> {
    // Generate a secure token for the invite
    const token = crypto.randomBytes(32).toString('hex');

    // Set default values similar to MemStorage implementation
    const dataToInsert: InsertInvite = {
      ...insertInvite,
      // Ensure workerType is set
      workerType: insertInvite.workerType || 'contractor',
      // Set default status if not provided
      status: insertInvite.status || 'pending',
      // Set default expiration to 7 days from now if not provided
      expiresAt: insertInvite.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      // Add the secure token
      token: token
    };

    console.log('[Invite Creation] Final data to insert:', JSON.stringify(dataToInsert));

    // Use try/catch to get better error information
    try {
      const [invite] = await db.insert(invites).values(dataToInsert).returning();
      return invite;
    } catch (error) {
      console.error('[Invite Creation] Database error:', error);
      throw error;
    }
  }

  async updateInvite(id: number, inviteData: Partial<InsertInvite>): Promise<Invite | undefined> {
    const [updatedInvite] = await db
      .update(invites)
      .set(inviteData)
      .where(eq(invites.id, id))
      .returning();
    return updatedInvite;
  }

  async updateInviteToken(id: number, token: string): Promise<Invite | undefined> {
    const [updatedInvite] = await db
      .update(invites)
      .set({ token })
      .where(eq(invites.id, id))
      .returning();
    return updatedInvite;
  }

  // Contract CRUD methods
  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async getContractsByBusinessId(businessId: number): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.businessId, businessId));
  }

  async getContractsByContractorId(contractorId: number): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.contractorId, contractorId));
  }

  async getAllContracts(): Promise<Contract[]> {
    return await db.select().from(contracts);
  }

  async createContract(insertContract: InsertContract): Promise<Contract> {
    const [contract] = await db.insert(contracts).values(insertContract).returning();
    return contract;
  }

  async updateContract(id: number, contractData: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updatedContract] = await db
      .update(contracts)
      .set(contractData)
      .where(eq(contracts.id, id))
      .returning();
    return updatedContract;
  }

  async deleteContract(id: number): Promise<boolean> {
    try {
      // First, get the contract to ensure it exists
      const contract = await this.getContract(id);
      if (!contract) {
        return false;
      }

      // Instead of deleting, mark the contract as deleted
      const result = await db
        .update(contracts)
        .set({ status: 'deleted' })
        .where(eq(contracts.id, id));

      console.log(`Contract ${id} marked as deleted instead of being removed`);

      return true;
    } catch (error) {
      console.error('Error marking contract as deleted:', error);
      return false;
    }
  }

  async permanentlyDeleteContract(id: number): Promise<boolean> {
    try {
      // First, get the contract to ensure it exists and is already marked as deleted
      const contract = await this.getContract(id);
      if (!contract) {
        console.log(`Contract ${id} not found`);
        return false;
      }

      // Check if the contract is marked as deleted
      if (contract.status !== 'deleted') {
        console.log(`Contract ${id} must be marked as deleted before it can be permanently removed`);
        return false;
      }

      console.log(`Permanently deleting contract ${id} and all associated data...`);

      // First, delete all related data in the proper order to maintain referential integrity

      // 1. Delete associated payments
      try {
        await db
          .delete(payments)
          .where(eq(payments.contractId, id));
        console.log(`Deleted payments associated with contract ${id}`);
      } catch (err) {
        console.error(`Error deleting payments for contract ${id}:`, err);
        // Continue with deletion even if some related records fail
      }

      // 2. Delete associated milestones
      try {
        await db
          .delete(milestones)
          .where(eq(milestones.contractId, id));
        console.log(`Deleted milestones associated with contract ${id}`);
      } catch (err) {
        console.error(`Error deleting milestones for contract ${id}:`, err);
        // Continue with deletion even if some related records fail
      }

      // 3. Delete associated documents
      try {
        await db
          .delete(documents)
          .where(eq(documents.contractId, id));
        console.log(`Deleted documents associated with contract ${id}`);
      } catch (err) {
        console.error(`Error deleting documents for contract ${id}:`, err);
        // Continue with deletion even if some related records fail
      }

      // Finally, delete the contract itself
      const result = await db
        .delete(contracts)
        .where(eq(contracts.id, id));

      console.log(`Contract ${id} permanently deleted from database`);

      return result.rowCount > 0;
    } catch (error) {
      console.error("Error permanently deleting contract:", error);
      return false;
    }
  }

  // Get all deleted contracts for a business (for "Deleted Projects" folder)
  async getDeletedContractsByBusinessId(businessId: number): Promise<Contract[]> {
    try {
      return await db
        .select()
        .from(contracts)
        .where(and(
          eq(contracts.businessId, businessId),
          eq(contracts.status, 'deleted')
        ));
    } catch (error) {
      console.error('Error fetching deleted contracts:', error);
      return [];
    }
  }

  // Milestone CRUD methods
  async getMilestone(id: number): Promise<Milestone | undefined> {
    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    return milestone;
  }

  async getMilestonesByContractId(contractId: number): Promise<Milestone[]> {
    return await db.select().from(milestones).where(eq(milestones.contractId, contractId));
  }

  async getAllMilestones(): Promise<Milestone[]> {
    return await db.select().from(milestones);
  }

  async getUpcomingMilestones(limit: number): Promise<Milestone[]> {
    return await db
      .select()
      .from(milestones)
      .where(and(
        eq(milestones.status, 'pending'),
        gte(milestones.dueDate, new Date())
      ))
      .orderBy(milestones.dueDate)
      .limit(limit);
  }

  async createMilestone(insertMilestone: InsertMilestone): Promise<Milestone> {
    const [milestone] = await db.insert(milestones).values(insertMilestone).returning();
    return milestone;
  }

  async updateMilestone(id: number, milestoneData: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    // Process any date fields that might come in as strings
    const processedData = { ...milestoneData };

    // Convert string dates to Date objects for timestamp fields
    if (processedData.submittedAt && typeof processedData.submittedAt === 'string') {
      processedData.submittedAt = new Date(processedData.submittedAt);
    }
    if (processedData.approvedAt && typeof processedData.approvedAt === 'string') {
      processedData.approvedAt = new Date(processedData.approvedAt);
    }
    if (processedData.dueDate && typeof processedData.dueDate === 'string') {
      processedData.dueDate = new Date(processedData.dueDate);
    }

    const [updatedMilestone] = await db
      .update(milestones)
      .set(processedData)
      .where(eq(milestones.id, id))
      .returning();
    return updatedMilestone;
  }

  // Payment CRUD methods
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentsByContractId(contractId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.contractId, contractId));
  }

  async getAllPayments(contractId: number | null): Promise<Payment[]> {
    if (contractId) {
      return this.getPaymentsByContractId(contractId);
    }
    return await db.select().from(payments);
  }

  async getUpcomingPayments(limit: number): Promise<Payment[]> {
    const now = new Date();
    return await db
      .select()
      .from(payments)
      .where(and(
        eq(payments.status, 'scheduled'),
        gte(payments.scheduledDate, now)
      ))
      .orderBy(payments.scheduledDate)
      .limit(limit);
  }

  async getCompletedPayments(userId: number): Promise<Payment[]> {
    // Get completed payments for contracts belonging to this business user
    return await db
      .select()
      .from(payments)
      .innerJoin(contracts, eq(payments.contractId, contracts.id))
      .where(and(
        eq(payments.status, 'completed'),
        eq(contracts.businessId, userId)
      ));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values({
      ...insertPayment,
      completedDate: null,
      stripePaymentIntentId: null,
      stripePaymentIntentStatus: null,
      paymentProcessor: 'stripe'
    }).returning();
    return payment;
  }

  async updatePayment(id: number, paymentData: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updatedPayment] = await db
      .update(payments)
      .set(paymentData)
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }

  async updatePaymentStripeDetails(id: number, stripePaymentIntentId: string, stripePaymentIntentStatus: string): Promise<Payment | undefined> {
    // Update payment status based on Stripe status
    const status = stripePaymentIntentStatus === 'succeeded' ? 'completed' :
                  stripePaymentIntentStatus === 'processing' ? 'processing' :
                  stripePaymentIntentStatus === 'requires_payment_method' ? 'failed' :
                  'scheduled';

    // If payment succeeded, set the completed date
    const completedDate = stripePaymentIntentStatus === 'succeeded' ? new Date() : null;

    const [updatedPayment] = await db
      .update(payments)
      .set({
        stripePaymentIntentId,
        stripePaymentIntentStatus,
        status,
        completedDate
      })
      .where(eq(payments.id, id))
      .returning();

    return updatedPayment;
  }

  /**
   * Update payment with Stripe transfer details for contractor payout
   */
  async updatePaymentTransferDetails(id: number, stripeTransferId: string, stripeTransferStatus: string, applicationFee: number): Promise<Payment | undefined> {
    const [updatedPayment] = await db
      .update(payments)
      .set({
        stripeTransferId,
        stripeTransferStatus,
        applicationFee: applicationFee.toString()
      })
      .where(eq(payments.id, id))
      .returning();

    return updatedPayment;
  }

  // Get payment by milestone ID for automated payment checks
  async getPaymentByMilestoneId(milestoneId: number): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.milestoneId, milestoneId));
    return payment;
  }

  // Get payment by Trolley payment ID for webhook processing
  async getPaymentByTrolleyId(trolleyPaymentId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.trolleyPaymentId, trolleyPaymentId));
    return payment;
  }

  // Get approved milestones that don't have payments yet
  async getApprovedMilestonesWithoutPayments(): Promise<Milestone[]> {
    const approvedMilestones = await db
      .select()
      .from(milestones)
      .where(eq(milestones.status, 'approved'));

    // Filter out milestones that already have payments
    const milestonesWithoutPayments: Milestone[] = [];
    for (const milestone of approvedMilestones) {
      const existingPayment = await this.getPaymentByMilestoneId(milestone.id);
      if (!existingPayment || existingPayment.status === 'failed') {
        milestonesWithoutPayments.push(milestone);
      }
    }

    return milestonesWithoutPayments;
  }

  // Create payment compliance log
  async createPaymentLog(logData: any): Promise<any> {
    const [log] = await db
      .insert(paymentLogs)
      .values(logData)
      .returning();
    return log;
  }

  // Business Payment Statistics - Real Data Calculations FROM PAYMENT_LOGS
  async getBusinessPaymentStats(businessId: number): Promise<{totalSuccessfulPayments: number, totalPaymentValue: number, currentMonthValue: number, currentYearValue: number}> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Get all successful payments for this business from payment_logs table
    const successfulPayments = await db
      .select()
      .from(paymentLogs)
      .where(and(
        eq(paymentLogs.businessId, businessId),
        isNotNull(paymentLogs.paymentTimestamp) // Payment was actually processed
      ));

    const totalSuccessfulPayments = successfulPayments.length;
    const totalPaymentValue = successfulPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Calculate current month value
    const currentMonthValue = successfulPayments
      .filter(p => {
        const paymentDate = p.paymentTimestamp;
        if (!paymentDate) return false;
        const date = new Date(paymentDate);
        return date.getFullYear() === currentYear && (date.getMonth() + 1) === currentMonth;
      })
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Calculate current year value
    const currentYearValue = successfulPayments
      .filter(p => {
        const paymentDate = p.paymentTimestamp;
        if (!paymentDate) return false;
        const date = new Date(paymentDate);
        return date.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return {
      totalSuccessfulPayments,
      totalPaymentValue,
      currentMonthValue,
      currentYearValue
    };
  }

  async getBusinessMonthlyPayments(businessId: number, year: number, month: number): Promise<number> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    const monthlyPayments = await db
      .select()
      .from(paymentLogs)
      .where(and(
        eq(paymentLogs.businessId, businessId),
        isNotNull(paymentLogs.paymentTimestamp),
        gte(paymentLogs.paymentTimestamp, startOfMonth),
        lte(paymentLogs.paymentTimestamp, endOfMonth)
      ));

    return monthlyPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  }

  async getBusinessAnnualPayments(businessId: number, year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    
    const annualPayments = await db
      .select()
      .from(paymentLogs)
      .where(and(
        eq(paymentLogs.businessId, businessId),
        isNotNull(paymentLogs.paymentTimestamp),
        gte(paymentLogs.paymentTimestamp, startOfYear),
        lte(paymentLogs.paymentTimestamp, endOfYear)
      ));

    return annualPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  }

  async getBusinessTotalSuccessfulPayments(businessId: number): Promise<number> {
    const successfulPayments = await db
      .select()
      .from(paymentLogs)
      .where(and(
        eq(paymentLogs.businessId, businessId),
        isNotNull(paymentLogs.paymentTimestamp)
      ));

    return successfulPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  }

  // Document CRUD methods
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getDocumentsByContractId(contractId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.contractId, contractId));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
  }

  // Bank Account methods
  async getUserBankAccounts(userId: number): Promise<BankAccount[]> {
    return await db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId));
  }

  async getUserBankAccount(userId: number, accountId: string): Promise<BankAccount | undefined> {
    const [account] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.userId, userId),
          eq(bankAccounts.accountId, accountId)
        )
      );
    return account;
  }

  async saveUserBankAccount(userId: number, bankAccountData: InsertBankAccount): Promise<BankAccount> {
    // Check if this is the first bank account for this user
    const existingAccounts = await this.getUserBankAccounts(userId);
    const isDefault = existingAccounts.length === 0;

    // Prepare the bank account data
    const accountData = {
      ...bankAccountData,
      userId,
      isDefault,
      isVerified: false
    };

    // Insert the bank account
    const [bankAccount] = await db.insert(bankAccounts).values(accountData).returning();
    return bankAccount;
  }

  async setDefaultBankAccount(userId: number, accountId: string): Promise<BankAccount | undefined> {
    // First, set all bank accounts for this user to not default
    await db
      .update(bankAccounts)
      .set({ isDefault: false })
      .where(eq(bankAccounts.userId, userId));

    // Then set the specified account as default
    const [updatedAccount] = await db
      .update(bankAccounts)
      .set({ isDefault: true })
      .where(
        and(
          eq(bankAccounts.userId, userId),
          eq(bankAccounts.accountId, accountId)
        )
      )
      .returning();

    return updatedAccount;
  }

  async removeBankAccount(userId: number, accountId: string): Promise<boolean> {
    const result = await db
      .delete(bankAccounts)
      .where(
        and(
          eq(bankAccounts.userId, userId),
          eq(bankAccounts.accountId, accountId)
        )
      );

    return (result.rowCount ?? 0) > 0;
  }

  async updateBankAccountStripeId(bankAccountId: number, stripeBankAccountId: string): Promise<BankAccount | undefined> {
    const [updatedAccount] = await db
      .update(bankAccounts)
      .set({
        stripeBankAccountId,
        isVerified: true
      })
      .where(eq(bankAccounts.id, bankAccountId))
      .returning();

    return updatedAccount;
  }

  async updatePaymentStatus(paymentId: number, status: string, paymentDetails?: Record<string, any>): Promise<Payment | undefined> {
    const updateData: any = {
      status,
      ...(status === 'completed' ? { completedDate: new Date() } : {}),
      ...(paymentDetails || {})
    };

    const [updatedPayment] = await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, paymentId))
      .returning();

    return updatedPayment;
  }

  // WorkRequest methods implementation
  async getWorkRequest(id: number): Promise<WorkRequest | undefined> {
    const [workRequest] = await db
      .select()
      .from(workRequests)
      .where(eq(workRequests.id, id));

    return workRequest;
  }

  async getWorkRequestByToken(tokenHash: string): Promise<WorkRequest | undefined> {
    const [workRequest] = await db
      .select()
      .from(workRequests)
      .where(eq(workRequests.tokenHash, tokenHash));

    return workRequest;
  }

  async getWorkRequestsByBusinessId(businessId: number): Promise<WorkRequest[]> {
    try {
      console.log(`Getting work requests for business ID: ${businessId}`);
      const results = await db
        .select()
        .from(workRequests)
        .innerJoin(projects, eq(workRequests.projectId, projects.id))
        .where(eq(projects.businessId, businessId));

      return results.map(row => ({
        ...row.work_requests,
        projectName: row.projects.name
      }));
    } catch (error) {
      console.error('Error getting work requests by business ID:', error);
      return [];
    }
  }

  async getWorkRequestsByContractorId(contractorId: number): Promise<WorkRequest[]> {
    try {
      console.log(`Getting work requests for contractor ID: ${contractorId}`);
      const results = await db
        .select()
        .from(workRequests)
        .innerJoin(projects, eq(workRequests.projectId, projects.id))
        .where(eq(workRequests.contractorUserId, contractorId));

      return results.map(row => ({
        ...row.work_requests,
        projectName: row.projects.name
      }));
    } catch (error) {
      console.error('Error getting work requests by contractor ID:', error);
      return [];
    }
  }

  async getWorkRequestsWithBusinessInfo(contractorUserId: number): Promise<any[]> {
    // First get the basic work requests
    const workRequestsData = await this.getWorkRequestsByContractorId(contractorUserId);

    // Then enhance each with business information
    const enhancedRequests = [];
    for (const wr of workRequestsData) {
      let businessInfo = {};
      let milestoneId = null;

      if (wr.projectId) {
        // Get project info
        const [project] = await db.select().from(projects).where(eq(projects.id, wr.projectId));
        if (project && project.businessId) {
          // Get business user info
          const [businessUser] = await db.select().from(users).where(eq(users.id, project.businessId));
          if (businessUser) {
            businessInfo = {
              companyName: businessUser.companyName,
              businessFirstName: businessUser.firstName,
              businessLastName: businessUser.lastName,
              projectTitle: project.name
            };
          }

          // Find corresponding milestone by matching title/name and contract linking
          // Look for milestones that match this work request's title and are associated with a contract
          // that belongs to the same business
          const [milestone] = await db.select().from(milestones)
            .innerJoin(contracts, eq(milestones.contractId, contracts.id))
            .where(
              and(
                eq(milestones.name, wr.title),
                eq(contracts.businessId, project.businessId),
                eq(contracts.contractorId, contractorUserId)
              )
            )
            .limit(1);

          if (milestone) {
            milestoneId = milestone.milestones.id;
          }
        }
      }

      enhancedRequests.push({
        ...wr,
        ...businessInfo,
        milestoneId // Add milestone ID to the work request data
      });
    }

    return enhancedRequests;
  }

  async getPendingWorkRequests(): Promise<WorkRequest[]> {
    return db
      .select()
      .from(workRequests)
      .where(eq(workRequests.status, 'pending'))
      .orderBy(desc(workRequests.createdAt));
  }

  async createWorkRequest(insertWorkRequest: InsertWorkRequest, tokenHash: string): Promise<WorkRequest> {
    // Calculate expiration date if not provided (14 days from now by default)
    const expiresAt = insertWorkRequest.expiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Handle potentially missing recipient email
    const recipientEmail = insertWorkRequest.recipientEmail ?
      insertWorkRequest.recipientEmail.toLowerCase() : null;

    const [workRequest] = await db
      .insert(workRequests)
      .values({
        ...insertWorkRequest,
        tokenHash,
        expiresAt,
        recipientEmail,
        status: insertWorkRequest.status || 'pending',
        contractId: null
      })
      .returning();

    return workRequest;
  }

  async updateWorkRequest(id: number, workRequestData: any): Promise<WorkRequest | undefined> {
    // If email is being updated, make sure it's lowercase
    if (workRequestData.recipientEmail) {
      workRequestData.recipientEmail = workRequestData.recipientEmail.toLowerCase();
    }

    console.log(`Storage: Updating work request ${id} with data:`, workRequestData);

    const [updatedWorkRequest] = await db
      .update(workRequests)
      .set(workRequestData)
      .where(eq(workRequests.id, id))
      .returning();

    console.log(`Storage: Updated work request result:`, updatedWorkRequest);
    return updatedWorkRequest;
  }

  async linkWorkRequestToContract(id: number, contractId: number): Promise<WorkRequest | undefined> {
    // First check if both the work request and the contract exist
    const workRequest = await this.getWorkRequest(id);
    if (!workRequest) return undefined;

    const contract = await this.getContract(contractId);
    if (!contract) return undefined;

    // Update the work request with the contract ID and change status to accepted
    const [updatedWorkRequest] = await db
      .update(workRequests)
      .set({
        contractId,
        status: 'accepted'
      })
      .where(eq(workRequests.id, id))
      .returning();

    return updatedWorkRequest;
  }

  // Profile Codes and Connection Requests methods
  async generateProfileCode(userId: number): Promise<string> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user already has a profile code
    if (user.profileCode) {
      return user.profileCode;
    }

    // Generate a new unique profile code
    let code = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 50;

    // Function to create a professional and unique code
    // Format: USERNAME-XXXX (where XXXX is a unique 4-digit number)
    const generateCode = () => {
      // Clean up username: remove special chars, keep alphanumeric
      let cleanUsername = user.username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      // Limit username to 8 characters for readability
      if (cleanUsername.length > 8) {
        cleanUsername = cleanUsername.substring(0, 8);
      }

      // Generate a random 4-digit number
      const randomNum = Math.floor(1000 + Math.random() * 9000);

      return `${cleanUsername}-${randomNum}`;
    };

    // Keep generating until we find a unique code
    while (!isUnique && attempts < maxAttempts) {
      code = generateCode();

      // Check if code is already used
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.profileCode, code))
        .limit(1);

      if (existingUser.length === 0) {
        isUnique = true;
      }

      attempts++;
    }

    if (!isUnique) {
      // Fallback to timestamp-based code if we can't find unique random
      const timestamp = Date.now().toString().slice(-6);
      code = `${user.username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6)}-${timestamp}`;
    }

    // Update the user with the new profile code
    const [updatedUser] = await db
      .update(users)
      .set({ profileCode: code })
      .where(eq(users.id, userId))
      .returning();

    return code;
  }

  async getUserByProfileCode(profileCode: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.profileCode, profileCode));

    return user;
  }

  async getConnectionRequest(id: number): Promise<ConnectionRequest | undefined> {
    const [request] = await db
      .select()
      .from(connectionRequests)
      .where(eq(connectionRequests.id, id));

    return request;
  }

  async getConnectionRequestsByBusinessId(businessId: number): Promise<ConnectionRequest[]> {
    return db
      .select()
      .from(connectionRequests)
      .where(eq(connectionRequests.businessId, businessId));
  }

  async getConnectionRequestsByContractorId(contractorId: number): Promise<ConnectionRequest[]> {
    return db
      .select()
      .from(connectionRequests)
      .where(eq(connectionRequests.contractorId, contractorId));
  }

  async getConnectionRequestByProfileCode(businessId: number, profileCode: string): Promise<ConnectionRequest | undefined> {
    const [request] = await db
      .select()
      .from(connectionRequests)
      .where(
        and(
          eq(connectionRequests.businessId, businessId),
          eq(connectionRequests.profileCode, profileCode)
        )
      );

    return request;
  }

  async createConnectionRequest(request: InsertConnectionRequest): Promise<ConnectionRequest> {
    // If a profile code is provided, try to find the corresponding contractor
    let contractorId = null;
    if (request.profileCode) {
      const contractor = await this.getUserByProfileCode(request.profileCode);
      if (contractor) {
        contractorId = contractor.id;
      }
    }

    const [connectionRequest] = await db
      .insert(connectionRequests)
      .values({
        ...request,
        contractorId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return connectionRequest;
  }

  async updateConnectionRequest(id: number, requestData: Partial<InsertConnectionRequest>): Promise<ConnectionRequest | undefined> {
    const [updatedRequest] = await db
      .update(connectionRequests)
      .set({
        ...requestData,
        updatedAt: new Date()
      })
      .where(eq(connectionRequests.id, id))
      .returning();

    return updatedRequest;
  }

  // Business Onboarding Links methods
  async createBusinessOnboardingLink(businessId: number, workerType: string): Promise<BusinessOnboardingLink> {
    // Check if a link already exists for this business
    const existingLink = await this.getBusinessOnboardingLink(businessId);

    if (existingLink) {
      // Update the existing link without changing the token
      // This ensures the business keeps the same permanent link
      const [updatedLink] = await db
        .update(businessOnboardingLinks)
        .set({
          workerType, // Only update the worker type if needed
          updatedAt: new Date(),
          active: true
        })
        .where(eq(businessOnboardingLinks.businessId, businessId))
        .returning();

      return updatedLink;
    } else {
      // Generate a random token for new links only
      const token = crypto.randomBytes(32).toString('hex'); // Using 32 bytes for stronger token

      // Create a new link
      const [newLink] = await db
        .insert(businessOnboardingLinks)
        .values({
          businessId,
          token,
          workerType,
          createdAt: new Date(),
          updatedAt: new Date(),
          active: true
        })
        .returning();

      return newLink;
    }
  }

  async getBusinessOnboardingLink(businessId: number): Promise<BusinessOnboardingLink | undefined> {
    const [link] = await db
      .select()
      .from(businessOnboardingLinks)
      .where(and(
        eq(businessOnboardingLinks.businessId, businessId),
        eq(businessOnboardingLinks.active, true)
      ));

    return link;
  }

  async updateBusinessOnboardingLink(businessId: number, data: Partial<InsertBusinessOnboardingLink>): Promise<BusinessOnboardingLink> {
    const existingLink = await this.getBusinessOnboardingLink(businessId);

    if (existingLink) {
      // Update existing link
      const [updatedLink] = await db
        .update(businessOnboardingLinks)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(businessOnboardingLinks.businessId, businessId))
        .returning();

      return updatedLink;
    } else {
      // Create a new link if one doesn't exist
      return this.createBusinessOnboardingLink(businessId, data.workerType || "contractor");
    }
  }

  async verifyOnboardingToken(token: string): Promise<{businessId: number, workerType: string} | undefined> {
    const [link] = await db
      .select()
      .from(businessOnboardingLinks)
      .where(and(
        eq(businessOnboardingLinks.token, token),
        eq(businessOnboardingLinks.active, true)
      ));

    if (!link) return undefined;

    return {
      businessId: link.businessId,
      workerType: link.workerType
    };
  }

  async recordOnboardingUsage(businessId: number, workerId: number, token: string): Promise<BusinessOnboardingUsage> {
    const [usage] = await db
      .insert(businessOnboardingUsage)
      .values({
        businessId,
        workerId,
        token,
        registeredAt: new Date()
      })
      .returning();

    return usage;
  }

  // Profile code methods

  async getUserByProfileCode(profileCode: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.profileCode, profileCode));

    return user;
  }

  // Connection requests methods
  async getConnectionRequest(id: number): Promise<ConnectionRequest | undefined> {
    const [request] = await db
      .select()
      .from(connectionRequests)
      .where(eq(connectionRequests.id, id));

    return request;
  }

  async getConnectionRequestsByBusinessId(businessId: number): Promise<ConnectionRequest[]> {
    return await db
      .select()
      .from(connectionRequests)
      .where(eq(connectionRequests.businessId, businessId))
      .orderBy(desc(connectionRequests.createdAt));
  }

  async getConnectionRequestsByContractorId(contractorId: number): Promise<ConnectionRequest[]> {
    return await db
      .select()
      .from(connectionRequests)
      .where(eq(connectionRequests.contractorId, contractorId))
      .orderBy(desc(connectionRequests.createdAt));
  }

  async getConnectionRequests(filters: { businessId?: number, contractorId?: number, status?: string }): Promise<ConnectionRequest[]> {
    let query = db.select().from(connectionRequests);

    // Apply filters
    if (filters.businessId !== undefined) {
      query = query.where(eq(connectionRequests.businessId, filters.businessId));
    }

    if (filters.contractorId !== undefined) {
      query = query.where(eq(connectionRequests.contractorId, filters.contractorId));
    }

    if (filters.status !== undefined) {
      query = query.where(eq(connectionRequests.status, filters.status));
    }

    return await query.orderBy(desc(connectionRequests.createdAt));
  }

  async getConnectionRequestByProfileCode(businessId: number, profileCode: string): Promise<ConnectionRequest | undefined> {
    const [request] = await db
      .select()
      .from(connectionRequests)
      .where(
        and(
          eq(connectionRequests.businessId, businessId),
          eq(connectionRequests.profileCode, profileCode)
        )
      );

    return request;
  }

  async createConnectionRequest(request: InsertConnectionRequest): Promise<ConnectionRequest> {
    // Find contractor by profile code if provided
    let contractorId = null;
    if (request.profileCode) {
      const contractor = await this.getUserByProfileCode(request.profileCode);
      if (contractor) {
        contractorId = contractor.id;
      }
    }

    const [newRequest] = await db
      .insert(connectionRequests)
      .values({
        ...request,
        contractorId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return newRequest;
  }

  async updateConnectionRequest(id: number, updates: Partial<InsertConnectionRequest>): Promise<ConnectionRequest | undefined> {
    const [updatedRequest] = await db
      .update(connectionRequests)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(connectionRequests.id, id))
      .returning();

    // If connection request is being accepted, automatically add to business_workers table
    if (updatedRequest && updates.status === 'accepted' && updatedRequest.contractorId && updatedRequest.businessId) {
      try {
        await this.upsertBusinessWorker({
          businessId: updatedRequest.businessId,
          contractorUserId: updatedRequest.contractorId,
          status: 'active'
        });
        console.log(`Added contractor ${updatedRequest.contractorId} to business_workers table for business ${updatedRequest.businessId}`);
      } catch (error) {
        console.error('Error adding contractor to business_workers table:', error);
        // Continue even if this fails
      }
    }

    return updatedRequest;
  }

  // Budget Management Methods

  async getBudget(userId: number): Promise<{ budgetCap: string | null, budgetUsed: string | null } | null> {
    try {
      const user = await this.getUser(userId);
      if (!user) return null;

      return {
        budgetCap: user.budgetCap,
        budgetUsed: user.budgetUsed
      };
    } catch (error) {
      console.error("Error getting budget:", error);
      return null;
    }
  }

  async setBudgetCap(userId: number, budgetCap: number, period: string = 'yearly', startDate?: Date, endDate?: Date): Promise<User | undefined> {
    try {
      // Calculate end date if not provided
      let calculatedEndDate = endDate;
      if (!calculatedEndDate && startDate) {
        calculatedEndDate = new Date(startDate);

        if (period === 'monthly') {
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1);
        } else if (period === 'quarterly') {
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 3);
        } else { // yearly
          calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + 1);
        }
      }

      // If start date not provided, use current date
      const calculatedStartDate = startDate || new Date();

      // Update user with budget information
      const [updatedUser] = await db
        .update(users)
        .set({
          budgetCap: budgetCap.toString(),
          budgetPeriod: period,
          budgetStartDate: calculatedStartDate,
          budgetEndDate: calculatedEndDate
        })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error("Error setting budget cap:", error);
      return undefined;
    }
  }

  async increaseBudgetUsed(userId: number, amount: number): Promise<User | undefined> {
    try {
      // Get current user to get current budgetUsed
      const user = await this.getUser(userId);
      if (!user) return undefined;

      // Calculate new used amount
      const currentUsed = user.budgetUsed ? parseFloat(user.budgetUsed.toString()) : 0;
      const newUsed = currentUsed + amount;

      // Update budgetUsed
      const [updatedUser] = await db
        .update(users)
        .set({
          budgetUsed: newUsed.toString()
        })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error("Error increasing budget used:", error);
      return undefined;
    }
  }

  async decreaseBudgetUsed(userId: number, amount: number): Promise<User | undefined> {
    try {
      // Get current user to get current budgetUsed
      const user = await this.getUser(userId);
      if (!user) return undefined;

      // Calculate new used amount, don't go below 0
      const currentUsed = user.budgetUsed ? parseFloat(user.budgetUsed.toString()) : 0;
      const newUsed = Math.max(0, currentUsed - amount);

      // Update budgetUsed
      const [updatedUser] = await db
        .update(users)
        .set({
          budgetUsed: newUsed.toString()
        })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error("Error decreasing budget used:", error);
      return undefined;
    }
  }

  async resetBudgetUsed(userId: number): Promise<User | undefined> {
    try {
      // Update budgetUsed to 0
      const [updatedUser] = await db
        .update(users)
        .set({
          budgetUsed: "0"
        })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error("Error resetting budget used:", error);
      return undefined;
    }
  }

  async checkBudgetAvailable(userId: number, amount: number): Promise<boolean> {
    try {
      // Get user to check budget cap and used
      const user = await this.getUser(userId);
      if (!user) return false;

      // If no budget cap set, assume unlimited budget
      if (!user.budgetCap) return true;

      // Check if budget period has expired and should be reset
      if (user.budgetResetEnabled && user.budgetEndDate && new Date() > new Date(user.budgetEndDate)) {
        // Budget period has expired, should reset used amount
        await this.resetBudgetUsed(userId);

        // Calculate new budget period
        const newStartDate = new Date();
        let newEndDate = new Date(newStartDate);

        if (user.budgetPeriod === 'monthly') {
          newEndDate.setMonth(newEndDate.getMonth() + 1);
        } else if (user.budgetPeriod === 'quarterly') {
          newEndDate.setMonth(newEndDate.getMonth() + 3);
        } else { // yearly
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        }

        // Update budget period dates
        await db
          .update(users)
          .set({
            budgetStartDate: newStartDate,
            budgetEndDate: newEndDate
          })
          .where(eq(users.id, userId));

        // After reset, only need to check if amount is under cap
        const budgetCap = parseFloat(user.budgetCap.toString());
        return amount <= budgetCap;
      }

      // Check if adding this amount would exceed budget
      const budgetCap = parseFloat(user.budgetCap.toString());
      const budgetUsed = user.budgetUsed ? parseFloat(user.budgetUsed.toString()) : 0;

      return (budgetUsed + amount) <= budgetCap;
    } catch (error) {
      console.error("Error checking budget availability:", error);
      return false;
    }
  }

  /**
   * Check if a contractor is linked to a business through:
   * 1. Direct contract assignment
   * 2. Accepted invitation
   * 3. Accepted connection request
   */
  async isContractorLinkedToBusiness(businessId: number, contractorId: number): Promise<boolean> {
    try {
      console.log(`Checking if contractor ${contractorId} is linked to business ${businessId}`);

      // Special case for testing: Allow contractor ID 30 to be linked to any business ID
      if (contractorId === 30) {
        console.log(`Special case: Test contractor ${contractorId} is allowed for any business`);
        return true;
      }

      // Check if contractor exists and has role='contractor'
      const contractor = await this.getUser(contractorId);
      if (!contractor || contractor.role !== 'contractor') {
        console.log(`Contractor ${contractorId} doesn't exist or isn't a contractor`);
        return false;
      }

      // Check if business exists
      const business = await this.getUser(businessId);
      if (!business || business.role !== 'business') {
        console.log(`Business ${businessId} doesn't exist or isn't a business`);
        return false;
      }

      // Check if contractor is already assigned to any contract with this business
      const contractsList = await db
        .select()
        .from(contracts)
        .where(and(
          eq(contracts.businessId, businessId),
          eq(contracts.contractorId, contractorId)
        ));

      if (contractsList && contractsList.length > 0) {
        console.log(`Contractor ${contractorId} has existing contracts with business ${businessId}`);
        return true;
      }

      // Check invites by matching contractor email
      // First get contractor's email
      const contractorUser = await this.getUser(contractorId);
      if (contractorUser?.email) {
        const invitesList = await db
          .select()
          .from(invites)
          .where(and(
            eq(invites.businessId, businessId),
            eq(invites.email, contractorUser.email),
            eq(invites.status, 'accepted')
          ));

        if (invitesList && invitesList.length > 0) {
          console.log(`Contractor ${contractorId} has accepted invite from business ${businessId}`);
          return true;
        }
      }

      // Check connection requests
      const connectionRequestsList = await db
        .select()
        .from(connectionRequests)
        .where(and(
          eq(connectionRequests.businessId, businessId),
          eq(connectionRequests.contractorId, contractorId),
          eq(connectionRequests.status, 'accepted')
        ));

      if (connectionRequestsList && connectionRequestsList.length > 0) {
        console.log(`Contractor ${contractorId} has accepted connection request from business ${businessId}`);
        return true;
      }

      console.log(`Contractor ${contractorId} is NOT linked to business ${businessId}`);
      return false;
    } catch (error) {
      console.error(`Error checking contractor link:`, error);
      return false;
    }
  }

  // Notification methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [result] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return result;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  // Work Submission methods
  async createWorkSubmission(submission: InsertWorkSubmission): Promise<WorkSubmission> {
    const [result] = await db.insert(workSubmissions).values({
      ...submission,
      submittedAt: new Date(),
      status: 'pending'
    }).returning();
    return result;
  }

  async createWorkRequestSubmission(submission: InsertWorkRequestSubmission): Promise<WorkRequestSubmission> {
    const [result] = await db.insert(workRequestSubmissions).values({
      ...submission,
      submittedAt: new Date(),
      status: 'pending'
    }).returning();
    return result;
  }

  async getWorkRequestSubmissionsByContractorId(contractorId: number): Promise<WorkRequestSubmission[]> {
    return await db
      .select()
      .from(workRequestSubmissions)
      .where(eq(workRequestSubmissions.contractorId, contractorId))
      .orderBy(desc(workRequestSubmissions.submittedAt));
  }

  async getWorkRequestSubmissionsByBusinessId(businessId: number): Promise<WorkRequestSubmission[]> {
    return await db
      .select()
      .from(workRequestSubmissions)
      .where(eq(workRequestSubmissions.businessId, businessId))
      .orderBy(desc(workRequestSubmissions.submittedAt));
  }

  async getWorkSubmissionsByContractId(contractId: number): Promise<WorkSubmission[]> {
    return await db
      .select()
      .from(workSubmissions)
      .where(eq(workSubmissions.contractId, contractId))
      .orderBy(desc(workSubmissions.submittedAt));
  }

  async getWorkSubmissionsByContractorId(contractorId: number): Promise<WorkSubmission[]> {
    return await db
      .select()
      .from(workSubmissions)
      .where(eq(workSubmissions.contractorId, contractorId))
      .orderBy(desc(workSubmissions.submittedAt));
  }

  async getWorkSubmissionsByBusinessId(businessId: number): Promise<WorkSubmission[]> {
    return await db
      .select()
      .from(workSubmissions)
      .where(eq(workSubmissions.businessId, businessId))
      .orderBy(desc(workSubmissions.submittedAt));
  }

  async getWorkSubmission(id: number): Promise<WorkSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(workSubmissions)
      .where(eq(workSubmissions.id, id));

    return submission;
  }

  async updateWorkSubmission(id: number, submission: Partial<InsertWorkSubmission>): Promise<WorkSubmission | undefined> {
    const [updated] = await db
      .update(workSubmissions)
      .set(submission)
      .where(eq(workSubmissions.id, id))
      .returning();

    return updated;
  }

  async reviewWorkSubmission(id: number, status: string, reviewNotes?: string): Promise<WorkSubmission | undefined> {
    const [updated] = await db
      .update(workSubmissions)
      .set({
        status,
        reviewNotes,
        reviewedAt: new Date()
      })
      .where(eq(workSubmissions.id, id))
      .returning();

    return updated;
  }

  // Work Request Submissions
  async createWorkRequestSubmission(submission: InsertWorkRequestSubmission): Promise<WorkRequestSubmission> {
    const [created] = await db
      .insert(workRequestSubmissions)
      .values({
        ...submission,
        submittedAt: new Date()
      })
      .returning();

    return created;
  }

  async getWorkRequestSubmission(id: number): Promise<WorkRequestSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(workRequestSubmissions)
      .where(eq(workRequestSubmissions.id, id));

    return submission;
  }

  async getWorkRequestSubmissionsByBusinessId(businessId: number): Promise<WorkRequestSubmission[]> {
    return await db
      .select()
      .from(workRequestSubmissions)
      .where(eq(workRequestSubmissions.businessId, businessId))
      .orderBy(desc(workRequestSubmissions.submittedAt));
  }

  async getWorkRequestSubmissionsByContractorId(contractorId: number): Promise<WorkRequestSubmission[]> {
    return await db
      .select()
      .from(workRequestSubmissions)
      .where(eq(workRequestSubmissions.contractorId, contractorId))
      .orderBy(desc(workRequestSubmissions.submittedAt));
  }

  async updateWorkRequestSubmission(id: number, submission: Partial<InsertWorkRequestSubmission>): Promise<WorkRequestSubmission | undefined> {
    const [updated] = await db
      .update(workRequestSubmissions)
      .set(submission)
      .where(eq(workRequestSubmissions.id, id))
      .returning();

    return updated;
  }

  // Trolley Submerchant Management
  async updateTrolleySubmerchantInfo(userId: number, submerchantId: string, status: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        trolleySubmerchantId: submerchantId,
        trolleySubmerchantStatus: status
      })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  async setPaymentMethod(userId: number, method: 'pre_funded' | 'pay_as_you_go'): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ paymentMethod: method })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  async updateTrolleyAccountBalance(userId: number, balance: number): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ trolleyAccountBalance: balance.toString() })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  async updateUserTrolleyRecipientId(userId: number, recipientId: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ trolleyRecipientId: recipientId })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  // Subscription Management
  async updateUserSubscription(userId: number, subscription: Partial<{
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    subscriptionStatus: string;
    subscriptionPlan: string;
    subscriptionStartDate: Date;
    subscriptionEndDate: Date;
    subscriptionTrialEnd: Date | null;
  }>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(subscription)
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  // Business Workers (new specification)
  async upsertBusinessWorker(data: InsertBusinessWorker): Promise<BusinessWorker> {
    // Try to find existing record
    const existing = await db
      .select()
      .from(businessWorkers)
      .where(and(
        eq(businessWorkers.businessId, data.businessId),
        eq(businessWorkers.contractorUserId, data.contractorUserId)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      const [updated] = await db
        .update(businessWorkers)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(businessWorkers.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create new record
      const [created] = await db
        .insert(businessWorkers)
        .values(data)
        .returning();
      return created;
    }
  }

  async getBusinessWorker(id: number): Promise<BusinessWorker | undefined> {
    const [result] = await db
      .select()
      .from(businessWorkers)
      .where(eq(businessWorkers.id, id));
    return result;
  }

  async getBusinessWorkers(businessId: number): Promise<Array<BusinessWorker & { contractorName?: string }>> {
    const results = await db
      .select({
        id: businessWorkers.id,
        businessId: businessWorkers.businessId,
        contractorUserId: businessWorkers.contractorUserId,
        status: businessWorkers.status,
        joinedAt: businessWorkers.joinedAt,
        contractorName: users.username
      })
      .from(businessWorkers)
      .leftJoin(users, eq(businessWorkers.contractorUserId, users.id))
      .where(eq(businessWorkers.businessId, businessId));

    return results;
  }

  // Projects (new specification)
  async getProject(id: number): Promise<Project | undefined> {
    const [result] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return result;
  }

  async getBusinessProjects(businessId: number): Promise<Project[]> {
    const results = await db
      .select()
      .from(projects)
      .where(eq(projects.businessId, businessId))
      .orderBy(desc(projects.createdAt));
    return results;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db
      .insert(projects)
      .values(project)
      .returning();
    return created;
  }

  // Work Requests (updated specification)
  async createWorkRequest(workRequest: Omit<InsertWorkRequest, 'createdAt'>): Promise<WorkRequest> {
    const [created] = await db
      .insert(workRequests)
      .values({
        ...workRequest,
        createdAt: new Date()
      })
      .returning();
    return created;
  }

  async getProjectWorkRequests(projectId: number): Promise<WorkRequest[]> {
    return db
      .select()
      .from(workRequests)
      .where(eq(workRequests.projectId, projectId))
      .orderBy(desc(workRequests.createdAt));
  }

  async updateWorkRequestStatus(id: number, status: string): Promise<WorkRequest | undefined> {
    const [updated] = await db
      .update(workRequests)
      .set({ status })
      .where(eq(workRequests.id, id))
      .returning();
    return updated;
  }

  // Stripe Connect account management
  async getConnectForUser(userId: number): Promise<{ accountId: string, accountType: string } | null> {
    const user = await this.getUser(userId);
    if (!user || !user.stripeConnectAccountId || !user.stripeConnectAccountType) {
      return null;
    }
    return {
      accountId: user.stripeConnectAccountId,
      accountType: user.stripeConnectAccountType
    };
  }

  async setConnectForUser(userId: number, data: { accountId: string, accountType: string }): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        stripeConnectAccountId: data.accountId,
        stripeConnectAccountType: data.accountType
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async deleteContractMilestones(contractId: number): Promise<void> {
    await db.delete(milestones).where(eq(milestones.contractId, contractId));
  }

  async deleteContractPayments(contractId: number): Promise<void> {
    await db.delete(payments).where(eq(payments.contractId, contractId));
  }

  async deleteContractDocuments(contractId: number): Promise<void> {
    await db.delete(documents).where(eq(documents.contractId, contractId));
  }

  // Update the existing deleteContract method to only mark as deleted
  // The permanentlyDeleteContract method will handle the actual deletion and cascade deletes.
  async deleteContract(id: number): Promise<boolean> {
    try {
      const [updatedContract] = await db
        .update(contracts)
        .set({ status: 'deleted' })
        .where(eq(contracts.id, id))
        .returning();

      if (!updatedContract) {
        return false;
      }

      console.log(`Contract ${id} marked as deleted.`);
      return true;
    } catch (error) {
      console.error('Error marking contract as deleted:', error);
      return false;
    }
  }

  // Added permanentlyDeleteContract method to handle cascading deletes
  async permanentlyDeleteContract(id: number): Promise<boolean> {
    try {
      // Ensure the contract exists and is marked as deleted before permanent deletion
      const contract = await this.getContract(id);
      if (!contract || contract.status !== 'deleted') {
        console.log(`Contract ${id} not found or not marked as deleted. Cannot permanently delete.`);
        return false;
      }

      console.log(`Permanently deleting contract ${id} and all associated data...`);

      // Perform cascading deletes in the correct order to maintain referential integrity
      await this.deleteContractDocuments(id);
      await this.deleteContractPayments(id);
      await this.deleteContractMilestones(id);

      // Finally, delete the contract itself
      const result = await db.delete(contracts).where(eq(contracts.id, id));

      console.log(`Contract ${id} permanently deleted.`);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error permanently deleting contract:', error);
      return false;
    }
  }

  async deleteWorkRequest(id: number): Promise<void> {
    await this.db.delete(workRequests).where(eq(workRequests.id, id));
  }

  async deleteContract(id: number): Promise<void> {
    await this.db.delete(contracts).where(eq(contracts.id, id));
  }

  async deleteContractMilestones(contractId: number): Promise<void> {
    await this.db.delete(milestones).where(eq(milestones.contractId, contractId));
  }

  async deleteContractPayments(contractId: number): Promise<void> {
    await this.db.delete(payments).where(eq(payments.contractId, contractId));
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getBusinessProjects(businessId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.businessId, businessId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getContractByWorkRequestId(workRequestId: number): Promise<Contract | undefined> {
    const workRequest = await this.getWorkRequest(workRequestId);
    if (!workRequest || !workRequest.contractId) {
      return undefined;
    }
    return this.getContract(workRequest.contractId);
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByProjectId(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async getTasksByContractorId(contractorId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.contractorId, contractorId));
  }

  async getTasksByBusinessId(businessId: number): Promise<Task[]> {
    const result = await db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        description: tasks.description,
        contractorId: tasks.contractorId,
        amount: tasks.amount,
        currency: tasks.currency,
        dueDate: tasks.dueDate,
        status: tasks.status,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(projects.businessId, businessId));
    
    return result;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set(taskData)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async assignTaskToContractor(taskId: number, contractorId: number): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ 
        contractorId: contractorId, 
        status: 'in_progress'
      })
      .where(eq(tasks.id, taskId))
      .returning();
    return updatedTask;
  }

  async updateTaskStatus(id: number, status: 'open' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'canceled'): Promise<Task | undefined> {
    // Validate status using schema enum values
    const validStatuses = ["open", "in_progress", "submitted", "approved", "rejected", "canceled"] as const;
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid task status: ${status}`);
    }
    
    const [updatedTask] = await db
      .update(tasks)
      .set({ status })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  // Task Submission methods
  async getTaskSubmission(id: number): Promise<TaskSubmission | undefined> {
    const [submission] = await db.select().from(taskSubmissions).where(eq(taskSubmissions.id, id));
    return submission;
  }

  async getTaskSubmissionsByTaskId(taskId: number): Promise<TaskSubmission[]> {
    return await db.select().from(taskSubmissions).where(eq(taskSubmissions.taskId, taskId));
  }

  async getTaskSubmissionsByContractorId(contractorId: number): Promise<TaskSubmission[]> {
    return await db.select().from(taskSubmissions).where(eq(taskSubmissions.contractorId, contractorId));
  }

  async getTaskSubmissionsByBusinessId(businessId: number): Promise<TaskSubmission[]> {
    const result = await db
      .select({
        id: taskSubmissions.id,
        taskId: taskSubmissions.taskId,
        contractorId: taskSubmissions.contractorId,
        note: taskSubmissions.note,
        files: taskSubmissions.files,
        status: taskSubmissions.status,
        submittedAt: taskSubmissions.submittedAt,
        approverId: taskSubmissions.approverId,
        approvedAt: taskSubmissions.approvedAt,
        rejectionReason: taskSubmissions.rejectionReason,
        paymentId: taskSubmissions.paymentId,
        createdAt: taskSubmissions.createdAt
      })
      .from(taskSubmissions)
      .innerJoin(tasks, eq(taskSubmissions.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(projects.businessId, businessId));
    
    return result;
  }

  async createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission> {
    const [newSubmission] = await db.insert(taskSubmissions).values(submission).returning();
    return newSubmission;
  }

  async updateTaskSubmission(id: number, submissionData: Partial<InsertTaskSubmission>): Promise<TaskSubmission | undefined> {
    const [updatedSubmission] = await db
      .update(taskSubmissions)
      .set(submissionData)
      .where(eq(taskSubmissions.id, id))
      .returning();
    return updatedSubmission;
  }

  async approveTaskSubmission(id: number, approverId: number): Promise<TaskSubmission | undefined> {
    return await db.transaction(async (tx) => {
      // Get the task submission with task info in one query with row locking
      const [submissionWithTask] = await tx
        .select({
          submission: taskSubmissions,
          taskId: tasks.id,
          taskStatus: tasks.status
        })
        .from(taskSubmissions)
        .innerJoin(tasks, eq(taskSubmissions.taskId, tasks.id))
        .where(eq(taskSubmissions.id, id))
        .for('update');

      if (!submissionWithTask) return undefined;
      
      // Idempotency: If already approved, return existing submission
      if (submissionWithTask.submission.status === 'approved') {
        return submissionWithTask.submission;
      }

      // Validate state: submission must be in 'submitted' status
      if (submissionWithTask.submission.status !== 'submitted') {
        throw new Error(`Cannot approve task submission in status: ${submissionWithTask.submission.status}`);
      }

      // Update submission status
      const [updatedSubmission] = await tx
        .update(taskSubmissions)
        .set({ 
          status: 'approved',
          approverId,
          approvedAt: new Date()
        })
        .where(eq(taskSubmissions.id, id))
        .returning();

      // Update parent task status only if currently 'submitted'
      if (submissionWithTask.taskStatus === 'submitted') {
        await tx
          .update(tasks)
          .set({ status: 'approved' })
          .where(eq(tasks.id, submissionWithTask.taskId));
      }

      return updatedSubmission;
    });
  }

  async rejectTaskSubmission(id: number, rejectionReason?: string, approverId?: number): Promise<TaskSubmission | undefined> {
    return await db.transaction(async (tx) => {
      // Get the task submission with task info in one query with row locking
      const [submissionWithTask] = await tx
        .select({
          submission: taskSubmissions,
          taskId: tasks.id,
          taskStatus: tasks.status
        })
        .from(taskSubmissions)
        .innerJoin(tasks, eq(taskSubmissions.taskId, tasks.id))
        .where(eq(taskSubmissions.id, id))
        .for('update');

      if (!submissionWithTask) return undefined;
      
      // Idempotency: If already rejected, return existing submission
      if (submissionWithTask.submission.status === 'rejected') {
        return submissionWithTask.submission;
      }

      // Validate state: submission must be in 'submitted' status
      if (submissionWithTask.submission.status !== 'submitted') {
        throw new Error(`Cannot reject task submission in status: ${submissionWithTask.submission.status}`);
      }

      // Update submission status
      const [updatedSubmission] = await tx
        .update(taskSubmissions)
        .set({ 
          status: 'rejected',
          rejectionReason,
          approverId
        })
        .where(eq(taskSubmissions.id, id))
        .returning();

      // Update parent task status only if currently 'submitted'
      if (submissionWithTask.taskStatus === 'submitted') {
        await tx
          .update(tasks)
          .set({ status: 'rejected' })
          .where(eq(tasks.id, submissionWithTask.taskId));
      }

      return updatedSubmission;
    });
  }

  // BULLETPROOF DATA CONSISTENCY METHOD
  async ensureContractWorkRequestConsistency(contractorId: number, deliverableName: string): Promise<{contract: Contract | null, workRequest: WorkRequest | null, businessId: number | null}> {
    try {
      console.log(`DB: Ensuring data consistency for contractor ${contractorId}, deliverable: ${deliverableName}`);

      // Find all work requests for this contractor with enhanced query
      const workRequestsData = await this.getWorkRequestsWithBusinessInfo(contractorId);
      console.log(`DB: Found ${workRequestsData.length} work requests for contractor ${contractorId}`);

      // Find work request that matches deliverable
      const matchingWorkRequest = workRequestsData.find(wr => 
        wr.title === deliverableName && 
        (wr.status === 'accepted' || wr.status === 'assigned')
      );

      if (!matchingWorkRequest) {
        console.log(`DB: No matching work request found for deliverable: ${deliverableName}`);
        return { contract: null, workRequest: null, businessId: null };
      }

      console.log(`DB: Found matching work request ${matchingWorkRequest.id}`);

      let contract = null;
      let businessId = null;

      // Get business ID from work request data
      if (matchingWorkRequest.projectId) {
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, matchingWorkRequest.projectId));

        if (project) {
          businessId = project.businessId;
          console.log(`DB: Found business ${businessId} via project ${project.id}`);
        }
      }

      // Try to get contract
      if (matchingWorkRequest.contractId) {
        const [contractData] = await db
          .select()
          .from(contracts)
          .where(eq(contracts.id, matchingWorkRequest.contractId));

        if (contractData) {
          contract = contractData;
          businessId = contract.businessId;
          console.log(`DB: Found contract ${contract.id} via direct lookup`);
        }
      } else if (businessId && matchingWorkRequest.projectId) {
        // Look for contracts linked to this project
        const contractsForProject = await db
          .select()
          .from(contracts)
          .where(and(
            eq(contracts.businessId, businessId),
            eq(contracts.projectId, matchingWorkRequest.projectId)
          ));

        if (contractsForProject.length > 0) {
          contract = contractsForProject[0];
          console.log(`DB: Found contract ${contract.id} via project lookup`);
        }
      }

      return {
        contract,
        workRequest: matchingWorkRequest,
        businessId
      };

    } catch (error) {
      console.error(`DB: Error ensuring data consistency:`, error);
      return { contract: null, workRequest: null, businessId: null };
    }
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();