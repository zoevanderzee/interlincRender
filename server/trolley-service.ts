import { createHmac } from 'crypto';

/**
 * Trolley Payment Service
 * Handles contractor payments through Trolley API using batch-based payments
 */

const TROLLEY_API_BASE = 'https://api.trolley.com/v1';

interface TrolleyRecipient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  type: 'individual' | 'business';
  status: string;
  routeType?: string;
  estimatedFees?: string;
  accounts?: Array<{
    id: string;
    type: string;
    primary: boolean;
  }>;
}

interface TrolleyBatch {
  id: string;
  status: string;
  description: string;
  sentAt?: string;
  completedAt?: string;
  paymentsCount: number;
  totalAmount: string;
  currency: string;
}

interface TrolleyPayment {
  id: string;
  recipient: {
    id: string;
    email: string;
  };
  amount: string;
  currency: string;
  memo: string;
  externalId: string;
  status: string;
  batchId: string;
  processedAt?: string;
  estimatedDeliveryAt?: string;
  fees?: string;
}

interface CreateBatchRequest {
  description: string;
  currency?: string;
  payments?: Array<{
    recipient: {
      id: string;
    };
    amount: string;
    currency: string;
    memo: string;
    externalId?: string;
  }>;
}

interface CreatePaymentRequest {
  recipient: {
    id: string;
  };
  amount: string;
  currency: string;
  memo: string;
  externalId?: string;
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

class TrolleyService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = process.env.TROLLEY_API_KEY || '';
    this.apiSecret = process.env.TROLLEY_API_SECRET || '';
    
