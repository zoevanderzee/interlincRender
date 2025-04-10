import { storage } from '../server/storage';
import { InsertDocument } from '@shared/schema';

async function seedDocuments() {
  console.log('Seeding document data...');
  
  try {
    // Document types that would typically be in a data room
    const documentTypes = [
      { name: 'Smart Contract', type: 'application/pdf' },
      { name: 'Statement of Work', type: 'application/pdf' },
      { name: 'Invoice', type: 'application/pdf' },
      { name: 'Non-Disclosure Agreement', type: 'application/pdf' },
      { name: 'Change Request', type: 'application/pdf' },
      { name: 'Milestone Completion', type: 'application/pdf' },
      { name: 'Payment Confirmation', type: 'application/pdf' }
    ];
    
    // Get all contracts to create documents for
    const contracts = await storage.getContractsByBusinessId(9); // Business ID for Creativ Linc
    
    const createdDocuments = [];
    
    // For each contract, create a set of documents
    for (const contract of contracts) {
      for (const docType of documentTypes) {
        // Skip some document types randomly to make the data more realistic
        if (Math.random() > 0.7) continue;
        
        const documentData: InsertDocument = {
          contractId: contract.id,
          fileName: `${contract.contractCode}_${docType.name.replace(/\s/g, '_')}.pdf`,
          fileType: docType.type,
          filePath: `/documents/${contract.contractCode}/${docType.name.replace(/\s/g, '_')}.pdf`,
          uploadedBy: 9, // Admin user ID
          description: `${docType.name} for ${contract.contractName}`
        };
        
        const document = await storage.createDocument(documentData);
        createdDocuments.push(document);
        console.log(`Created document: ${document.fileName}`);
      }
    }
    
    console.log(`Successfully created ${createdDocuments.length} documents for ${contracts.length} contracts.`);
  } catch (error) {
    console.error('Error seeding documents:', error);
  }
}

seedDocuments();