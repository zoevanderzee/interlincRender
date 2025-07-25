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

      // For existing recipients, we need special handling to avoid "Email already exists" error
      if (user.trolleyRecipientId) {
        // User already has Trolley account - use direct widget without refid
        const widgetUrl = trolleyService.generateWidgetUrl({
          recipientEmail: user.email,
          // Skip recipientReferenceId for existing accounts to avoid conflicts
          products: ['pay', 'tax'],
          colors: {
            primary: '#3b82f6',
            background: '#ffffff',
            text: '#000000'
          }
        });
        
        return res.json({
          widgetUrl,
          message: 'Trolley widget URL generated for existing account'
        });
      }
      
      // For new recipients, use the business widget pattern with refid
      const referenceId = `contractor_${userId}_${Date.now()}`;
      const widgetUrl = trolleySdk.generateWidgetUrl(user.email, referenceId);

      res.json({
        widgetUrl,
        message: 'Trolley widget URL generated successfully'
      });
    } catch (error) {
      console.error('Error generating Trolley widget URL:', error);
      res.status(500).json({ message: 'Failed to generate widget URL' });
    }
  });

  // Initialize contractor onboarding via live Trolley API
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

      // Create new Trolley recipient account if none exists
      if (!user.trolleyRecipientId) {
        try {
          const recipientData = {
            type: 'individual' as const,
            firstName: user.firstName || user.username,
            lastName: user.lastName || 'User',
            email: user.email
          };

          console.log('Creating new Trolley recipient for user:', user.id, user.email);
          const recipient = await trolleyService.createRecipient(recipientData);
          
          // Update user with real Trolley recipient ID
          await storage.updateUser(Number(userId), {
            trolleyRecipientId: recipient.id,
            payoutEnabled: recipient.status === 'active'
          });

          res.json({
            success: true,
            recipientId: recipient.id,
            status: recipient.status === 'active' ? 'completed' : 'pending',
            payoutEnabled: recipient.status === 'active',
            message: 'Live Trolley recipient account created successfully'
          });
        } catch (trolleyError) {
          console.error('Error creating live Trolley recipient:', trolleyError);
          res.status(500).json({ 
            success: false,
            message: 'Failed to create live Trolley recipient account',
            error: trolleyError 
          });
        }
      } else {
        // Check existing recipient status with live Trolley API
        try {
          const recipient = await trolleyService.getRecipient(user.trolleyRecipientId);
          res.json({
            success: true,
            status: recipient.status === 'active' ? 'completed' : 'pending',
            recipientId: user.trolleyRecipientId,
            payoutEnabled: recipient.status === 'active',
            message: 'Live Trolley recipient status verified'
          });
        } catch (error) {
          console.error('Error verifying existing Trolley recipient:', error);
          res.status(500).json({ 
            success: false,
            message: 'Failed to verify live Trolley recipient status',
            error 
          });
        }
      }
    } catch (error) {
      console.error('Error initializing contractor onboarding:', error);
      res.status(500).json({ message: 'Failed to initialize onboarding' });
    }
  });

  // Create contractor recipient account (legacy endpoint)
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

      if (user.trolleyRecipientId) {
        return res.json({
          success: true,
          recipientId: user.trolleyRecipientId,
          message: 'Contractor already has live Trolley account'
        });
      }

      // Create recipient with live Trolley API
      const recipientData = {
        type: 'individual' as const,
        firstName: user.firstName || user.username,
        lastName: user.lastName || 'User',
        email: user.email
      };

      try {
        const recipient = await trolleyService.createRecipient(recipientData);
        
        // Update user with live Trolley recipient ID
        await storage.updateUser(Number(userId), {
          trolleyRecipientId: recipient.id,
          payoutEnabled: recipient.status === 'active'
        });

        res.json({
          success: true,
          recipientId: recipient.id,
          status: recipient.status,
          message: 'Live Trolley recipient account created successfully'
        });
      } catch (trolleyError) {
        console.error('Error creating live Trolley recipient:', trolleyError);
        res.status(500).json({
          success: false,
          message: 'Failed to create live Trolley recipient account',
          error: trolleyError
        });
      }
    } catch (error) {
      console.error('Error creating contractor:', error);
      res.status(500).json({ message: 'Failed to create contractor account' });
    }
  });
}