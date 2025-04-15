import { Router, Request, Response } from 'express';
import { plaidService } from './services/plaid-service';
import { storage } from './storage';
import { stripeService } from './services/stripe-service';

// Authentication middleware simplified for this example
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

const router = Router();

// Create a Plaid link token for a user
router.post('/link-token', requireAuth, async (req: Request, res: Response) => {
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
router.post('/exchange-token', requireAuth, async (req: Request, res: Response) => {
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
    await storage.saveUserBankAccount(userId, {
      plaidAccessToken: accessToken,
      plaidItemId: itemId,
      accountId,
      accountName: accountName || selectedAccount.name,
      accountType: selectedAccount.type,
      accountSubtype: selectedAccount.subtype,
      accountMask: selectedAccount.mask,
      institutionName: authData.item.institution_id,
    });
    
    // Create a Stripe bank account token for ACH payments
    // Note: In a real implementation, you would use Stripe's ACH capabilities
    // This is a simplified version
    const bankAccountToken = await stripeService.createBankAccountToken({
      country: 'US',
      currency: 'usd',
      account_holder_name: req.user?.firstName + ' ' + req.user?.lastName,
      account_holder_type: 'individual',
      routing_number: selectedAccount.routing,
      account_number: selectedAccount.account,
    });
    
    res.json({
      success: true,
      bankAccount: {
        id: accountId,
        name: selectedAccount.name,
        mask: selectedAccount.mask,
        type: selectedAccount.type,
        subtype: selectedAccount.subtype,
      },
    });
  } catch (error: any) {
    console.error('Error exchanging token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's saved bank accounts
router.get('/bank-accounts', requireAuth, async (req: Request, res: Response) => {
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

// Initiate an ACH payment for a milestone payment
router.post('/payments/:id/pay-via-ach', requireAuth, async (req: Request, res: Response) => {
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
    
    // Initiate the ACH transfer
    // This would connect with Stripe to create an ACH payment using the Plaid token
    const transferResult = await plaidService.initiateACHTransfer(
      bankAccount.plaidAccessToken,
      bankAccount.accountId,
      parseFloat(payment.amount.toString()),
      `Payment for ${contract.contractName} - Milestone ID: ${payment.milestoneId}`
    );
    
    // Update the payment status
    await storage.updatePaymentStatus(paymentId, 'processing', {
      stripePaymentMethod: 'ach_debit',
      stripePaymentIntentId: transferResult.transferId,
    });
    
    res.json({
      success: true,
      paymentId,
      status: 'processing',
      transferId: transferResult.transferId,
    });
  } catch (error: any) {
    console.error('Error initiating ACH payment:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;