
import express from "express";
import { isFeatureEnabled, enableFeatureForUser, setRolloutPercentage, getFeatureFlag } from "./feature-flags.js";

export default function adminRoutes(app, apiPath, authMiddleware) {
  const adminBasePath = `${apiPath}/admin`;

  /**
   * GET /api/admin/feature-flags
   * Get all feature flags status
   */
  app.get(`${adminBasePath}/feature-flags`, authMiddleware, async (req, res) => {
    try {
      const flags = {
        STRIPE_CONNECT_V2: getFeatureFlag('STRIPE_CONNECT_V2')
      };
      
      res.json({ flags });
    } catch (e) {
      console.error("[admin-feature-flags]", e);
      res.status(500).json({ error: e.message || "Unknown error" });
    }
  });

  /**
   * POST /api/admin/feature-flags/enable-user
   * Enable V2 for specific user
   */
  app.post(`${adminBasePath}/feature-flags/enable-user`, authMiddleware, async (req, res) => {
    try {
      const { userId, feature = 'STRIPE_CONNECT_V2' } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }
      
      enableFeatureForUser(feature, parseInt(userId));
      
      res.json({ 
        success: true, 
        message: `Feature ${feature} enabled for user ${userId}` 
      });
    } catch (e) {
      console.error("[admin-enable-feature]", e);
      res.status(500).json({ error: e.message || "Unknown error" });
    }
  });

  /**
   * POST /api/admin/feature-flags/rollout
   * Set rollout percentage
   */
  app.post(`${adminBasePath}/feature-flags/rollout`, authMiddleware, async (req, res) => {
    try {
      const { percentage, feature = 'STRIPE_CONNECT_V2' } = req.body;
      
      if (percentage === undefined || percentage < 0 || percentage > 100) {
        return res.status(400).json({ error: "Valid percentage (0-100) required" });
      }
      
      setRolloutPercentage(feature, percentage);
      
      res.json({ 
        success: true, 
        message: `Feature ${feature} rollout set to ${percentage}%` 
      });
    } catch (e) {
      console.error("[admin-rollout]", e);
      res.status(500).json({ error: e.message || "Unknown error" });
    }
  });
}
