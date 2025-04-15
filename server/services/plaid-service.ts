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
        client_name: 'Creativ Linc Platform',
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
   * Initiate an ACH transfer
   * @param accessToken - The Plaid access token
   * @param accountId - The Plaid account ID
   * @param amount - The amount to transfer
   * @param description - Description of the transfer
   */
  async initiateACHTransfer(
    accessToken: string,
    accountId: string,
    amount: number,
    description: string
  ): Promise<any> {
    try {
      // This would integrate with your Stripe ACH transfer logic
      // For now, just return success to simulate the flow
      return {
        success: true,
        transferId: `ach_${Date.now()}`,
        status: 'pending',
      };
    } catch (error) {
      console.error('Error initiating ACH transfer:', error);
      throw error;
    }
  }
}

export const plaidService = new PlaidService();