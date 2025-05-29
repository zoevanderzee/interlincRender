import Stripe from 'stripe';
import { storage } from '../storage';
import { eq } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

interface PaymentProcessingResult {
  success: boolean;
  paymentId?: number;
  logId?: number;
  error?: string;
  transferId?: string;
}

class AutomatedPaymentService {
  
  /**
   * Triggers automatic payment when a milestone is approved
   * This is the core logic that replaces manual invoice generation
   */
  async processMilestoneApproval(milestoneId: number, approvedBy: number): Promise<PaymentProcessingResult> {
    try {
      // Get milestone details
      const milestone = await storage.getMilestone(milestoneId);
      if (!milestone) {
        return { success: false, error: 'Milestone not found' };
      }

      // Get contract details
      const contract = await storage.getContract(milestone.contractId);
      if (!contract) {
        return { success: false, error: 'Contract not found' };
      }

      // Get contractor details
      const contractor = await storage.getUser(contract.contractorId);
      if (!contractor) {
        return { success: false, error: 'Contractor not found' };
      }

      // Check if auto-pay is enabled for this milestone
      if (!milestone.autoPayEnabled) {
        console.log(`Auto-pay disabled for milestone ${milestoneId}, skipping automatic payment`);
        return { success: false, error: 'Auto-pay disabled for this milestone' };
      }

      // Check if payment already exists for this milestone
      const existingPayment = await storage.getPaymentByMilestoneId(milestoneId);
      if (existingPayment && existingPayment.status !== 'failed') {
        return { success: false, error: 'Payment already exists for this milestone' };
      }

      // Calculate payment amounts
      const totalAmount = parseFloat(milestone.paymentAmount);
      const platformFeeRate = 0.03; // 3% platform fee
      const applicationFee = totalAmount * platformFeeRate;
      const netAmount = totalAmount - applicationFee;

      // Create payment record
      const paymentData = {
        contractId: milestone.contractId,
        milestoneId: milestoneId,
        amount: milestone.paymentAmount,
        status: 'auto_triggered' as const,
        scheduledDate: new Date(),
        triggeredBy: 'auto_approval' as const,
        triggeredAt: new Date(),
        applicationFee: applicationFee.toFixed(2),
        notes: `Automatically triggered payment for approved milestone: ${milestone.name}`
      };

      const payment = await storage.createPayment(paymentData);

      // Process Stripe payment
      const stripeResult = await this.processStripePayment(
        payment.id,
        totalAmount,
        applicationFee,
        contractor,
        milestone,
        contract
      );

      if (!stripeResult.success) {
        await storage.updatePayment(payment.id, { status: 'failed' });
        return { success: false, error: stripeResult.error };
      }

      // Update payment with Stripe details
      await storage.updatePayment(payment.id, {
        status: 'processing',
        stripePaymentIntentId: stripeResult.paymentIntentId,
        stripeTransferId: stripeResult.transferId
      });

      // Create compliance log
      const logId = await this.createComplianceLog(
        payment.id,
        milestone,
        contract,
        contractor,
        totalAmount,
        applicationFee,
        netAmount,
        stripeResult
      );

      return {
        success: true,
        paymentId: payment.id,
        logId: logId,
        transferId: stripeResult.transferId
      };

    } catch (error) {
      console.error('Error processing milestone approval payment:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Processes payment through Stripe Connect
   */
  private async processStripePayment(
    paymentId: number,
    amount: number,
    applicationFee: number,
    contractor: any,
    milestone: any,
    contract: any
  ): Promise<{ success: boolean; paymentIntentId?: string; transferId?: string; error?: string }> {
    try {
      const amountInCents = Math.round(amount * 100);
      const applicationFeeInCents = Math.round(applicationFee * 100);

      let paymentIntentData: any = {
        amount: amountInCents,
        currency: 'usd',
        confirm: true,
        payment_method: 'pm_card_visa', // For demo - in production this would come from business payment method
        metadata: {
          paymentId: paymentId.toString(),
          milestoneId: milestone.id.toString(),
          contractId: contract.id.toString(),
          contractorId: contractor.id.toString(),
          triggerEvent: 'milestone_approved'
        }
      };

      // If contractor has Stripe Connect account, use direct transfer
      if (contractor.stripeConnectAccountId) {
        paymentIntentData.transfer_data = {
          destination: contractor.stripeConnectAccountId,
        };
        paymentIntentData.application_fee_amount = applicationFeeInCents;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        transferId: paymentIntent.transfer_data?.destination
      };

    } catch (error: any) {
      console.error('Stripe payment processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Creates structured compliance log for audit purposes
   * This replaces traditional invoicing with structured data
   */
  private async createComplianceLog(
    paymentId: number,
    milestone: any,
    contract: any,
    contractor: any,
    amount: number,
    applicationFee: number,
    netAmount: number,
    stripeResult: any
  ): Promise<number> {
    const complianceData = {
      transaction_type: 'milestone_payment',
      contract_reference: contract.contractCode,
      milestone_reference: milestone.name,
      deliverable_reference: milestone.deliverableUrl,
      payment_terms: 'Net immediate upon approval',
      service_period: {
        start: contract.startDate,
        end: milestone.dueDate
      },
      tax_classification: 'professional_services',
      jurisdiction: 'US',
      business_entity: {
        id: contract.businessId,
        type: 'platform_client'
      },
      contractor_entity: {
        id: contractor.id,
        profile_code: contractor.profileCode,
        type: 'independent_contractor'
      },
      payment_breakdown: {
        gross_amount: amount,
        platform_fee: applicationFee,
        net_contractor_payment: netAmount
      },
      automation_details: {
        trigger_event: 'milestone_approved',
        processing_timestamp: new Date().toISOString(),
        approval_workflow: 'automatic'
      }
    };

    const logData = {
      paymentId: paymentId,
      contractId: contract.id,
      milestoneId: milestone.id,
      businessId: contract.businessId,
      contractorId: contractor.id,
      amount: amount.toFixed(2),
      applicationFee: applicationFee.toFixed(2),
      netAmount: netAmount.toFixed(2),
      triggerEvent: 'milestone_approved' as const,
      approvalTimestamp: new Date(),
      paymentTimestamp: new Date(),
      processorReference: stripeResult.paymentIntentId,
      transferReference: stripeResult.transferId,
      deliverableReference: milestone.deliverableUrl,
      complianceData: complianceData
    };

    const log = await storage.createPaymentLog(logData);
    return log.id;
  }

  /**
   * Checks for completed milestones that haven't been processed
   * Can be called periodically to catch any missed automatic payments
   */
  async processQueuedApprovals(): Promise<PaymentProcessingResult[]> {
    try {
      // Get all approved milestones that don't have payments yet
      const unprocessedMilestones = await storage.getApprovedMilestonesWithoutPayments();
      
      const results: PaymentProcessingResult[] = [];
      
      for (const milestone of unprocessedMilestones) {
        if (milestone.autoPayEnabled) {
          const result = await this.processMilestoneApproval(milestone.id, milestone.approvedBy || 0);
          results.push(result);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error processing queued approvals:', error);
      return [{ success: false, error: String(error) }];
    }
  }
}

export const automatedPaymentService = new AutomatedPaymentService();
export default automatedPaymentService;