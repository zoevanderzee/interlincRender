import { storage } from "../storage";
import { InsertNotification } from "../../shared/schema";

export class NotificationService {
  // Create notification for contract invitation
  static async createContractInvitation(contractorId: number, contractTitle: string, businessName: string) {
    const notification: InsertNotification = {
      userId: contractorId,
      title: "New Project Invitation",
      message: `You've been invited to work on "${contractTitle}" by ${businessName}`,
      type: "contract_invitation",
      relatedId: null,
      isRead: false
    };
    
    return await storage.createNotification(notification);
  }

  // Create notification for milestone approval
  static async createMilestoneApproval(contractorId: number, milestoneTitle: string, paymentAmount: string) {
    const notification: InsertNotification = {
      userId: contractorId,
      title: "Milestone Approved",
      message: `Your milestone "${milestoneTitle}" has been approved. Payment of ${paymentAmount} is being processed.`,
      type: "milestone_approved",
      relatedId: null,
      isRead: false
    };
    
    return await storage.createNotification(notification);
  }

  // Create notification for payment completed
  static async createPaymentCompleted(contractorId: number, amount: string, contractTitle: string) {
    const notification: InsertNotification = {
      userId: contractorId,
      title: "Payment Received",
      message: `Payment of ${amount} for "${contractTitle}" has been completed and should appear in your account within 1-2 business days.`,
      type: "payment_completed",
      relatedId: null,
      isRead: false
    };
    
    return await storage.createNotification(notification);
  }

  // Create notification for work request acceptance
  static async createWorkRequestAccepted(businessId: number, contractorName: string, workRequestTitle: string) {
    const notification: InsertNotification = {
      userId: businessId,
      title: "Work Request Accepted",
      message: `${contractorName} has accepted your work request "${workRequestTitle}". The project is now active.`,
      type: "work_request_accepted",
      relatedId: null,
      isRead: false
    };
    
    return await storage.createNotification(notification);
  }

  // Create notification for work submission
  static async createWorkSubmission(businessId: number, contractorName: string, submissionTitle: string) {
    const notification: InsertNotification = {
      userId: businessId,
      title: "Work Submitted",
      message: `${contractorName} has submitted work: "${submissionTitle}". Please review and approve.`,
      type: "work_submission",
      relatedId: null,
      isRead: false
    };
    
    return await storage.createNotification(notification);
  }

  // Create notification for connection request
  static async createConnectionRequest(businessId: number, contractorName: string) {
    const notification: InsertNotification = {
      userId: businessId,
      title: "New Connection Request",
      message: `${contractorName} has sent you a connection request. Review their profile to connect.`,
      type: "connection_request",
      relatedId: null,
      isRead: false
    };
    
    return await storage.createNotification(notification);
  }

  // Create notification for profile completion reminder
  static async createProfileReminder(userId: number) {
    const notification: InsertNotification = {
      userId: userId,
      title: "Complete Your Profile",
      message: "Complete your profile to increase your visibility and attract more project opportunities.",
      type: "profile_reminder",
      relatedId: null,
      isRead: false
    };
    
    return await storage.createNotification(notification);
  }

  // Create welcome notification for new users
  static async createWelcomeNotification(userId: number, userRole: string) {
    const roleName = userRole === 'business' ? 'business owner' : 'contractor';
    const notification: InsertNotification = {
      userId: userId,
      title: `Welcome to Creativ Linc!`,
      message: `Welcome to the platform! As a ${roleName}, you now have access to all the tools you need to manage your ${userRole === 'business' ? 'projects and contractors' : 'work and payments'}.`,
      type: "welcome",
      relatedId: null,
      isRead: false
    };
    
    return await storage.createNotification(notification);
  }

  // DISABLED: No sample notifications - live production system only
  static async createSampleNotifications(userId: number, userRole: string) {
    console.log('⚠️ createSampleNotifications() called but DISABLED - Live production system only');
    return [];

    if (userRole === 'business') {
      notifications.push({
        userId: userId,
        title: "New Connection Request",
        message: "Sarah Johnson has sent you a connection request. Review her profile to connect.",
        type: "connection_request",
        relatedId: null,
        isRead: false
      });

      notifications.push({
        userId: userId,
        title: "Work Submitted",
        message: "Mike Chen has submitted work: 'Website Design Mockups'. Please review and approve.",
        type: "work_submission",
        relatedId: null,
        isRead: false
      });

      notifications.push({
        userId: userId,
        title: "Payment Processed",
        message: "Payment of £850.00 to Alex Thompson has been successfully processed.",
        type: "payment_processed",
        relatedId: null,
        isRead: true
      });
    } else {
      notifications.push({
        userId: userId,
        title: "New Project Invitation",
        message: "You've been invited to work on 'E-commerce Platform Development' by TechStart Solutions",
        type: "contract_invitation",
        relatedId: null,
        isRead: false
      });

      notifications.push({
        userId: userId,
        title: "Milestone Approved",
        message: "Your milestone 'Initial Design Phase' has been approved. Payment of £500.00 is being processed.",
        type: "milestone_approved",
        relatedId: null,
        isRead: false
      });

      notifications.push({
        userId: userId,
        title: "Payment Received",
        message: "Payment of £500.00 for 'Mobile App UI Design' has been completed and should appear in your account within 1-2 business days.",
        type: "payment_completed",
        relatedId: null,
        isRead: true
      });
    }

    // Create all notifications
    for (const notification of notifications) {
      await storage.createNotification(notification);
    }

    return notifications.length;
  }
}

export default NotificationService;