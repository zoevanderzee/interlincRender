import { storage } from '../storage';
import { createPaymentIntent } from './stripe';
import { notificationService } from './notifications';

interface PaymentProcessingResult {
  success: boolean;
  paymentId?: number;
  logId?: number;
  error?: string;
  transferId?: string;
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
   * Process approved work payment using Stripe Connect V2
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

      // Calculate payment amounts - V2 Connect handles fees automatically
      const totalAmount = parseFloat(milestone.paymentAmount);
      const netAmount = totalAmount; // Full amount goes to contractor

      console.log(`[PAYMENT_ATTEMPT] Starting Stripe payment for approved milestone ${milestoneId}: $${totalAmount}`);

      // Check if contractor has Stripe Connect account setup
      if (!contractor.stripeConnectAccountId) {
        console.log(`[PAYMENT_FAILED] Contractor ${contractor.id} not set up for Stripe payments`);
        return {
          success: false,
          error: 'Contractor not set up for payments. Work approved but payment cannot be processed until contractor completes Stripe Connect onboarding.'
        };
      }

      // Get business user details for budget checking
      const businessUser = await storage.getUser(contract.businessId);
      if (!businessUser) {
        console.log(`[PAYMENT_FAILED] Business user ${contract.businessId} not found`);
        return { success: false, error: 'Business user not found' };
      }

      // Budget validation - Check if payment exceeds budget cap
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

      // Process payment through Stripe V2 Connect - DESTINATION CHARGES ONLY
      console.log(`[Automated Payments] Processing milestone payment for milestone ${milestoneId}`);

      let transferResult;
      try {
        // Get contractor's Stripe Connect account
        const contractorConnect = await storage.getConnectForUser(contractor.id);

        if (!contractorConnect?.accountId) {
          throw new Error(`Contractor ${contractor.id} does not have a Stripe Connect account`);
        }

        console.log(`[Automated Payments] Creating V2 destination charge (NO MANUAL TRANSFERS):`, {
          destination: contractorConnect.accountId,
          amount: netAmount,
          milestone: milestone.name
        });

        // FIXED: Create payment record FIRST to get database ID for Stripe metadata
        const paymentData = {
          contractId: milestone.contractId,
          milestoneId: milestoneId,
          amount: netAmount.toFixed(2),
          status: 'requires_payment_method' as const,
          processedAt: new Date().toISOString(),
          metadata: {
            approvedBy,
            paymentType: 'destination_charge',
            destinationAccount: contractorConnect.accountId
          }
        };

        const payment = await storage.createPayment(paymentData);
        console.log(`✅ DATABASE PAYMENT RECORD CREATED: Payment ID ${payment.id} for milestone ${milestoneId}`);

        // Create Payment Intent with destination charge - funds go directly to contractor
        // NO manual transfers, NO platform balance, NO /v1/transfers calls
        transferResult = await createPaymentIntent({
          amount: netAmount,
          currency: 'gbp',
          description: `Payment for milestone: ${milestone.name} (Project: ${milestone.contractName})`,
          metadata: {
            paymentId: payment.id.toString(),
            milestoneId: milestoneId.toString(),
            contractorId: contractor.id.toString(),
            businessId: approvedBy.toString(),
            contractId: milestone.contractId.toString(),
            paymentType: 'milestone_completion',
            flow_type: 'destination_charge_standard_account',
            platform: 'interlinc',
            timestamp: new Date().toISOString(),
            net_amount: netAmount.toString(),
            gross_amount: grossAmount.toString(),
            platform_fee: platformFee.toString()
          },
          transferData: {
            destination: contractorConnect.accountId
          }
        });

        // Update payment record with Stripe payment intent details
        await storage.updatePaymentStripeDetails(payment.id, transferResult.id, transferResult.status);

        console.log(`✅ V2 destination charge created successfully (NO TRANSFERS):`, {
          paymentId: payment.id,
          paymentIntentId: transferResult.id,
          amount: netAmount,
          status: transferResult.status
        });
      } catch (stripeError: any) {
        console.log(`[PAYMENT_FAILED] Stripe API error: ${stripeError.message}`);
        return {
          success: false,
          error: `Payment processor error: ${stripeError.message}. Work approved but payment failed.`
        };
      }

      if (!transferResult || !transferResult.id) {
        console.log(`[PAYMENT_FAILED] Stripe payment creation failed`);
        return {
          success: false,
          error: 'Payment processor temporarily unavailable. Work approved but payment failed.'
        };
      }

      // Update budget tracking and create compliance log
      try {
        await storage.increaseBudgetUsed(contract.businessId, totalAmount);
        console.log(`✅ BUDGET UPDATED: Deducted $${totalAmount} from business user ${contract.businessId} budget`);

        // Create compliance log
        const applicationFee = 0; // V2 destination charges don't require platform fees
        const logId = await this.createComplianceLog(
          payment.id,
          milestone,
          contract,
          contractor,
          totalAmount,
          applicationFee,
          netAmount,
          transferResult // Pass transferResult for compliance log
        );

        console.log(`✅ STRIPE PAYMENT_SUCCESS: $${totalAmount} payment processed for milestone ${milestoneId}`);

        // AUTO-GENERATE COMPLIANT E-INVOICES
        try {
          const { invoiceGenerator } = await import('./invoice-generator');
          await invoiceGenerator.generateInvoiceForPayment({
            paymentId: payment.id,
            stripePaymentIntentId: transferResult.id,
            stripeTransactionId: transferResult.id
          });
        } catch (invoiceError) {
          console.error('Invoice generation failed (non-blocking):', invoiceError);
        }

        return {
          success: true,
          paymentId: payment.id,
          logId: logId,
          transferId: transferResult.id, // Payment Intent ID for destination charges
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
      processorReference: stripeResult.transfer_id,
      transferReference: stripeResult.transfer_id,
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
        const result = await this.processMilestoneApproval(milestone.id, milestone.approvedBy || 0);
        results.push(result);
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