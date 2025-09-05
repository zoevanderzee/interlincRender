
import { db } from "../server/db";
import { users } from "../shared/schema";

async function purgeAllTrolleyData() {
  try {
    console.log("🧹 Purging ALL Trolley data from database...");

    // Update ALL users to remove ALL Trolley-related fields
    const result = await db.update(users)
      .set({
        // Clear ALL Trolley company/business fields
        trolleyCompanyProfileId: null,
        trolleySubmerchantId: null,
        trolleySubmerchantStatus: null,
        trolleySubmerchantAccessKey: null,
        trolleySubmerchantSecretKey: null,
        
        // Clear ALL Trolley recipient/contractor fields
        trolleyRecipientId: null,
        
        // Clear ALL Trolley bank account fields
        trolleyBankAccountStatus: null,
        trolleyBankAccountId: null,
        trolleyBankAccountLast4: null,
        
        // Clear ALL Trolley verification fields
        trolleyVerificationToken: null,
        trolleyVerificationStarted: null,
        trolleyVerificationStatus: null,
        trolleyVerificationCompletedAt: null,
        
        // Clear Trolley account balance
        trolleyAccountBalance: "0",
        
        // Reset payout to disabled (will be re-enabled with new provider)
        payoutEnabled: false,
        
        // Reset to pay-as-you-go for new payment system
        paymentMethod: "pay_as_you_go"
      });

    console.log(`✅ Cleared Trolley data from ${result.rowCount} users`);

    // Verify cleanup - check a few sample users
    const sampleUsers = await db.select({
      id: users.id,
      email: users.email,
      trolleyRecipientId: users.trolleyRecipientId,
      trolleyCompanyProfileId: users.trolleyCompanyProfileId,
      trolleySubmerchantId: users.trolleySubmerchantId,
      payoutEnabled: users.payoutEnabled
    }).from(users).limit(5);

    console.log("\n✨ Verification - Sample users after Trolley purge:");
    sampleUsers.forEach(user => {
      console.log(`- User ${user.id} (${user.email}):`);
      console.log(`  trolleyRecipientId: ${user.trolleyRecipientId || 'null'}`);
      console.log(`  trolleyCompanyProfileId: ${user.trolleyCompanyProfileId || 'null'}`);
      console.log(`  trolleySubmerchantId: ${user.trolleySubmerchantId || 'null'}`);
      console.log(`  payoutEnabled: ${user.payoutEnabled}`);
    });

    console.log("\n🎯 All Trolley data successfully purged from database!");
    console.log("Ready for new payment provider integration.");

  } catch (error) {
    console.error("❌ Error purging Trolley data:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

purgeAllTrolleyData();
