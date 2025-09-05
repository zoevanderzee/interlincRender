/**
 * Trolley API Test Route
 * Provides endpoint to test Trolley connection with current credentials
 */

import { Router } from 'express';
import { trolleyConfig } from './trolley-config';

const router = Router();

// Test Trolley API connection
router.get('/test-connection', async (req, res) => {
  try {
    // Force refresh credentials from environment
    trolleyConfig.refreshCredentials();
    
    // Test the connection
    const result = await trolleyConfig.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Trolley API connection successful',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Connection failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get Trolley credential status
router.get('/credential-status', (req, res) => {
  const creds = trolleyConfig.getCredentials();
  
  res.json({
    configured: !!creds,
    keyPrefix: creds?.apiKey?.substring(0, 10) + '...' || 'Not set',
    secretLength: creds?.apiSecret?.length || 0,
    timestamp: new Date().toISOString()
  });
});

export default router;