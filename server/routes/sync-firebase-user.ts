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

      // Check if user already exists by email (case-insensitive)
      let existingUser = await storage.getUserByEmail(email.toLowerCase());
      
      // Also check by Firebase UID in case email doesn't match
      if (!existingUser) {
        existingUser = await storage.getUserByFirebaseUID(uid);
      }

      if (existingUser) {
        // Update existing user with Firebase UID and verification status
        const result = await storage.updateUser(existingUser.id, { 
          firebaseUid: uid,
          emailVerified: emailVerified 
        });

        // User found and synced successfully  
        console.log(`User metadata synced for user ID ${existingUser.id} (${existingUser.username})`);

        // SECURITY FIX: Use Passport.js session instead of manual session
        req.login(existingUser, (err) => {
          if (err) {
            console.error('Passport login error:', err);
            return res.status(500).json({ 
              success: false, 
              error: 'Failed to create secure session' 
            });
          }

          console.log(`✅ Secure Passport session created for user ${existingUser.id}`);
          
          return res.json({ 
            success: true, 
            message: "User metadata synced",
            userId: existingUser.id
          });
        });
        return; // BUGFIX: Prevent duplicate user creation
      }

      // CRITICAL: Log this case to prevent duplicate accounts
      console.error(`🚨 CRITICAL: No existing user found for email ${email} or Firebase UID ${uid}`);
      console.error('This should not happen for existing business users - check for account corruption');
      
      // Create minimal user record for metadata storage
      // Note: This is optional - Firebase handles all authentication
      const userData = {
        email: email.toLowerCase(), // Normalize email to lowercase
        username: email.split('@')[0].toLowerCase(),
        firstName: displayName?.split(' ')[0] || 'User',
        lastName: displayName?.split(' ').slice(1).join(' ') || '',
        password: 'firebase_managed', // Not used for authentication
        role: 'contractor' as const, // Default to contractor for new accounts
        firebaseUid: uid,
        emailVerified: emailVerified,
        subscriptionStatus: 'inactive' as const
      };

      const newUser = await storage.createUser(userData);

      // User created and synced successfully
      console.log(`User metadata created for user ID ${newUser.id} (${newUser.username})`);

      // SECURITY FIX: Use Passport.js session instead of manual session  
      req.login(newUser, (err) => {
        if (err) {
          console.error('Passport login error:', err);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to create secure session' 
          });
        }

        console.log(`✅ Secure Passport session created for user ${newUser.id}`);
        
        return res.json({ 
          success: true, 
          message: "User metadata created",
          userId: newUser.id
        });
      });

    } catch (error) {
      console.error('Sync Firebase user error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to sync user metadata' 
      });
    }
  });
}