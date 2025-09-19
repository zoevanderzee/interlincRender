import express from "express";
import Stripe from "stripe";
import { storage } from "./storage.js";
import { isFeatureEnabled } from "./feature-flags.js";
import connectV2Routes from "./connect-v2.js";

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

// V2 ONLY: All V1 endpoints permanently blocked
export default function connectRoutes(app, apiPath, authMiddleware) {

  // PERMANENTLY BLOCK ALL V1 ENDPOINTS - REDIRECT TO V2
  const v1Endpoints = [
    '/status',
    '/onboarding-link',
    '/onboarding-session',
    '/verify-session',
    '/refresh-session',
    '/account-status'
  ];

  v1Endpoints.forEach(endpoint => {
    app.all(`${apiPath}/connect${endpoint}`, (req, res) => {
      console.log(`❌ BLOCKED V1 Connect endpoint: ${req.method} ${req.path}`);
      res.status(410).json({
        error: "V1 Connect endpoints are permanently deprecated. Use V2 endpoints only.",
        version: "v2_only",
        redirect: `${apiPath}/connect/v2${endpoint}`,
        message: "V1 Connect has been completely removed. All functionality is now in V2."
      });
    });
  });

  // V2 ROUTES ONLY
  connectV2Routes(app, apiPath, authMiddleware);

  console.log("✅ Stripe Connect V2 ONLY - All V1 endpoints permanently blocked");
}