import { storage } from '../storage';
import { trolleyService } from '../trolley-service';

interface PaymentProcessingResult {
  success: boolean;
  paymentId?: number;
  logId?: number;
  error?: string;
  transferId?: string;
  batchId?: string;
  trolleyPaymentId?: string;
  // Add fields expected by UI
  payment?: {
    amount: string;
    contractorId: number;
    milestoneId?: number;
    contractId?: number;
  };
}

class AutomatedPaymentService {
  
  /**
   * 🚀 NEW: Non-blocking payment processing for approved work
   * This follows the "approval first, payment second" approach
   * NEVER blocks approval even if payment fails
   */
  async processApprovedWorkPayment(milestoneId: number, approvedBy: number): Promise<PaymentProcessingResult> {
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

      // Calculate payment amounts
      const totalAmount = parseFloat(milestone.paymentAmount);
      const platformFeeRate = 0.0025; // 0.25% platform fee
      const applicationFee = totalAmount * platformFeeRate;
      const netAmount = totalAmount - applicationFee;

      console.log(`[PAYMENT_ATTEMPT] Starting payment for approved milestone ${milestoneId}: $${totalAmount}`);

      // Check if auto-pay is enabled for this milestone
      if (!milestone.autoPayEnabled) {
        console.log(`[PAYMENT_SKIPPED] Auto-pay disabled for milestone ${milestoneId}`);
        return { success: false, error: 'Auto-pay disabled for this milestone' };
      }

      // Check if payment already exists for this milestone
      const existingPayment = await storage.getPaymentByMilestoneId(milestoneId);
      if (existingPayment && existingPayment.status !== 'failed') {
        console.log(`[PAYMENT_SKIPPED] Payment already exists for milestone ${milestoneId}`);
        return { success: false, error: 'Payment already exists for this milestone' };
      }

      // NON-BLOCKING: Check if contractor has Trolley recipient setup
      if (!contractor.trolleyRecipientId) {
        console.log(`[PAYMENT_FAILED] Contractor ${contractor.id} not set up for payments`);
        return { 
          success: false, 
          error: 'Contractor not set up for payments. Work approved but payment cannot be processed until contractor completes onboarding.'
        };
      }

      // Get business user details for budget checking
      const businessUser = await storage.getUser(contract.businessId);
      if (!businessUser) {
        console.log(`[PAYMENT_FAILED] Business user ${contract.businessId} not found`);
        return { success: false, error: 'Business user not found' };
      }

      // NON-BLOCKING: Budget validation - Check if payment exceeds budget cap
      let budgetWarning = null;
      const budgetInfo = await storage.getBudget(contract.businessId);
      if (budgetInfo && budgetInfo.budgetCap) {
        const budgetCap = parseFloat(budgetInfo.budgetCap);
        const budgetUsed = parseFloat(budgetInfo.budgetUsed || '0');
        const budgetRemaining = budgetCap - budgetUsed;

        if (totalAmount > budgetRemaining) {
          console.log(`⚠️ PAYMENT_BUDGET_WARNING: Amount $${totalAmount} exceeds remaining budget $${budgetRemaining}`);
          budgetWarning = `Payment amount $${totalAmount.toFixed(2)} exceeds remaining budget $${budgetRemaining.toFixed(2)}. Work approved but payment cannot be processed. Please increase your budget cap.`;
          
          return { 
            success: false, 
            error: budgetWarning
          };
        }

        console.log(`✅ BUDGET CHECK PASSED: Payment $${totalAmount} within remaining budget $${budgetRemaining}`);
      }

      // Attempt payment through Trolley API
      let paymentResult = null;
      try {
        paymentResult = await trolleyService.createAndProcessPayment({
          recipientId: contractor.trolleyRecipientId,
          amount: netAmount.toFixed(2),
          currency: 'USD',
          memo: `Payment for milestone: ${milestone.name}`,
          externalId: `milestone_${milestoneId}`,
          description: `Milestone payment for contract ${contract.contractName}`
        });
      } catch (trolleyError: any) {
        console.log(`[PAYMENT_FAILED] Trolley API error: ${trolleyError.message}`);
        return { 
          success: false, 
          error: `Payment processor error: ${trolleyError.message}. Work approved but payment failed.`
        };
      }

      if (!paymentResult) {
        console.log(`[PAYMENT_FAILED] Trolley payment creation failed`);
        return { 
          success: false, 
          error: 'Payment processor temporarily unavailable. Work approved but payment failed.'
        };
      }

      // Create payment record in database
      try {
        const paymentData = {
          contractId: milestone.contractId,
          milestoneId: milestoneId,
          amount: milestone.paymentAmount,
          status: 'processing' as const,
          scheduledDate: new Date(),
          triggeredBy: 'auto_approval' as const,
          triggeredAt: new Date(),
          applicationFee: applicationFee.toFixed(2),
          paymentProcessor: 'trolley' as const,
          trolleyBatchId: paymentResult.batch.id,
          trolleyPaymentId: paymentResult.payment.id,
          notes: `Automatically triggered payment for approved milestone: ${milestone.name}`
        };

        const payment = await storage.createPayment(paymentData);

        // Update budget tracking
        await storage.increaseBudgetUsed(contract.businessId, totalAmount);
        console.log(`✅ BUDGET UPDATED: Deducted $${totalAmount} from business user ${contract.businessId} budget`);

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

        console.log(`✅ PAYMENT_SUCCESS: $${totalAmount} payment processed for milestone ${milestoneId}`);

        return {
          success: true,
          paymentId: payment.id,
          logId: logId,
          batchId: paymentResult.batch.id,
          trolleyPaymentId: paymentResult.payment.id,
          payment: {
            amount: milestone.paymentAmount,
            contractorId: contractor.id,
            milestoneId: milestone.id,
            contractId: contract.id
          }
        };
      } catch (dbError: any) {
        console.error(`[PAYMENT_FAILED] Database error while recording payment:`, dbError);
        return { 
          success: false, 
          error: `Payment processed but database recording failed: ${dbError.message}`
        };
      }

    } catch (error: any) {
      console.error(`[PAYMENT_FAILED] Unexpected error in payment processing:`, error);
      return { 
        success: false, 
        error: `Unexpected payment error: ${error.message}. Work approved but payment failed.`
      };
    }
  }

  /**
   * @deprecated Use processApprovedWorkPayment instead
   * Legacy method with blocking validation - kept for backward compatibility
   */
  async processMilestoneApproval(milestoneId: number, approvedBy: number): Promise<PaymentProcessingResult> {
    console.log(`[DEPRECATED] processMilestoneApproval called - redirecting to processApprovedWorkPayment`);
    return this.processApprovedWorkPayment(milestoneId, approvedBy);
  }

  /**
   * Creates payment through Trolley Embedded Payouts
   * Company wallet funds are used to pay contractors
   */
  private async createTrolleyPayment(
    paymentId: number,
    amount: number,
    applicationFee: number,
    contractor: any,
    milestone: any,
    contract: any
  ): Promise<{ success: boolean; batchId?: string; paymentId?: string; error?: string }> {
    try {
      // Get business owner details
      const business = await storage.getUser(contract.businessId);
      if (!business) {
        return { success: false, error: 'Business user not found' };
      }

      // Check if Trolley API is configured
      if (!trolleyService.isConfigured()) {
        return { 
          success: false, 
          error: 'Payment processing not configured. Contact support to enable payment processing.' 
        };
      }

      // Check if business has Trolley company profile
      if (!business.trolleyCompanyProfileId) {
        return {
          success: false,
          error: 'Company must complete Trolley onboarding before processing payments. Please visit Payment Setup.'
        };
      }

      // Prepare Trolley Embedded Payout data
      const embeddedPayoutData = {
        companyProfileId: business.trolleyCompanyProfileId,
        recipient: {
          id: contractor.trolleyRecipientId || contractor.email,
          email: contractor.email,
          firstName: contractor.firstName,
          lastName: contractor.lastName,
          type: 'individual'
        },
        payment: {
          sourceAmount: amount,
          sourceCurrency: 'USD',
          targetCurrency: contractor.preferredCurrency || 'USD',
          purpose: 'contractor_payment',
          memo: `Milestone: ${milestone.name} - Contract ${contract.contractCode}`,
          compliance: {
            category: 'contractor_services',
            subcategory: 'milestone_completion',
            taxCategory: 'professional_services'
          }
        },
        platformMetadata: {
          contractId: contract.id,
          milestoneId: milestone.id,
          contractCode: contract.contractCode,
          businessId: contract.businessId,
          platformPaymentId: paymentId,
          platformFee: applicationFee,
          netContractorAmount: amount
        }
      };

      console.log('Processing Trolley Embedded Payout:', {
        companyProfile: business.trolleyCompanyProfileId,
        contractorEmail: contractor.email,
        amount: amount,
        milestone: milestone.name,
        contract: contract.contractCode
      });

      // LIVE TROLLEY PAYMENT - Create real payment through Trolley API
      const { trolleyService } = await import('../trolley-service');
      
      const trolleyResult = await trolleyService.createAndProcessPayment({
        recipientId: contractor.trolleyRecipientId,
        amount: amount.toString(),
        currency: 'USD',
        memo: `Milestone: ${milestone.name} - Contract ${contract.contractCode}`
      });

      if (!trolleyResult) {
        return { success: false, error: 'Failed to create live Trolley payment' };
      }

      console.log('✅ LIVE TROLLEY PAYMENT CREATED:', trolleyResult.payment.id);

      return {
        success: true,
        batchId: trolleyResult.batch.id,
        paymentId: trolleyResult.payment.id
      };

    } catch (error: any) {
      console.error('Trolley Embedded Payout error:', error);
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