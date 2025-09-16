import express from "express";
import Stripe from "stripe";
import { storage } from "./storage.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// --- helpers ----------------------------------------------------
function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// Mirror your app's pattern: prefer req.user.id, fallback to X-User-Id header
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

// Database integration with existing storage
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

export default function connectRoutes(app, apiPath, authMiddleware) {
  const connectBasePath = `${apiPath}/connect`;

  /**
   * GET /api/connect/status
   * Returns the user's current Connect account status
   */
  app.get(`${connectBasePath}/status`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await db.getConnect(userId);

      if (!existing?.accountId) {
        return res.json({ hasAccount: false, needsOnboarding: true });
      }

      const acct = await stripe.accounts.retrieve(existing.accountId);
      const reqs = acct.requirements || {};
      const needsOnboarding =
        !acct.details_submitted ||
        (Array.isArray(reqs.currently_due) && reqs.currently_due.length > 0) ||
        (Array.isArray(reqs.past_due) && reqs.past_due.length > 0);

      res.json({ 
        hasAccount: true, 
        accountId: acct.id, 
        accountType: acct.type, 
        needsOnboarding,
        detailsSubmitted: acct.details_submitted 
      });
    } catch (e) {
      console.error("[connect-status]", e);
      res.status(e.status || 500).json({ error: e.message || "Unknown error" });
    }
  });

  /**
   * POST /api/connect/session
   * Body: { publishableKey?: "pk_...", country?: "GB" }
   * Creates an account session for embedded onboarding (no pre-created account)
   * Returns: { client_secret: "<string>", needsOnboarding: true }
   */
  app.post(`${connectBasePath}/session`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { publishableKey, country = "GB" } = req.body || {};

      assertKeyModesMatch(publishableKey);

      // Check if user already has a Connect account
      const existing = await db.getConnect(userId);
      if (existing?.accountId) {
        // User already has an account, create session for management
        const acct = await stripe.accounts.retrieve(existing.accountId);
        if (acct.type === "standard") throw httpError(409, "Embedded requires Express/Custom.");

        const reqs = acct.requirements || {};
        const needsOnboarding =
          !acct.details_submitted ||
          (Array.isArray(reqs.currently_due) && reqs.currently_due.length > 0) ||
          (Array.isArray(reqs.past_due) && reqs.past_due.length > 0);

        const session = await stripe.accountSessions.create({
          account: existing.accountId,
          components: {
            account_onboarding: { enabled: true },
          },
        });

        return res.json({ client_secret: session.client_secret, needsOnboarding, hasExistingAccount: true });
      }

      // No existing account - create Connect account first, then session
      // Step 1: Create basic Connect account (just gets an account ID)
      const user = await db.getUser(userId);
      
      // Create account for new users
      if (!existing?.accountId) {
        console.log('Creating new Stripe Connect account for user:', userId);

        // Check if user is a contractor to create individual account
        const isContractor = user.role === 'contractor';

        const accountConfig = {
          type: 'express',
          country: country || 'GB',
          email: user.email,
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          metadata: {
            userId: userId.toString(),
            role: user.role || 'business',
          },
        };

        if (isContractor) {
          // Individual account for contractors
          accountConfig.business_type = 'individual';
          accountConfig.individual = {
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
          };
        } else {
          // Company account for businesses
          accountConfig.business_type = 'company';
          accountConfig.company = {
            name: user.companyName || `${user.firstName} ${user.lastName}`,
          };
        }

        const account = await stripe.accounts.create(accountConfig);

        // Step 2: Create account session for that account
        const session = await stripe.accountSessions.create({
          account: account.id,  // This was missing!
          components: {
            account_onboarding: { enabled: true },
          },
        });

        // Step 3: Save the new account ID to our database
        await db.setConnect(userId, { 
          accountId: account.id, 
          accountType: account.type,
          detailsSubmitted: false,
          chargesEnabled: false,
          payoutsEnabled: false
        });

        res.json({ client_secret: session.client_secret, needsOnboarding: true, hasExistingAccount: false, accountId: account.id });
      }
    } catch (e) {
      console.error("[connect-session]", e);
      res.status(e.status || 500).json({ error: e.message || "Unknown error" });
    }
  });

  /**
   * POST /api/connect/save-account
   * Body: { accountId: "acct_..." }
   * Called after successful onboarding to save the account details
   */
  app.post(`${connectBasePath}/save-account`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { accountId } = req.body || {};
      if (!accountId) throw httpError(400, "Missing accountId");

      // Verify the account exists and get its details
      const acct = await stripe.accounts.retrieve(accountId);

      // Save the account details to our database
      await db.setConnect(userId, { 
        accountId: acct.id, 
        accountType: acct.type,
        detailsSubmitted: acct.details_submitted,
        chargesEnabled: acct.charges_enabled,
        payoutsEnabled: acct.payouts_enabled
      });

      res.json({ 
        success: true, 
        accountId: acct.id, 
        accountType: acct.type,
        detailsSubmitted: acct.details_submitted 
      });
    } catch (e) {
      console.error("[save-account]", e);
      res.status(e.status || 500).json({ error: e.message || "Unknown error" });
    }
  });
}