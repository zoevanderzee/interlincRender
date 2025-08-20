import trolley from 'trolleyhq';
import crypto from 'crypto';
import type { User } from '../shared/schema';

// Trolley API Response Types
interface TrolleyRecipient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  type: 'individual' | 'business';
  dob?: string;
  address?: {
    street1: string;
    street2?: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };
}

interface TrolleyPayment {
  id: string;
  recipientId: string;
  amount: string;
  currency: string;
  status: string;
  batchId: string;
  processedAt?: string;
  estimatedDeliveryAt?: string;
  fees?: string;
}

interface TrolleyBatch {
  id: string;
  status: string;
  description: string;
  totalAmount: string;
  currency: string;
  sentAt?: string;
  completedAt?: string;
  payments?: TrolleyPayment[];
}

interface CreateRecipientRequest {
  type: 'individual' | 'business';
  firstName: string;
  lastName: string;
  email: string;
  address?: {
    street1: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };
  dob?: string;
  passport?: string;
  ssn?: string;
}

interface CreatePaymentRequest {
  recipient: { id: string };
  amount: string;
  currency: string;
  memo: string;
  externalId?: string;
}

class TrolleyService {
  private client: any;
  private apiKey: string;
  private apiSecret: string;
  private readonly API_BASE = 'https://api.trolley.com/v1';

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    this.apiKey = process.env.TROLLEY_API_KEY || '';
    this.apiSecret = process.env.TROLLEY_API_SECRET || '';
    
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('LIVE Trolley API credentials required. Please configure TROLLEY_API_KEY and TROLLEY_API_SECRET');
    }

    this.client = (trolley as any).connect({
      key: this.apiKey,
      secret: this.apiSecret
    });
    
    console.log('Trolley SDK client initialized successfully with LIVE production credentials');
  }

  private ensureClient() {
    if (!this.client) {
      throw new Error('Trolley client not initialized - check API credentials');
    }
  }

  private getAuthHeaders(method: string, path: string, body?: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Build message for signature according to Trolley API spec
    const message = `${method.toUpperCase()}\n${path}\n${body || ''}\n${timestamp}`;
    const signature = crypto.createHmac('sha256', this.apiSecret).update(message).digest('base64');
    
    return {
      'Content-Type': 'application/json',
      'X-PR-Timestamp': timestamp,
      'Authorization': `prsign=${this.apiKey}:${signature}`,
    };
  }

  /**
   * Create a recipient account for contractor payments
   * This sets up the contractor to receive direct bank transfers
   */
  async createRecipient(recipientData: CreateRecipientRequest): Promise<TrolleyRecipient> {
    this.ensureClient();
    
    try {
      const recipient = await this.client.recipient.create(recipientData);
      console.log(`Created Trolley recipient: ${recipient.id} for ${recipientData.email}`);
      return recipient;
    } catch (error) {
      console.error('Error creating Trolley recipient:', error);
      throw error;
    }
  }

  /**
   * Get recipient details and verify account status
   */
  async getRecipient(recipientId: string): Promise<TrolleyRecipient> {
    this.ensureClient();
    
    try {
      const recipient = await this.client.recipient.find(recipientId);
      return recipient;
    } catch (error) {
      console.error('Error fetching recipient:', error);
      throw error;
    }
  }

  /**
   * Search for recipients by email address using SDK
   */
  async searchRecipientByEmail(email: string): Promise<TrolleyRecipient[]> {
    this.ensureClient();
    
    try {
      console.log(`🔍 Searching for recipient with email: ${email}`);
      
      // Use SDK search method
      const result = await this.client.recipient.search();
      console.log(`SDK search returned:`, result);
      
      const recipients = result?.recipients || [];
      console.log(`Found ${recipients.length} total recipients via SDK search`);
      
      if (!Array.isArray(recipients)) {
        console.log('Recipients is not an array:', recipients);
        return [];
      }
      
      // Filter recipients by email
      const matchingRecipients = recipients.filter((recipient: any) => 
        recipient.email && recipient.email.toLowerCase() === email.toLowerCase()
      );
      
      console.log(`Found ${matchingRecipients.length} recipients matching email ${email}`);
      return matchingRecipients;
    } catch (error) {
      console.error('Error searching recipients by email via SDK:', error);
      
      // Return empty array instead of throwing - this makes auto-sync non-blocking
      console.log('No matching recipients found due to search error');
      return [];
    }
  }

  /**
   * Add bank account to existing recipient
   */
  async addBankAccount(recipientId: string, bankAccountData: {
    bankName: string;
    bankId: string;
    branchId: string;
    accountNum: string;
    accountHolderName: string;
    accountType: string;
    country: string;
  }): Promise<any> {
    this.ensureClient();
    
    try {
      const bankAccount = await this.client.recipientAccount.create(recipientId, {
        type: 'bank-transfer',
        ...bankAccountData
      });
      console.log(`Bank account added to recipient ${recipientId}`);
      return bankAccount;
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw error;
    }
  }

  /**
   * Add PayPal account to existing recipient
   */
  async addPayPalAccount(recipientId: string, paypalEmail: string): Promise<any> {
    this.ensureClient();
    
    try {
      const paypalAccount = await this.client.recipientAccount.create(recipientId, {
        type: 'paypal',
        emailAddress: paypalEmail
      });
      console.log(`PayPal account added to recipient ${recipientId}`);
      return paypalAccount;
    } catch (error) {
      console.error('Error adding PayPal account:', error);
      throw error;
    }
  }

  /**
   * Create payment batch and process payment to contractor's bank account
   * This is where the actual payment transfer happens
   */
  async createAndProcessPayment(
    recipientId: string, 
    amount: string, 
    currency: string = 'USD', 
    memo: string
  ): Promise<{ batch: TrolleyBatch; payment: TrolleyPayment }> {
    this.ensureClient();
    
    try {
      // Step 1: Create batch using SDK (not manual fetch)
      const batchData = {
        description: `Milestone payment: ${memo}`,
        currency,
        payments: [{
          recipient: { id: recipientId },
          amount,
          currency,
          memo,
          externalId: `milestone_${Date.now()}`
        }]
      };

      console.log('Creating batch with data:', JSON.stringify(batchData, null, 2));
      console.log('SDK client exists:', !!this.client);
      console.log('Batch method exists:', typeof this.client.batch.create === 'function');

      const batch = await this.client.batch.create(batchData);
      
      // Debug the batch structure fully
      console.log('Batch payments array:', batch.payments);
      console.log('Batch payments length:', batch.payments?.length || 0);
      console.log('Batch total payments:', batch.totalPayments);
      
      // SDK batches are created but need to be processed to have actual payment objects
      // For now, create a minimal payment object from batch data
      const payment = {
        id: `${batch.id}-payment-1`,
        batchId: batch.id,
        amount: batchData.payments[0].amount,
        currency: batchData.payments[0].currency,
        memo: batchData.payments[0].memo,
        recipient: batchData.payments[0].recipient,
        status: batch.status
      };
      
      if (!batch) {
        throw new Error('No batch created');
      }

      console.log(`Payment batch created: ${batch.id}, Payment ID: ${payment.id}`);
      
      // Step 2: Process batch using SDK (the missing step!)
      await this.client.batch.startProcessing(batch.id);
      
      console.log(`Batch ${batch.id} sent for processing - contractor will receive ${amount} ${currency} directly to their bank account`);
      
      return { batch, payment };
    } catch (error) {
      console.error('Error creating and processing Trolley batch:', error);
      throw error;
    }
  }

  /**
   * Generate secure widget URL for contractor onboarding
   * This URL allows contractors to set up their bank account and verify identity
   */
  generateWidgetUrl(options: {
    recipientEmail: string;
    recipientReferenceId?: string;
    products?: string[];
    colors?: Record<string, string>;
    address?: Record<string, string>;
    userRole?: string;
  }): string {
    // Official Trolley recipient widget API parameters
    const timestamp = Math.floor(Date.now() / 1000);
    
    const queryParams: Record<string, string> = {
      ts: timestamp.toString(),
      key: this.apiKey,
      email: options.recipientEmail,
      products: (options.products || ['pay', 'tax']).join(','),
      hideEmail: 'false',
      roEmail: 'false',
      locale: 'en',
      type: options.userRole === 'business' ? 'business' : 'individual'  // Set type based on user role
    };

    // Skip reference ID to avoid conflicts with existing recipients
    // Trolley will use email-only lookup for existing recipients

    // Use light theme colors to prevent black screen
    if (options.colors) {
      Object.entries(options.colors).forEach(([key, value]) => {
        queryParams[`colors.${key}`] = value;
      });
    }

    if (options.address) {
      Object.entries(options.address).forEach(([key, value]) => {
        queryParams[`addr.${key}`] = value;
      });
    }

    // Create query string exactly as per Trolley documentation
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
      .replace(/\+/g, '%20');

    // Generate signature exactly as per Trolley documentation
    const signature = crypto.createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');

    return `https://widget.trolley.com?${queryString}&sign=${signature}`;
  }

  /**
   * Get funding instructions for business wallet
   * Returns bank details and steps for manual bank transfer
   */
  async getFundingInstructions(): Promise<{
    accountName: string;
    accountNumber: string;
    sortCode: string;
    reference: string;
  }> {
    try {
      // Call Trolley API to get funding instructions
      const path = '/v1/funding/bank-transfer-info';
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: this.getAuthHeaders('GET', path)
      });

      if (!response.ok) {
        throw new Error(`Failed to get funding instructions: ${response.status}`);
      }

      const data = await response.json();
      return {
        accountName: data.accountName || 'Trolley Inc',
        accountNumber: data.accountNum || 'Contact Trolley Support',
        sortCode: data.routingNumber || 'Contact Trolley Support',
        reference: data.referenceMemo || 'Your Recipient ID'
      };
      
    } catch (error) {
      console.error('Error getting funding instructions:', error);
      // Return fallback instructions
      return {
        accountName: 'Trolley Inc',
        accountNumber: 'Contact Trolley Support for Details',
        sortCode: 'Contact Trolley Support for Details', 
        reference: 'Use your Recipient ID as reference'
      };
    }
  }

  /**
   * Get wallet balance for recipient account
   */
  async getWalletBalance(recipientId: string): Promise<{
    balance: number;
    currency: string;
    accountId?: string;
  }> {
    try {
      const path = `/v1/recipients/${recipientId}/balance`;
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: this.getAuthHeaders('GET', path)
      });

      if (!response.ok) {
        throw new Error(`Failed to get balance: ${response.status}`);
      }

      const data = await response.json();
      return {
        balance: parseFloat(data.balance || '0'),
        currency: data.currency || 'GBP',
        accountId: recipientId
      };
      
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return {
        balance: 0,
        currency: 'GBP',
        accountId: recipientId
      };
    }
  }
}

export const trolleyService = new TrolleyService();
export type { TrolleyRecipient, TrolleyBatch, TrolleyPayment, CreateRecipientRequest };