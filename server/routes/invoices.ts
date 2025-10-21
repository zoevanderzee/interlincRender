
import { Router } from 'express';
import { storage } from '../storage';
import { db } from '../db';
import { invoices } from '../../shared/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { pdfInvoiceGenerator } from '../services/pdf-invoice-generator';
import fs from 'fs';

const router = Router();

// Get all invoices for current user
router.get('/invoices', async (req, res) => {
  try {
    const userId = req.session?.userId || parseInt(req.headers['x-user-id'] as string);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get invoices where user is either business or contractor
    const userInvoices = await db
      .select()
      .from(invoices)
      .where(
        or(
          eq(invoices.businessId, userId),
          eq(invoices.contractorId, userId)
        )
      )
      .orderBy(desc(invoices.createdAt));

    res.json(userInvoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get single invoice by ID
router.get('/invoices/:id', async (req, res) => {
  try {
    const userId = req.session?.userId || parseInt(req.headers['x-user-id'] as string);
    const invoiceId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId)
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Verify user has access to this invoice
    if (invoice.businessId !== userId && invoice.contractorId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Download invoice as PDF
router.get('/invoices/:id/download', async (req, res) => {
  try {
    const userId = req.session?.userId || parseInt(req.headers['x-user-id'] as string);
    const invoiceId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId)
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Verify user has access
    if (invoice.businessId !== userId && invoice.contractorId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate PDF from invoice data
    const pdfPath = await pdfInvoiceGenerator.generateInvoicePDF(invoice.invoiceData as any);

    // Send PDF file
    res.download(pdfPath, `invoice-${invoice.invoiceNumber}.pdf`, (err) => {
      if (err) {
        console.error('Error sending PDF:', err);
      }
      // Clean up temporary file
      fs.unlink(pdfPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temp PDF:', unlinkErr);
      });
    });
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

export default router;
