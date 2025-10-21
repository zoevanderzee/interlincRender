
import { storage } from '../storage';
import { db } from '../db';
import { invoices } from '@shared/schema';

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

    // Create structured invoice data for compliance
    const invoiceData = {
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString(),
      due_date: new Date().toISOString(), // Paid immediately
      paid_date: payment.completedDate || new Date().toISOString(),
      
      seller: {
        name: contractorUser.username,
        email: contractorUser.email,
        address: contractorUser.address || 'Address on file',
        tax_id: contractorUser.taxId || null
      },
      
      buyer: {
        name: businessUser.companyName || businessUser.username,
        email: businessUser.email,
        address: businessUser.address || 'Address on file',
        tax_id: businessUser.taxId || null
      },
      
      line_items: [
        {
          description: description,
          quantity: 1,
          unit_price: grossAmount,
          total: grossAmount
        }
      ],
      
      amounts: {
        subtotal: grossAmount,
        platform_fee: platformFee,
        net_to_contractor: netAmount,
        currency: 'GBP'
      },
      
      payment_details: {
        method: 'Stripe Connect',
        stripe_payment_intent: stripePaymentIntentId,
        stripe_transaction: stripeTransactionId,
        status: 'paid',
        paid_at: payment.completedDate || new Date().toISOString()
      },
      
      compliance: {
        invoice_type: 'e-invoice',
        standard: 'UK MTD compliant',
        generated_by: 'Interlinc automated system',
        generated_at: new Date().toISOString()
      }
    };

    // BUSINESS COPY - Proof of Expense (what they paid)
    const businessInvoiceData = {
      invoice_number: invoiceNumber,
      invoice_type: 'business_expense',
      issue_date: new Date().toISOString(),
      due_date: new Date().toISOString(),
      paid_date: payment.completedDate || new Date().toISOString(),
      
      // Business is the buyer/payer
      buyer: {
        name: businessUser.companyName || businessUser.username,
        email: businessUser.email,
        address: businessUser.address || 'Address on file',
        tax_id: businessUser.taxId || null
      },
      
      // Contractor is the seller/payee
      seller: {
        name: contractorUser.username,
        email: contractorUser.email,
        address: contractorUser.address || 'Address on file',
        tax_id: contractorUser.taxId || null
      },
      
      line_items: [
        {
          description: description,
          quantity: 1,
          unit_price: grossAmount,
          total: grossAmount
        }
      ],
      
      amounts: {
        gross_amount: grossAmount,
        taxes: 0, // No VAT applied
        total_paid: grossAmount,
        currency: 'GBP'
      },
      
      payment_details: {
        method: 'Stripe Connect',
        stripe_payment_intent: stripePaymentIntentId,
        stripe_transaction: stripeTransactionId,
        status: 'paid',
        paid_at: payment.completedDate || new Date().toISOString()
      },
      
      compliance: {
        invoice_type: 'e-invoice',
        standard: 'UK MTD compliant',
        generated_by: 'Interlinc automated system',
        generated_at: new Date().toISOString(),
        footer: 'Invoice issued by Interlinc on behalf of contractors using Stripe Connect. Retain for your tax records.'
      }
    };

    // CONTRACTOR COPY - Proof of Income (what they received)
    const contractorInvoiceData = {
      invoice_number: invoiceNumber,
      invoice_type: 'contractor_income',
      issue_date: new Date().toISOString(),
      due_date: new Date().toISOString(),
      paid_date: payment.completedDate || new Date().toISOString(),
      
      // Contractor is the payee
      payee: {
        name: contractorUser.username,
        email: contractorUser.email,
        address: contractorUser.address || 'Address on file',
        tax_id: contractorUser.taxId || null
      },
      
      // Business is the payer
      payer: {
        name: businessUser.companyName || businessUser.username,
        email: businessUser.email,
        address: businessUser.address || 'Address on file',
        tax_id: businessUser.taxId || null
      },
      
      line_items: [
        {
          description: description,
          quantity: 1,
          unit_price: grossAmount,
          total: grossAmount
        }
      ],
      
      amounts: {
        gross_amount: grossAmount,
        stripe_fees: platformFee,
        net_received: netAmount,
        currency: 'GBP'
      },
      
      payment_details: {
        method: 'Stripe Connect',
        stripe_payment_intent: stripePaymentIntentId,
        stripe_transaction: stripeTransactionId,
        status: 'paid',
        paid_at: payment.completedDate || new Date().toISOString()
      },
      
      compliance: {
        invoice_type: 'payment_receipt',
        standard: 'UK MTD compliant',
        generated_by: 'Interlinc automated system',
        generated_at: new Date().toISOString(),
        footer: 'This document serves as proof of payment. Funds processed by Interlinc via Stripe Connect. Retain for your records.'
      }
    };

    // Insert BUSINESS invoice (expense proof)
    const [businessInvoice] = await db.insert(invoices).values({
      invoiceNumber,
      paymentId,
      contractId: payment.contractId,
      milestoneId: payment.milestoneId,
      businessId: businessUser.id,
      contractorId: contractorUser.id,
      
      issueDate: new Date(),
      dueDate: new Date(),
      paidDate: payment.completedDate || new Date(),
      
      grossAmount: grossAmount.toFixed(2),
      platformFee: '0.00', // Business doesn't see platform fees
      netAmount: grossAmount.toFixed(2), // Business sees full amount paid
      currency: 'GBP',
      
      businessName: businessUser.companyName || businessUser.username,
      businessAddress: businessUser.address || null,
      businessTaxId: businessUser.taxId || null,
      
      contractorName: contractorUser.username,
      contractorAddress: contractorUser.address || null,
      contractorTaxId: contractorUser.taxId || null,
      
      description: `Invoice - ${description}`,
      workReference,
      
      stripePaymentIntentId,
      stripeTransactionId: stripeTransactionId || null,
      paymentMethod: 'Stripe Connect',
      
      status: 'paid',
      invoiceData: businessInvoiceData
    }).returning();

    // Insert CONTRACTOR invoice (income proof)
    const [contractorInvoice] = await db.insert(invoices).values({
      invoiceNumber: `${invoiceNumber}-C`, // Add suffix to distinguish contractor copy
      paymentId,
      contractId: payment.contractId,
      milestoneId: payment.milestoneId,
      businessId: businessUser.id,
      contractorId: contractorUser.id,
      
      issueDate: new Date(),
      dueDate: new Date(),
      paidDate: payment.completedDate || new Date(),
      
      grossAmount: grossAmount.toFixed(2),
      platformFee: platformFee.toFixed(2), // Contractor sees the fees deducted
      netAmount: netAmount.toFixed(2), // Contractor sees net amount received
      currency: 'GBP',
      
      businessName: businessUser.companyName || businessUser.username,
      businessAddress: businessUser.address || null,
      businessTaxId: businessUser.taxId || null,
      
      contractorName: contractorUser.username,
      contractorAddress: contractorUser.address || null,
      contractorTaxId: contractorUser.taxId || null,
      
      description: `Payment Receipt - ${description}`,
      workReference,
      
      stripePaymentIntentId,
      stripeTransactionId: stripeTransactionId || null,
      paymentMethod: 'Stripe Connect',
      
      status: 'paid',
      invoiceData: contractorInvoiceData
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
