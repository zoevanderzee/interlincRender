/**
 * Trolley API Service with Fixed Authentication
 * Uses Basic authentication with API key:secret
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
  companyProfileId?: string;
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
    };
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Fund company wallet from linked bank account - THIS IS THE CRITICAL FIX
   */
  async fundCompanyWallet(profileId: string, amount: number): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      console.log(`🔴 LIVE TROLLEY TRANSFER: Sending $${amount} to profileId ${profileId}`);
      
      const response = await fetch(`${this.baseUrl}/embedded/company-profiles/${profileId}/fund`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          amount: amount,
          currency: 'USD'
        })
      });

      console.log(`🔴 TROLLEY API RESPONSE: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ TROLLEY FUNDING FAILED: ${error}`);
        return { success: false, error: `Trolley API error: ${error}` };
      }

      const result = await response.json();
      console.log(`✅ LIVE MONEY TRANSFERRED: $${amount} - Transaction ID: ${result.transaction?.id}`);
      
      return { success: true, transactionId: result.transaction.id };

    } catch (error: any) {
      console.error('❌ TROLLEY FUNDING ERROR:', error);
      return { success: false, error: error.message };
    }
  }

  async createCompanyProfile(companyData: TrolleyCompanyProfile): Promise<{ success: boolean; profileId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/embedded/company-profiles`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
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

  async createRecipient(recipientData: TrolleyRecipient): Promise<{ success: boolean; recipientId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Trolley API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/recipients`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
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

  async getFundingHistory(profileId: string): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new Error('Trolley API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embedded/company-profiles/${profileId}/transactions`, {
        method: 'GET',
        headers: this.getAuthHeaders()
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

  async getCompanyBalance(profileId: string): Promise<{ balance: number; currency: string }> {
    if (!this.isConfigured()) {
      throw new Error('Trolley API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embedded/company-profiles/${profileId}/balance`, {
        method: 'GET',
        headers: this.getAuthHeaders()
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
}

export const trolleyApiFixed = new TrolleyApiService();