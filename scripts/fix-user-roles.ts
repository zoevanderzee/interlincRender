/**
 * Script to fix user roles in the database
 * This will update user role for self-registered business users
 */
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq, and, or, not, isNotNull, sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Starting user role fix script...");
    
    // First, directly fix the specific user from the screenshot
    console.log("Fixing specific user by email: zoevdzee@creativlinc.co.uk");
    
    // Update the user with email zoevdzee@creativlinc.co.uk
    await db.update(users)
      .set({ 
        role: 'business',
        workerType: null 
      })
      .where(eq(users.email, 'zoevdzee@creativlinc.co.uk'));
      
    // Get all users with role 'contractor' or 'freelancer' that have creativlinc in their email
    const potentialBusinessUsers = await db.select()
      .from(users)
      .where(
        and(
          or(
            eq(users.role, 'contractor'),
            eq(users.role, 'freelancer')
          ),
          // Email contains creativlinc domain
          sql`${users.email} LIKE '%creativlinc%'`
        )
      );
    
    console.log(`Found ${potentialBusinessUsers.length} potential business users by email domain`);
    
    // Update all detected business users
    for (const user of potentialBusinessUsers) {
      console.log(`Updating user ${user.id} (${user.username}) from ${user.role} to business`);
      
      await db.update(users)
        .set({ 
          role: 'business',
          workerType: null 
        })
        .where(eq(users.id, user.id));
    }
    
    // Also look for company names that suggest business users
    const companyNameBusinessUsers = await db.select()
      .from(users)
      .where(
        and(
          or(
            eq(users.role, 'contractor'),
            eq(users.role, 'freelancer')
          ),
          // Has a non-empty company name containing 'Creative' or 'Linc'
          and(
            isNotNull(users.companyName),
            not(eq(users.companyName, '')),
            or(
              sql`${users.companyName} LIKE '%Creative%'`,
              sql`${users.companyName} LIKE '%Linc%'`
            )
          )
        )
      );
    
    console.log(`Found ${companyNameBusinessUsers.length} potential business users by company name`);
    
    // Update these users too
    for (const user of companyNameBusinessUsers) {
      console.log(`Updating user ${user.id} (${user.username}) from ${user.role} to business`);
      
      await db.update(users)
        .set({ 
          role: 'business',
          workerType: null 
        })
        .where(eq(users.id, user.id));
    }
    
    console.log("User role fix completed successfully");
  } catch (error) {
    console.error("Error fixing user roles:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();