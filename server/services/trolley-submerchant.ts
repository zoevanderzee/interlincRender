import { trolleySdk } from '../trolley-sdk-service';

export interface TrolleySubmerchantData {
  merchant: {
    name: string;
    currency: string;
  };
  onboarding: {
    businessWebsite: string;
    businessLegalName: string;
    businessAsName: string;
    businessTaxId: string;
    businessCategory: string;
    businessCountry: string;
    businessCity: string;
    businessAddress: string;
    businessZip: string;
    businessRegion: string;
    businessTotalMonthly: string;
    businessPpm: string;
    businessIntlPercentage: string;
    expectedPayoutCountries: string;
  };
}

export interface TrolleySubmerchantResponse {
  success: boolean;
  submerchantId?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface TrolleyPaymentRequest {
  submerchantId: string;
  recipientId: string;
  amount: number;
  currency: string;
  memo?: string;
  reference?: string;
}

export interface TrolleyPaymentResponse {
  success: boolean;
  paymentId?: string;
  batchId?: string;
  status?: string;
  message?: string;
  error?: string;
}

class TrolleySubmerchantService {
  /**
   * Create a Trolley submerchant account for a business
   */
  async createSubmerchantAccount(data: TrolleySubmerchantData): Promise<TrolleySubmerchantResponse> {
    try {
      console.log('Creating live Trolley submerchant account with data:', {
        merchantName: data.merchant.name,
        currency: data.merchant.currency,
        businessName: data.onboarding.businessLegalName
      });

      // Create submerchant account using live Trolley SDK
      const result = await (trolleySdk as any).client.submerchant.create({
        name: data.merchant.name,
        currency: data.merchant.currency,
        onboarding: data.onboarding
      });

      console.log('Successfully created live Trolley submerchant:', result.id);
      
      return {
        success: true,
        submerchantId: result.id,
        status: result.status || 'created',
        message: 'Live Trolley submerchant account created successfully'
      };
    } catch (error) {
      console.error('Error creating live Trolley submerchant:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create submerchant account'
      };
    }
  }

  /**
   * Get submerchant account details
   */
  async getSubmerchantAccount(submerchantId: string): Promise<any> {
    try {
      console.log('Fetching live Trolley submerchant account:', submerchantId);
      
      const result = await (trolleySdk as any).client.submerchant.find(submerchantId);
      
      console.log('Successfully fetched live Trolley submerchant:', result.id);
      
      return result;
    } catch (error) {
      console.error('Error fetching live Trolley submerchant:', error);
      throw error;
    }
  }

  /**
   * Update submerchant account
   */
  async updateSubmerchantAccount(submerchantId: string, updateData: Partial<TrolleySubmerchantData>): Promise<TrolleySubmerchantResponse> {
    try {
      if (!trolleySdk || !(trolleySdk as any).client) {
        throw new Error('Trolley SDK not initialized');
      }

      const result = await (trolleySdk as any).client.submerchant.update(submerchantId, updateData);

      return {
        success: true,
        submerchantId: result.id,
        status: result.status,
        message: 'Submerchant account updated successfully'
      };
    } catch (error) {
      console.error('Error updating Trolley submerchant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update submerchant account'
      };
    }
  }

  /**
   * Create a payment from submerchant to recipient (contractor)
   */
  async createSubmerchantPayment(paymentData: TrolleyPaymentRequest): Promise<TrolleyPaymentResponse> {
    try {
      console.log('Creating live Trolley submerchant payment:', {
        submerchantId: paymentData.submerchantId,
        recipientId: paymentData.recipientId,
        amount: paymentData.amount,
        currency: paymentData.currency
      });

      // Create batch for the submerchant using live API
      const batch = await (trolleySdk as any).client.batch.create({
        sourceAccountId: paymentData.submerchantId,
        description: paymentData.memo || 'Milestone payment'
      });

      // Add payment to the batch
      const payment = await (trolleySdk as any).client.payment.create({
        batchId: batch.id,
        recipientId: paymentData.recipientId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        memo: paymentData.memo,
        reference: paymentData.reference
      });

      // Process the batch
      await (trolleySdk as any).client.batch.process(batch.id);

      console.log('Successfully created live Trolley payment:', payment.id);

      return {
        success: true,
        paymentId: payment.id,
        batchId: batch.id,
        status: 'processing',
        message: 'Live Trolley payment created and processing'
      };
    } catch (error) {
      console.error('Error creating live Trolley submerchant payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment'
      };
    }
  }

  /**
   * Get submerchant account balance
   */
  async getSubmerchantBalance(submerchantId: string): Promise<{ balance: number; currency: string } | null> {
    try {
      console.log('Fetching live Trolley submerchant balance for:', submerchantId);
      
      const account = await (trolleySdk as any).client.submerchant.find(submerchantId);
      
      const balance = {
        balance: account.balance || 0,
        currency: account.currency || 'USD'
      };
      
      console.log('Live Trolley balance retrieved:', balance);
      
      return balance;
    } catch (error) {
      console.error('Error fetching live Trolley submerchant balance:', error);
      return null;
    }
  }

  /**
   * Add funds to submerchant account (for pre-funded option)
   */
  async addFundsToSubmerchant(submerchantId: string, amount: number, currency: string = 'USD'): Promise<TrolleySubmerchantResponse> {
    try {
      if (!trolleySdk || !(trolleySdk as any).client) {
        throw new Error('Trolley SDK not initialized');
      }

      const result = await (trolleySdk as any).client.submerchant.addFunds(submerchantId, {
        amount,
        currency,
        description: 'Platform pre-funding'
      });

      return {
        success: true,
        submerchantId,
        message: `Successfully added ${amount} ${currency} to submerchant account`
      };
    } catch (error) {
      console.error('Error adding funds to Trolley submerchant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add funds to account'
      };
    }
  }

  /**
   * Check if business has sufficient budget for payment
   */
  checkBudgetAvailability(budgetCap: number, budgetUsed: number, paymentAmount: number): boolean {
    const availableBudget = budgetCap - budgetUsed;
    return availableBudget >= paymentAmount;
  }

  /**
   * Validate submerchant data before creation
   */
  validateSubmerchantData(data: TrolleySubmerchantData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate merchant data
    if (!data.merchant.name || data.merchant.name.trim().length === 0) {
      errors.push('Merchant name is required');
    }
    if (!data.merchant.currency || data.merchant.currency.length !== 3) {
      errors.push('Valid 3-letter currency code is required');
    }

    // Validate onboarding data
    const required = [
      'businessWebsite',
      'businessLegalName', 
      'businessAsName',
      'businessTaxId',
      'businessCategory',
      'businessCountry',
      'businessCity',
      'businessAddress',
      'businessRegion',
      'businessTotalMonthly',
      'businessPpm',
      'businessIntlPercentage',
      'expectedPayoutCountries'
    ];

    required.forEach(field => {
      if (!data.onboarding[field as keyof typeof data.onboarding] || 
          String(data.onboarding[field as keyof typeof data.onboarding]).trim().length === 0) {
        errors.push(`${field} is required`);
      }
    });

    // Validate country codes
    if (data.onboarding.businessCountry && data.onboarding.businessCountry.length !== 2) {
      errors.push('Business country must be 2-letter ISO code');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const trolleySubmerchantService = new TrolleySubmerchantService();
export default trolleySubmerchantService;