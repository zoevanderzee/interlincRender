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

export default function connectRoutes(app, apiPath, authMiddleware) {
  const connectBasePath = `${apiPath}/connect`;
  
  // Initialize V2 routes
  connectV2Routes(app, apiPath, authMiddleware);

  /**
   * GET /api/connect/status
   * Returns the user's current Connect account status
   */
  app.get(`${connectBasePath}/status`, (req, res) => {
    res.status(410).json({ 
      error: "V1 API deprecated. Use /api/connect/v2/status instead." 
    });
  });

  /**
   * POST /api/connect/session
   * Body: { publishableKey?: "pk_...", country?: "GB" }
   * Creates an account session for embedded onboarding (no pre-created account)
   * Returns: { client_secret: "<string>", needsOnboarding: true }
   */
  app.post(`${connectBasePath}/session`, (req, res) => {
    res.status(410).json({ 
      error: "V1 API deprecated. Use V2 API endpoints instead." 
    });
  });
}