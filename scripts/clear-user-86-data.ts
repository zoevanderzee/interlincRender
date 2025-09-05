
import { db } from "../server/db";
import { users, contracts, milestones, payments, invites, businessWorkers, projects, notifications, connectionRequests } from "../shared/schema";
import { eq, or } from "drizzle-orm";

// Import work_requests from schema (we need to add this to handle the foreign key)
// Assuming work_requests table exists based on the error
const workRequests = "work_requests"; // We'll handle this with raw SQL if needed

async function main() {
  try {
    console.log("🧹 Completely resetting user 86 data...");

    const userId = 86;

    // First, get all contracts associated with this user
    const userContracts = await db.select().from(contracts).where(
      or(
        eq(contracts.businessId, userId),
        eq(contracts.contractorId, userId)
      )
    );

    console.log(`Found ${userContracts.length} contracts for user ${userId}`);

    // Delete all related data in proper order (foreign key constraints)
    for (const contract of userContracts) {
      console.log(`Deleting data for contract ${contract.id}...`);
      
      // Delete payments for this contract
      await db.delete(payments).where(eq(payments.contractId, contract.id));
      
      // Delete milestones for this contract  
      await db.delete(milestones).where(eq(milestones.contractId, contract.id));
      
      // Delete the contract
      await db.delete(contracts).where(eq(contracts.id, contract.id));
    }

    // Delete other user-related data
    await db.delete(invites).where(eq(invites.businessId, userId));
    await db.delete(businessWorkers).where(
      or(
        eq(businessWorkers.businessId, userId),
        eq(businessWorkers.contractorUserId, userId)
      )
    );

    // Get user's projects first to handle work_requests constraint
    const userProjects = await db.select().from(projects).where(eq(projects.businessId, userId));
    
    // Delete work_requests for each project (handles foreign key constraint)
    for (const project of userProjects) {
      console.log(`Deleting work requests for project ${project.id}...`);
      // Use raw SQL since work_requests might not be in our schema imports
      await db.execute(`DELETE FROM work_requests WHERE project_id = ${project.id}`);
    }
    
    // Now we can safely delete projects
    await db.delete(projects).where(eq(projects.businessId, userId));
    await db.delete(notifications).where(eq(notifications.userId, userId));
    await db.delete(connectionRequests).where(
      or(
        eq(connectionRequests.businessId, userId),
        eq(connectionRequests.contractorId, userId)
      )
    );

    // Reset ALL user budget and payment data to clean state
    await db.update(users)
      .set({
        // Clear all budget data completely
        budgetCap: null,
        budgetUsed: "0",
        budgetPeriod: "yearly",
        budgetStartDate: null,
        budgetEndDate: null,
        budgetResetEnabled: false,

        // Clear all payment/subscription data
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeConnectAccountId: null,
        subscriptionStatus: "active", // Keep subscription active
        subscriptionPlan: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        subscriptionTrialEnd: null,

        // Clear all Trolley data
        trolleyCompanyProfileId: null,
        trolleyRecipientId: null,
        trolleySubmerchantId: null,
        trolleySubmerchantStatus: null,
        trolleySubmerchantAccessKey: null,
        trolleySubmerchantSecretKey: null,
        trolleyBankAccountStatus: null,
        trolleyBankAccountId: null,
        trolleyBankAccountLast4: null,
        trolleyVerificationToken: null,
        trolleyVerificationStarted: null,
        trolleyVerificationStatus: null,
        trolleyVerificationCompletedAt: null,
        payoutEnabled: false,
        paymentMethod: "pay_as_you_go",
        trolleyAccountBalance: "0",

        // Keep core identity unchanged
        role: "business",
        workerType: null,
        emailVerified: true
      })
      .where(eq(users.id, userId));

    console.log("✅ User 86 data completely reset to clean state");

    // Verify the cleanup
    const cleanUser = await db.select().from(users).where(eq(users.id, userId));
    if (cleanUser.length > 0) {
      const user = cleanUser[0];
      console.log("✨ Verification - User 86 after cleanup:");
      console.log(`- Email: ${user.email}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Budget Cap: ${user.budgetCap || 'null'}`);
      console.log(`- Budget Used: ${user.budgetUsed}`);
      console.log(`- Subscription Status: ${user.subscriptionStatus}`);
      console.log(`- Trolley Recipient ID: ${user.trolleyRecipientId || 'null'}`);
    }

  } catch (error) {
    console.error("❌ Error resetting user data:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
