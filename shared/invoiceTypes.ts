
export type InterlincInvoiceV1 = {
  schemaVersion: 'interlinc-invoice-v1';

  documentType: 'business_invoice' | 'contractor_receipt';
  documentLabel: string; // e.g. 'Invoice', 'Payment Receipt', 'VAT Invoice'

  invoiceNumber: string;
  issueDate: string;                    // ISO string
  supplyDate?: string | null;           // optional
  currency: string;                     // ISO 4217: 'GBP', 'USD', 'EUR', ...

  supplier: {
    legalName: string;
    tradingName?: string | null;
    address: string | null;
    country: string | null;            // ISO 3166-1 alpha-2
    taxId?: string | null;
  };

  customer: {
    legalName: string;
    address: string | null;
    country: string | null;
    taxId?: string | null;
  };

  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineNet: number;
    taxRate: number;                   // percent, e.g. 0, 20
    taxAmount: number;
    lineGross: number;
  }>;

  totals: {
    net: number;
    tax: number;
    gross: number;
  };

  paymentDetails: {
    method: string;
    transactionReference?: string | null; // e.g. Stripe PI
    paidAt: string;                       // ISO
    status: 'paid' | 'pending' | 'failed';
  };

  references: {
    paymentId: number;
    contractId?: number | null;
    milestoneId?: number | null;
    workSummary?: string | null;       // description / workReference
  };

  compliance: {
    jurisdictionHint: string | null;   // business country code
    region: 'UK' | 'US' | 'EU' | 'OTHER';
    taxLabel: string;                  // 'VAT', 'Sales Tax', 'Tax'
    notes: string;                     // disclaimer
    generatedBy: 'Interlinc';
    generatedAt: string;               // ISO
  };
};
