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

  // Debug endpoint to test Trolley API directly
  app.get(`${apiRouter}/trolley/debug-api`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await storage.getUser(Number(userId));
      if (!user || user.role !== 'contractor') {
        return res.status(403).json({ message: 'Access denied: Contractors only' });
      }

      // Test direct API call to check credentials
      try {
        const recipientData = {
          type: 'individual' as const,
          firstName: user.username || 'Test',
          lastName: 'User',
          email: user.email
        };

        console.log(`Testing Trolley API: Creating recipient for ${user.email}`);
        const recipient = await trolleyService.createRecipient(recipientData);
        
        console.log('Trolley API SUCCESS: Recipient created:', recipient.id);
        
        // Update user with recipient ID
        await storage.updateUserTrolleyRecipientId(Number(userId), recipient.id);
        
        res.json({
          success: true,
          recipientId: recipient.id,
          message: 'Direct API creation successful'
        });
      } catch (apiError: any) {
        console.error('Trolley API error:', apiError);
        res.json({
          success: false,
          error: apiError.message,
          details: apiError.response?.data || 'No additional details'
        });
      }
    } catch (error) {
      console.error('Debug endpoint error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Submit contractor payment setup - creates Trolley recipient under sub-merchant
  app.post(`${apiRouter}/trolley/submit-payment-setup`, requireAuth, async (req: Request, res: Response) => {
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
        return res.status(400).json({ message: 'Payment setup already completed' });
      }

      const { 
        firstName, 
        lastName, 
        address, 
        dateOfBirth, 
        phoneNumber, 
        bankAccount, 
        paypalEmail 
      } = req.body;

      // Validate required personal information
      if (!firstName || !lastName || !address?.street1 || !address?.city || !address?.region || !address?.country || !address?.postalCode) {
        return res.status(400).json({ message: 'Missing required personal information' });
      }

      // Validate at least one payout method
      if (!bankAccount?.accountNumber && !paypalEmail) {
        return res.status(400).json({ message: 'At least one payout method (bank account or PayPal) is required' });
      }

      console.log(`🔄 Creating Trolley recipient for contractor ${user.email} with payout details`);
      
      // Step 1: Create basic recipient profile
      const recipientData = {
        type: 'individual' as const,
        firstName,
        lastName,
        email: user.email,
        address: {
          street1: address.street1,
          street2: address.street2 || '',
          city: address.city,
          region: address.region,
          country: address.country,
          postalCode: address.postalCode
        },
        dob: dateOfBirth,
        ...(phoneNumber && { phone: phoneNumber })
      };

      try {
        // Create recipient using main Trolley API (will be linked to sub-merchant during payment)
        const recipient = await trolleyService.createRecipient(recipientData);
        console.log(`✅ Trolley recipient created: ${recipient.id}`);
        
        // Step 2: Add payout methods to the recipient
        if (bankAccount?.accountNumber) {
          try {
            console.log(`🏦 Adding bank account for recipient ${recipient.id}`);
            await trolleyService.addBankAccount(recipient.id, {
              bankName: bankAccount.bankName || 'User Bank',
              bankId: bankAccount.routingNumber || '',
              branchId: bankAccount.routingNumber || '',
              accountNum: bankAccount.accountNumber,
              accountHolderName: `${firstName} ${lastName}`,
              accountType: bankAccount.accountType || 'checking',
              country: address.country
            });
            console.log(`✅ Bank account added to recipient ${recipient.id}`);
          } catch (bankError) {
            console.error('Error adding bank account:', bankError);
            // Continue - PayPal might still work
          }
        }

        if (paypalEmail) {
          try {
            console.log(`💳 Adding PayPal account for recipient ${recipient.id}`);
            await trolleyService.addPayPalAccount(recipient.id, paypalEmail);
            console.log(`✅ PayPal account added to recipient ${recipient.id}`);
          } catch (paypalError) {
            console.error('Error adding PayPal account:', paypalError);
            // Continue - bank account might still work
          }
        }
        
        // Step 3: Save recipient ID to user profile
        await storage.updateUserTrolleyRecipientId(Number(userId), recipient.id);
        
        console.log(`✅ Payment setup completed for contractor ${user.email}`);
        console.log(`   - Recipient ID: ${recipient.id}`);
        console.log(`   - Bank Account: ${bankAccount?.accountNumber ? 'Added' : 'None'}`);
        console.log(`   - PayPal: ${paypalEmail ? 'Added' : 'None'}`);
        
        res.json({
          success: true,
          recipientId: recipient.id,
          message: 'Payment setup completed successfully',
          payoutMethods: {
            bankAccount: !!bankAccount?.accountNumber,
            paypal: !!paypalEmail
          }
        });
      } catch (trolleyError: any) {
        console.error('Trolley API error during payment setup:', trolleyError);
        
        // Handle duplicate email case
        if (trolleyError.validationErrors?.some((err: any) => err.code === 'duplicate' && err.field === 'email')) {
          const existingIdMatch = trolleyError.message?.match(/recipient\s+([R-\w]+)/);
          
          if (existingIdMatch && existingIdMatch[1]) {
            const existingRecipientId = existingIdMatch[1];
            console.log(`📋 Found existing recipient ID: ${existingRecipientId}`);
            
            await storage.updateUserTrolleyRecipientId(Number(userId), existingRecipientId);
            
            return res.json({
              success: true,
              recipientId: existingRecipientId,
              message: 'Connected to existing Trolley account'
            });
          }
        }
        
        res.status(500).json({ 
          message: 'Failed to complete payment setup',
          error: trolleyError.message 
        });
      }
    } catch (error) {
      console.error('Error in payment setup:', error);
      res.status(500).json({ message: 'Internal server error' });
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