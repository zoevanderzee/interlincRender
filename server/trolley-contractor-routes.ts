import type { Express, Request, Response } from "express";
import { trolleyService } from "./trolley-service";
import { storage } from "./storage";
import { trolleySdk } from "./trolley-sdk-service";

export function registerTrolleyContractorRoutes(app: Express, apiRouter: string, requireAuth: any): void {
  
  // Get contractor's Trolley onboarding status
  app.get(`${apiRouter}/trolley/contractor-status`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await storage.getUser(Number(userId));
      if (!user || user.role !== 'contractor') {
        return res.status(403).json({ message: 'Access denied: Contractors only' });
      }

      // Check live Trolley API status if recipient ID exists
      let status = 'not_started';
      let payoutEnabled = false;
      
      if (user.trolleyRecipientId) {
        try {
          const recipient = await trolleyService.getRecipient(user.trolleyRecipientId);
          status = recipient.status === 'active' ? 'completed' : 'pending';
          payoutEnabled = recipient.status === 'active';
        } catch (error) {
          console.error('Error verifying live Trolley recipient:', error);
          status = 'error';
        }
      }

      res.json({
        status,
        recipientId: user.trolleyRecipientId,
        payoutEnabled,
        hasSetup: !!user.trolleyRecipientId
      });
    } catch (error) {
      console.error('Error getting contractor Trolley status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Generate Trolley widget URL for contractor onboarding
  app.post(`${apiRouter}/trolley/generate-widget`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await storage.getUser(Number(userId));
      if (!user || user.role !== 'contractor') {
        return res.status(403).json({ message: 'Access denied: Contractors only' });
      }

      // Per Trolley documentation: for existing recipients, omit refid to avoid "Email already exists"
      // Check if recipient exists first
      let widgetUrl;
      try {
        const searchResult = await trolleySdk.searchRecipients({ email: user.email });
        const hasExistingRecipient = searchResult && searchResult.recipients && searchResult.recipients.length > 0;
        
        if (hasExistingRecipient) {
          console.log(`Found existing recipient for ${user.email} - generating widget WITHOUT refid`);
          // For existing recipients: NO refid parameter (per Trolley docs)
          widgetUrl = trolleySdk.generateWidgetUrl(user.email);
        } else {
          console.log(`No existing recipient for ${user.email} - generating widget WITH refid for new account`);
          // For new recipients: include refid for tracking
          const referenceId = `contractor_${userId}_${Date.now()}`;
          widgetUrl = trolleySdk.generateWidgetUrl(user.email, referenceId);
        }
      } catch (searchError) {
        console.log(`Could not search for existing recipient, assuming new: ${searchError.message}`);
        // If search fails, assume new recipient
        const referenceId = `contractor_${userId}_${Date.now()}`;
        widgetUrl = trolleySdk.generateWidgetUrl(user.email, referenceId);
      }

      res.json({
        widgetUrl,
        message: 'Trolley widget URL generated successfully'
      });
    } catch (error) {
      console.error('Error generating Trolley widget URL:', error);
      res.status(500).json({ message: 'Failed to generate widget URL' });
    }
  });

  // Initialize contractor onboarding via live Trolley API - USE WIDGET-ONLY APPROACH LIKE BUSINESS
  app.post(`${apiRouter}/trolley/initialize-contractor-onboarding`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await storage.getUser(Number(userId));
      if (!user || user.role !== 'contractor') {
        return res.status(403).json({ message: 'Access denied: Contractors only' });
      }

      // DO NOT CREATE RECIPIENT VIA API - Let the widget handle everything like business flow
      // This prevents "email already exists" errors
      console.log(`Contractor ${user.email} onboarding initialized - widget will handle recipient creation`);
      
      res.json({
        success: true,
        status: 'widget_ready',
        message: 'Ready for widget-based onboarding - no pre-creation needed'
      });
    } catch (error) {
      console.error('Error initializing contractor onboarding:', error);
      res.status(500).json({ message: 'Failed to initialize onboarding' });
    }
  });

  // Legacy endpoint - now widget-only approach
  app.post(`${apiRouter}/trolley/create-contractor`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await storage.getUser(Number(userId));
      if (!user || user.role !== 'contractor') {
        return res.status(403).json({ message: 'Access denied: Contractors only' });
      }

      // WIDGET-ONLY APPROACH - no more API recipient creation
      console.log(`Legacy create-contractor endpoint called for ${user.email} - redirecting to widget flow`);
      
      res.json({
        success: true,
        message: 'Please use the widget for account setup - no API creation needed',
        redirectToWidget: true
      });
    } catch (error) {
      console.error('Error in legacy create-contractor:', error);
      res.status(500).json({ message: 'Failed to process request' });
    }
  });

  // Add account reset endpoint for mystery account situations  
  app.post(`${apiRouter}/trolley/reset-account`, requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const user = await storage.getUser(Number(userId));
      if (!user || user.role !== 'contractor') {
        return res.status(403).json({ message: 'Access denied: Contractors only' });
      }

      console.log(`Resetting Trolley account for user ${user.email}, clearing recipient ID: ${user.trolleyRecipientId}`);

      // Clear the trolley recipient ID to force fresh account creation
      await storage.updateUser(Number(userId), {
        trolleyRecipientId: null,
        payoutEnabled: false
      });

      res.json({
        success: true,
        message: 'Account reset completed. You can now create a fresh Trolley account.'
      });
    } catch (error) {
      console.error('Account reset error:', error);
      res.status(500).json({ 
        message: 'Failed to reset account', 
        error: error.message 
      });
    }
  });

  // No return needed as we're using app directly
}