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

      // Create payment through Trolley API
      const paymentResult = await this.createTrolleyPayment(
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

      // Update payment with Trolley batch details
      await storage.updatePayment(payment.id, {
        status: 'processing_via_trolley',
        trolleyBatchId: paymentResult.batchId,
        trolleyPaymentId: paymentResult.paymentId
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
        transferId: paymentResult.batchId
      };

    } catch (error) {
      console.error('Error processing milestone approval payment:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Creates payment through Trolley API
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

      // Check if business has Trolley API credentials configured
      if (!process.env.TROLLEY_API_KEY) {
        return { 
          success: false, 
          error: 'Trolley API key not configured. Please add TROLLEY_API_KEY to environment variables.' 
        };
      }

      // Prepare Trolley payment data
      const trolleyPayment = {
        recipient: {
          id: contractor.trolleyRecipientId || contractor.email, // Use Trolley recipient ID if available, fallback to email
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
          memo: `Payment for ${milestone.name} - Contract ${contract.contractCode}`,
          compliance: {
            category: 'contractor_services',
            subcategory: 'milestone_completion'
          }
        },
        metadata: {
          contractId: contract.id,
          milestoneId: milestone.id,
          contractCode: contract.contractCode,
          businessId: contract.businessId,
          platformPaymentId: paymentId,
          coordinationFee: applicationFee
        }
      };

      // Create Trolley batch for payment processing
      const batchData = {
        sourceCurrency: 'USD',
        description: `Milestone payment batch - ${new Date().toISOString()}`,
        payments: [trolleyPayment]
      };

      console.log('Creating Trolley payment batch:', {
        contractorEmail: contractor.email,
        amount: amount,
        milestone: milestone.name,
        contract: contract.contractCode
      });

      // In production, this would make actual API call to Trolley:
      // const response = await fetch('https://api.trolley.com/v1/batches', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.TROLLEY_API_KEY}`,
      //     'Content-Type': 'application/json',
      //     'X-API-Version': '1'
      //   },
      //   body: JSON.stringify(batchData)
      // });

      // For now, simulate successful response
      const mockTrolleyResponse = {
        batch: {
          id: `batch_${Date.now()}`,
          status: 'processing',
          payments: [{
            id: `payment_${Date.now()}`,
            status: 'pending',
            recipient: {
              id: contractor.email
            }
          }]
        }
      };

      return {
        success: true,
        batchId: mockTrolleyResponse.batch.id,
        paymentId: mockTrolleyResponse.batch.payments[0].id
      };

    } catch (error: any) {
      console.error('Trolley payment creation error:', error);
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