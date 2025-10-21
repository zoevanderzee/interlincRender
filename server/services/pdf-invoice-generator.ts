
import PDFDocument from 'pdfkit';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';

interface InvoicePDFData {
  invoiceNumber: string;
  invoiceType: 'business_expense' | 'contractor_income';
  issueDate: string;
  paidDate: string;
  buyer: {
    name: string;
    email: string;
    address: string | null;
    taxId: string | null;
  };
  seller: {
    name: string;
    email: string;
    address: string | null;
    taxId: string | null;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  amounts: {
    grossAmount: number;
    platformFee?: number;
    netAmount: number;
    currency: string;
  };
  paymentDetails: {
    method: string;
    stripePaymentIntent: string;
    status: string;
    paidAt: string;
  };
  compliance: {
    invoiceType: string;
    standard: string;
    generatedBy: string;
    generatedAt: string;
    footer: string;
  };
}

export class PDFInvoiceGenerator {
  private uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');

  constructor() {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async generateInvoicePDF(invoiceData: InvoicePDFData): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileName = `invoice-${invoiceData.invoiceNumber}.pdf`;
      const filePath = path.join(this.uploadsDir, fileName);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();

      // Invoice Details
      doc.fontSize(10);
      doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, { align: 'right' });
      doc.text(`Issue Date: ${new Date(invoiceData.issueDate).toLocaleDateString()}`, { align: 'right' });
      doc.text(`Payment Date: ${new Date(invoiceData.paidDate).toLocaleDateString()}`, { align: 'right' });
      doc.text(`Status: ${invoiceData.paymentDetails.status.toUpperCase()}`, { align: 'right' });
      doc.moveDown(2);

      // From/To Information
      const isBusinessInvoice = invoiceData.invoiceType === 'business_expense';
      
      doc.fontSize(12).text(isBusinessInvoice ? 'FROM (Service Provider):' : 'TO (Client):');
      doc.fontSize(10);
      doc.text(invoiceData.seller.name);
      doc.text(invoiceData.seller.email);
      if (invoiceData.seller.address) {
        doc.text(invoiceData.seller.address);
      }
      if (invoiceData.seller.taxId) {
        doc.text(`Tax ID: ${invoiceData.seller.taxId}`);
      }
      doc.moveDown();

      doc.fontSize(12).text(isBusinessInvoice ? 'TO (Client):' : 'PAYMENT TO:');
      doc.fontSize(10);
      doc.text(invoiceData.buyer.name);
      doc.text(invoiceData.buyer.email);
      if (invoiceData.buyer.address) {
        doc.text(invoiceData.buyer.address);
      }
      if (invoiceData.buyer.taxId) {
        doc.text(`Tax ID: ${invoiceData.buyer.taxId}`);
      }
      doc.moveDown(2);

      // Line Items Table
      doc.fontSize(12).text('SERVICES PROVIDED:', { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const descriptionX = 50;
      const quantityX = 300;
      const priceX = 370;
      const totalX = 450;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', descriptionX, tableTop);
      doc.text('Qty', quantityX, tableTop);
      doc.text('Price', priceX, tableTop);
      doc.text('Total', totalX, tableTop);

      doc.font('Helvetica');
      let itemY = tableTop + 20;

      invoiceData.lineItems.forEach((item) => {
        doc.text(item.description, descriptionX, itemY, { width: 240 });
        doc.text(item.quantity.toString(), quantityX, itemY);
        doc.text(`${invoiceData.amounts.currency} ${item.unitPrice.toFixed(2)}`, priceX, itemY);
        doc.text(`${invoiceData.amounts.currency} ${item.total.toFixed(2)}`, totalX, itemY);
        itemY += 30;
      });

      doc.moveDown(2);

      // Amounts Summary
      const summaryX = 350;
      doc.font('Helvetica-Bold');
      doc.text('Gross Amount:', summaryX, doc.y);
      doc.font('Helvetica');
      doc.text(`${invoiceData.amounts.currency} ${invoiceData.amounts.grossAmount.toFixed(2)}`, totalX, doc.y - 12);

      if (invoiceData.amounts.platformFee && invoiceData.amounts.platformFee > 0) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold');
        doc.text('Platform Fee:', summaryX, doc.y);
        doc.font('Helvetica');
        doc.text(`${invoiceData.amounts.currency} ${invoiceData.amounts.platformFee.toFixed(2)}`, totalX, doc.y - 12);
      }

      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Net Amount:', summaryX, doc.y);
      doc.text(`${invoiceData.amounts.currency} ${invoiceData.amounts.netAmount.toFixed(2)}`, totalX, doc.y - 14);

      doc.moveDown(2);
      doc.font('Helvetica').fontSize(10);

      // Payment Information
      doc.fontSize(12).font('Helvetica-Bold').text('PAYMENT DETAILS:');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Payment Method: ${invoiceData.paymentDetails.method}`);
      doc.text(`Transaction ID: ${invoiceData.paymentDetails.stripePaymentIntent}`);
      doc.text(`Payment Date: ${new Date(invoiceData.paymentDetails.paidAt).toLocaleString()}`);
      doc.moveDown();

      // Compliance Footer
      doc.fontSize(8).text(invoiceData.compliance.footer, {
        align: 'center',
        width: 500,
      });
      doc.moveDown(0.5);
      doc.text(`Compliant with: ${invoiceData.compliance.standard}`, { align: 'center' });
      doc.text(`Generated by: ${invoiceData.compliance.generatedBy}`, { align: 'center' });
      doc.text(`Generated at: ${new Date(invoiceData.compliance.generatedAt).toLocaleString()}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }
}

export const pdfInvoiceGenerator = new PDFInvoiceGenerator();
