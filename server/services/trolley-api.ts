/**
 * Trolley Embedded Payouts Integration Service
 * Creativ Linc acts as the platform account with company sub-accounts
 * Companies fund their wallets and payments are processed through the platform
 */

interface TrolleyCompanyProfile {
  id?: string;
  name: string;
  email: string;
  type: 'business';
  walletBalance?: number;
  fundingSource?: {
    type: 'bank_account' | 'credit_card';
    id: string;
  };
}

interface TrolleyRecipient {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  type: 'individual' | 'business';
  address?: {
    street1: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };
  dateOfBirth?: string;
  currency?: string;
  companyProfileId?: string; // Links contractor to company sub-account
}

interface TrolleyPayment {
  recipient: TrolleyRecipient;
  sourceAmount: number;
  sourceCurrency: string;
  targetCurrency?: string;
  purpose: string;
  memo: string;
  compliance?: {
    category: string;
    subcategory: string;
  };
  metadata?: Record<string, any>;
}

interface TrolleyBatch {
  id?: string;
  status?: string;
  sourceCurrency: string;
  description: string;
  payments: TrolleyPayment[];
  totalAmount?: number;
  createdAt?: string;
}

export class TrolleyApiService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.TROLLEY_API_KEY || '';
    this.apiSecret = process.env.TROLLEY_API_SECRET || '';
    this.baseUrl = process.env.TROLLEY_API_URL || 'https://api.trolley.com/v1';
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'X-API-Version': '1'
    };
  }

  /**
   * Check if Trolley API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Create company profile for Embedded Payouts
   */
  async createCompanyProfile(companyData: TrolleyCompanyProfile): Promise<{ success: boolean; profileId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/embedded/company-profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Version': '1'
        },
        body: JSON.stringify(companyData)
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Trolley API error: ${error}` };
      }

      const result = await response.json();
      return { success: true, profileId: result.profile.id };

    } catch (error: any) {
      console.error('Trolley company profile creation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create or update a recipient in Trolley
   */
  async createRecipient(recipientData: TrolleyRecipient): Promise<{ success: boolean; recipientId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/recipients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Version': '1'
        },
        body: JSON.stringify(recipientData)
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Trolley API error: ${error}` };
      }

      const result = await response.json();
      return { success: true, recipientId: result.recipient.id };

    } catch (error: any) {
      console.error('Trolley recipient creation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fund company wallet from linked bank account
   */
  async fundCompanyWallet(profileId: string, amount: number): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/embedded/company-profiles/${profileId}/fund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Version': '1'
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'USD'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Trolley API error: ${error}` };
      }

      const result = await response.json();
      return { success: true, transactionId: result.transaction.id };

    } catch (error: any) {
      console.error('Trolley wallet funding error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a payment batch in Trolley
   */
  async createBatch(batchData: TrolleyBatch): Promise<{ success: boolean; batchId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/batches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Version': '1'
        },
        body: JSON.stringify(batchData)
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Trolley API error: ${error}` };
      }

      const result = await response.json();
      return { success: true, batchId: result.batch.id };

    } catch (error: any) {
      console.error('Trolley batch creation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get funding history for a company profile
   */
  async getFundingHistory(profileId: string): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new Error('Trolley API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embedded/company-profiles/${profileId}/transactions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Version': '1'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Trolley API error: ${error}`);
      }

      const result = await response.json();
      return result.transactions || [];

    } catch (error: any) {
      console.error('Trolley funding history error:', error);
      throw error;
    }
  }

  /**
   * Get company bank accounts from Trolley
   */
  async getCompanyBankAccounts(profileId: string): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new Error('Trolley API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embedded/company-profiles/${profileId}/bank-accounts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Version': '1'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Trolley API error: ${error}`);
      }

      const result = await response.json();
      return result.bankAccounts || [];

    } catch (error: any) {
      console.error('Trolley bank accounts error:', error);
      throw error;
    }
  }

  /**
   * Get company balance from Trolley
   */
  async getCompanyBalance(profileId: string): Promise<{ balance: number; currency: string }> {
    if (!this.isConfigured()) {
      throw new Error('Trolley API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embedded/company-profiles/${profileId}/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Version': '1'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Trolley API error: ${error}`);
      }

      const result = await response.json();
      return {
        balance: result.balance || 0,
        currency: result.currency || 'USD'
      };

    } catch (error: any) {
      console.error('Trolley balance error:', error);
      throw error;
    }
  }

  /**
   * Get batch status from Trolley
   */
  async getBatchStatus(batchId: string): Promise<{ success: boolean; status?: string; payments?: any[]; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/batches/${batchId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Version': '1'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Trolley API error: ${error}` };
      }

      const result = await response.json();
      return { 
        success: true, 
        status: result.batch.status,
        payments: result.batch.payments 
      };

    } catch (error: any) {
      console.error('Trolley batch status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get recipient information from Trolley
   */
  async getRecipient(recipientId: string): Promise<{ success: boolean; recipient?: any; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/recipients/${recipientId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Version': '1'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Trolley API error: ${error}` };
      }

      const result = await response.json();
      return { success: true, recipient: result.recipient };

    } catch (error: any) {
      console.error('Trolley recipient fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a payment to a recipient
   */
  async createPayment(paymentData: {
    recipientId: string;
    amount: string;
    currency: string;
    description: string;
    externalId: string;
  }): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      // First create a batch
      const batchResponse = await fetch(`${this.baseUrl}/batches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Version': '1'
        },
        body: JSON.stringify({
          description: paymentData.description,
          currency: paymentData.currency
        })
      });

      if (!batchResponse.ok) {
        const error = await batchResponse.text();
        return { success: false, error: `Trolley batch creation failed: ${error}` };
      }

      const batchResult = await batchResponse.json();
      const batchId = batchResult.batch.id;

      // Add payment to the batch
      const paymentResponse = await fetch(`${this.baseUrl}/batches/${batchId}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Version': '1'
        },
        body: JSON.stringify({
          recipient: { id: paymentData.recipientId },
          amount: paymentData.amount,
          currency: paymentData.currency,
          memo: paymentData.description,
          externalId: paymentData.externalId
        })
      });

      if (!paymentResponse.ok) {
        const error = await paymentResponse.text();
        return { success: false, error: `Trolley payment creation failed: ${error}` };
      }

      const paymentResult = await paymentResponse.json();

      // Send the batch to process the payment
      const sendResponse = await fetch(`${this.baseUrl}/batches/${batchId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Version': '1'
        }
      });

      if (!sendResponse.ok) {
        const error = await sendResponse.text();
        return { success: false, error: `Trolley batch send failed: ${error}` };
      }

      return { 
        success: true, 
        paymentId: paymentResult.payment.id 
      };

    } catch (error: any) {
      console.error('Trolley payment creation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment status from Trolley
   */
  async getPayment(paymentId: string): Promise<{ success: boolean; payment?: any; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Version': '1'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Trolley API error: ${error}` };
      }

      const result = await response.json();
      return { success: true, payment: result.payment };

    } catch (error: any) {
      console.error('Trolley payment fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start batch processing in Trolley
   */
  async startBatch(batchId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/batches/${batchId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Version': '1'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Trolley API error: ${error}` };
      }

      return { success: true };

    } catch (error: any) {
      console.error('Trolley batch start error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const trolleyApi = new TrolleyApiService();