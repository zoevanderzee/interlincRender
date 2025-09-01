import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

// Plaid configuration
const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

// Initialize the Plaid client
const plaidClient = new PlaidApi(configuration);

class PlaidService {
  /**
   * Create a link token for initializing the Plaid Link process
   * @param userId - The user ID to associate with this link token
   */
  async createLinkToken(userId: number): Promise<string> {
    try {
      const request = {
        user: {
          client_user_id: userId.toString(),
        },
        client_name: 'Interlinc Platform',
        products: ['auth', 'transactions'] as Products[],
        language: 'en',
        country_codes: ['US'] as CountryCode[],
      };

      const response = await plaidClient.linkTokenCreate(request);
      return response.data.link_token;
    } catch (error) {
      console.error('Error creating Plaid link token:', error);
      throw error;
    }
  }

  /**
   * Exchange a public token for access token and item ID
   * @param publicToken - The public token from Plaid Link
   */
  async exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }> {
    try {
      const response = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      return {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
      };
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw error;
    }
  }

  /**
   * Get bank account information for ACH transfers
   * @param accessToken - The Plaid access token
   */
  async getBankAccountInfo(accessToken: string): Promise<any> {
    try {
      const response = await plaidClient.authGet({
        access_token: accessToken,
      });

      return response.data;
    } catch (error) {
      console.error('Error retrieving bank account info:', error);
      throw error;
    }
  }

  /**
   * Create a bank account token for Stripe from Plaid credentials
   * @param accessToken - The Plaid access token
   * @param accountId - The Plaid account ID
   */
  async createBankAccountToken(accessToken: string, accountId: string): Promise<string> {
    try {
      // Get bank account details from Plaid
      const accountInfo = await this.getBankAccountInfo(accessToken);
      const account = accountInfo.accounts.find((acc: any) => acc.account_id === accountId);
      
      if (!account) {
        throw new Error(`Account with ID ${accountId} not found`);
      }
      
      // Get bank account numbers from Plaid
      const numbersResponse = await plaidClient.processorTokenCreate({
        access_token: accessToken,
        account_id: accountId,
        processor: 'stripe' as any, // Type cast to handle the enum restriction
      });
      
      return numbersResponse.data.processor_token;
    } catch (error) {
      console.error('Error creating bank account token:', error);
      throw error;
    }
  }

  /**
   * Initiate an ACH transfer
   * @param accessToken - The Plaid access token
   * @param accountId - The Plaid account ID
   * @param amount - The amount to transfer
   * @param description - Description of the transfer
   * @param recipientConnectId - The contractor's Stripe Connect account ID
   */
  async initiateACHTransfer(
    accessToken: string,
    accountId: string,
    amount: number,
    description: string,
    recipientConnectId?: string
  ): Promise<any> {
    try {
      // Step 1: Create a processor token for Stripe
      const processorToken = await this.createBankAccountToken(accessToken, accountId);
      
      // Step 2: Create a payment method using the processor token
      // This would be implemented in the Stripe service
      // For demonstration, we're returning a simulated response
      // In a production environment, this would create a real ACH payment method
      // and initiate a transfer to the recipient
      
      if (recipientConnectId) {
        // If we have a Connect account ID, we'd create a real transfer here
        console.log(`Would create ACH transfer to Connect account ${recipientConnectId}`);
      }
      
      return {
        success: true,
        transferId: `ach_${Date.now()}`,
        status: 'pending',
        processorToken: processorToken
      };
    } catch (error) {
      console.error('Error initiating ACH transfer:', error);
      throw error;
    }
  }
}

export const plaidService = new PlaidService();