    if (!this.apiKey || !this.apiSecret) {
      console.warn('Trolley API credentials not found. Set TROLLEY_API_KEY and TROLLEY_API_SECRET environment variables.');
    }
  }

  private generateAuthHeader(method: string, path: string, body: string = ''): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Math.random().toString(36).substring(2, 15);
    
    // Create message string exactly as Trolley expects
    const message = `${method.toUpperCase()}\n${path}\n\n${timestamp}\n${nonce}`;
    const signature = createHmac('sha256', this.apiSecret).update(message).digest('hex');
    
    // Format as per Trolley documentation
    return `prsign accessKey="${this.apiKey}"; timestamp="${timestamp}"; nonce="${nonce}"; version="1"; signature="${signature}"`;
  }

  private getAuthHeaders(method: string, path: string, body: string = '') {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.generateAuthHeader(method, path, body),
      'X-PR-Version': '1',
      'Accept': 'application/json'
    };
  }

  async createRecipient(recipientData: CreateRecipientRequest): Promise<TrolleyRecipient> {
    const path = '/recipients';
    const body = JSON.stringify(recipientData);
    
    try {
      const response = await fetch(`${TROLLEY_API_BASE}${path}`, {
        method: 'POST',
        headers: this.getAuthHeaders('POST', path, body),
        body
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Trolley API error creating recipient:', errorData);
        throw new Error(`Trolley API error: ${response.status} - ${errorData}`);
      }

      const recipient = await response.json();
      console.log(`Created Trolley recipient: ${recipient.id} for ${recipientData.email}`);
      
      return recipient;
    } catch (error) {
      console.error('Error creating Trolley recipient:', error);
      throw error;
    }
  }

  async getRecipient(recipientId: string): Promise<TrolleyRecipient> {
    const path = `/recipients/${recipientId}`;
    
    try {
      const response = await fetch(`${TROLLEY_API_BASE}${path}`, {
        method: 'GET',
        headers: this.getAuthHeaders('GET', path)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Trolley API error: ${response.status} - ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Trolley recipient:', error);
      throw error;
    }
  }

  async createBatch(batchData: CreateBatchRequest): Promise<TrolleyBatch> {
    const path = '/batches';
    const body = JSON.stringify(batchData);
    
    try {
      const response = await fetch(`${TROLLEY_API_BASE}${path}`, {
        method: 'POST',
        headers: this.getAuthHeaders('POST', path, body),
        body
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Trolley API error creating batch:', errorData);
        throw new Error(`Trolley API error: ${response.status} - ${errorData}`);
      }

      const batch = await response.json();
      console.log(`Created Trolley batch: ${batch.id}`);
      
      return batch;
    } catch (error) {
      console.error('Error creating Trolley batch:', error);
      throw error;
    }
  }

  async addPaymentToBatch(batchId: string, paymentData: CreatePaymentRequest): Promise<TrolleyPayment> {
    const path = `/batches/${batchId}/payments`;
    const body = JSON.stringify(paymentData);
    
    try {
      const response = await fetch(`${TROLLEY_API_BASE}${path}`, {
        method: 'POST',
        headers: this.getAuthHeaders('POST', path, body),
        body
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Trolley API error adding payment to batch:', errorData);
        throw new Error(`Trolley API error: ${response.status} - ${errorData}`);
      }

      const payment = await response.json();
      console.log(`Added payment to batch ${batchId}: ${payment.id}`);
      
      return payment;
    } catch (error) {
      console.error('Error adding payment to batch:', error);
      throw error;
    }
  }

  async processBatch(batchId: string): Promise<TrolleyBatch> {
    const path = `/batches/${batchId}/start-processing`;
    
    try {
      const response = await fetch(`${TROLLEY_API_BASE}${path}`, {
        method: 'POST',
        headers: this.getAuthHeaders('POST', path)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Trolley API error processing batch:', errorData);
        throw new Error(`Trolley API error: ${response.status} - ${errorData}`);
      }

      const batch = await response.json();
      console.log(`Started processing batch: ${batch.id}`);
      
      return batch;
    } catch (error) {
      console.error('Error processing batch:', error);
      throw error;
    }
  }

  async getBatch(batchId: string): Promise<TrolleyBatch> {
    const path = `/batches/${batchId}`;
    
    try {
      const response = await fetch(`${TROLLEY_API_BASE}${path}`, {
        method: 'GET',
        headers: this.getAuthHeaders('GET', path)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Trolley API error: ${response.status} - ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Trolley batch:', error);
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<TrolleyPayment> {
    const path = `/payments/${paymentId}`;
    
    try {
      const response = await fetch(`${TROLLEY_API_BASE}${path}`, {
        method: 'GET',
        headers: this.getAuthHeaders('GET', path)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Trolley API error: ${response.status} - ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Trolley payment:', error);
      throw error;
    }
  }

  async getPaymentsByRecipient(recipientId: string): Promise<TrolleyPayment[]> {
    const path = `/recipients/${recipientId}/payments`;
    
    try {
      const response = await fetch(`${TROLLEY_API_BASE}${path}`, {
        method: 'GET',
        headers: this.getAuthHeaders('GET', path)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Trolley API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      return result.payments || [];
    } catch (error) {
      console.error('Error fetching recipient payments:', error);
      throw error;
    }
  }

  /**
   * Creates a complete payment flow: recipient (if needed) → batch → payment → process
   */
  async createAndProcessPayment(paymentData: {
    recipientId: string;
    amount: string;
    currency: string;
    memo: string;
    externalId?: string;
    description?: string;
  }): Promise<{ batch: TrolleyBatch; payment: TrolleyPayment }> {
    try {
      // Create batch
      const batch = await this.createBatch({
        description: paymentData.description || `Payment for ${paymentData.memo}`,
        currency: paymentData.currency
      });

      // Add payment to batch
      const payment = await this.addPaymentToBatch(batch.id, {
        recipient: { id: paymentData.recipientId },
        amount: paymentData.amount,
        currency: paymentData.currency,
        memo: paymentData.memo,
        externalId: paymentData.externalId
      });

      // Process batch
      const processedBatch = await this.processBatch(batch.id);

      return { batch: processedBatch, payment };
    } catch (error) {
      console.error('Error in complete payment flow:', error);
      throw error;
    }
  }

  /**
   * Generates Trolley Widget URL for recipient onboarding
   * Following official Trolley documentation for widget generation
   */
  generateWidgetUrl(recipientEmail: string, options: {
    recipientReferenceId?: string;
    hideEmail?: boolean;
    roEmail?: boolean;
    locale?: string;
    products?: string[];
    colors?: Record<string, string>;
    address?: Record<string, string>;
  } = {}): string {
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Build query parameters following Trolley documentation
    const queryParams: Record<string, string> = {
      ts: timestamp.toString(),
      key: this.apiKey,
      email: recipientEmail,
      hideEmail: options.hideEmail ? 'true' : 'false',
      roEmail: options.roEmail ? 'true' : 'false',
      locale: options.locale || 'en',
      products: options.products?.join(',') || 'pay,tax'
    };

    // Add reference ID if provided
    if (options.recipientReferenceId) {
      queryParams.refid = options.recipientReferenceId;
    }

    // Add color customizations if provided
    if (options.colors) {
      Object.entries(options.colors).forEach(([key, value]) => {
        queryParams[`colors.${key}`] = value;
      });
    }

    // Add address fields if provided
    if (options.address) {
      Object.entries(options.address).forEach(([key, value]) => {
        queryParams[`addr.${key}`] = value;
      });
    }

    // Create query string with proper encoding
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
      .replace(/\+/g, '%20');

    // Generate HMAC signature
    const hmac = createHmac('sha256', this.apiSecret);
    hmac.update(queryString);
    const signature = hmac.digest('hex');

    // Return complete widget URL
    return `https://widget.trolley.com?${queryString}&sign=${signature}`;
  }
}

export const trolleyService = new TrolleyService();
export type { TrolleyRecipient, TrolleyBatch, TrolleyPayment, CreateRecipientRequest };