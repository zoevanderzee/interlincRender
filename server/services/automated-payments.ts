import { storage } from '../storage';

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
      const platformFeeRate = 0.0025; // 0.25% platform fee
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

      // Create payment instruction for third-party provider
      const paymentResult = await this.createPaymentInstruction(
        payment.id,
        netAmount,
        applicationFee,
        contractor,
        milestone,
        contract
      );

      if (!paymentResult.success) {
        await storage.updatePayment(payment.id, { status: 'failed' });
        return { success: false, error: paymentResult.error };
      }

      // Update payment with provider instruction details
      await storage.updatePayment(payment.id, {
        status: 'pending_provider_processing',
        providerInstructionId: paymentResult.instructionId
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
        paymentResult
      );

      return {
        success: true,
        paymentId: payment.id,
        logId: logId,
        instructionId: paymentResult.instructionId
      };

    } catch (error) {
      console.error('Error processing milestone approval payment:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Creates payment instruction for third-party provider
   */
  private async createPaymentInstruction(
    paymentId: number,
    amount: number,
    applicationFee: number,
    contractor: any,
    milestone: any,
    contract: any
  ): Promise<{ success: boolean; instructionId?: string; error?: string }> {
    try {
      // Get business owner details
      const business = await storage.getUser(contract.businessId);
      if (!business) {
        return { success: false, error: 'Business user not found' };
      }

      // Check if business has connected payment providers
      // This would check for Wise, Payoneer, Bill.com, etc. connections
      const paymentProviders = []; // Would fetch from database
      
      if (paymentProviders.length === 0) {
        return { 
          success: false, 
          error: 'Business must connect a payment provider before automated payments can be processed. Please visit Payment Providers settings.' 
        };
      }

      // Create payment instruction record
      const paymentInstruction = {
        paymentId: paymentId,
        businessId: contract.businessId,
        contractorId: contractor.id,
        milestoneId: milestone.id,
        contractId: contract.id,
        amount: amount.toString(),
        platformFee: applicationFee.toString(),
        contractorEmail: contractor.email,
        contractorName: `${contractor.firstName} ${contractor.lastName}`,
        description: `Payment for milestone: ${milestone.name}`,
        status: 'pending_provider_processing',
        providerInstructions: {
          recipient: {
            email: contractor.email,
            name: `${contractor.firstName} ${contractor.lastName}`,
            // Additional contractor payment details would be added here
          },
          amount: amount,
          currency: 'USD',
          reference: `Milestone-${milestone.id}-Contract-${contract.id}`,
          memo: `Payment for ${milestone.name} - ${contract.contractName}`
        }
      };

      // In a real implementation, this would:
      // 1. Send payment instruction to connected provider's API
      // 2. Store the provider's transaction ID
      // 3. Set up webhooks to track payment status
      
      return {
        success: true,
        instructionId: `instruction_${Date.now()}_${paymentId}`
      };

    } catch (error: any) {
      console.error('Payment instruction creation error:', error);
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