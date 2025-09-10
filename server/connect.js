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
};

export default function connectRoutes(app, apiPath, authMiddleware) {
  const connectBasePath = `${apiPath}/connect`;

  /**
   * POST /api/connect/ensure-account
   * Body: { country?: "GB", businessType?: "company"|"individual" }
   * Idempotent: creates a single Express account and persists it for the authed user.
   */
  app.post(`${connectBasePath}/ensure-account`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const country = req.body?.country || "GB";
      const businessType = req.body?.businessType;

      const existing = await db.getConnect(userId);
      if (existing?.accountId) {
        const acct = await stripe.accounts.retrieve(existing.accountId);
        if (acct.type === "standard") {
          throw httpError(409, "Embedded requires Express/Custom (account is Standard).");
        }
        return res.json({ accountId: acct.id, accountType: acct.type });
      }

      const acct = await stripe.accounts.create({
        type: "express",
        country,
        ...(businessType ? { business_type: businessType } : {}),
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      });

      await db.setConnect(userId, { accountId: acct.id, accountType: acct.type });
      res.json({ accountId: acct.id, accountType: acct.type });
    } catch (e) {
      console.error("[ensure-account]", e);
      res.status(e.status || 500).json({ error: e.message || "Unknown error" });
    }
  });

  /**
   * POST /api/connect/session
   * Body: { accountId: "acct_...", publishableKey?: "pk_..." }
   * Returns: { client_secret: "<string>", needsOnboarding: boolean }
   */
  app.post(`${connectBasePath}/session`, authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { accountId, publishableKey } = req.body || {};
      if (!accountId) throw httpError(400, "Missing accountId");

      assertKeyModesMatch(publishableKey);

      // Optional safety: verify the account actually belongs to this user
      const saved = await db.getConnect(userId);
      if (!saved || saved.accountId !== accountId) {
        throw httpError(403, "Account does not belong to authenticated user");
      }

      const acct = await stripe.accounts.retrieve(accountId);
      if (acct.type === "standard") throw httpError(409, "Embedded requires Express/Custom.");

      const reqs = acct.requirements || {};
      const needsOnboarding =
        !acct.details_submitted ||
        (Array.isArray(reqs.currently_due) && reqs.currently_due.length > 0) ||
        (Array.isArray(reqs.past_due) && reqs.past_due.length > 0);

      const session = await stripe.accountSessions.create({
        account: accountId,
        components: {
          account_onboarding: { enabled: true },
          account_management: { enabled: true },
        },
      });

      if (!session.client_secret) throw httpError(502, "Stripe did not return client_secret");
      res.json({ client_secret: session.client_secret, needsOnboarding });
    } catch (e) {
      console.error("[connect/session]", e);
      res.status(e.status || 500).json({ error: e.message || "Unknown error" });
    }
  });
}