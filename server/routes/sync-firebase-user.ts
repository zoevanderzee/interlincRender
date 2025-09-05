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

      // Check if user already exists by email
      let existingUser = await storage.getUserByEmail(email);

      if (existingUser) {
        // Update existing user with Firebase UID and verification status
        const result = await storage.updateUser(existingUser.id, { 
          firebaseUid: uid,
          emailVerified: emailVerified 
        });

        // Log the user in by creating a session using Passport
        req.login(existingUser, (err) => {
          if (err) {
            console.error('Session creation error:', err);
            return res.status(500).json({ 
              success: false, 
              error: 'Session creation failed' 
            });
          }

          console.log('Firebase sync successful: User', existingUser.id, 'logged in');
          return res.json({ 
            success: true, 
            message: 'User synced and logged in successfully',
            user: {
              id: existingUser.id,
              email: existingUser.email,
              role: existingUser.role
            }
          });
        });
        return; // Ensure no further processing after login attempt
      }

      // Create minimal user record for metadata storage
      // Note: This is optional - Firebase handles all authentication
      const userData = {
        email,
        username: email.split('@')[0],
        firstName: displayName?.split(' ')[0] || 'User',
        lastName: displayName?.split(' ').slice(1).join(' ') || '',
        password: 'firebase_managed', // Not used for authentication
        role: 'contractor' as const,
        firebaseUid: uid,
        emailVerified: emailVerified,
        subscriptionStatus: 'inactive' as const
      };

      const newUser = await storage.createUser(userData);

      // Log the user in by creating a session using Passport
      req.login(newUser, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return res.status(500).json({ 
            success: false, 
            error: 'Session creation failed' 
          });
        }

        console.log('Firebase sync successful: User', newUser.id, 'logged in');
        return res.json({ 
          success: true, 
          message: 'User synced and logged in successfully',
          user: {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role
          }
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