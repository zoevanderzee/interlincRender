import { Request, Response } from 'express';

/**
 * Trolley Payment Service
 * Handles contractor payments through Trolley API
 */

const TROLLEY_API_BASE = 'https://api.trolley.com/v1';

interface TrolleyRecipient {
  id: string;
  email: string;
  name: string;
  type: 'individual' | 'business';
  country: string;
  status: string;
}

interface TrolleyPayment {
  id: string;
  recipient: string;
  amount: string;
  currency: string;
  description: string;
  externalId: string;
  status: string;
  createdAt: string;
}

interface TrolleyCompanyProfile {
  id: string;
  name: string;
  email: string;
  country: string;
  currency: string;
  status: string;
}

class TrolleyService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = process.env.TROLLEY_API_KEY || '';
    this.apiSecret = process.env.TROLLEY_API_SECRET || '';
    
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Trolley API credentials not configured');
    }
  }

  private getAuthHeaders() {
    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async createCompanyProfile(companyData: {
    name: string;
    email: string;
    country: string;
    currency: string;
  }): Promise<TrolleyCompanyProfile> {
    try {
      const response = await fetch(`${TROLLEY_API_BASE}/company-profiles`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          name: companyData.name,
          email: companyData.email,
          country: companyData.country,
          currency: companyData.currency,
          type: 'business'
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Trolley API error: ${response.status} - ${errorData}`);
      }

      const profile = await response.json();
      console.log(`Created Trolley company profile: ${profile.id} for ${companyData.name}`);
      
      return profile;
    } catch (error) {
      console.error('Error creating Trolley company profile:', error);
      throw error;
    }
  }

  async createRecipient(contractorData: {
    email: string;
    firstName: string;
    lastName: string;
    country?: string;
  }): Promise<TrolleyRecipient> {
    try {
      const response = await fetch(`${TROLLEY_API_BASE}/recipients`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          email: contractorData.email,
          name: `${contractorData.firstName} ${contractorData.lastName}`,
          type: 'individual',
          country: contractorData.country || 'GB',
          paymentMethods: []
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Trolley API error: ${response.status} - ${errorData}`);
      }

      const recipient = await response.json();
      console.log(`Created Trolley recipient: ${recipient.id} for ${contractorData.email}`);
      
      return recipient;
    } catch (error) {
      console.error('Error creating Trolley recipient:', error);
      throw error;
    }
  }

  async createPayment(paymentData: {
    recipientId: string;
    amount: string;
    currency: string;
    description: string;
    externalId: string;
  }): Promise<TrolleyPayment> {
    try {
      const response = await fetch(`${TROLLEY_API_BASE}/payments`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          recipient: paymentData.recipientId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          description: paymentData.description,
          externalId: paymentData.externalId
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Trolley payment API error: ${response.status} - ${errorData}`);
      }

      const payment = await response.json();
      console.log(`Created Trolley payment: ${payment.id} for ${paymentData.amount} ${paymentData.currency}`);
      
      return payment;
    } catch (error) {
      console.error('Error creating Trolley payment:', error);
      throw error;
    }
  }

  async getRecipient(recipientId: string): Promise<TrolleyRecipient> {
    try {
      const response = await fetch(`${TROLLEY_API_BASE}/recipients/${recipientId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
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

  async getPayment(paymentId: string): Promise<TrolleyPayment> {
    try {
      const response = await fetch(`${TROLLEY_API_BASE}/payments/${paymentId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
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
    try {
      const response = await fetch(`${TROLLEY_API_BASE}/payments?recipient=${recipientId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Trolley API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      return data.payments || [];
    } catch (error) {
      console.error('Error fetching Trolley payments:', error);
      throw error;
    }
  }
}

export const trolleyService = new TrolleyService();
export type { TrolleyRecipient, TrolleyPayment };