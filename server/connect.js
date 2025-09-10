import express from "express";
import Stripe from "stripe";
import { storage } from "./storage.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// Get user ID from the existing auth system
async function getUserId(req) {
  // Use your auth/session. This integrates with your existing auth middleware
  if (!req.user?.id) throw new Error("Auth required");
  return req.user.id;
}

async function getConnectForUser(userId) {
  return await storage.getConnectForUser(userId);
}

async function setConnectForUser(userId, data) {
  return await storage.setConnectForUser(userId, data);
}

function assertKeyModesMatch(publishableKey) {
  if (!publishableKey) return;
  const pkMode = publishableKey.startsWith("pk_live_") ? "live"
              : publishableKey.startsWith("pk_test_") ? "test" : "unknown";
  const sk = process.env.STRIPE_SECRET_KEY || "";
  const skMode = sk.startsWith("sk_live_") ? "live"
              : sk.startsWith("sk_test_") ? "test" : "unknown";
  if (pkMode !== skMode) {
    const err = new Error(`Key mode mismatch (client=${pkMode}, server=${skMode})`);
    err.status = 400; throw err;
  }
}

/**
 * POST /api/connect/ensure-account
 * Idempotent: create a single **Express** account for this user and persist it.
 * Body: { country?: "GB", businessType?: "company"|"individual" }
 */
router.post("/ensure-account", async (req, res) => {
  try {
    const userId = await getUserId(req);
    const country = req.body?.country || "GB";
    const businessType = req.body?.businessType; // optional

    const existing = await getConnectForUser(userId);
    if (existing?.accountId) {
      const acct = await stripe.accounts.retrieve(existing.accountId);
      if (acct.type === "standard") {
        return res.status(409).json({ error: "standard_account", message: "Embedded requires Express/Custom." });
      }
      return res.json({ accountId: acct.id, accountType: acct.type });
    }

    const acct = await stripe.accounts.create({
      type: "express",                 // <<< IMPORTANT: no Standard accounts
      country,
      ...(businessType ? { business_type: businessType } : {}),
      capabilities: {
        card_payments: { requested: true },
        transfers:     { requested: true },
      },
    });

    await setConnectForUser(userId, { accountId: acct.id, accountType: acct.type });
    res.json({ accountId: acct.id, accountType: acct.type });
  } catch (e) {
    console.error("[ensure-account]", e);
    res.status(e.status || 500).json({ error: e.message || "Unknown error" });
  }
});

/**
 * POST /api/connect/session
 * Create an **embedded** Account Session (onboarding + management).
 * Body: { accountId: "acct_...", publishableKey?: "pk_..." }
 * Returns: { client_secret: "<string>", needsOnboarding: boolean }
 */
router.post("/session", async (req, res) => {
  try {
    const { accountId, publishableKey } = req.body || {};
    if (!accountId) return res.status(400).json({ error: "Missing accountId" });
    assertKeyModesMatch(publishableKey);

    const acct = await stripe.accounts.retrieve(accountId);
    if (acct.type === "standard") {
      return res.status(409).json({ error: "standard_account", message: "Embedded requires Express/Custom." });
    }

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

    if (!session.client_secret) throw new Error("No client_secret from Stripe");
    res.json({ client_secret: session.client_secret, needsOnboarding });
  } catch (e) {
    console.error("[connect/session]", e);
    res.status(e.status || 500).json({ error: e.message || "Unknown error" });
  }
});

export default router;