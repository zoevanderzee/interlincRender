import { Express, Request, Response } from 'express';
import { plaidService } from './services/plaid-service';
import { storage } from './storage';
import stripeService from './services/stripe';

/**
 * Registers Plaid integration routes to the main Express app
 */
export default function plaidRoutes(app: Express, apiPath: string, authMiddleware: any) {
  // Base path for Plaid endpoints
  const plaidBasePath = `${apiPath}/plaid`;

  // Create a Plaid link token for a user
  app.post(`${plaidBasePath}/link-token`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const linkToken = await plaidService.createLinkToken(userId);
      res.json({ link_token: linkToken });
    } catch (error: any) {
      console.error('Error creating link token:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Exchange public token for access token and save bank account info
  app.post(`${plaidBasePath}/exchange-token`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const { publicToken, accountId, accountName } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Exchange the public token for an access token
      const { accessToken, itemId } = await plaidService.exchangePublicToken(publicToken);
      
      // Get the bank account information
      const authData = await plaidService.getBankAccountInfo(accessToken);
      
      // Find the selected account
      const selectedAccount = authData.accounts.find((account: any) => account.account_id === accountId);
      
      if (!selectedAccount) {
        return res.status(400).json({ error: 'Selected account not found' });
      }
      
      // Save the bank account information to the database for the user
      const savedBankAccount = await storage.saveUserBankAccount(userId, {
        userId, // Include userId in the bank account data
        plaidAccessToken: accessToken,
        plaidItemId: itemId,
        accountId,
        accountName: accountName || selectedAccount.name,
        accountType: selectedAccount.type,
        accountSubtype: selectedAccount.subtype || null,
        accountMask: selectedAccount.mask || null,
        institutionName: authData.item.institution_id || null,
      });
      
      // Send notification that a bank account has been linked
      try {
        const notificationService = await import('./services/notifications');
        await notificationService.default.sendBankAccountVerificationNotification(
          userId, 
          savedBankAccount.accountName
        );
        console.log(`Bank account linking notification sent to user ${userId}`);
      } catch (notifyError) {
        // Don't fail the request if notification fails
        console.error('Error sending bank account linking notification:', notifyError);
      }

      res.json({
        success: true,
        bankAccount: {
          id: accountId,
          name: selectedAccount.name,
          mask: selectedAccount.mask || null,
          type: selectedAccount.type,
          subtype: selectedAccount.subtype || null,
        },
      });
    } catch (error: any) {
      console.error('Error exchanging token:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's saved bank accounts
  app.get(`${plaidBasePath}/bank-accounts`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const bankAccounts = await storage.getUserBankAccounts(userId);
      res.json(bankAccounts);
    } catch (error: any) {
      console.error('Error getting bank accounts:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Set a bank account as default
  app.post(`${plaidBasePath}/bank-accounts/:accountId/set-default`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const updatedAccount = await storage.setDefaultBankAccount(userId, accountId);
      if (!updatedAccount) {
        return res.status(404).json({ error: 'Bank account not found' });
      }
      
      res.json({ success: true, account: updatedAccount });
    } catch (error: any) {
      console.error('Error setting default bank account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Remove a bank account
  app.delete(`${plaidBasePath}/bank-accounts/:accountId`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const success = await storage.removeBankAccount(userId, accountId);
      if (!success) {
        return res.status(404).json({ error: 'Bank account not found or could not be removed' });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing bank account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Initiate an ACH payment for a milestone payment
  app.post(`${plaidBasePath}/payments/:id/pay-via-ach`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { bankAccountId } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Get the payment details
      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      
      // Get the bank account
      const bankAccount = await storage.getUserBankAccount(userId, bankAccountId);
      if (!bankAccount) {
        return res.status(404).json({ error: 'Bank account not found' });
      }
      
      // Get the contract and contractor
      const contract = await storage.getContract(payment.contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      const contractor = await storage.getUser(contract.contractorId);
      if (!contractor) {
        return res.status(404).json({ error: 'Contractor not found' });
      }
      
      // Get the business user (payer)
      const business = await storage.getUser(userId);
      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }
      
      // Ensure the business has a Stripe customer ID
      if (!business.stripeCustomerId) {
        return res.status(400).json({ error: 'Business does not have a Stripe customer ID' });
      }
      
      let paymentResult;
      
      // Check if the bank account is already linked to Stripe
      if (!bankAccount.stripeBankAccountId) {
        try {
          // Create a processor token
          const processorToken = await plaidService.createBankAccountToken(
            bankAccount.plaidAccessToken,
            bankAccount.accountId
          );
          
          // Create a bank account payment method in Stripe
          const stripeBankAccountId = await stripeService.createBankAccountPaymentMethod(
            business.stripeCustomerId,
            processorToken
          );
          
          // Save the Stripe bank account ID to our database
          await storage.updateBankAccountStripeId(bankAccount.id, stripeBankAccountId);
          
          // Update our local reference
          bankAccount.stripeBankAccountId = stripeBankAccountId;
          
          // Send notification about successful bank account verification
          try {
            const notificationService = await import('./services/notifications');
            await notificationService.default.sendBankAccountVerificationNotification(
              business.id, 
              bankAccount.accountName
            );
            console.log(`Bank account verification notification sent to user ${business.id}`);
          } catch (notifyError) {
            // Don't fail the request if notification fails
            console.error('Error sending bank account verification notification:', notifyError);
          }
        } catch (tokenError: any) {
          console.error('Error creating bank account token:', tokenError);
          return res.status(400).json({ 
            error: 'Failed to link bank account to payment processor',
            details: tokenError.message
          });
        }
      }
      
      // Determine if we should use Stripe Connect for direct payment to contractor
      let contractorConnectId = undefined;
      if (contractor.stripeConnectAccountId && contractor.payoutEnabled) {
        contractorConnectId = contractor.stripeConnectAccountId;
      }
      
      try {
        // Process ACH payment through Stripe
        paymentResult = await stripeService.processACHPayment(
          payment,
          business.stripeCustomerId,
          bankAccount.stripeBankAccountId as string,
          contractorConnectId
        );
      } catch (paymentError: any) {
        console.error('Error processing ACH payment:', paymentError);
        return res.status(400).json({ 
          error: 'Failed to process ACH payment',
          details: paymentError.message
        });
      }
      
      // Calculate platform fee (5% by default)
      const amount = parseFloat(payment.amount);
      const platformFee = amount * 0.05; // 5% platform fee
      
      // Update the payment status
      const updatedPayment = await storage.updatePaymentStatus(paymentId, 'processing', {
        paymentProcessor: 'stripe_ach',
        stripePaymentIntentId: paymentResult.id,
        stripePaymentIntentStatus: 'processing',
        applicationFee: platformFee.toString(),
      });
      
      // Send payment initiated notifications to both business and contractor
      try {
        const notificationService = await import('./services/notifications');
        
        // Notify business
        await notificationService.default.sendPaymentNotification(
          updatedPayment, 
          'initiated', 
          business.id,
          'Your payment has been initiated and is now being processed. This may take 3-5 business days to complete.'
        );
        
        // Notify contractor
        await notificationService.default.sendPaymentNotification(
          updatedPayment, 
          'initiated', 
          contractor.id,
          'A payment has been initiated to your account. This may take 3-5 business days to appear in your account.'
        );
        
        console.log(`Payment initiation notifications sent for payment ${paymentId}`);
      } catch (notifyError) {
        // Don't fail the request if notification fails
        console.error('Error sending payment initiation notifications:', notifyError);
      }
      
      res.json({
        success: true,
        paymentId,
        status: 'processing',
        paymentIntentId: paymentResult.id,
        clientSecret: paymentResult.clientSecret,
        directToContractor: !!contractorConnectId,
        paymentId: payment.id
      });
    } catch (error: any) {
      console.error('Error initiating ACH payment:', error);
      res.status(500).json({ error: error.message });
    }
  });
}