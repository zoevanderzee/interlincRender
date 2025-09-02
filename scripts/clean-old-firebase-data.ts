
import { db } from "../server/db";
import { users, contracts, milestones, payments, invites, businessWorkers, projects } from "../shared/schema";
import { eq, or, like, and } from "drizzle-orm";

async function main() {
  try {
    console.log("🧹 Cleaning old Firebase and Creativlinc data...");

    // First, let's see what data we have
    const allUsers = await db.select().from(users);
    console.log("📊 All users in database:");
    allUsers.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.email}, Company: ${user.companyName}, Firebase UID: ${user.firebaseUid}`);
    });

    // Find users with old creativlinc email domains
    const oldCreativlincUsers = await db.select()
      .from(users)
      .where(
        or(
          like(users.email, '%creativlinc%'),
          like(users.companyName, '%Creativ%')
        )
      );

    console.log(`📧 Found ${oldCreativlincUsers.length} users with old Creativlinc data`);

    // Delete all old creativlinc data
    for (const user of oldCreativlincUsers) {
      console.log(`🗑️ Deleting user: ${user.email} (ID: ${user.id})`);
      
      // Delete related data first (foreign key constraints)
      await db.delete(payments).where(eq(payments.contractId, user.id));
      await db.delete(milestones).where(eq(milestones.contractId, user.id));
      await db.delete(contracts).where(or(
        eq(contracts.businessId, user.id),
        eq(contracts.contractorId, user.id)
      ));
      await db.delete(invites).where(eq(invites.businessId, user.id));
      await db.delete(businessWorkers).where(or(
        eq(businessWorkers.businessId, user.id),
        eq(businessWorkers.contractorUserId, user.id)
      ));
      await db.delete(projects).where(eq(projects.businessId, user.id));
      
      // Delete the user
      await db.delete(users).where(eq(users.id, user.id));
    }

    // Now update the current user to ensure clean data
    const currentUser = await db.select()
      .from(users)
      .where(like(users.email, '%interlinc%'));

    if (currentUser.length > 0) {
      const user = currentUser[0];
      console.log(`✨ Updating current user: ${user.email}`);
      
      await db.update(users)
        .set({
          companyName: 'Interlinc',
          email: user.email.includes('@interlinc.co') ? user.email : user.email.replace('@creativlinc.co.uk', '@interlinc.co'),
          role: 'business',
          workerType: null
        })
        .where(eq(users.id, user.id));
    }

    console.log("✅ Database cleanup completed successfully");
    
    // Show final state
    const finalUsers = await db.select().from(users);
    console.log("📊 Final users in database:");
    finalUsers.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.email}, Company: ${user.companyName}, Firebase UID: ${user.firebaseUid}`);
    });

  } catch (error) {
    console.error("❌ Error cleaning database:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
