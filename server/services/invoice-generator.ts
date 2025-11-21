import { storage } from '../storage';
import { db } from '../db';
import { invoices } from '@shared/schema';
import { getInvoiceComplianceProfile } from '@shared/invoiceCompliance';
import type { InterlincInvoiceV1 } from '@shared/invoiceTypes';

export class InvoiceGeneratorService {
  /**
   * Generate invoice automatically when payment succeeds
   */
  async generateInvoiceForPayment(params: { paymentId: number; stripePaymentIntentId?: string; stripeTransactionId?: string; documentType: 'business_invoice' | 'contractor_receipt'; }): Promise<number> {
    const { paymentId, stripePaymentIntentId, stripeTransactionId, documentType } = params;

    const context = await this.getInvoiceContext(paymentId);
    const businessCurrency = context.businessUser.currency || 'GBP';
    const complianceProfile = getInvoiceComplianceProfile(context.businessUser.country);

    const baseInvoiceNumber = await this.resolveBaseInvoiceNumber(paymentId);
    const invoiceNumber = documentType === 'contractor_receipt' ? `${baseInvoiceNumber}-C` : baseInvoiceNumber;
    const grossAmount = context.grossAmount;
    const netAmount = context.netAmount;
    const workReference = context.workReference;
    const description = context.description;

    const invoiceData: InterlincInvoiceV1 = {
      schemaVersion: 'interlinc-invoice-v1',
      documentType,
      documentLabel: documentType === 'business_invoice'
        ? complianceProfile.documentLabelBusiness
        : complianceProfile.documentLabelContractor,
      invoiceNumber: baseInvoiceNumber,
      issueDate: new Date().toISOString(),
      supplyDate: new Date().toISOString(),
      currency: businessCurrency,
      supplier: {
        legalName: context.contractorUser.username,
        tradingName: context.contractorUser.companyName || null,
        address: context.contractorUser.address || 'Address on file',
        country: context.contractorUser.country || null,
        taxId: context.contractorUser.taxId || null,
      },
      customer: {
        legalName: context.businessUser.companyName || context.businessUser.username,
        address: context.businessUser.address || 'Address on file',
        country: context.businessUser.country || null,
        taxId: context.businessUser.taxId || null,
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
        paidAt: context.payment.completedDate || new Date().toISOString(),
        status: 'paid',
      },
      references: {
        paymentId: paymentId,
        contractId: context.payment.contractId,
        milestoneId: context.payment.milestoneId,
        workSummary: workReference,
      },
      compliance: {
        jurisdictionHint: context.businessUser.country || null,
        region: complianceProfile.region,
        taxLabel: complianceProfile.taxLabel,
        notes: complianceProfile.notes,
        generatedBy: 'Interlinc',
        generatedAt: new Date().toISOString(),
      },
    };

    const [insertedInvoice] = await db.insert(invoices).values({
      paymentId,
      contractId: context.payment.contractId || null,
      milestoneId: context.payment.milestoneId || null,
      businessId: context.payment.businessId,
      contractorId: context.payment.contractorId!,
      invoiceNumber,
      issueDate: new Date(),
      grossAmount: grossAmount.toString(),
      platformFee: context.platformFee.toString(),
      netAmount: netAmount.toString(),
      currency: businessCurrency,
      businessName: context.businessUser.companyName || context.businessUser.username,
      businessAddress: context.businessUser.address || 'Address on file',
      businessTaxId: context.businessUser.taxId || null,
      contractorName: context.contractorUser.username,
      contractorAddress: context.contractorUser.address || 'Address on file',
      contractorTaxId: context.contractorUser.taxId || null,
      description: documentType === 'business_invoice'
        ? `Payment to ${context.contractorUser.username} for ${description}`
        : `Payment from ${context.businessUser.companyName || context.businessUser.username} for ${description}`,
      workReference,
      stripePaymentIntentId: stripePaymentIntentId || context.payment.stripePaymentIntentId || undefined,
      stripeTransactionId: stripeTransactionId || context.payment.stripeTransactionId || undefined,
      paymentMethod: 'Stripe Connect',
      status: 'paid',
      invoiceData,
    }).returning();

    console.log(`✅ Generated ${documentType === 'business_invoice' ? 'business invoice' : 'contractor receipt'} ${invoiceNumber} for payment ${paymentId}`);
    return insertedInvoice.id;
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

  private async resolveBaseInvoiceNumber(paymentId: number): Promise<string> {
    const existingInvoices = await storage.getInvoicesByPaymentId(paymentId);
    const businessInvoice = existingInvoices.find(inv => inv.invoiceData?.documentType === 'business_invoice');
    if (businessInvoice?.invoiceNumber) {
      return businessInvoice.invoiceNumber.replace(/-C$/, '');
    }

    const contractorInvoice = existingInvoices.find(inv => inv.invoiceData?.documentType === 'contractor_receipt');
    if (contractorInvoice?.invoiceNumber) {
      return contractorInvoice.invoiceNumber.replace(/-C$/, '');
    }

    return this.generateInvoiceNumber(paymentId);
  }

  private async getInvoiceContext(paymentId: number) {
    const payment = await storage.getPayment(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const contract = payment.contractId ? await storage.getContract(payment.contractId) : null;
    const milestone = payment.milestoneId ? await storage.getMilestone(payment.milestoneId) : null;
    const businessUser = payment.businessId
      ? await storage.getUser(payment.businessId)
      : contract
        ? await storage.getUser(contract.businessId)
        : null;

    const contractorUser = payment.contractorId
      ? await storage.getUser(payment.contractorId)
      : contract
        ? await storage.getUser(contract.contractorId)
        : null;

    if (!businessUser || !contractorUser) {
      throw new Error('Missing business or contractor user data');
    }

    const grossAmount = parseFloat(payment.amount.toString());
    const platformFee = payment.applicationFee ? parseFloat(payment.applicationFee.toString()) : 0;
    const netAmount = grossAmount - platformFee;

    const description = milestone?.name || contract?.contractName || payment.notes || 'Professional services';
    const workReference = milestone
      ? `Milestone: ${milestone.name}`
      : contract
        ? `Project: ${contract.contractName}`
        : 'Direct payment';

    return {
      payment,
      contract,
      milestone,
      businessUser,
      contractorUser,
      grossAmount,
      platformFee,
      netAmount,
      description,
      workReference,
    };
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

    const invoicesForPayment = await storage.getInvoicesByPaymentId(paymentId);

    if (invoicesForPayment.some(inv => inv.invoiceData?.documentType === 'business_invoice')) {
      console.log(`Business invoice already exists for payment ${paymentId}, skipping`);
    } else if (payment.stripePaymentIntentStatus === 'succeeded' || payment.status === 'completed') {
      await invoiceGenerator.generateInvoiceForPayment({
        paymentId,
        stripePaymentIntentId: payment.stripePaymentIntentId || undefined,
        stripeTransactionId: payment.stripeTransactionId || undefined,
        documentType: 'business_invoice',
      });
    }

    if (payment.status === 'completed' && !invoicesForPayment.some(inv => inv.invoiceData?.documentType === 'contractor_receipt')) {
      await invoiceGenerator.generateInvoiceForPayment({
        paymentId,
        stripePaymentIntentId: payment.stripePaymentIntentId || undefined,
        stripeTransactionId: payment.stripeTransactionId || undefined,
        documentType: 'contractor_receipt',
      });
    }

    console.log(`✅ Auto-generated invoices for payment ${paymentId} if missing`);
  } catch (error) {
    console.error(`Failed to generate invoice for payment ${paymentId}:`, error);
    throw error;
  }
}

export async function generateBusinessInvoiceForPayment(
  paymentId: number,
  stripePaymentIntentId?: string,
  stripeTransactionId?: string
): Promise<void> {
  const existingInvoices = await storage.getInvoicesByPaymentId(paymentId);
  if (existingInvoices.some(inv => inv.invoiceData?.documentType === 'business_invoice')) {
    console.log(`Business invoice already exists for payment ${paymentId}, skipping generation.`);
    return;
  }

  await invoiceGenerator.generateInvoiceForPayment({
    paymentId,
    stripePaymentIntentId,
    stripeTransactionId,
    documentType: 'business_invoice',
  });
}

export async function generateContractorReceiptForPayment(
  paymentId: number,
  stripePaymentIntentId?: string,
  stripeTransactionId?: string
): Promise<void> {
  const existingInvoices = await storage.getInvoicesByPaymentId(paymentId);
  if (existingInvoices.some(inv => inv.invoiceData?.documentType === 'contractor_receipt')) {
    console.log(`Contractor receipt already exists for payment ${paymentId}, skipping generation.`);
    return;
  }

  await invoiceGenerator.generateInvoiceForPayment({
    paymentId,
    stripePaymentIntentId,
    stripeTransactionId,
    documentType: 'contractor_receipt',
  });
}