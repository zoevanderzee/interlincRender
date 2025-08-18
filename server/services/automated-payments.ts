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
}

class AutomatedPaymentService {
  
  /**
   * Triggers automatic payment when a deliverable is approved
   * This is the core logic that replaces manual invoice generation
   */
  async processDeliverableApproval(deliverableId: number, approvedBy: number): Promise<PaymentProcessingResult> {
    try {
      // Get deliverable details
      const deliverable = await storage.getDeliverable(deliverableId);
      if (!deliverable) {
        return { success: false, error: 'Deliverable not found' };
      }

      // Get contract details
      const contract = await storage.getContract(deliverable.contractId);
      if (!contract) {
        return { success: false, error: 'Contract not found' };
      }

      // Get contractor details
      const contractor = await storage.getUser(contract.contractorId);
      if (!contractor) {
        return { success: false, error: 'Contractor not found' };
      }

      // Check if auto-pay is enabled for this deliverable
      if (!deliverable.autoPayEnabled) {
        console.log(`Auto-pay disabled for deliverable ${deliverableId}, skipping automatic payment`);
        return { success: false, error: 'Auto-pay disabled for this deliverable' };
      }

      // Check if payment already exists for this deliverable
      const existingPayment = await storage.getPaymentByDeliverableId(deliverableId);
      if (existingPayment && existingPayment.status !== 'failed') {
        return { success: false, error: 'Payment already exists for this deliverable' };
      }

      // Check if contractor has Trolley recipient setup
      if (!contractor.trolleyRecipientId) {
        return { success: false, error: 'Contractor not set up for payments. Please onboard them first.' };
      }

      // Get business user details for budget checking
      const businessUser = await storage.getUser(contract.businessId);
      if (!businessUser) {
        return { success: false, error: 'Business user not found' };
      }

      // Calculate payment amounts
      const totalAmount = parseFloat(deliverable.paymentAmount);
      const platformFeeRate = 0.0025; // 0.25% platform fee
      const applicationFee = totalAmount * platformFeeRate;
      const netAmount = totalAmount - applicationFee;

      // ✅ BUDGET VALIDATION - Check if payment exceeds budget cap
      const budgetInfo = await storage.getBudget(contract.businessId);
      if (budgetInfo && budgetInfo.budgetCap) {
        const budgetCap = parseFloat(budgetInfo.budgetCap);
        const budgetUsed = parseFloat(budgetInfo.budgetUsed || '0');
        const budgetRemaining = budgetCap - budgetUsed;

        if (totalAmount > budgetRemaining) {
          console.log(`🚫 PAYMENT BLOCKED: Amount $${totalAmount} exceeds remaining budget $${budgetRemaining}`);
          return { 
            success: false, 
            error: `Payment blocked: Amount $${totalAmount.toFixed(2)} exceeds remaining budget $${budgetRemaining.toFixed(2)}. Please increase your budget cap or reduce the payment amount.` 
          };
        }

        console.log(`✅ BUDGET CHECK PASSED: Payment $${totalAmount} within remaining budget $${budgetRemaining}`);
      }

      // Create payment through Trolley API first
      const paymentResult = await trolleyService.createAndProcessPayment({
        recipientId: contractor.trolleyRecipientId,
        amount: netAmount.toFixed(2),
        currency: 'USD',
        memo: `Payment for deliverable: ${deliverable.name}`,
        externalId: `deliverable_${deliverableId}`,
        description: `Deliverable payment for contract ${contract.contractName}`
      });

      if (!paymentResult) {
        return { success: false, error: 'Failed to create Trolley payment' };
      }

      // Create payment record in database
      const paymentData = {
        contractId: deliverable.contractId,
        deliverableId: deliverableId,
        amount: deliverable.paymentAmount,
        status: 'processing' as const,
        scheduledDate: new Date(),
        triggeredBy: 'auto_approval' as const,
        triggeredAt: new Date(),
        applicationFee: applicationFee.toFixed(2),
        paymentProcessor: 'trolley' as const,
        trolleyBatchId: paymentResult.batch.id,
        trolleyPaymentId: paymentResult.payment.id,
        notes: `Automatically triggered payment for approved deliverable: ${deliverable.name}`
      };

      const payment = await storage.createPayment(paymentData);

      // ✅ BUDGET TRACKING - Deduct payment amount from available budget
      await storage.increaseBudgetUsed(contract.businessId, totalAmount);
      console.log(`✅ BUDGET UPDATED: Deducted $${totalAmount} from business user ${contract.businessId} budget`);

      // Create compliance log
      const logId = await this.createComplianceLog(
        payment.id,
        deliverable,
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
        batchId: paymentResult.batch.id,
        trolleyPaymentId: paymentResult.payment.id
      };

    } catch (error) {
      console.error('Error processing deliverable approval payment:', error);
      return { success: false, error: String(error) };
    }
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
    deliverable: any,
    contract: any
  ): Promise<{ success: boolean; batchId?: string; paymentId?: string; error?: string }> {
    try {
      // Get business owner details
      const business = await storage.getUser(contract.businessId);
      if (!business) {
        return { success: false, error: 'Business user not found' };
      }

      // Check if Trolley API is configured
      if (!process.env.TROLLEY_API_KEY) {
        return { 
          success: false, 
          error: 'Trolley API key not configured. Contact support to enable payment processing.' 
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
          memo: `Deliverable: ${deliverable.name} - Contract ${contract.contractCode}`,
          compliance: {
            category: 'contractor_services',
            subcategory: 'deliverable_completion',
            taxCategory: 'professional_services'
          }
        },
        platformMetadata: {
          contractId: contract.id,
          deliverableId: deliverable.id,
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
        deliverable: deliverable.name,
        contract: contract.contractCode
      });

      // LIVE TROLLEY PAYMENT - Create real payment through Trolley API
      const { trolleyService } = await import('../trolley-service');
      
      const trolleyResult = await trolleyService.createAndProcessPayment({
        recipientId: contractor.trolleyRecipientId,
        amount: amount.toString(),
        currency: 'USD',
        memo: `Deliverable: ${deliverable.name} - Contract ${contract.contractCode}`
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
    deliverable: any,
    contract: any,
    contractor: any,
    amount: number,
    applicationFee: number,
    netAmount: number,
    stripeResult: any
  ): Promise<number> {
    const complianceData = {
      transaction_type: 'deliverable_payment',
      contract_reference: contract.contractCode,
      deliverable_reference: deliverable.name,
      deliverable_reference: deliverable.deliverableUrl,
      payment_terms: 'Net immediate upon approval',
      service_period: {
        start: contract.startDate,
        end: deliverable.dueDate
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
        trigger_event: 'deliverable_approved',
        processing_timestamp: new Date().toISOString(),
        approval_workflow: 'automatic'
      }
    };

    const logData = {
      paymentId: paymentId,
      contractId: contract.id,
      deliverableId: deliverable.id,
      businessId: contract.businessId,
      contractorId: contractor.id,
      amount: amount.toFixed(2),
      applicationFee: applicationFee.toFixed(2),
      netAmount: netAmount.toFixed(2),
      triggerEvent: 'deliverable_approved' as const,
      approvalTimestamp: new Date(),
      paymentTimestamp: new Date(),
      processorReference: stripeResult.paymentIntentId,
      transferReference: stripeResult.transferId,
      deliverableReference: deliverable.deliverableUrl,
      complianceData: complianceData
    };

    const log = await storage.createPaymentLog(logData);
    return log.id;
  }

  /**
   * Checks for completed deliverables that haven't been processed
   * Can be called periodically to catch any missed automatic payments
   */
  async processQueuedApprovals(): Promise<PaymentProcessingResult[]> {
    try {
      // Get all approved deliverables that don't have payments yet
      const unprocessedDeliverables = await storage.getApprovedDeliverablesWithoutPayments();
      
      const results: PaymentProcessingResult[] = [];
      
      for (const deliverable of unprocessedDeliverables) {
        if (deliverable.autoPayEnabled) {
          const result = await this.processDeliverableApproval(deliverable.id, deliverable.approvedBy || 0);
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