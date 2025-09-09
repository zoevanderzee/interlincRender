import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16', // Using latest stable version
});

export interface CreateConnectedAccountParams {
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  country?: string;
}

export interface ConnectedAccountResponse {
  accountId: string;
  onboardingUrl?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export interface CreateProductParams {
  name: string;
  description?: string;
  priceInCents: number;
  currency: string;
}

/**
 * Creates a new Stripe Connected Account using controller properties
 * This gives the connected account full access to Stripe dashboard while
 * maintaining platform control over fees and risk management
 */
export async function createConnectedAccount(params: CreateConnectedAccountParams): Promise<ConnectedAccountResponse> {
  try {
    // Validate required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    // Determine business type: company if businessName provided, individual otherwise
    const businessType = params.businessName ? 'company' : 'individual';

    // Prepare account data based on business type
    const accountData: any = {
      controller: {
        // Platform controls fee collection - connected account pays fees
        fees: {
          payer: 'account' as const
        },
        // Stripe handles payment disputes and losses
        losses: {
          payments: 'stripe' as const
        },
        // Connected account gets full access to Stripe dashboard
        stripe_dashboard: {
          type: 'full' as const
        }
      },
      business_type: businessType,
      country: params.country || 'US',
      email: params.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        payment_methods: { requested: true },
      }
    };

    // Add business-specific parameters for company accounts
    if (businessType === 'company' && params.businessName) {
      accountData.business_profile = {
        name: params.businessName,
      };
      accountData.company = {
        name: params.businessName,
      };
    }

    // Add individual-specific parameters for individual accounts
    if (businessType === 'individual' && params.firstName && params.lastName) {
      accountData.individual = {
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
      };
    }

    // Create connected account
    const account = await stripe.accounts.create(accountData);

    console.log(`Created Stripe Connected Account: ${account.id}`);

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  } catch (error) {
    console.error('Error creating connected account:', error);
    throw error;
  }
}

/**
 * Creates an Account Link for onboarding a connected account
 * This redirects users to Stripe's hosted onboarding flow
 */
export async function createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  } catch (error) {
    console.error('Error creating account link:', error);
    throw error;
  }
}

/**
 * Creates an Account Session for embedded onboarding
 * This allows embedding Stripe's onboarding components directly in your app
 */
export async function createAccountSession(accountId: string): Promise<{ client_secret: string }> {
  try {
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: {
          enabled: true,
        },
        notification_banner: {
          enabled: true,
        },
      },
    });

    return {
      client_secret: accountSession.client_secret,
    };
  } catch (error) {
    console.error('Error creating account session:', error);
    throw error;
  }
}

/**
 * Retrieves the current status of a connected account
 * Use this to check onboarding completion and capabilities
 */
export async function getAccountStatus(accountId: string): Promise<ConnectedAccountResponse> {
  try {
    const account = await stripe.accounts.retrieve(accountId);

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  } catch (error) {
    console.error('Error retrieving account status:', error);
    throw error;
  }
}

/**
 * Creates a product on behalf of a connected account
 * Uses the Stripe-Account header to create products on the connected account
 */
export async function createProduct(accountId: string, params: CreateProductParams): Promise<Stripe.Product> {
  try {
    const product = await stripe.products.create({
      name: params.name,
      description: params.description,
      default_price_data: {
        unit_amount: params.priceInCents,
        currency: params.currency,
      },
    }, {
      stripeAccount: accountId, // This sets the Stripe-Account header
    });

    console.log(`Created product ${product.id} for account ${accountId}`);
    return product;
  } catch (error) {
    console.error('Error creating product for connected account:', error);
    throw error;
  }
}

/**
 * Lists products for a connected account
 * Uses the Stripe-Account header to retrieve products from the connected account
 */
export async function listProducts(accountId: string): Promise<Stripe.Product[]> {
  try {
    const products = await stripe.products.list({
      limit: 100,
      active: true,
    }, {
      stripeAccount: accountId, // This sets the Stripe-Account header
    });

    return products.data;
  } catch (error) {
    console.error('Error listing products for connected account:', error);
    throw error;
  }
}

/**
 * Creates a Checkout Session for a direct charge with application fee
 * This processes payments directly to the connected account with platform monetization
 */
export async function createCheckoutSession(
  accountId: string,
  priceId: string,
  quantity: number,
  applicationFeeAmount: number,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      payment_intent_data: {
        // Application fee for platform monetization
        application_fee_amount: applicationFeeAmount,
      },
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    }, {
      stripeAccount: accountId, // This sets the Stripe-Account header for direct charge
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session for connected account:', error);
    throw error;
  }
}

/**
 * Retrieves a specific product from a connected account
 */
export async function getProduct(accountId: string, productId: string): Promise<Stripe.Product> {
  try {
    const product = await stripe.products.retrieve(productId, {
      stripeAccount: accountId,
    });

    return product;
  } catch (error) {
    console.error('Error retrieving product for connected account:', error);
    throw error;
  }
}

/**
 * Updates the Stripe Connect account ID for a user in our database
 * This should be called after successfully creating a connected account
 */
export async function linkConnectedAccountToUser(userId: number, accountId: string): Promise<void> {
  // This would typically update your user database
  // Implementation depends on your storage layer
  console.log(`Linking connected account ${accountId} to user ${userId}`);
}

export default {
  createConnectedAccount,
  createAccountLink,
  createAccountSession,
  getAccountStatus,
  createProduct,
  listProducts,
  createCheckoutSession,
  getProduct,
  linkConnectedAccountToUser,
};