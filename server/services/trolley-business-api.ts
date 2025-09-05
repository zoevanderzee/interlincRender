/**
 * Trolley Business API Service - Correct Implementation for Verified Business Accounts
 * Uses proper business account endpoints with correct authentication
 */

export class TrolleyBusinessApiService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.TROLLEY_API_KEY || '';
    this.apiSecret = process.env.TROLLEY_API_SECRET || '';
    this.baseUrl = 'https://api.trolley.com/v1';
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get recipient balance - correct endpoint for business recipients
   */
  async getRecipientBalance(recipientId: string): Promise<{ balance: number; currency: string }> {
    try {
      console.log(`🔴 FETCHING BALANCE for recipient: ${recipientId}`);
      
      const response = await fetch(`${this.baseUrl}/recipients/${recipientId}/accounts`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.text();
        console.error(`Trolley API error: ${error}`);
        throw new Error(`Trolley API error: ${error}`);
      }

      const result = await response.json();
      console.log('Trolley balance response:', result);
      
      // Extract balance from accounts
      const accounts = result.accounts || [];
      const primaryAccount = accounts.find((acc: any) => acc.primary) || accounts[0];
      
      return {
        balance: primaryAccount?.balance || 0,
        currency: primaryAccount?.currency || 'USD'
      };

    } catch (error: any) {
      console.error('Trolley balance fetch error:', error);
      throw error;
    }
  }

  /**
   * Get recipient details including payment methods
   */
  async getRecipientDetails(recipientId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/recipients/${recipientId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Trolley API error: ${error}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error('Trolley recipient fetch error:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for recipient
   */
  async getRecipientTransactions(recipientId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recipients/${recipientId}/logs`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Trolley API error: ${error}`);
      }

      const result = await response.json();
      return result.logs || [];

    } catch (error: any) {
      console.error('Trolley transaction history error:', error);
      return [];
    }
  }
}

export const trolleyBusinessApi = new TrolleyBusinessApiService();