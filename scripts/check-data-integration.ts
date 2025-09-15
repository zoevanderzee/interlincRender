
import { db } from "../server/db";
import { payments, contracts, milestones, projects, users } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

async function checkDataIntegration() {
  console.log("🔍 COMPREHENSIVE DATA INTEGRATION CHECK");
  console.log("=====================================\n");
  
  try {
    // Get all data from each table
    console.log("📊 RAW DATA COUNTS:");
    
    const allUsers = await db.select().from(users);
    const allProjects = await db.select().from(projects);
    const allContracts = await db.select().from(contracts);
    const allMilestones = await db.select().from(milestones);
    const allPayments = await db.select().from(payments);
    
    console.log(`- Users: ${allUsers.length}`);
    console.log(`- Projects: ${allProjects.length}`);
    console.log(`- Contracts: ${allContracts.length}`);
    console.log(`- Milestones: ${allMilestones.length}`);
    console.log(`- Payments: ${allPayments.length}\n`);
    
    // Show detailed data for user 86 (zoevdzee)
    console.log("👤 USER 86 (zoevdzee) DATA:");
    const user86 = allUsers.find(u => u.id === 86);
    if (user86) {
      console.log(`- Email: ${user86.email}`);
      console.log(`- Role: ${user86.role}`);
      console.log(`- Username: ${user86.username}\n`);
    }
    
    // Show all projects
    console.log("📁 ALL PROJECTS:");
    allProjects.forEach(project => {
      console.log(`- ID: ${project.id}, Name: "${project.name}", Business: ${project.businessId}, Budget: ${project.budget}`);
    });
    console.log("");
    
    // Show all contracts
    console.log("📋 ALL CONTRACTS:");
    allContracts.forEach(contract => {
      console.log(`- ID: ${contract.id}, Name: "${contract.contractName}", Project: ${contract.projectId}, Business: ${contract.businessId}, Contractor: ${contract.contractorId}`);
    });
    console.log("");
    
    // Show all milestones
    console.log("🎯 ALL MILESTONES:");
    allMilestones.forEach(milestone => {
      console.log(`- ID: ${milestone.id}, Name: "${milestone.name}", Contract: ${milestone.contractId}, Amount: $${milestone.paymentAmount}`);
    });
    console.log("");
    
    // Show all payments
    console.log("💰 ALL PAYMENTS:");
    allPayments.forEach(payment => {
      console.log(`- ID: ${payment.id}, Contract: ${payment.contractId}, Milestone: ${payment.milestoneId}, Amount: $${payment.amount}, Status: ${payment.status}`);
    });
    console.log("");
    
    // Check for orphaned data
    console.log("🔗 DATA INTEGRITY CHECK:");
    
    // Check contracts without valid projects
    const orphanedContracts = allContracts.filter(contract => 
      contract.projectId && !allProjects.some(project => project.id === contract.projectId)
    );
    console.log(`- Contracts with invalid projectId: ${orphanedContracts.length}`);
    orphanedContracts.forEach(contract => {
      console.log(`  * Contract ${contract.id} references non-existent project ${contract.projectId}`);
    });
    
    // Check milestones without valid contracts
    const orphanedMilestones = allMilestones.filter(milestone => 
      !allContracts.some(contract => contract.id === milestone.contractId)
    );
    console.log(`- Milestones with invalid contractId: ${orphanedMilestones.length}`);
    orphanedMilestones.forEach(milestone => {
      console.log(`  * Milestone ${milestone.id} references non-existent contract ${milestone.contractId}`);
    });
    
    // Check payments without valid contracts or milestones
    const orphanedPayments = allPayments.filter(payment => 
      !allContracts.some(contract => contract.id === payment.contractId) ||
      !allMilestones.some(milestone => milestone.id === payment.milestoneId)
    );
    console.log(`- Payments with invalid references: ${orphanedPayments.length}`);
    orphanedPayments.forEach(payment => {
      const contractExists = allContracts.some(contract => contract.id === payment.contractId);
      const milestoneExists = allMilestones.some(milestone => milestone.id === payment.milestoneId);
      console.log(`  * Payment ${payment.id}: Contract ${payment.contractId} ${contractExists ? 'EXISTS' : 'MISSING'}, Milestone ${payment.milestoneId} ${milestoneExists ? 'EXISTS' : 'MISSING'}`);
    });
    
    console.log("\n🎯 INTEGRATION STATUS:");
    if (orphanedContracts.length === 0 && orphanedMilestones.length === 0 && orphanedPayments.length === 0) {
      console.log("✅ All data is properly integrated!");
    } else {
      console.log("❌ Data integration issues found - orphaned records exist");
    }
    
    // Show what should be displayed on each page
    console.log("\n📄 PAGE DATA EXPECTATIONS:");
    console.log("Projects page should show:");
    console.log(`- ${allProjects.length} projects`);
    console.log("Payments page should show:");
    const validPayments = allPayments.filter(payment => 
      allContracts.some(contract => contract.id === payment.contractId) &&
      allMilestones.some(milestone => milestone.id === payment.milestoneId)
    );
    console.log(`- ${validPayments.length} valid payments (${allPayments.length - validPayments.length} will be filtered out)`);
    
  } catch (error) {
    console.error("❌ Error during data integration check:", error);
  }
}

checkDataIntegration().then(() => {
  console.log("✅ Data integration check completed!");
  process.exit(0);
}).catch(error => {
  console.error("❌ Check failed:", error);
  process.exit(1);
});
