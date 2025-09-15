import type { Express } from "express";
import { storage } from "../storage";
import { z } from "zod";

const syncFirebaseUserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  displayName: z.string().optional()
});

export function registerSyncFirebaseUserRoutes(app: Express) {
  // Endpoint to sync Firebase user metadata to PostgreSQL (optional)
  app.post("/api/sync-firebase-user", async (req, res) => {
    try {
      const { uid, email, emailVerified, displayName } = syncFirebaseUserSchema.parse(req.body);

      // Helper to promisify req.login
      const loginAsync = (user: any): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
          req.login(user, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      };

      // Check if user already exists by email (case-insensitive)
      let existingUser;
      try {
        existingUser = await storage.getUserByEmail(email.toLowerCase());
      } catch (dbError) {
        console.error('Database error getting user by email:', dbError);
        return res.status(500).json({ 
          success: false, 
          error: 'Database connection error' 
        });
      }
      
      // Also check by Firebase UID in case email doesn't match
      if (!existingUser) {
        existingUser = await storage.getUserByFirebaseUID(uid);
      }

      if (existingUser) {
        // Update existing user with Firebase UID and verification status
        await storage.updateUser(existingUser.id, { 
          firebaseUid: uid,
          emailVerified: emailVerified 
        });

        console.log(`User metadata synced for user ID ${existingUser.id} (${existingUser.username})`);
        
        await loginAsync(existingUser);
        console.log(`✅ Secure Passport session created for user ${existingUser.id}`);
        
        return res.json({ 
          success: true, 
          message: "User metadata synced",
          userId: existingUser.id
        });
      } else {
        console.log(`🚨 CRITICAL: No existing user found for email ${email} or Firebase UID ${uid}`);
        console.log(`This should not happen for existing business users - check for account corruption`);
        
        // Try to find by username before creating
        const existingByUsername = await storage.getUserByUsername(email.split('@')[0].toLowerCase());
        
        if (existingByUsername) {
          // User exists but without Firebase UID, update it
          await storage.updateUser(existingByUsername.id, { 
            firebaseUid: uid,
            emailVerified: emailVerified 
          });
          
          console.log(`User metadata synced for existing username ${existingByUsername.id} (${existingByUsername.username})`);
          
          await loginAsync(existingByUsername);
          console.log(`✅ Secure Passport session created for user ${existingByUsername.id}`);
          
          return res.json({ 
            success: true, 
            message: "User metadata synced",
            userId: existingByUsername.id
          });
        }

        // Create minimal user record for metadata storage with unique username
        let username = email.split('@')[0].toLowerCase();
        let counter = 1;
        
        // Ensure unique username by appending counter if needed
        while (await storage.getUserByUsername(username)) {
          username = `${email.split('@')[0].toLowerCase()}${counter}`;
          counter++;
        }

        const userData = {
          email: email.toLowerCase(),
          username: username,
          firstName: displayName?.split(' ')[0] || 'User',
          lastName: displayName?.split(' ').slice(1).join(' ') || '',
          password: 'firebase_managed',
          role: 'contractor' as const,
          firebaseUid: uid,
          emailVerified: emailVerified,
          subscriptionStatus: 'inactive' as const
        };

        const newUser = await storage.createUser(userData);
        console.log(`User metadata created for user ID ${newUser.id} (${newUser.username})`);
        
        await loginAsync(newUser);
        console.log(`✅ Secure Passport session created for user ${newUser.id}`);
        
        return res.json({ 
          success: true, 
          message: "User metadata created",
          userId: newUser.id
        });
      }

    } catch (error) {
      console.error('Sync Firebase user error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to sync user metadata' 
      });
    }
  });
}