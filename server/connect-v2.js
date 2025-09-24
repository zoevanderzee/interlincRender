
import express from "express";
import Stripe from "stripe";
import { storage } from "./storage.js";
import { createPaymentIntent, createSecurePaymentV2 } from "./services/stripe.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// --- V2 Direct API Implementation ----------------------------------------------------
function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function getUserId(req) {
  const headerId = req.headers["x-user-id"];
  const userId = req.user?.id ?? (headerId ? parseInt(headerId) : null);
  if (!userId) throw httpError(401, "Auth required");
  return userId;
}

function assertKeyModesMatch(publishableKey) {
  if (!publishableKey) return;
  const pkMode = publishableKey.startsWith("pk_live_") ? "live"
               : publishableKey.startsWith("pk_test_") ? "test" : "unknown";
  const sk = process.env.STRIPE_SECRET_KEY || "";
  const skMode = sk.startsWith("sk_live_") ? "live"
               : sk.startsWith("sk_test_") ? "test" : "unknown";
  if (pkMode !== skMode) throw httpError(400, `Key mode mismatch (client=${pkMode}, server=${skMode})`);
}

const db = {
  async getConnect(userId) {
    return await storage.getConnectForUser(userId);
  },
  async setConnect(userId, data) {
    return await storage.setConnectForUser(userId, data);
  },
  async getUser(userId) {
    return await storage.getUser(userId);
  },
};

