import { storage } from '../storage';
import { db } from '../db';
import { invoices, payments, contracts, milestones, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getInvoiceComplianceProfile } from '@shared/invoiceCompliance';
import type { InterlincInvoiceV1 } from '@shared/invoiceTypes';

interface InvoiceGenerationParams {
  paymentId: number;
  stripePaymentIntentId: string;
  stripeTransactionId?: string;
}

export class InvoiceGeneratorService {
  /**
   * Generate invoice automatically when payment succeeds
   */
  async generateInvoiceForPayment(params: InvoiceGenerationParams): Promise<number> {
    const { paymentId, stripePaymentIntentId, stripeTransactionId } = params;

    // Get payment details
    const payment = await storage.getPayment(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    // Get contract details
    const contract = payment.contractId ? await storage.getContract(payment.contractId) : null;

    // Get milestone details
    const milestone = payment.milestoneId ? await storage.getMilestone(payment.milestoneId) : null;

    // Get business user
    const businessUser = payment.businessId
      ? await storage.getUser(payment.businessId)
      : contract
        ? await storage.getUser(contract.businessId)
        : null;

    // Get contractor user
    const contractorUser = payment.contractorId
      ? await storage.getUser(payment.contractorId)
      : contract
        ? await storage.getUser(contract.contractorId)
        : null;

    if (!businessUser || !contractorUser) {
      throw new Error('Missing business or contractor user data');
    }

    const businessCurrency = businessUser.currency || 'GBP';
    const complianceProfile = getInvoiceComplianceProfile(businessUser.country);

    // Generate unique invoice number
    const invoiceNumber = await this.generateInvoiceNumber(paymentId);

    // Calculate amounts
    const grossAmount = parseFloat(payment.amount);
    const platformFee = payment.platformFeeAmount ? parseFloat(payment.platformFeeAmount.toString()) : 0;
    const netAmount = payment.netAmount ? parseFloat(payment.netAmount.toString()) : grossAmount;

    // Build work description
    const description = milestone?.name || contract?.contractName || payment.notes || 'Professional services';
    const workReference = milestone
      ? `Milestone: ${milestone.name}`
      : contract
        ? `Project: ${contract.contractName}`
        : 'Direct payment';

    // Build business invoice (business's expense)
    const businessInvoiceData: InterlincInvoiceV1 = {
      schemaVersion: 'interlinc-invoice-v1',
      documentType: 'business_invoice',
      documentLabel: complianceProfile.documentLabelBusiness,
      invoiceNumber,
      issueDate: new Date().toISOString(),
      supplyDate: new Date().toISOString(),
      currency: businessCurrency,
      supplier: {
        legalName: contractorUser.username,
        tradingName: contractorUser.companyName || null,
        address: contractorUser.address || 'Address on file',
        country: contractorUser.country || null,
        taxId: contractorUser.taxId || null,
      },
      customer: {
        legalName: businessUser.companyName || businessUser.username,
        address: businessUser.address || 'Address on file',
        country: businessUser.country || null,
        taxId: businessUser.taxId || null,
      },
      lineItems: [
        {
          description,
          quantity: 1,
          unitPrice: grossAmount,
          lineNet: grossAmount,
          taxRate: 0,
          taxAmount: 0,
          lineGross: grossAmount,
        },
      ],
      totals: {
        net: grossAmount,
        tax: 0,
        gross: grossAmount,
      },
      paymentDetails: {
        method: 'Stripe Connect',
        transactionReference: stripePaymentIntentId || stripeTransactionId || null,
        paidAt: payment.completedDate || new Date().toISOString(),
        status: 'paid',
      },
      references: {
        paymentId: paymentId,
        contractId: payment.contractId,
        milestoneId: payment.milestoneId,
        workSummary: workReference,
      },
      compliance: {
        jurisdictionHint: businessUser.country || null,
        region: complianceProfile.region,
        taxLabel: complianceProfile.taxLabel,
        notes: complianceProfile.notes,
        generatedBy: 'Interlinc',
        generatedAt: new Date().toISOString(),
      },
    };

    // Build contractor receipt (contractor's income)
    const contractorInvoiceData: InterlincInvoiceV1 = {
      schemaVersion: 'interlinc-invoice-v1',
      documentType: 'contractor_receipt',
      documentLabel: complianceProfile.documentLabelContractor,
      invoiceNumber,
      issueDate: new Date().toISOString(),
      supplyDate: new Date().toISOString(),
      currency: businessCurrency,
      supplier: {
        legalName: contractorUser.username,
        tradingName: contractorUser.companyName || null,
        address: contractorUser.address || 'Address on file',
        country: contractorUser.country || null,
        taxId: contractorUser.taxId || null,
      },
      customer: {
        legalName: businessUser.companyName || businessUser.username,
        address: businessUser.address || 'Address on file',
        country: businessUser.country || null,
        taxId: businessUser.taxId || null,
      },
      lineItems: [
        {
          description,
          quantity: 1,
          unitPrice: grossAmount,
          lineNet: grossAmount,
          taxRate: 0,
          taxAmount: 0,
          lineGross: grossAmount,
        },
      ],
      totals: {
        net: grossAmount,
        tax: 0,
        gross: grossAmount,
      },
      paymentDetails: {
        method: 'Stripe Connect',
        transactionReference: stripePaymentIntentId || stripeTransactionId || null,
        paidAt: payment.completedDate || new Date().toISOString(),
        status: 'paid',
      },
      references: {
        paymentId: paymentId,
        contractId: payment.contractId,
        milestoneId: payment.milestoneId,
        workSummary: workReference,
      },
      compliance: {
        jurisdictionHint: businessUser.country || null,
        region: complianceProfile.region,
        taxLabel: complianceProfile.taxLabel,
        notes: complianceProfile.notes,
        generatedBy: 'Interlinc',
        generatedAt: new Date().toISOString(),
      },
    };

    // Insert BUSINESS invoice (expense proof)
    const [businessInvoice] = await db.insert(invoices).values({
      businessUserId: payment.businessUserId,
      contractorUserId: payment.contractorUserId,
      paymentId,
      invoiceNumber,
      amount: grossAmount.toString(),
      currency: businessCurrency,
      description: `Payment to ${contractorUser.username} for ${description}`,
      issueDate: new Date(),
      workReference,
      stripePaymentIntentId: stripePaymentIntentId || undefined,
      stripeTransactionId: stripeTransactionId || undefined,
      invoiceData: businessInvoiceData,
    }).returning();

    // Insert CONTRACTOR invoice (income proof)
    const [contractorInvoice] = await db.insert(invoices).values({
      businessUserId: payment.businessUserId,
      contractorUserId: payment.contractorUserId,
      paymentId,
      invoiceNumber: `${invoiceNumber}-C`, // Add suffix to distinguish contractor copy
      amount: grossAmount.toString(),
      currency: businessCurrency,
      description: `Payment from ${businessUser.companyName || businessUser.username} for ${description}`,
      issueDate: new Date(),
      workReference,
      stripePaymentIntentId: stripePaymentIntentId || undefined,
      stripeTransactionId: stripeTransactionId || undefined,
      invoiceData: contractorInvoiceData,
    }).returning();

    console.log(`✅ AUTO-GENERATED DUAL INVOICES for payment ${paymentId}`);
    console.log(`   📄 Business Invoice: ${invoiceNumber} (Expense Proof)`);
    console.log(`   📄 Contractor Invoice: ${invoiceNumber}-C (Income Proof)`);
    console.log(`   Business: ${businessUser.username} → Contractor: ${contractorUser.username}`);
    console.log(`   Business Paid: £${grossAmount.toFixed(2)} | Contractor Received: £${netAmount.toFixed(2)}`);

    return businessInvoice.id;
  }

  /**
   * Generate sequential invoice number
   */
  private async generateInvoiceNumber(paymentId: number): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Format: INV-YYYY-MM-XXXXX
    const prefix = `INV-${year}-${month}`;

    // Get count of invoices this month for sequence number
    const count = await db.$count(invoices);
    const sequence = String(count + 1).padStart(5, '0');

    return `${prefix}-${sequence}`;
  }
}

export const invoiceGenerator = new InvoiceGeneratorService();

/**
 * Helper function to trigger invoice generation from payment webhooks
 */
export async function generateInvoiceFromPayment(paymentId: number): Promise<void> {
  try {
    const payment = await storage.getPayment(paymentId);
    if (!payment) {
      console.error(`Payment ${paymentId} not found for invoice generation`);
      return;
    }

    // Only generate if payment is completed and no invoice exists yet
    if (payment.status !== 'completed') {
      console.log(`Payment ${paymentId} not completed, skipping invoice generation`);
      return;
    }

    // Check if invoice already exists for this payment
    const existingInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.paymentId, paymentId));

    if (existingInvoices.length > 0) {
      console.log(`Invoice already exists for payment ${paymentId}, skipping`);
      return;
    }

    // Generate invoice
    await invoiceGenerator.generateInvoiceForPayment({
      paymentId,
      stripePaymentIntentId: payment.stripePaymentIntentId || '',
      stripeTransactionId: payment.stripeTransactionId || undefined
    });

    console.log(`✅ Auto-generated invoices for payment ${paymentId}`);
  } catch (error) {
    console.error(`Failed to generate invoice for payment ${paymentId}:`, error);
    throw error;
  }
}