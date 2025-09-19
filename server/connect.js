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
  // V2 ROUTES ONLY - V1 completely removed
  connectV2Routes(app, apiPath, authMiddleware);

  // Block any remaining V1 endpoint attempts with clear error messages
  app.all(`${apiPath}/connect/status`, (req, res) => {
    console.log('❌ Blocked V1 Connect endpoint access:', req.method, req.url);
    res.status(410).json({ 
      error: 'V1 Connect API permanently removed', 
      message: 'Use V2 only: /api/connect/v2/status',
      redirect: '/api/connect/v2/status'
    });
  });

  app.all(`${apiPath}/connect/create-account`, (req, res) => {
    console.log('❌ Blocked V1 Connect endpoint access:', req.method, req.url);
    res.status(410).json({ 
      error: 'V1 Connect API permanently removed', 
      message: 'Use V2 only: /api/connect/v2/create-account' 
    });
  });

  // Block any other V1 Connect endpoints
  app.all(`${apiPath}/connect/*`, (req, res, next) => {
    // Allow V2 endpoints to pass through
    if (req.path.includes('/connect/v2/')) {
      return next();
    }
    
    console.log('❌ Blocked V1 Connect endpoint access:', req.method, req.url);
    res.status(410).json({ 
      error: 'V1 Connect API permanently removed', 
      message: 'All Connect functionality moved to V2: /api/connect/v2/*' 
    });
  });

  console.log("✅ Stripe Connect V2 routes initialized - V1 endpoints completely blocked");
}