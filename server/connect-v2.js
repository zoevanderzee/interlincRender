
import express from "express";
import Stripe from "stripe";
import { storage } from "./storage.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// --- V2 API Implementation ----------------------------------------------------
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

  /**
   * GET /api/connect/v2/status
   * Enhanced status with V2 capabilities
   */
  app.get(`${connectBasePath}/status`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await db.getConnect(userId);

      if (!existing?.accountId) {
        return res.json({ 
          hasAccount: false, 
          needsOnboarding: true,
          version: 'v2',
          capabilities: {
            enhanced_onboarding: true,
            real_time_status: true,
            embedded_management: true
          }
        });
      }

      const acct = await stripe.accounts.retrieve(existing.accountId);
      const reqs = acct.requirements || {};
      
      // Account is fully ready if charges are enabled and details submitted
      const isFullyVerified = acct.charges_enabled && acct.details_submitted && acct.payouts_enabled;
      const hasOutstandingRequirements = 
        (Array.isArray(reqs.currently_due) && reqs.currently_due.length > 0) ||
        (Array.isArray(reqs.past_due) && reqs.past_due.length > 0) ||
        (Array.isArray(reqs.pending_verification) && reqs.pending_verification.length > 0);

      // For active accounts with no requirements, no onboarding needed
      const needsOnboarding = !isFullyVerified || hasOutstandingRequirements;

      console.log(`[Connect V2 Status] Account ${acct.id}:`, {
        charges_enabled: acct.charges_enabled,
        details_submitted: acct.details_submitted,
        payouts_enabled: acct.payouts_enabled,
        isFullyVerified,
        hasOutstandingRequirements,
        needsOnboarding,
        currently_due: reqs.currently_due?.length || 0,
        past_due: reqs.past_due?.length || 0,
        pending_verification: reqs.pending_verification?.length || 0
      });

      // V2 Enhanced Status with complete verified account data
      const v2Status = {
        hasAccount: true,
        accountId: acct.id,
        accountType: acct.type,
        needsOnboarding,
        detailsSubmitted: acct.details_submitted,
        chargesEnabled: acct.charges_enabled,
        payoutsEnabled: acct.payouts_enabled,
        isFullyVerified,
        version: 'v2',
        
        // Account verification status
        verification_status: {
          details_submitted: acct.details_submitted,
          charges_enabled: acct.charges_enabled,
          payouts_enabled: acct.payouts_enabled,
          verification_complete: acct.details_submitted && acct.charges_enabled
        },
        
        // V2 Enhancements
        requirements: {
          currently_due: reqs.currently_due || [],
          past_due: reqs.past_due || [],
          pending_verification: reqs.pending_verification || [],
          disabled_reason: acct.requirements?.disabled_reason || null,
          is_complete: (reqs.currently_due || []).length === 0 && (reqs.past_due || []).length === 0
        },
        
        capabilities: {
          card_payments: acct.capabilities?.card_payments?.status || 'inactive',
          transfers: acct.capabilities?.transfers?.status || 'inactive',
          us_bank_account_ach_payments: acct.capabilities?.us_bank_account_ach_payments?.status || 'inactive',
          sepa_debit_payments: acct.capabilities?.sepa_debit_payments?.status || 'inactive',
          enhanced_onboarding: true,
          real_time_status: true,
          embedded_management: true
        },
        
        // Payment method support
        payment_methods: {
          card: acct.capabilities?.card_payments?.status === 'active',
          ach: acct.capabilities?.us_bank_account_ach_payments?.status === 'active',
          international: acct.capabilities?.sepa_debit_payments?.status === 'active',
          bank_transfer: acct.payouts_enabled,
          instant_payouts: acct.capabilities?.instant_payouts?.status === 'active'
        },
        
        // Business profile for verified accounts
        business_profile: acct.business_profile ? {
          name: acct.business_profile.name,
          support_email: acct.business_profile.support_email,
          support_phone: acct.business_profile.support_phone,
          url: acct.business_profile.url
        } : null,
        
        // Settings for payment processing
        settings: {
          payouts: acct.settings?.payouts || {},
          payments: acct.settings?.payments || {},
          dashboard: acct.settings?.dashboard || {}
        }
      };

      // Final status determination - if account can process payments, no onboarding needed
      if (isFullyVerified && !hasOutstandingRequirements) {
        v2Status.needsOnboarding = false;
        v2Status.paymentReady = true;
        
        console.log(`[Connect V2] Account ${acct.id} is fully verified - updating database`);
        
        // Automatically enable payments in our system for verified accounts
        await db.setConnect(userId, {
          ...existing,
          detailsSubmitted: true,
          chargesEnabled: true,
          payoutsEnabled: acct.payouts_enabled,
          paymentsEnabled: true,
          isFullyVerified: true,
          lastUpdated: new Date().toISOString(),
          version: 'v2'
        });
      } else {
        console.log(`[Connect V2] Account ${acct.id} still needs onboarding`);
      }

      res.json(v2Status);
    } catch (e) {
      console.error("[connect-v2-status]", e);
      res.status(e.status || 500).json({ error: e.message || "Unknown error" });
    }
  });

  /**
   * POST /api/connect/v2/session
   * Enhanced session creation with V2 features
   */
  app.post(`${connectBasePath}/session`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { publishableKey, country = "GB", enabledComponents = {} } = req.body || {};

      assertKeyModesMatch(publishableKey);

      const existing = await db.getConnect(userId);
      if (existing?.accountId) {
        // Enhanced session for existing accounts
        const acct = await stripe.accounts.retrieve(existing.accountId);
        if (acct.type === "standard") throw httpError(409, "V2 requires Express/Custom accounts.");

        const reqs = acct.requirements || {};
        const needsOnboarding =
          !acct.details_submitted ||
          (Array.isArray(reqs.currently_due) && reqs.currently_due.length > 0) ||
          (Array.isArray(reqs.past_due) && reqs.past_due.length > 0);

        // V2 Enhanced Components
        const components = {
          account_onboarding: { enabled: true },
          account_management: { enabled: enabledComponents.account_management || false },
          ...enabledComponents
        };

        const session = await stripe.accountSessions.create({
          account: existing.accountId,
          components: components,
        });

        return res.json({ 
          client_secret: session.client_secret, 
          needsOnboarding, 
          hasExistingAccount: true,
          version: 'v2',
          components: Object.keys(components)
        });
      }

      // Create new account with V2 enhancements
      const user = await db.getUser(userId);
      console.log('Creating new V2 Stripe Connect account for user:', userId);

      const isContractor = user.role === 'contractor';

      // V2 Enhanced Account Configuration
      const accountConfig = {
        type: 'express',
        country: country || 'GB',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
          // V2 Enhanced Capabilities
          us_bank_account_ach_payments: { requested: true },
          sepa_debit_payments: { requested: true },
        },
        metadata: {
          userId: userId.toString(),
          role: user.role || 'business',
          version: 'v2',
          created_at: new Date().toISOString()
        },
      };

      if (isContractor) {
        accountConfig.business_type = 'individual';
        accountConfig.individual = {
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
        };
      } else {
        accountConfig.business_type = 'company';
        accountConfig.company = {
          name: user.companyName || `${user.firstName} ${user.lastName}`,
        };
      }

      const account = await stripe.accounts.create(accountConfig);

      // V2 Enhanced Session Components
      const components = {
        account_onboarding: { enabled: true },
        account_management: { enabled: enabledComponents.account_management || false },
        ...enabledComponents
      };

      const session = await stripe.accountSessions.create({
        account: account.id,
        components: components,
      });

      // Save with V2 metadata
      await db.setConnect(userId, { 
        accountId: account.id, 
        accountType: account.type,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        version: 'v2',
        createdAt: new Date().toISOString()
      });

      res.json({ 
        client_secret: session.client_secret, 
        needsOnboarding: true, 
        hasExistingAccount: false, 
        accountId: account.id,
        version: 'v2',
        components: Object.keys(components)
      });

    } catch (e) {
      console.error("[connect-v2-session]", e);
      res.status(e.status || 500).json({ error: e.message || "Unknown error" });
    }
  });

  /**
   * POST /api/connect/v2/account-management-session
   * Create session for embedded account management
   */
  app.post(`${connectBasePath}/account-management-session`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await db.getConnect(userId);
      
      if (!existing?.accountId) {
        throw httpError(404, "No Connect account found");
      }

      const session = await stripe.accountSessions.create({
        account: existing.accountId,
        components: {
          account_management: { enabled: true },
          notification_banner: { enabled: true }
        },
      });

      res.json({ 
        client_secret: session.client_secret,
        accountId: existing.accountId,
        version: 'v2'
      });

    } catch (e) {
      console.error("[connect-v2-management]", e);
      res.status(e.status || 500).json({ error: e.message || "Unknown error" });
    }
  });

  /**
   * GET /api/connect/v2/capabilities
   * Get account capabilities and payment methods
   */
  app.get(`${connectBasePath}/capabilities`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await db.getConnect(userId);
      
      if (!existing?.accountId) {
        return res.json({ 
          error: "No account found",
          available_methods: ['card', 'ach', 'international']
        });
      }

      const acct = await stripe.accounts.retrieve(existing.accountId);
      
      res.json({
        account_id: acct.id,
        capabilities: acct.capabilities,
        available_payment_methods: {
          card: acct.capabilities?.card_payments?.status === 'active',
          ach: acct.capabilities?.us_bank_account_ach_payments?.status === 'active',
          sepa: acct.capabilities?.sepa_debit_payments?.status === 'active',
        },
        payout_methods: {
          bank_transfer: acct.payouts_enabled,
          instant: acct.capabilities?.instant_payouts?.status === 'active'
        }
      });

    } catch (e) {
      console.error("[connect-v2-capabilities]", e);
      res.status(e.status || 500).json({ error: e.message || "Unknown error" });
    }
  });

  /**
   * POST /api/connect/v2/onboard
   * Complete onboarding directly via API without embedded components
   */
  app.post(`${connectBasePath}/onboard`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { 
        business_type, 
        first_name, 
        last_name, 
        email, 
        phone,
        company_name,
        tax_id,
        address_line1,
        address_city,
        address_postal_code,
        address_country = 'GB',
        tos_acceptance 
      } = req.body || {};

      if (!tos_acceptance) {
        throw httpError(400, "Terms of service acceptance is required");
      }

      const existing = await db.getConnect(userId);
      if (!existing?.accountId) {
        throw httpError(404, "No Connect account found. Please create account first.");
      }

      // Update account with provided information
      const updateData = {
        business_type,
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: req.ip || '127.0.0.1',
        }
      };

      if (business_type === 'individual') {
        updateData.individual = {
          first_name,
          last_name,
          email,
          phone,
          address: {
            line1: address_line1,
            city: address_city,
            postal_code: address_postal_code,
            country: address_country
          }
        };
      } else {
        updateData.company = {
          name: company_name,
          tax_id,
          phone,
          address: {
            line1: address_line1,
            city: address_city,
            postal_code: address_postal_code,
            country: address_country
          }
        };
      }

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
        detailsSubmitted: account.details_submitted,
        requirementsRemaining: account.requirements?.currently_due || []
      });

    } catch (e) {
      console.error("[connect-v2-onboard]", e);
      res.status(e.status || 500).json({ error: e.message || "Onboarding failed" });
    }
  });

  /**
   * POST /api/connect/v2/update
   * Update account information directly via API
   */
  app.post(`${connectBasePath}/update`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const updateData = req.body || {};

      const existing = await db.getConnect(userId);
      if (!existing?.accountId) {
        throw httpError(404, "No Connect account found");
      }

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
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled
      });

    } catch (e) {
      console.error("[connect-v2-update]", e);
      res.status(e.status || 500).json({ error: e.message || "Update failed" });
    }
  });

  /**
   * GET /api/connect/v2/requirements
   * Get detailed account requirements
   */
  app.get(`${connectBasePath}/requirements`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await db.getConnect(userId);
      
      if (!existing?.accountId) {
        throw httpError(404, "No Connect account found");
      }

      const account = await stripe.accounts.retrieve(existing.accountId);
      const requirements = account.requirements || {};

      res.json({
        accountId: account.id,
        currently_due: requirements.currently_due || [],
        past_due: requirements.past_due || [],
        pending_verification: requirements.pending_verification || [],
        disabled_reason: requirements.disabled_reason,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      });

    } catch (e) {
      console.error("[connect-v2-requirements]", e);
      res.status(e.status || 500).json({ error: e.message || "Failed to get requirements" });
    }
  });

  /**
   * POST /api/connect/v2/enable-payments
   * Enable payment processing for verified accounts
   */
  app.post(`${connectBasePath}/enable-payments`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await db.getConnect(userId);
      
      if (!existing?.accountId) {
        throw httpError(404, "No Connect account found");
      }

      const account = await stripe.accounts.retrieve(existing.accountId);
      
      // Check if account is verified and ready for payments
      if (!account.charges_enabled) {
        throw httpError(400, "Account not yet verified for payments");
      }

      if (!account.details_submitted) {
        throw httpError(400, "Account details not submitted");
      }

      // Update our database with current account status
      await db.setConnect(userId, {
        ...existing,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        paymentsEnabled: true,
        isFullyVerified: true,
        paymentReady: true,
        lastUpdated: new Date().toISOString(),
        version: 'v2'
      });

      res.json({
        success: true,
        accountId: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        capabilities: account.capabilities,
        paymentReady: true,
        isFullyVerified: true,
        message: "Payment processing fully activated"
      });

    } catch (e) {
      console.error("[connect-v2-enable-payments]", e);
      res.status(e.status || 500).json({ error: e.message || "Failed to enable payments" });
    }
  });
}
