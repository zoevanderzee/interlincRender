import { 
  users, contracts, milestones, payments, documents,
  type User, type InsertUser, 
  type Contract, type InsertContract,
  type Milestone, type InsertMilestone,
  type Payment, type InsertPayment,
  type Document, type InsertDocument
} from "@shared/schema";

// Storage interface for CRUD operations
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Contracts
  getContract(id: number): Promise<Contract | undefined>;
  getContractsByBusinessId(businessId: number): Promise<Contract[]>;
  getContractsByContractorId(contractorId: number): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  
  // Milestones
  getMilestone(id: number): Promise<Milestone | undefined>;
  getMilestonesByContractId(contractId: number): Promise<Milestone[]>;
  getUpcomingMilestones(limit: number): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: number, milestone: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  
  // Payments
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByContractId(contractId: number): Promise<Payment[]>;
  getUpcomingPayments(limit: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  
  // Documents
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByContractId(contractId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contracts: Map<number, Contract>;
  private milestones: Map<number, Milestone>;
  private payments: Map<number, Payment>;
  private documents: Map<number, Document>;
  
  private userId: number;
  private contractId: number;
  private milestoneId: number;
  private paymentId: number;
  private documentId: number;
  
  constructor() {
    this.users = new Map();
    this.contracts = new Map();
    this.milestones = new Map();
    this.payments = new Map();
    this.documents = new Map();
    
    this.userId = 1;
    this.contractId = 1;
    this.milestoneId = 1;
    this.paymentId = 1;
    this.documentId = 1;
    
    // Add some seed data for development
    this.seedData();
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
  
  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === role
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
  
  // Contract CRUD methods
  async getContract(id: number): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }
  
  async getContractsByBusinessId(businessId: number): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      (contract) => contract.businessId === businessId
    );
  }
  
  async getContractsByContractorId(contractorId: number): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      (contract) => contract.contractorId === contractorId
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
  
  // Milestone CRUD methods
  async getMilestone(id: number): Promise<Milestone | undefined> {
    return this.milestones.get(id);
  }
  
  async getMilestonesByContractId(contractId: number): Promise<Milestone[]> {
    return Array.from(this.milestones.values()).filter(
      (milestone) => milestone.contractId === contractId
    );
  }
  
  async getUpcomingMilestones(limit: number): Promise<Milestone[]> {
    return Array.from(this.milestones.values())
      .filter(milestone => milestone.status !== 'completed' && milestone.status !== 'approved')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, limit);
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
  
  async getUpcomingPayments(limit: number): Promise<Payment[]> {
    const now = new Date();
    return Array.from(this.payments.values())
      .filter(payment => payment.status === 'scheduled' && new Date(payment.scheduledDate) >= now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, limit);
  }
  
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.paymentId++;
    const payment: Payment = { ...insertPayment, id, completedDate: null };
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
  
  // Seed data method for development
  private seedData() {
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
  }
}

export const storage = new MemStorage();
