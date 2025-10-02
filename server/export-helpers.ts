// Export Helper Functions for Data Room Compliance
import { storage } from './storage';
import { db, invoices, users, and, eq, or, desc, sql } from './db'; // Assuming db and schema are set up correctly

export async function generateComplianceExport(userId: number, userRole: string) {
  const exportData: any = {
    exportDate: new Date().toISOString(),
    userId,
    userRole,
    complianceVersion: "1.0",
    data: {}
  };

  try {
    if (userRole === 'business') {
      // Business users get all their contracts, milestones, payments
      const contracts = await storage.getContractsByBusinessId(userId);
      const payments = await storage.getPaymentsByBusinessId(userId);
      const milestones = [];

      for (const contract of contracts) {
        const contractMilestones = await storage.getMilestonesByContractId(contract.id);
        milestones.push(...contractMilestones);
      }

      exportData.data = {
        contracts: contracts.map(c => ({
          id: c.id,
          contractName: c.contractName,
          description: c.description,
          status: c.status,
          totalValue: c.totalValue,
          createdAt: c.createdAt,
          contractorId: c.contractorId
        })),
        milestones: milestones.map(m => ({
          id: m.id,
          contractId: m.contractId,
          name: m.name,
          description: m.description,
          paymentAmount: m.paymentAmount,
          status: m.status,
          dueDate: m.dueDate,
          completedAt: m.completedAt,
          approvedAt: m.approvedAt
        })),
        payments: payments.map(p => ({
          id: p.id,
          contractId: p.contractId,
          milestoneId: p.milestoneId,
          amount: p.amount,
          status: p.status,
          scheduledDate: p.scheduledDate,
          completedDate: p.completedDate,
          paymentProcessor: p.paymentProcessor,
          stripePaymentIntentId: p.stripePaymentIntentId,
          trolleyPaymentId: p.trolleyPaymentId,
          notes: p.notes
        }))
      };
    } else if (userRole === 'contractor') {
      // Contractors get their contracts and payments
      const contracts = await storage.getContractsByContractorId(userId);
      const payments = [];
      const milestones = [];

      for (const contract of contracts) {
        const contractPayments = await storage.getPaymentsByContractId(contract.id);
        const contractMilestones = await storage.getMilestonesByContractId(contract.id);
        payments.push(...contractPayments);
        milestones.push(...contractMilestones);
      }

      exportData.data = {
        contracts: contracts.map(c => ({
          id: c.id,
          contractName: c.contractName,
          description: c.description,
          status: c.status,
          contractorBudget: c.contractorBudget,
          createdAt: c.createdAt,
          businessId: c.businessId
        })),
        milestones: milestones.map(m => ({
          id: m.id,
          contractId: m.contractId,
          name: m.name,
          description: m.description,
          paymentAmount: m.paymentAmount,
          status: m.status,
          dueDate: m.dueDate,
          completedAt: m.completedAt,
          approvedAt: m.approvedAt
        })),
        payments: payments.map(p => ({
          id: p.id,
          contractId: p.contractId,
          milestoneId: p.milestoneId,
          amount: p.amount,
          status: p.status,
          scheduledDate: p.scheduledDate,
          completedDate: p.completedDate,
          paymentProcessor: p.paymentProcessor,
          notes: p.notes
        }))
      };
    }

    return exportData;
  } catch (error) {
    console.error('Error generating compliance export:', error);
    throw error;
  }
}

