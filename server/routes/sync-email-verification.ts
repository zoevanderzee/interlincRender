import type { Express } from "express";
import { storage } from "../storage";

export function setupSyncEmailVerification(app: Express) {
  // Sync email verification from Firebase to PostgreSQL
  app.post("/api/sync-email-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Find user by email in our PostgreSQL database
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found in our database" });
      }
      
      // Update email verification status in PostgreSQL
      const updatedUser = await storage.updateEmailVerification(user.id, true);
      
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update email verification status" });
      }
      
      console.log(`✅ Email verification synced to database for: ${email}`);
      res.json({ 
        success: true, 
        message: "Email verification synced successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          emailVerified: updatedUser.emailVerified
        }
      });
      
    } catch (error) {
      console.error('❌ Error syncing email verification:', error);
      res.status(500).json({ error: "Failed to sync email verification" });
    }
  });
}