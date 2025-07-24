import type { Express, Request, Response } from "express";
import { trolleyService } from "./trolley-service";
import { storage } from "./storage";

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

      // Generate Trolley widget URL
      const widgetUrl = trolleyService.generateWidgetUrl({
        recipientEmail: user.email,
        recipientReferenceId: `contractor_${user.id}`,
        products: ['pay', 'tax'],
        colors: {
          primary: '#3b82f6',
          background: '#000000',
          text: '#ffffff',
          border: '#374151'
        }
      });

      res.json({
        widgetUrl,
        message: 'Trolley widget URL generated successfully'
      });
    } catch (error) {
      console.error('Error generating Trolley widget URL:', error);
      res.status(500).json({ message: 'Failed to generate widget URL' });
    }
  });

  // Check and update contractor status after widget completion
  app.post(`${apiRouter}/trolley/check-status`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await storage.getUser(Number(userId));
      if (!user || user.role !== 'contractor') {
        return res.status(403).json({ message: 'Access denied: Contractors only' });
      }

      // Check actual Trolley recipient status and create if needed
      let recipientId = user.trolleyRecipientId;
      
      if (!recipientId) {
        // Create real Trolley recipient account
        try {
          const recipientData = {
            type: 'individual' as const,
            firstName: user.firstName || user.username,
            lastName: user.lastName || '',
            email: user.email
          };

          const recipient = await trolleyService.createRecipient(recipientData);
          recipientId = recipient.id;
          
          // Update user with real Trolley recipient ID
          await storage.updateUser(Number(userId), {
            trolleyRecipientId: recipientId,
            payoutEnabled: true
          });

          res.json({
            status: 'completed',
            recipientId,
            payoutEnabled: true,
            message: 'Live Trolley recipient account created successfully'
          });
        } catch (trolleyError) {
          console.error('Error creating live Trolley recipient:', trolleyError);
          res.status(500).json({ 
            message: 'Failed to create live Trolley recipient account',
            error: trolleyError 
          });
        }
      } else {
        // Check existing recipient status with live Trolley API
        try {
          const recipient = await trolleyService.getRecipient(recipientId);
          res.json({
            status: recipient.status === 'active' ? 'completed' : 'pending',
            recipientId,
            payoutEnabled: recipient.status === 'active',
            message: 'Live Trolley recipient status verified'
          });
        } catch (error) {
          res.status(500).json({ 
            message: 'Failed to verify live Trolley recipient status',
            error 
          });
        }
      }
    } catch (error) {
      console.error('Error checking contractor status:', error);
      res.status(500).json({ message: 'Failed to check status' });
    }
  });

  // Create contractor recipient account
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

      if (user.trolley_recipient_id) {
        return res.json({
          success: true,
          recipientId: user.trolley_recipient_id,
          message: 'Contractor already has Trolley account'
        });
      }

      // Create recipient with Trolley
      const recipientData = {
        type: 'individual' as const,
        firstName: user.first_name || user.username,
        lastName: user.last_name || '',
        email: user.email
      };

      try {
        const recipient = await trolleyService.createRecipient(recipientData);
        
        // Update user with Trolley recipient ID
        await storage.updateUserTrolleyInfo(Number(userId), {
          trolley_recipient_id: recipient.id,
          payout_enabled: true
        });

        res.json({
          success: true,
          recipientId: recipient.id,
          message: 'Contractor Trolley account created successfully'
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