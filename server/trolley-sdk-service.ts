import * as trolley from 'trolleyhq';
import * as crypto from 'crypto';

/**
 * Trolley Payment Service using Official SDK
 * Handles contractor payments through Trolley SDK
 */

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

class TrolleySdkService {
  private client: any;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = process.env.TROLLEY_API_KEY;
    const apiSecret = process.env.TROLLEY_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      console.warn('Trolley API credentials not configured');
      return;
    }

    try {
      this.client = (trolley as any).connect({
        key: apiKey,
        secret: apiSecret
      });
      
      console.log('Trolley SDK client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Trolley SDK:', error);
    }
  }

  public refreshCredentials() {
    this.initializeClient();
    console.log('Trolley SDK credentials refreshed');
  }

  /**
   * Create submerchant account for business 
   * CRITICAL: This creates a SUBMERCHANT (payment facilitator) not a RECIPIENT
   */
  async createSubmerchant(submerchantData: any): Promise<any> {
    this.ensureClient();
    
    try {
      // Use Trolley API with correct Basic auth format
      const credentials = Buffer.from(`${process.env.TROLLEY_API_KEY}:${process.env.TROLLEY_API_SECRET}`).toString('base64');
      
      const response = await fetch('https://api.trolley.com/v1/profile/submerchant', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submerchantData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Trolley submerchant creation failed: ${error}`);
      }

      const result = await response.json();
      console.log(`✅ SUBMERCHANT CREATED: ${result.merchant.id}`);
      
      return result;

    } catch (error: any) {
      console.error('❌ SUBMERCHANT CREATION ERROR:', error);
      throw error;
    }
  }

  /**
   * Generate submerchant widget URL for business onboarding
   * CRITICAL: This creates a BUSINESS WIDGET not a RECIPIENT WIDGET
   */
  generateSubmerchantWidgetUrl(options: {
    submerchantId: string;
    accessKey: string;
    secretKey: string;
    businessEmail: string;
  }): string {
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Submerchant widget parameters (different from recipient widget)
    const queryParams: Record<string, string> = {
      ts: timestamp.toString(),
      key: options.accessKey, // Use submerchant's own access key
      email: options.businessEmail,
      merchant_id: options.submerchantId,
      products: 'pay,tax,trust', // Full business verification modules
      hideEmail: 'false',
      roEmail: 'false',
      locale: 'en',
      type: 'business' // CRITICAL: Business type, not individual
    };

    // Create query string
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
      .replace(/\+/g, '%20');

    // Generate signature using submerchant's secret key
    const signature = crypto.createHmac('sha256', options.secretKey)
      .update(queryString)
      .digest('hex');

    // Return submerchant widget URL
    return `https://widget.trolley.com?${queryString}&sign=${signature}`;
  }

  private ensureClient() {
    if (!this.client) {
      throw new Error('Trolley SDK client not initialized - check API credentials');
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    this.ensureClient();
    
    try {
      // Test with recipient search (confirmed working method)
      const result = await this.client.recipient.search();
      return {
        success: true,
        message: `Connection successful. Found ${result.recipients?.length || 0} recipients. Total records: ${result.meta?.records || 0}.`
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

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

  async getRecipient(recipientId: string): Promise<TrolleyRecipient> {
    this.ensureClient();
    
    try {
      return await this.client.recipient.find(recipientId);
    } catch (error) {
      console.error('Error fetching Trolley recipient:', error);
      throw error;
    }
  }

  async createBatch(batchData: CreateBatchRequest): Promise<TrolleyBatch> {
    this.ensureClient();
    
    try {
      const batch = await this.client.batch.create(batchData);
      console.log(`Created Trolley batch: ${batch.id} with ${batchData.payments?.length || 0} payments`);
      
      return batch;
    } catch (error) {
      console.error('Error creating Trolley batch:', error);
      throw error;
    }
  }

  async getBatch(batchId: string): Promise<TrolleyBatch> {
    this.ensureClient();
    
    try {
      return await this.client.batch.find(batchId);
    } catch (error) {
      console.error('Error fetching Trolley batch:', error);
      throw error;
    }
  }

  async processBatch(batchId: string): Promise<void> {
    this.ensureClient();
    
    try {
      await this.client.batch.startProcessing(batchId);
      console.log(`Started processing batch: ${batchId}`);
    } catch (error) {
      console.error('Error processing Trolley batch:', error);
      throw error;
    }
  }

  async addPaymentToBatch(batchId: string, paymentData: CreatePaymentRequest): Promise<TrolleyPayment> {
    this.ensureClient();
    
    try {
      // Use batch.update to add payments to existing batch
      const updatedBatch = await this.client.batch.update(batchId, {
        payments: [paymentData]
      });
      
      console.log(`Added payment to batch ${batchId}`);
      
      // Return the first payment from the updated batch
      if (updatedBatch.payments && updatedBatch.payments.length > 0) {
        return updatedBatch.payments[0];
      }
      
      throw new Error('Payment was not added to batch');
    } catch (error) {
      console.error('Error adding payment to batch:', error);
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<TrolleyPayment> {
    this.ensureClient();
    
    try {
      return await this.client.payment.find(paymentId);
    } catch (error) {
      console.error('Error fetching Trolley payment:', error);
      throw error;
    }
  }

  async searchRecipients(query: { email?: string; page?: number; pageSize?: number }) {
    this.ensureClient();
    
    try {
      return await this.client.recipient.search(query);
    } catch (error) {
      console.error('Error searching Trolley recipients:', error);
      throw error;
    }
  }

  // Generate widget URL for contractor onboarding
  generateWidgetUrl(recipientEmail: string, recipientReferenceId?: string): string {
    const apiKey = process.env.TROLLEY_API_KEY;
    const apiSecret = process.env.TROLLEY_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      throw new Error('Trolley API credentials not configured');
    }

    // Generate Trolley widget URL
    const widgetBaseUrl = new URL('https://widget.trolley.com');
    
    const baseParams = {
      ts: Math.floor(new Date().getTime() / 1000).toString(),
      key: apiKey,
      email: recipientEmail,
      hideEmail: 'false',
      roEmail: 'false',
      locale: 'en',
      products: 'pay,tax',
      type: 'business'  // This function is only for business users creating widgets
    };

    // Only include refid for NEW recipients - per Trolley documentation
    // For existing recipients, omit refid to access existing account
    const queryParams = recipientReferenceId 
      ? new URLSearchParams({ ...baseParams, refid: recipientReferenceId })
      : new URLSearchParams(baseParams);

    const querystring = queryParams.toString().replace(/\+/g, '%20');
    
    // Create HMAC signature using built-in crypto
    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(querystring);
    const signature = hmac.digest('hex');
    
    // Build final URL with signature
    widgetBaseUrl.search = querystring + '&sign=' + signature;
    
    return widgetBaseUrl.toString();
  }

  // Generate widget URL specifically for existing recipients (no refid)
  generateWidgetUrlForExisting(recipientEmail: string): string {
    console.log(`Generating existing account widget URL for: ${recipientEmail}`);
    
    const apiKey = process.env.TROLLEY_API_KEY;
    const apiSecret = process.env.TROLLEY_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      throw new Error('Trolley API credentials not configured');
    }

    // Generate Trolley widget URL without refid for existing accounts
    const widgetBaseUrl = new URL('https://widget.trolley.com');
    
    const baseParams = {
      ts: Math.floor(new Date().getTime() / 1000).toString(),
      key: apiKey,
      email: recipientEmail,
      hideEmail: 'false',
      roEmail: 'false',
      locale: 'en',
      products: 'pay,tax',
      type: 'business'  // This function is only for existing business users
    };

    // Create query string WITHOUT refid (this is key for existing accounts)
    const queryParams = new URLSearchParams(baseParams);
    const querystring = queryParams.toString();
    
    // CRITICAL FIX: Trolley HMAC expects spaces not %20 encoding
    const hmacString = querystring.replace(/\+/g, ' ');
    console.log(`HMAC calculation string: ${hmacString}`);
    
    // Create HMAC signature - without refid for existing accounts
    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(hmacString);
    const signature = hmac.digest('hex');
    console.log(`Generated HMAC signature: ${signature}`);
    
    // Build final URL with signature
    widgetBaseUrl.search = querystring + '&sign=' + signature;
    
    const finalUrl = widgetBaseUrl.toString();
    console.log(`Generated existing account widget URL: ${finalUrl}`);
    
    return finalUrl;
  }
}

// Export singleton instance
export const trolleySdk = new TrolleySdkService();
export default trolleySdk;