export async function generateInvoiceExport(userId: number): Promise<any[]> {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.length === 0) {
      return [];
    }

    const userRole = user[0].role;

    // Get invoices filtered by user perspective
    // Business users see invoices WITHOUT the -C suffix (expense proof)
    // Contractors see invoices WITH the -C suffix (income proof)
    const userInvoices = await db
      .select()
      .from(invoices)
      .where(
        userRole === 'business'
          ? and(
              eq(invoices.businessId, userId),
              sql`${invoices.invoiceNumber} NOT LIKE '%-C'`
            )
          : and(
              eq(invoices.contractorId, userId),
              sql`${invoices.invoiceNumber} LIKE '%-C'`
            )
      )
      .orderBy(desc(invoices.createdAt));

    return userInvoices.map(invoice => ({
      invoiceNumber: invoice.invoiceNumber,
      paymentId: invoice.paymentId,
      contractId: invoice.contractId,
      milestoneId: invoice.milestoneId,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      issuedDate: invoice.issuedDate,
      paidDate: invoice.paidDate,
      dueDate: invoice.dueDate,
      contractName: invoice.contractName,
      milestoneName: invoice.milestoneName,
      businessName: invoice.businessName,
      contractorName: invoice.contractorName,
      businessEmail: invoice.businessEmail,
      contractorEmail: invoice.contractorEmail,
      paymentProcessor: invoice.paymentProcessor,
      transactionId: invoice.transactionId,
      notes: invoice.notes,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      netAmount: invoice.netAmount,
      grossAmount: invoice.grossAmount
    }));
  } catch (error) {
    console.error('Error generating invoice export:', error);
    throw error;
  }
}

export async function generatePaymentExport(userId: number, userRole: string) {
  try {
    let payments = [];

    if (userRole === 'business') {
      payments = await storage.getPaymentsByBusinessId(userId);
    } else if (userRole === 'contractor') {
      const contracts = await storage.getContractsByContractorId(userId);
      for (const contract of contracts) {
        const contractPayments = await storage.getPaymentsByContractId(contract.id);
        payments.push(...contractPayments);
      }
    }

    const enrichedPayments = [];

    for (const payment of payments) {
      const contract = await storage.getContract(payment.contractId);
      const milestone = payment.milestoneId ? await storage.getMilestone(payment.milestoneId) : null;

      enrichedPayments.push({
        ...payment,
        contractName: contract?.contractName || 'Unknown',
        milestoneName: milestone?.name || 'Payment',
        businessId: contract?.businessId,
        contractorId: contract?.contractorId
      });
    }

    return {
      exportDate: new Date().toISOString(),
      userId,
      userRole,
      totalPayments: enrichedPayments.length,
      totalAmount: enrichedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      payments: enrichedPayments
    };
  } catch (error) {
    console.error('Error generating payment export:', error);
    throw error;
  }
}

export async function generateCSVExport(userId: number, userRole: string, type: string) {
  try {
    let csvData = '';

    if (type === 'payments') {
      const paymentData = await generatePaymentExport(userId, userRole);

      // CSV Headers
      csvData = 'Payment ID,Contract Name,Milestone,Amount,Status,Scheduled Date,Completed Date,Payment Processor,Transaction ID,Notes\n';

      // CSV Rows
      for (const payment of paymentData.payments) {
        const row = [
          payment.id,
          `"${payment.contractName}"`,
          `"${payment.milestoneName}"`,
          payment.amount,
          payment.status,
          payment.scheduledDate,
          payment.completedDate || '',
          payment.paymentProcessor || '',
          payment.stripePaymentIntentId || payment.trolleyPaymentId || '',
          `"${payment.notes || ''}"`
        ].join(',');
        csvData += row + '\n';
      }
    } else if (type === 'invoices') {
      const invoiceData = await generateInvoiceExport(userId, userRole);

      // CSV Headers
      csvData = 'Invoice Number,Contract Name,Amount,Status,Issue Date,Paid Date,Business,Contractor,Payment Processor,Transaction ID\n';

      // CSV Rows
      for (const invoice of invoiceData.invoices) {
        const row = [
          invoice.invoiceNumber,
          `"${invoice.contractName}"`,
          invoice.amount,
          invoice.status,
          invoice.issuedDate,
          invoice.paidDate || '',
          `"${invoice.businessName}"`,
          `"${invoice.contractorName}"`,
          invoice.paymentProcessor || '',
          invoice.transactionId || ''
        ].join(',');
        csvData += row + '\n';
      }
    } else {
      // Default compliance export
      const complianceData = await generateComplianceExport(userId, userRole);
      csvData = 'Export Type,Total Records,Export Date,User Role\n';
      csvData += `"Compliance Data",${Object.keys(complianceData.data).length},"${complianceData.exportDate}","${userRole}"\n`;
    }

    return csvData;
  } catch (error) {
    console.error('Error generating CSV export:', error);
    throw error;
  }
}