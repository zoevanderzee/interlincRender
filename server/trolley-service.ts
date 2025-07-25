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
    
    const message = `${method}${path}${body || ''}${timestamp}`;
    const signature = crypto.createHmac('sha256', this.apiSecret).update(message).digest('hex');
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `prsign=${signature}; timestamp=${timestamp}; key=${this.apiKey}`,
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
   * Create payment batch and process payment to contractor's bank account
   * This is where the actual payment transfer happens
   */
  async createAndProcessPayment(
    recipientId: string, 
    amount: string, 
    currency: string = 'USD', 
    memo: string
  ): Promise<{ batch: TrolleyBatch; payment: TrolleyPayment }> {
    const path = '/batches';
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

    const body = JSON.stringify(batchData);
    
    try {
      const response = await fetch(`${this.API_BASE}${path}`, {
        method: 'POST',
        headers: this.getAuthHeaders('POST', path, body),
        body
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Trolley API error (${response.status}): ${errorData}`);
      }

      const batch: TrolleyBatch = await response.json();
      const payment = batch.payments?.[0];
      
      if (!payment) {
        throw new Error('No payment created in batch');
      }

      console.log(`Payment batch created: ${batch.id}, Payment ID: ${payment.id}`);
      console.log(`Contractor will receive ${amount} ${currency} directly to their bank account`);
      
      return { batch, payment };
    } catch (error) {
      console.error('Error creating Trolley batch:', error);
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
      locale: 'en'
    };

    // Skip reference ID to avoid conflicts with existing recipients
    // Trolley will use email-only lookup for existing recipients

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
}

export const trolleyService = new TrolleyService();
export type { TrolleyRecipient, TrolleyBatch, TrolleyPayment, CreateRecipientRequest };