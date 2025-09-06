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

        // User found and synced successfully  
        console.log(`User metadata synced for user ID ${existingUser.id} (${existingUser.username})`);

        // Ensure session is properly set
        req.session.userId = existingUser.id;
        req.session.user = existingUser;

        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Session save error:', err);
              reject(err);
            } else {
              console.log(`Session saved for user ${existingUser.id}`);
              resolve();
            }
          });
        });

        return res.json({ 
          success: true, 
          message: "User metadata synced",
          userId: existingUser.id
        });
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

      // User created and synced successfully
      console.log(`User metadata created for user ID ${newUser.id} (${newUser.username})`);

      // Ensure session is properly set
      req.session.userId = newUser.id;
      req.session.user = newUser;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            console.log(`Session saved for user ${newUser.id}`);
            resolve();
          }
        });
      });

      return res.json({ 
        success: true, 
        message: "User metadata created",
        userId: newUser.id
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