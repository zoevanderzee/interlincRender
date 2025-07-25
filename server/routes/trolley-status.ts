import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth';
import { createTrolleyService } from '../services/trolley-submerchant';

const router = Router();

/**
 * Manual status check endpoint for contractors
 * Checks Trolley recipient status and updates payout eligibility
 */
router.post('/check-contractor-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUserById(userId);

    if (!user || user.role !== 'contractor') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only contractors can check payment setup status' 
      });
    }

    if (!user.trolleyRecipientId) {
      return res.json({
        success: false,
        status: 'not_started',
        message: 'No Trolley recipient account found. Please start payment setup first.'
      });
    }

    // Check recipient status with live Trolley API
    const trolleyService = createTrolleyService();
    
    try {
      const recipient = await trolleyService.getRecipient(user.trolleyRecipientId);

      if (!recipient) {
        return res.json({
          success: false,
          status: 'error',
          message: 'Unable to verify account status with Trolley'
        });
      }

      console.log(`Checking Trolley recipient status for user ${userId}:`, {
        recipientId: user.trolleyRecipientId,
        status: recipient.status,
        accounts: recipient.accounts?.length || 0
      });

      // Check if recipient is active and has payment methods
      const isActive = recipient.status === 'active' || recipient.status === 'verified';
      const hasPaymentMethod = recipient.accounts && recipient.accounts.length > 0;

      if (isActive && hasPaymentMethod && !user.payoutEnabled) {
        // Update user to enable payouts
        await storage.updateUser(userId, { payoutEnabled: true });
        
        // Create success notification
        await storage.createNotification(
          userId,
          'payment_setup_completed',
          'Payment Setup Complete',
          'Your Trolley account has been verified and you can now receive payments!',
          { recipientId: user.trolleyRecipientId, status: recipient.status }
        );

        console.log(`✅ Activated payouts for user ${userId} - Trolley recipient is now verified`);

        return res.json({
          success: true,
          status: 'completed',
          message: 'Account verified! You can now receive payments.',
          recipientStatus: recipient.status,
          payoutEnabled: true
        });
      }

      return res.json({
        success: true,
        status: isActive ? 'pending_payment_method' : 'pending_verification',
        message: isActive 
          ? 'Account verified but payment method setup needed'
          : 'Account still pending verification by Trolley',
        recipientStatus: recipient.status,
        payoutEnabled: user.payoutEnabled,
        hasPaymentMethod
      });

    } catch (trolleyError) {
      console.error('Trolley API error:', trolleyError);
      return res.json({
        success: false,
        status: 'api_error',
        message: 'Unable to check status with Trolley. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Error checking Trolley status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check account status'
    });
  }
});

/**
 * Get current contractor status without triggering updates
 */
router.get('/contractor-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUserById(userId);

    if (!user || user.role !== 'contractor') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only contractors can access this endpoint' 
      });
    }

    if (!user.trolleyRecipientId) {
      return res.json({
        status: 'not_started',
        payoutEnabled: false,
        message: 'Payment setup not started'
      });
    }

    return res.json({
      status: user.payoutEnabled ? 'completed' : 'pending',
      recipientId: user.trolleyRecipientId,
      payoutEnabled: user.payoutEnabled,
      message: user.payoutEnabled 
        ? 'Ready to receive payments'
        : 'Waiting for Trolley verification'
    });

  } catch (error) {
    console.error('Error getting contractor status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status'
    });
  }
});

export default router;