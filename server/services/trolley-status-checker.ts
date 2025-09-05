import { storage } from '../storage';
import { createTrolleyClient } from './trolley-submerchant';

export class TrolleyStatusChecker {
  private static instance: TrolleyStatusChecker;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute

  static getInstance(): TrolleyStatusChecker {
    if (!TrolleyStatusChecker.instance) {
      TrolleyStatusChecker.instance = new TrolleyStatusChecker();
    }
    return TrolleyStatusChecker.instance;
  }

  /**
   * Start monitoring all pending recipients for status updates
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      return; // Already monitoring
    }

    console.log('Starting Trolley recipient status monitoring...');
    this.checkInterval = setInterval(async () => {
      await this.checkAllPendingRecipients();
    }, this.CHECK_INTERVAL_MS);

    // Run initial check immediately
    this.checkAllPendingRecipients();
  }

  /**
   * Stop monitoring recipients
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Stopped Trolley recipient status monitoring');
    }
  }

  /**
   * Check all users with pending Trolley recipient status
   */
  private async checkAllPendingRecipients(): Promise<void> {
    try {
      // Get all users with Trolley recipient IDs who might need status updates
      const pendingUsers = await storage.getUsersWithTrolleyRecipients();
      
      console.log(`Checking status for ${pendingUsers.length} Trolley recipients...`);

      for (const user of pendingUsers) {
        if (user.trolleyRecipientId) {
          await this.checkRecipientStatus(user.id, user.trolleyRecipientId);
        }
      }
    } catch (error) {
      console.error('Error checking Trolley recipient statuses:', error);
    }
  }

  /**
   * Check specific recipient status and update database if changed
   */
  private async checkRecipientStatus(userId: number, recipientId: string): Promise<void> {
    try {
      const trolleyClient = createTrolleyClient();
      
      // Get recipient details from Trolley
      const recipient = await trolleyClient.recipient.find(recipientId);
      
      if (!recipient) {
        console.log(`Recipient ${recipientId} not found in Trolley`);
        return;
      }

      // Check if recipient is now active/verified
      const isActive = recipient.status === 'active' || recipient.status === 'verified';
      const hasPaymentMethod = recipient.accounts && recipient.accounts.length > 0;
      
      // Update user status if they're now ready for payouts
      if (isActive && hasPaymentMethod) {
        const user = await storage.getUserById(userId);
        
        if (user && !user.payoutEnabled) {
          console.log(`✅ Activating payouts for user ${userId} (${user.username}) - Trolley recipient ${recipientId} is now active`);
          
          await storage.updateUserPayoutStatus(userId, true);
          
          // Create notification for contractor
          await storage.createNotification(
            userId,
            'payment_setup_completed',
            'Payment Setup Complete',
            'Your Trolley account has been verified and you can now receive payments!',
            { recipientId, status: recipient.status }
          );
          
          console.log(`🎉 User ${user.username} is now ready to receive payments via Trolley`);
        }
      }
      
    } catch (error) {
      console.error(`Error checking recipient ${recipientId} for user ${userId}:`, error);
    }
  }

  /**
   * Manually trigger status check for specific user
   */
  async checkUserStatus(userId: number): Promise<{ success: boolean; status?: string; message: string }> {
    try {
      const user = await storage.getUserById(userId);
      
      if (!user || !user.trolleyRecipientId) {
        return {
          success: false,
          message: 'User does not have a Trolley recipient account'
        };
      }

      await this.checkRecipientStatus(userId, user.trolleyRecipientId);
      
      // Get updated user status
      const updatedUser = await storage.getUserById(userId);
      
      return {
        success: true,
        status: updatedUser?.payoutEnabled ? 'active' : 'pending',
        message: updatedUser?.payoutEnabled 
          ? 'Account verified and ready for payments'
          : 'Account still pending verification by Trolley'
      };
      
    } catch (error) {
      console.error('Error checking user status:', error);
      return {
        success: false,
        message: 'Failed to check account status'
      };
    }
  }
}

// Export singleton instance
export const trolleyStatusChecker = TrolleyStatusChecker.getInstance();