
import express from "express";
import { isFeatureEnabled } from "./feature-flags.js";

export default function testV2Routes(app, apiPath, authMiddleware) {
  const testBasePath = `${apiPath}/test`;

  /**
   * GET /api/test/v2-status
   * Test V2 feature flag and integration status
   */
  app.get(`${testBasePath}/v2-status`, authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || parseInt(req.headers["x-user-id"]);
      const isV2Enabled = isFeatureEnabled('STRIPE_CONNECT_V2', userId);
      
      res.json({
        success: true,
        userId,
        v2Enabled: isV2Enabled,
        message: 'V2 API is the only available version (V1 removed)',
        availableEndpoints: [
          'GET /api/connect/v2/status',
          'POST /api/connect/v2/create-account',
          'POST /api/connect/v2/submit-onboarding',
          'POST /api/connect/v2/create-transfer',
          'GET /api/connect/v2/transfers'
        ]
      });
    } catch (e) {
      console.error("[test-v2-status]", e);
      res.status(500).json({ error: e.message || "Unknown error" });
    }
  });

  /**
   * GET /api/test/v2-connect-demo
   * Demo V2 Connect capabilities
   */
  app.get(`${testBasePath}/v2-connect-demo`, authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id || parseInt(req.headers["x-user-id"]);
      
      if (!isFeatureEnabled('STRIPE_CONNECT_V2', userId)) {
        return res.status(403).json({ error: 'V2 not enabled for this user' });
      }

      // Test V2 status endpoint
      const statusResponse = await fetch(`${req.protocol}://${req.get('host')}/api/connect/v2/status`, {
        headers: {
          'x-user-id': userId.toString(),
          'Authorization': req.headers.authorization || ''
        }
      });
      
      const statusData = await statusResponse.json();
      
      res.json({
        success: true,
        v2Integration: 'active',
        statusTest: statusData,
        capabilities: {
          direct_api_integration: true,
          real_time_status: true,
          full_account_management: true,
          payment_methods: {
            card: true,
            ach: true,
            international: true
          }
        },
        nextSteps: [
          'Visit /stripe-test-v2 to test the V2 interface',
          'Check enhanced status with /api/connect/v2/status',
          'Use embedded account management'
        ]
      });
    } catch (e) {
      console.error("[test-v2-connect-demo]", e);
      res.status(500).json({ error: e.message || "V2 integration test failed" });
    }
  });
}
