
export type InvoiceComplianceProfile = {
  countryCode: string;
  region: 'UK' | 'US' | 'EU' | 'OTHER';
  taxLabel: string;                    // 'VAT', 'Sales Tax', 'Tax'
  documentLabelBusiness: string;       // label for business invoice
  documentLabelContractor: string;     // label for contractor receipt
  notes: string;                       // disclaimer text
};

const DEFAULT_PROFILE: InvoiceComplianceProfile = {
  countryCode: 'XX',
  region: 'OTHER',
  taxLabel: 'Tax',
  documentLabelBusiness: 'Invoice',
  documentLabelContractor: 'Payment Receipt',
  notes:
    'This document is generated for bookkeeping purposes. Interlinc does not submit documents to tax authorities on your behalf.',
};

const PROFILES: Record<string, InvoiceComplianceProfile> = {
  GB: {
    countryCode: 'GB',
    region: 'UK',
    taxLabel: 'VAT',
    documentLabelBusiness: 'Invoice',
    documentLabelContractor: 'Payment Receipt',
    notes:
      'This document is prepared for UK bookkeeping. Interlinc does not file VAT returns or submit documents to HMRC.',
  },
  US: {
    countryCode: 'US',
    region: 'US',
    taxLabel: 'Sales Tax',
    documentLabelBusiness: 'Invoice',
    documentLabelContractor: 'Payment Receipt',
    notes:
      'Sales tax treatment depends on state and nexus. Interlinc does not calculate or remit sales tax.',
  },
  DE: {
    countryCode: 'DE',
    region: 'EU',
    taxLabel: 'VAT',
    documentLabelBusiness: 'Rechnung',
    documentLabelContractor: 'Zahlungsbeleg',
    notes:
      'EU VAT rules may apply. This document is for bookkeeping; consult your tax advisor for classification and filing.',
  },
};

export function getInvoiceComplianceProfile(
  countryCode?: string | null
): InvoiceComplianceProfile {
  if (!countryCode) return DEFAULT_PROFILE;
  return PROFILES[countryCode] ?? DEFAULT_PROFILE;
}
