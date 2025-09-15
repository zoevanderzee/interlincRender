
import { db } from "../server/db";
import { payments, contracts, milestones } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

async function cleanPaymentsTestData() {
  console.log("🧹 Cleaning payments test data...");
  
  try {
    // Get all payments
    const allPayments = await db.select().from(payments);
    console.log(`Found ${allPayments.length} total payments`);
    
    // Get all valid contract IDs
    const validContracts = await db.select({ id: contracts.id }).from(contracts);
    const validContractIds = validContracts.map(c => c.id);
    console.log(`Found ${validContractIds.length} valid contracts`);
    
    // Get all valid milestone IDs
    const validMilestones = await db.select({ id: milestones.id }).from(milestones);
    const validMilestoneIds = validMilestones.map(m => m.id);
    console.log(`Found ${validMilestoneIds.length} valid milestones`);
    
    // Find orphaned payments
    const orphanedPayments = allPayments.filter(payment => 
      !validContractIds.includes(payment.contractId) || 
      !validMilestoneIds.includes(payment.milestoneId)
    );
    
    console.log(`Found ${orphanedPayments.length} orphaned payments to delete:`);
    orphanedPayments.forEach(payment => {
      console.log(`- Payment ID ${payment.id}: Contract #${payment.contractId}, Milestone #${payment.milestoneId}, Amount: $${payment.amount}`);
    });
    
    if (orphanedPayments.length > 0) {
      // Delete orphaned payments
      const orphanedPaymentIds = orphanedPayments.map(p => p.id);
      
      await db.delete(payments)
        .where(inArray(payments.id, orphanedPaymentIds));
      
      console.log(`✅ Deleted ${orphanedPayments.length} orphaned payments`);
    } else {
      console.log("✅ No orphaned payments found");
    }
    
    // Now check for any test/fake contracts that might still exist
    const allContracts = await db.select().from(contracts);
    console.log("\n📋 Current contracts in database:");
    allContracts.forEach(contract => {
      console.log(`- Contract ID ${contract.id}: "${contract.contractName}" (Business: ${contract.businessId}, Contractor: ${contract.contractorId})`);
    });
    
    // Check for any suspicious test contracts
    const testContracts = allContracts.filter(contract => 
      contract.contractName?.toLowerCase().includes('ui redesign') ||
      contract.contractName?.toLowerCase().includes('test') ||
      contract.contractName?.toLowerCase().includes('demo') ||
      contract.contractName?.toLowerCase().includes('sample')
    );
    
    if (testContracts.length > 0) {
      console.log(`\n⚠️  Found ${testContracts.length} potentially test contracts:`);
      testContracts.forEach(contract => {
        console.log(`- Contract ID ${contract.id}: "${contract.contractName}"`);
      });
      
      console.log("These should be manually reviewed and deleted if they are test data");
    }
    
    console.log("\n🎯 Data cleanup completed!");
    
  } catch (error) {
    console.error("❌ Error cleaning payments data:", error);
  }
}

cleanPaymentsTestData().then(() => {
  console.log("Script completed");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});