export default function connectV2Routes(app, apiPath, authMiddleware) {
  const connectBasePath = `${apiPath}/connect/v2`;

  // Block any V1 transfer attempts and redirect to V2
  app.all(`${apiPath}/v1/transfers*`, (req, res) => {
    console.error(`❌ BLOCKED V1 TRANSFER ATTEMPT: ${req.method} ${req.path}`);
    res.status(410).json({ 
      error: 'V1 transfers are completely disabled. Use V2 destination charges with Standard accounts.',
      v2_endpoint: `${connectBasePath}/create-transfer`,
      migration_info: 'V2 uses destination charges - funds go directly to connected Standard accounts without platform balance',
      correct_flow: 'Business pays → Stripe routes directly to contractor → No platform fund handling'
    });
  });

  // Also block any attempts to use Stripe transfers API directly
  app.all(`${apiPath}/stripe/transfers*`, (req, res) => {
    console.error(`❌ BLOCKED DIRECT STRIPE TRANSFER ATTEMPT: ${req.method} ${req.path}`);
    res.status(410).json({ 
      error: 'Direct Stripe transfers not supported with Standard accounts. Use destination charges.',
      correct_approach: 'Payment Intents with transfer_data for Standard Connect accounts'
    });
  });

  /**
   * GET /api/connect/v2/status
   * Enhanced status with real-time capability checking
   */
  app.get(`${connectBasePath}/status`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await db.getConnect(userId);

      // Comprehensive country to currency mapping
      const countryToCurrency = {
        'US': 'usd', 'USA': 'usd',
        'GB': 'gbp', 'UK': 'gbp', 'United Kingdom': 'gbp',
        'CA': 'cad', 'Canada': 'cad',
        'AU': 'aud', 'Australia': 'aud',
        'NZ': 'nzd', 'New Zealand': 'nzd',
        // European Union countries
        'AT': 'eur', 'BE': 'eur', 'CY': 'eur', 'EE': 'eur', 'FI': 'eur', 'FR': 'eur',
        'DE': 'eur', 'GR': 'eur', 'IE': 'eur', 'IT': 'eur', 'LV': 'eur', 'LT': 'eur',
        'LU': 'eur', 'MT': 'eur', 'NL': 'eur', 'PT': 'eur', 'SK': 'eur', 'SI': 'eur',
        'ES': 'eur', 'European Union': 'eur', 'Europe': 'eur',
        // Other major currencies
        'CH': 'chf', 'Switzerland': 'chf',
        'JP': 'jpy', 'Japan': 'jpy',
        'KR': 'krw', 'South Korea': 'krw',
        'SG': 'sgd', 'Singapore': 'sgd',
        'HK': 'hkd', 'Hong Kong': 'hkd',
        'SE': 'sek', 'Sweden': 'sek',
        'NO': 'nok', 'Norway': 'nok',
        'DK': 'dkk', 'Denmark': 'dkk',
        'PL': 'pln', 'Poland': 'pln',
        'CZ': 'czk', 'Czech Republic': 'czk',
        'HU': 'huf', 'Hungary': 'huf',
        'IN': 'inr', 'India': 'inr',
        'BR': 'brl', 'Brazil': 'brl',
        'MX': 'mxn', 'Mexico': 'mxn'
      };

      // Function to determine currency from country code
      const getCurrencyFromCountry = (countryCode) => {
        if (!countryCode) return 'usd';
        
        // Try exact match first
        const exactMatch = countryToCurrency[countryCode];
        if (exactMatch) return exactMatch;
        
        // Try case-insensitive match
        const lowerCaseMatch = Object.keys(countryToCurrency).find(
          key => key.toLowerCase() === countryCode.toLowerCase()
        );
        if (lowerCaseMatch) return countryToCurrency[lowerCaseMatch];
        
        // Default fallback
        return 'usd';
      };

      if (!existing?.accountId) {
        return res.json({ 
          hasAccount: false, 
          needsOnboarding: true,
          version: 'v2',
          country: 'GB', // Default country
          defaultCurrency: 'gbp', // Default currency
          capabilities: {
            direct_api_integration: true,
            real_time_status: true,
            full_account_management: true
          }
        });
      }

      // Get real-time account status from Stripe
      const account = await stripe.accounts.retrieve(existing.accountId);
      const requirements = account.requirements || {};

      // BULLETPROOF CURRENCY LOGIC: Get the most reliable country/currency data
      let accountCountry = null;
      let accountCurrency = null;

      // Priority 1: Stripe account's actual country (most reliable)
      if (account.country) {
        accountCountry = account.country;
        console.log(`[Currency Logic] Using Stripe account country: ${accountCountry}`);
      }

      // Priority 2: Stripe account's default currency (most reliable)
      if (account.default_currency) {
        accountCurrency = account.default_currency;
        console.log(`[Currency Logic] Using Stripe account currency: ${accountCurrency}`);
      }

      // Priority 3: Fallback to stored data
      if (!accountCountry && existing.country) {
        accountCountry = existing.country;
        console.log(`[Currency Logic] Using stored country: ${accountCountry}`);
      }

      // Priority 4: Derive currency from country if we don't have it directly
      if (!accountCurrency && accountCountry) {
        accountCurrency = getCurrencyFromCountry(accountCountry);
        console.log(`[Currency Logic] Derived currency from country ${accountCountry}: ${accountCurrency}`);
      }

      // Final fallbacks
      if (!accountCountry) {
        accountCountry = 'GB';
        console.log(`[Currency Logic] Using default country: ${accountCountry}`);
      }
      if (!accountCurrency) {
        accountCurrency = 'gbp';
        console.log(`[Currency Logic] Using default currency: ${accountCurrency}`);
      }

      console.log(`[Currency Logic FINAL] Country: ${accountCountry}, Currency: ${accountCurrency}`);

      // Check if capabilities need to be requested
      const capabilities = account.capabilities || {};
      const needsCapabilityUpdate = !capabilities.card_payments || !capabilities.transfers;

      if (needsCapabilityUpdate) {
        try {
          console.log(`[Connect V2] Updating capabilities for account ${existing.accountId}`);
          await stripe.accounts.update(existing.accountId, {
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true }
            }
          });
          // Retrieve updated account
          const updatedAccount = await stripe.accounts.retrieve(existing.accountId);
          console.log(`[Connect V2] Capabilities updated:`, updatedAccount.capabilities);
        } catch (capError) {
          console.error('[Connect V2] Error updating capabilities:', capError);
        }
      }
      
      // Check individual capability statuses after update
      const updatedAccount = await stripe.accounts.retrieve(existing.accountId);
      const currentCapabilities = updatedAccount.capabilities || {};
      // Filter capabilities to only show requested/active ones (exclude not_requested)
      const allCapabilities = {
        card_payments: currentCapabilities.card_payments,
        transfers: currentCapabilities.transfers,
        us_bank_account_ach_payments: currentCapabilities.us_bank_account_ach_payments,
        sepa_debit_payments: currentCapabilities.sepa_debit_payments,
        instant_payouts: currentCapabilities.instant_payouts
      };
      
      const capabilityStatuses = {};
      Object.entries(allCapabilities).forEach(([key, value]) => {
        if (value && value !== 'not_requested') {
          capabilityStatuses[key] = value;
        }
      });

      // Determine if account is fully operational based on real Stripe data
      const isFullyVerified = updatedAccount.charges_enabled && 
                             updatedAccount.details_submitted && 
                             updatedAccount.payouts_enabled &&
                             !requirements.disabled_reason &&
                             (requirements.currently_due || []).length === 0 &&
                             (requirements.past_due || []).length === 0;

      const hasRequirements = (requirements.currently_due || []).length > 0 ||
                             (requirements.past_due || []).length > 0 ||
                             !!requirements.disabled_reason;

      console.log(`[Connect V2 Status] Account ${updatedAccount.id}:`, {
        charges_enabled: updatedAccount.charges_enabled,
        details_submitted: updatedAccount.details_submitted,
        payouts_enabled: updatedAccount.payouts_enabled,
        capabilities: capabilityStatuses,
        hasRequirements,
        isFullyVerified,
        country: accountCountry,
        currency: accountCurrency
      });

      // Update our database with current status from Stripe INCLUDING currency data
      await db.setConnect(userId, {
        ...existing,
        country: accountCountry, // Store the determined country
        defaultCurrency: accountCurrency, // Store the determined currency
        detailsSubmitted: updatedAccount.details_submitted,
        chargesEnabled: updatedAccount.charges_enabled,
        payoutsEnabled: updatedAccount.payouts_enabled,
        isFullyVerified,
        lastStatusCheck: new Date().toISOString(),
        version: 'v2',
        stripeAccountData: {
          type: updatedAccount.type,
          business_type: updatedAccount.business_type,
          created: updatedAccount.created,
          requirements: requirements,
          capabilities: currentCapabilities,
          default_currency: updatedAccount.default_currency,
          country: updatedAccount.country
        }
      });

      const v2Status = {
        hasAccount: true,
        accountId: updatedAccount.id,
        accountType: updatedAccount.type,
        country: accountCountry, // Use bulletproof country
        defaultCurrency: accountCurrency, // Use bulletproof currency
        needsOnboarding: !isFullyVerified || hasRequirements,
        detailsSubmitted: updatedAccount.details_submitted,
        chargesEnabled: updatedAccount.charges_enabled,
        payoutsEnabled: updatedAccount.payouts_enabled,
        isFullyVerified,
        version: 'v2',
        
        verification_status: {
          details_submitted: updatedAccount.details_submitted,
          charges_enabled: updatedAccount.charges_enabled,
          payouts_enabled: updatedAccount.payouts_enabled,
          verification_complete: isFullyVerified
        },
        
        requirements: {
          currently_due: requirements.currently_due || [],
          past_due: requirements.past_due || [],
          pending_verification: requirements.pending_verification || [],
          disabled_reason: requirements.disabled_reason || null,
          is_complete: !hasRequirements
        },
        
        capabilities: capabilityStatuses,
        
        payment_methods: {
          card: capabilityStatuses.card_payments === 'active',
          ach: capabilityStatuses.us_bank_account_ach_payments === 'active',
          international: capabilityStatuses.sepa_debit_payments === 'active',
          instant_payouts: capabilityStatuses.instant_payouts === 'active'
        },

        business_profile: updatedAccount.business_profile ? {
          name: updatedAccount.business_profile.name,
          support_email: updatedAccount.business_profile.support_email,
          support_phone: updatedAccount.business_profile.support_phone,
          url: updatedAccount.business_profile.url
        } : null
      };

      res.json(v2Status);
    } catch (e) {
      console.error("[connect-v2-status]", e);
      res.status(e.status || 500).json({ error: e.message || "Unknown error" });
    }
  });

  /**
   * POST /api/connect/v2/create-account
   * Direct account creation via API - no embedded components
   */
  app.post(`${connectBasePath}/create-account`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { country = "GB", business_type = "individual" } = req.body || {};

      // Validate country and determine currency
      const countryToCurrency = {
        'US': 'usd',
        'GB': 'gbp', 
        'CA': 'cad',
        'AU': 'aud',
        'DE': 'eur',
        'FR': 'eur',
        'IT': 'eur',
        'ES': 'eur',
        'NL': 'eur',
        'BE': 'eur',
        'JP': 'jpy',
        'SG': 'sgd',
        'HK': 'hkd'
      };

      const defaultCurrency = countryToCurrency[country] || 'usd';
      
      console.log(`Creating V2 Connect account for user ${userId} in country ${country} with currency ${defaultCurrency}`);

      const existing = await db.getConnect(userId);
      if (existing?.accountId) {
        return res.status(409).json({ error: "Account already exists" });
      }

      const user = await db.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create account with enhanced V2 capabilities
      const accountConfig = {
        type: 'express',
        country,
        email: user.email,
        business_type,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        metadata: {
          userId: userId.toString(),
          role: user.role || 'business',
          version: 'v2',
          country: country,
          default_currency: defaultCurrency,
          created_at: new Date().toISOString()
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily'
            }
          }
        }
      };

      if (business_type === 'individual') {
        accountConfig.individual = {
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email
        };
      } else {
        accountConfig.company = {
          name: user.companyName || `${user.firstName} ${user.lastName}`
        };
      }

      const account = await stripe.accounts.create(accountConfig);

      // Store account info
      await db.setConnect(userId, { 
        accountId: account.id, 
        accountType: account.type,
        country: country,
        defaultCurrency: defaultCurrency,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        version: 'v2',
        createdAt: new Date().toISOString()
      });

      res.json({
        success: true,
        accountId: account.id,
        country: country,
        defaultCurrency: defaultCurrency,
        version: 'v2',
        needsOnboarding: true,
        capabilities: account.capabilities
      });

    } catch (e) {
      console.error("[connect-v2-create-account]", e);
      res.status(e.status || 500).json({ error: e.message || "Account creation failed" });
    }
  });

  /**
   * POST /api/connect/v2/submit-onboarding
   * Direct onboarding data submission - no embedded forms
   */
  app.post(`${connectBasePath}/submit-onboarding`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const onboardingData = req.body;

      const existing = await db.getConnect(userId);
      if (!existing?.accountId) {
        return res.status(404).json({ error: "No Connect account found" });
      }

      console.log('Submitting onboarding data for account:', existing.accountId);

      // Prepare update data based on business type
      const updateData = {
        business_type: onboardingData.business_type || 'individual',
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: req.ip || '127.0.0.1'
        }
      };

      if (onboardingData.business_type === 'company') {
        updateData.company = {
          name: onboardingData.company_name,
          phone: onboardingData.phone,
          tax_id: onboardingData.tax_id,
          address: {
            line1: onboardingData.address_line1,
            city: onboardingData.address_city,
            postal_code: onboardingData.address_postal_code,
            country: onboardingData.address_country || 'GB'
          }
        };
      } else {
        updateData.individual = {
          first_name: onboardingData.first_name,
          last_name: onboardingData.last_name,
          email: onboardingData.email,
          phone: onboardingData.phone,
          address: {
            line1: onboardingData.address_line1,
            city: onboardingData.address_city,
            postal_code: onboardingData.address_postal_code,
            country: onboardingData.address_country || 'GB'
          },
          dob: onboardingData.dob ? {
            day: onboardingData.dob.day,
            month: onboardingData.dob.month,
            year: onboardingData.dob.year
          } : undefined
        };
      }

      // Add business profile
      if (onboardingData.business_profile) {
        updateData.business_profile = {
          name: onboardingData.business_profile.name,
          support_email: onboardingData.business_profile.support_email,
          support_phone: onboardingData.business_profile.support_phone,
          url: onboardingData.business_profile.url
        };
      }

      // Update account with onboarding data
      const account = await stripe.accounts.update(existing.accountId, updateData);

      // Update our database
      await db.setConnect(userId, {
        ...existing,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        lastUpdated: new Date().toISOString()
      });

      res.json({
        success: true,
        accountId: account.id,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements || {},
        capabilities: account.capabilities || {}
      });

    } catch (e) {
      console.error("[connect-v2-submit-onboarding]", e);
      res.status(e.status || 500).json({ error: e.message || "Onboarding submission failed" });
    }
  });

  /**
   * POST /api/connect/v2/add-bank-account
   * Update account with bank account information (for Express accounts)
   */
  app.post(`${connectBasePath}/add-bank-account`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { routing_number, account_number, account_holder_type = 'individual' } = req.body;

      if (!routing_number || !account_number) {
        return res.status(400).json({ error: "Routing number and account number are required" });
      }

      const existing = await db.getConnect(userId);
      if (!existing?.accountId) {
        return res.status(404).json({ error: "No Connect account found" });
      }

      // For Express accounts, we update the account with bank account info
      // rather than using createExternalAccount which requires special permissions
      const updateData = {
        external_account: {
          object: 'bank_account',
          country: 'US',
          currency: 'usd',
          routing_number,
          account_number,
          account_holder_type
        }
      };

      // Update the account with bank account information
      const account = await stripe.accounts.update(existing.accountId, updateData);

      // For security, we don't return the full account number
      const last4 = account_number.slice(-4);

      res.json({
        success: true,
        message: "Bank account information updated successfully",
        last4: last4,
        routing_number: routing_number.slice(0, 4) + 'XXXXX', // Partially mask routing number
        account_holder_type
      });

    } catch (e) {
      console.error("[connect-v2-add-bank-account]", e);
      
      // Handle specific Stripe permission errors
      if (e.type === 'StripePermissionError' || e.code === 'oauth_not_supported') {
        return res.status(400).json({ 
          error: "Bank account setup must be completed through the onboarding process. Please complete account setup first." 
        });
      }
      
      res.status(e.status || 500).json({ error: e.message || "Bank account setup failed" });
    }
  });

  /**
   * POST /api/connect/v2/request-capabilities
   * Request additional payment capabilities
   */
  app.post(`${connectBasePath}/request-capabilities`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { capabilities } = req.body;

      const existing = await db.getConnect(userId);
      if (!existing?.accountId) {
        return res.status(404).json({ error: "No Connect account found" });
      }

      // Update account capabilities
      const updateData = { capabilities: {} };
      
      capabilities.forEach(capability => {
        updateData.capabilities[capability] = { requested: true };
      });

      const account = await stripe.accounts.update(existing.accountId, updateData);

      res.json({
        success: true,
        capabilities: account.capabilities,
        requirements: account.requirements
      });

    } catch (e) {
      console.error("[connect-v2-request-capabilities]", e);
      res.status(e.status || 500).json({ error: e.message || "Capability request failed" });
    }
  });

  /**
   * POST /api/connect/v2/create-transfer
   * BULLETPROOF V2 Connect: Secure payment using contractor ID only (NEVER account ID from client)
   * Stripe API is the ONLY source of truth for account resolution
   */
  app.post(`${connectBasePath}/create-transfer`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { contractorUserId, amount, description, metadata = {} } = req.body;
      
      // SECURITY: Reject any client-provided account ID
      if (req.body.destination || req.body.accountId || req.body.stripeAccountId) {
        console.error('[SECURITY VIOLATION] Client attempted to provide account ID:', {
          destination: req.body.destination,
          accountId: req.body.accountId,
          stripeAccountId: req.body.stripeAccountId,
          userId,
          ip: req.ip
        });
        return res.status(400).json({ 
          error: 'Security violation: Account IDs cannot be provided by client. Only contractor ID accepted.' 
        });
      }
      
      // Validate required fields
      if (!contractorUserId) {
        return res.status(400).json({ error: "Contractor user ID is required" });
      }
      
      console.log(`[SECURE PAYMENT] Business ${userId} creating payment to contractor ${contractorUserId}`);

      // Get business's Connect account for currency determination
      const businessConnect = await db.getConnect(userId);
      
      // BULLETPROOF CURRENCY DETERMINATION
      let determinedCurrency = 'gbp'; // Default fallback
      
      // Priority 1: Request body currency (if provided and valid)
      if (req.body.currency && req.body.currency.trim() !== '') {
        determinedCurrency = req.body.currency.toLowerCase();
        console.log(`[V2 Payment] Using provided currency: ${determinedCurrency}`);
      }
      // Priority 2: Business account's stored default currency
      else if (businessConnect?.defaultCurrency) {
        determinedCurrency = businessConnect.defaultCurrency;
        console.log(`[V2 Payment] Using business default currency: ${determinedCurrency}`);
      }
      // Priority 3: Get fresh business account data from Stripe
      else if (businessConnect?.accountId) {
        try {
          const account = await stripe.accounts.retrieve(businessConnect.accountId);
          if (account.default_currency) {
            determinedCurrency = account.default_currency;
            console.log(`[V2 Payment] Using business Stripe currency: ${determinedCurrency}`);
          } else if (account.country) {
            const countryToCurrency = {
              'US': 'usd', 'USA': 'usd',
              'GB': 'gbp', 'UK': 'gbp', 'United Kingdom': 'gbp',
              'CA': 'cad', 'Canada': 'cad',
              'AU': 'aud', 'Australia': 'aud',
              'NZ': 'nzd', 'New Zealand': 'nzd',
              'AT': 'eur', 'BE': 'eur', 'CY': 'eur', 'EE': 'eur', 'FI': 'eur', 'FR': 'eur',
              'DE': 'eur', 'GR': 'eur', 'IE': 'eur', 'IT': 'eur', 'LV': 'eur', 'LT': 'eur',
              'LU': 'eur', 'MT': 'eur', 'NL': 'eur', 'PT': 'eur', 'SK': 'eur', 'SI': 'eur',
              'ES': 'eur', 'European Union': 'eur', 'Europe': 'eur',
              'CH': 'chf', 'Switzerland': 'chf',
              'JP': 'jpy', 'Japan': 'jpy',
              'KR': 'krw', 'South Korea': 'krw',
              'SG': 'sgd', 'Singapore': 'sgd',
              'HK': 'hkd', 'Hong Kong': 'hkd',
              'SE': 'sek', 'Sweden': 'sek',
              'NO': 'nok', 'Norway': 'nok',
              'DK': 'dkk', 'Denmark': 'dkk',
              'PL': 'pln', 'Poland': 'pln',
              'CZ': 'czk', 'Czech Republic': 'czk',
              'HU': 'huf', 'Hungary': 'huf',
              'IN': 'inr', 'India': 'inr',
              'BR': 'brl', 'Brazil': 'brl',
              'MX': 'mxn', 'Mexico': 'mxn'
            };
            determinedCurrency = countryToCurrency[account.country] || 'gbp';
            console.log(`[V2 Payment] Derived from business country ${account.country}: ${determinedCurrency}`);
          }
        } catch (stripeError) {
          console.error('[V2 Payment] Error getting business account:', stripeError);
        }
      }
      
      console.log(`[V2 Payment] FINAL CURRENCY: ${determinedCurrency}`);
      const currency = determinedCurrency;

      // Validate required fields (contractor ID validation happens in createSecurePaymentV2)
      // Note: destination is now resolved securely server-side via Stripe API

      if (!amount && amount !== 0) {
        return res.status(400).json({ error: "Amount is required" });
      }
      
      const parsedAmount = parseFloat(amount);
      console.log(`[V2 Payment] Parsed amount:`, { original: amount, parsed: parsedAmount, isNaN: isNaN(parsedAmount) });
      
      if (isNaN(parsedAmount)) {
        return res.status(400).json({ error: "Amount must be a valid number" });
      }
      
      if (parsedAmount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than 0" });
      }
      
      // Country-specific minimum amounts
      const minimumAmounts = {
        'usd': 0.50,
        'gbp': 0.30,
        'eur': 0.50,
        'cad': 0.50,
        'aud': 0.50,
        'jpy': 50,
        'sgd': 0.50,
        'hkd': 4.00
      };

      const minAmount = minimumAmounts[currency] || 0.50;
      if (parsedAmount < minAmount) {
        const currencySymbols = {
          'usd': '$',
          'gbp': '£',
          'eur': '€',
          'cad': 'C$',
          'aud': 'A$',
          'jpy': '¥',
          'sgd': 'S$',
          'hkd': 'HK$'
        };
        const symbol = currencySymbols[currency] || '';
        return res.status(400).json({ 
          error: `Minimum payment amount is ${symbol}${minAmount} ${currency.toUpperCase()}` 
        });
      }

      // NOTE: Destination account validation now handled securely in createSecurePaymentV2()
      // Server will query Stripe API to resolve and validate contractor account

      // Convert amount to cents
      const amountInCents = Math.round(parsedAmount * 100);
      console.log(`[SECURE PAYMENT V2] Creating secure payment: ${parsedAmount} ${currency.toUpperCase()} for contractor ${contractorUserId}`);

      // BULLETPROOF: Create Payment Intent using secure contractor resolution
      // 1. Stripe API resolves contractor account ID (NEVER trust database)
      // 2. Creates Payment Intent on behalf of business account
      // 3. Payment appears in BUSINESS USER'S Stripe dashboard
      console.log(`[SECURE PAYMENT] Creating secure Payment Intent on behalf of business account: ${businessConnect?.accountId}`);
      
      const paymentResult = await createSecurePaymentV2({
        contractorUserId: parseInt(contractorUserId), // Only accept contractor ID
        amount: parsedAmount, // Use original amount, not cents (service handles conversion)
        currency,
        description: description || 'Secure payment via Connect V2 - Verified Destination',
        metadata: {
          ...metadata,
          businessId: userId.toString(),
          version: 'v2_secure',
          payment_type: 'verified_destination_charge',
          api_version: 'v2_bulletproof',
          flow_type: 'secure_destination_charge',
          no_manual_transfers: 'true',
          security_level: 'bulletproof'
        },
        businessAccountId: businessConnect?.accountId // KEY: This makes it appear in business dashboard
      });
      
      console.log(`[SECURE PAYMENT] ✅ Payment Intent created securely: ${paymentResult.payment_intent_id} → verified account ${paymentResult.destination_account}`);

      res.json({
        success: true,
        payment_intent_id: paymentResult.payment_intent_id,
        client_secret: paymentResult.client_secret,
        amount: parsedAmount,
        currency: currency,
        status: paymentResult.status,
        destination_account: paymentResult.destination_account, // Verified account from Stripe API
        contractor_user_id: contractorUserId,
        security_level: 'bulletproof',
        verification_method: 'stripe_api_source_of_truth'
      });

    } catch (e) {
      console.error("[connect-v2-destination-charge]", e);
      
      // Enhanced error handling for specific Stripe errors
      if (e.type === 'StripeInvalidRequestError') {
        if (e.code === 'account_invalid') {
          return res.status(400).json({ error: 'Invalid destination account' });
        } else if (e.code === 'amount_too_small') {
          return res.status(400).json({ error: 'Payment amount is below minimum' });
        }
      }
      
      res.status(e.status || 500).json({ error: e.message || "Payment creation failed" });
    }
  });

  /**
   * GET /api/connect/v2/transfers
   * Get transfer history for the account
   */
  app.get(`${connectBasePath}/transfers`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { limit = 10 } = req.query;

      const existing = await db.getConnect(userId);
      if (!existing?.accountId) {
        return res.status(404).json({ error: "No Connect account found" });
      }

      // Get transfers for this account
      const transfers = await stripe.transfers.list({
        destination: existing.accountId,
        limit: parseInt(limit)
      });

      const formattedTransfers = transfers.data.map(transfer => ({
        id: transfer.id,
        amount: transfer.amount / 100,
        currency: transfer.currency,
        description: transfer.description,
        created: new Date(transfer.created * 1000).toISOString(),
        status: transfer.status || 'completed',
        metadata: transfer.metadata
      }));

      res.json({
        transfers: formattedTransfers,
        has_more: transfers.has_more
      });

    } catch (e) {
      console.error("[connect-v2-transfers]", e);
      res.status(e.status || 500).json({ error: e.message || "Failed to fetch transfers" });
    }
  });

  /**
   * POST /api/connect/v2/update-business-profile
   * Update business profile information
   */
  app.post(`${connectBasePath}/update-business-profile`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profileData = req.body;

      const existing = await db.getConnect(userId);
      if (!existing?.accountId) {
        return res.status(404).json({ error: "No Connect account found" });
      }

      const account = await stripe.accounts.update(existing.accountId, {
        business_profile: profileData
      });

      res.json({
        success: true,
        business_profile: account.business_profile
      });

    } catch (e) {
      console.error("[connect-v2-update-business-profile]", e);
      res.status(e.status || 500).json({ error: e.message || "Profile update failed" });
    }
  });

  /**
   * POST /api/connect/v2/verify-account
   * Submit verification documents and information
   */
  app.post(`${connectBasePath}/verify-account`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { document_type, document_front, document_back } = req.body;

      const existing = await db.getConnect(userId);
      if (!existing?.accountId) {
        return res.status(404).json({ error: "No Connect account found" });
      }

      // Upload verification documents
      let updateData = {};

      if (document_front) {
        const frontFile = await stripe.files.create({
          purpose: 'identity_document',
          file: {
            data: Buffer.from(document_front, 'base64'),
            name: 'identity_front.jpg',
            type: 'application/octet-stream'
          }
        });

        updateData.individual = {
          verification: {
            document: {
              front: frontFile.id
            }
          }
        };
      }

      if (document_back) {
        const backFile = await stripe.files.create({
          purpose: 'identity_document',
          file: {
            data: Buffer.from(document_back, 'base64'),
            name: 'identity_back.jpg',
            type: 'application/octet-stream'
          }
        });

        updateData.individual.verification.document.back = backFile.id;
      }

      const account = await stripe.accounts.update(existing.accountId, updateData);

      res.json({
        success: true,
        verification_status: account.individual?.verification || {},
        requirements: account.requirements
      });

    } catch (e) {
      console.error("[connect-v2-verify-account]", e);
      res.status(e.status || 500).json({ error: e.message || "Verification failed" });
    }
  });
}
