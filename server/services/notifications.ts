import { storage } from "../storage";
import { sendEmail } from "./email";
import { Payment, User } from "@shared/schema";

/**
 * Send a payment notification via email
 */
export async function sendPaymentNotification(
  payment: Payment, 
  status: string,
  recipientId: number,
  additionalDetails?: string
): Promise<boolean> {
  try {
    // Get the recipient user
    const recipient = await storage.getUser(recipientId);
    if (!recipient || !recipient.email) {
      console.error(`Failed to send payment notification: User ${recipientId} not found or has no email`);
      return false;
    }
    
    // Get contract information
    const contract = await storage.getContract(payment.contractId);
    if (!contract) {
      console.error(`Failed to send payment notification: Contract ${payment.contractId} not found`);
      return false;
    }
    
    // Get milestone information if available
    let milestone = null;
    if (payment.milestoneId) {
      milestone = await storage.getMilestone(payment.milestoneId);
    }
    
    // Prepare email content based on status
    let subject = '';
    let message = '';
    
    switch (status) {
      case 'initiated':
        subject = `Payment Initiated: $${payment.amount} for ${contract.contractName}`;
        message = `A payment of $${payment.amount} has been initiated for contract ${contract.contractName}.`;
        break;
        
      case 'pending':
        subject = `Payment Processing: $${payment.amount} for ${contract.contractName}`;
        message = `Your payment of $${payment.amount} for contract ${contract.contractName} is being processed.`;
        break;
        
      case 'completed':
        subject = `Payment Complete: $${payment.amount} for ${contract.contractName}`;
        message = `Your payment of $${payment.amount} for contract ${contract.contractName} has been completed.`;
        break;
        
      case 'failed':
        subject = `Payment Failed: $${payment.amount} for ${contract.contractName}`;
        message = `Your payment of $${payment.amount} for contract ${contract.contractName} has failed.`;
        break;
        
      default:
        subject = `Payment Update: $${payment.amount} for ${contract.contractName}`;
        message = `There is an update to your payment of $${payment.amount} for contract ${contract.contractName}.`;
    }
    
    // Add milestone information if available
    if (milestone) {
      message += ` This payment is associated with milestone "${milestone.name}".`;
    }
    
    // Add additional details if provided
    if (additionalDetails) {
      message += ` ${additionalDetails}`;
    }
    
    // Add closing message
    message += ` You can view the details in your Creativ Linc dashboard.`;
    
    // Send the email
    await sendEmail({
      to: recipient.email,
      subject,
      text: message,
      html: `<p>${message}</p>`
    });
    
    return true;
  } catch (error) {
    console.error('Error sending payment notification:', error);
    return false;
  }
}

/**
 * Send a bank account verification notification
 */
export async function sendBankAccountVerificationNotification(userId: number, accountName: string): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user || !user.email) {
      console.error(`Failed to send bank account notification: User ${userId} not found or has no email`);
      return false;
    }
    
    const subject = `Bank Account Verified: ${accountName}`;
    const message = `Your bank account "${accountName}" has been successfully verified and is now ready for payments. You can now use this account to send or receive payments through Creativ Linc.`;
    
    await sendEmail({
      to: user.email,
      subject,
      text: message,
      html: `<p>${message}</p>`
    });
    
    return true;
  } catch (error) {
    console.error('Error sending bank account verification notification:', error);
    return false;
  }
}

/**
 * Send a contract payment completion notification
 */
export async function sendContractPaymentCompletionNotification(
  contractId: number, 
  businessId: number, 
  contractorId: number
): Promise<boolean> {
  try {
    // Get contract information
    const contract = await storage.getContract(contractId);
    if (!contract) {
      console.error(`Failed to send contract completion notification: Contract ${contractId} not found`);
      return false;
    }
    
    // Get business and contractor information
    const business = await storage.getUser(businessId);
    const contractor = await storage.getUser(contractorId);
    
    if (!business || !business.email || !contractor || !contractor.email) {
      console.error(`Failed to send contract completion notification: Business or contractor not found`);
      return false;
    }
    
    // Notify business
    const businessSubject = `All Payments Completed for ${contract.contractName}`;
    const businessMessage = `All payments for contract "${contract.contractName}" with ${contractor.firstName} ${contractor.lastName} have been successfully processed. The contract is now financially complete.`;
    
    await sendEmail({
      to: business.email,
      subject: businessSubject,
      text: businessMessage,
      html: `<p>${businessMessage}</p>`
    });
    
    // Notify contractor
    const contractorSubject = `All Payments Received for ${contract.contractName}`;
    const contractorMessage = `All payments for contract "${contract.contractName}" with ${business.companyName || business.firstName + ' ' + business.lastName} have been successfully processed. The contract is now financially complete.`;
    
    await sendEmail({
      to: contractor.email,
      subject: contractorSubject,
      text: contractorMessage,
      html: `<p>${contractorMessage}</p>`
    });
    
    return true;
  } catch (error) {
    console.error('Error sending contract completion notification:', error);
    return false;
  }
}

export default {
  sendPaymentNotification,
  sendBankAccountVerificationNotification,
  sendContractPaymentCompletionNotification
};