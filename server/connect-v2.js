
import express from "express";
import Stripe from "stripe";
import { storage } from "./storage.js";

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

  /**
   * GET /api/connect/v2/status
   * Enhanced status with real-time capability checking
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
            direct_api_integration: true,
            real_time_status: true,
            full_account_management: true
          }
        });
      }

      // Get real-time account status from Stripe
      const account = await stripe.accounts.retrieve(existing.accountId);
      const requirements = account.requirements || {};
      
      // Check individual capability statuses
      const capabilities = account.capabilities || {};
      const capabilityStatuses = {
        card_payments: capabilities.card_payments?.status || 'inactive',
        transfers: capabilities.transfers?.status || 'inactive',
        us_bank_account_ach_payments: capabilities.us_bank_account_ach_payments?.status || 'inactive',
        sepa_debit_payments: capabilities.sepa_debit_payments?.status || 'inactive',
        instant_payouts: capabilities.instant_payouts?.status || 'inactive'
      };

      // Determine if account is fully operational
      const isFullyVerified = account.charges_enabled && 
                             account.details_submitted && 
                             account.payouts_enabled &&
                             capabilityStatuses.card_payments === 'active' &&
                             capabilityStatuses.transfers === 'active';

      const hasRequirements = (requirements.currently_due || []).length > 0 ||
                             (requirements.past_due || []).length > 0;

      console.log(`[Connect V2 Status] Account ${account.id}:`, {
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
        capabilities: capabilityStatuses,
        hasRequirements,
        isFullyVerified
      });

      // Update our database with current status
      await db.setConnect(userId, {
        ...existing,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        isFullyVerified,
        lastStatusCheck: new Date().toISOString(),
        version: 'v2'
      });

      const v2Status = {
        hasAccount: true,
        accountId: account.id,
        accountType: account.type,
        needsOnboarding: !isFullyVerified || hasRequirements,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        isFullyVerified,
        version: 'v2',
        
        verification_status: {
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
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

        business_profile: account.business_profile ? {
          name: account.business_profile.name,
          support_email: account.business_profile.support_email,
          support_phone: account.business_profile.support_phone,
          url: account.business_profile.url
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

      const existing = await db.getConnect(userId);
      if (existing?.accountId) {
        return res.status(409).json({ error: "Account already exists" });
      }

      const user = await db.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log('Creating V2 Connect account for user:', userId);

      // Create account with enhanced V2 capabilities
      const accountConfig = {
        type: 'express',
        country,
        email: user.email,
        business_type,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
          us_bank_account_ach_payments: { requested: true },
          sepa_debit_payments: { requested: true },
          instant_payouts: { requested: true }
        },
        metadata: {
          userId: userId.toString(),
          role: user.role || 'business',
          version: 'v2',
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
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        version: 'v2',
        createdAt: new Date().toISOString()
      });

      res.json({
        success: true,
        accountId: account.id,
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
   * Direct bank account addition via API
   */
  app.post(`${connectBasePath}/add-bank-account`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { routing_number, account_number, account_holder_type = 'individual' } = req.body;

      const existing = await db.getConnect(userId);
      if (!existing?.accountId) {
        return res.status(404).json({ error: "No Connect account found" });
      }

      // Create external bank account
      const bankAccount = await stripe.accounts.createExternalAccount(
        existing.accountId,
        {
          external_account: {
            object: 'bank_account',
            country: 'US',
            currency: 'usd',
            routing_number,
            account_number,
            account_holder_type
          }
        }
      );

      res.json({
        success: true,
        bank_account_id: bankAccount.id,
        last4: bankAccount.last4,
        routing_number: bankAccount.routing_number
      });

    } catch (e) {
      console.error("[connect-v2-add-bank-account]", e);
      res.status(e.status || 500).json({ error: e.message || "Bank account addition failed" });
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
   * Direct transfer creation for payouts
   */
  app.post(`${connectBasePath}/create-transfer`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { amount, currency = 'usd', description, metadata = {} } = req.body;

      const existing = await db.getConnect(userId);
      if (!existing?.accountId) {
        return res.status(404).json({ error: "No Connect account found" });
      }

      // Create transfer to connected account
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        destination: existing.accountId,
        description,
        metadata: {
          ...metadata,
          userId: userId.toString(),
          version: 'v2'
        }
      });

      res.json({
        success: true,
        transfer_id: transfer.id,
        amount: transfer.amount / 100, // Convert back to dollars
        currency: transfer.currency,
        status: transfer.status || 'pending'
      });

    } catch (e) {
      console.error("[connect-v2-create-transfer]", e);
      res.status(e.status || 500).json({ error: e.message || "Transfer creation failed" });
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
