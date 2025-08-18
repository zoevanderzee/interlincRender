// Export Helper Functions for Data Room Compliance
import { storage } from './storage';

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

export async function generateInvoiceExport(userId: number, userRole: string) {
  const invoices = [];
  
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

    for (const payment of payments) {
      const contract = await storage.getContract(payment.contractId);
      const milestone = payment.milestoneId ? await storage.getMilestone(payment.milestoneId) : null;
      const businessUser = contract ? await storage.getUser(contract.businessId) : null;
      const contractorUser = contract ? await storage.getUser(contract.contractorId) : null;

      invoices.push({
        invoiceNumber: `INV-${payment.id}-${new Date(payment.scheduledDate).getFullYear()}`,
        paymentId: payment.id,
        contractId: payment.contractId,
        milestoneId: payment.milestoneId,
        amount: payment.amount,
        currency: 'GBP',
        status: payment.status,
        issuedDate: payment.scheduledDate,
        paidDate: payment.completedDate,
        dueDate: payment.scheduledDate,
        contractName: contract?.contractName || 'Unknown Project',
        milestoneName: milestone?.name || 'Payment',
        businessName: businessUser?.username || 'Unknown Business',
        contractorName: contractorUser?.username || 'Unknown Contractor',
        businessEmail: businessUser?.email,
        contractorEmail: contractorUser?.email,
        paymentProcessor: payment.paymentProcessor,
        transactionId: payment.stripePaymentIntentId || payment.trolleyPaymentId,
        notes: payment.notes,
        taxRate: 0, // UK e-invoicing compliance
        taxAmount: 0,
        netAmount: payment.amount,
        grossAmount: payment.amount
      });
    }

    return {
      exportDate: new Date().toISOString(),
      userId,
      userRole,
      totalInvoices: invoices.length,
      invoices
    };
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