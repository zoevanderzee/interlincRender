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

      // Log this case but don't treat it as an error - this happens for new Firebase users
      console.log(`Creating new user account for email ${email} with Firebase UID ${uid}`);
      
      // Create user record for Firebase authentication
      const userData = {
        email: email.toLowerCase(), // Normalize email to lowercase
        username: email.split('@')[0].toLowerCase() + '_' + Date.now(), // Ensure unique username
        firstName: displayName?.split(' ')[0] || 'User',
        lastName: displayName?.split(' ').slice(1).join(' ') || '',
        password: 'firebase_managed', // Not used for authentication
        role: 'business' as const, // Default to business for new accounts
        firebaseUid: uid,
        emailVerified: emailVerified,
        subscriptionStatus: 'inactive' as const
      };

      try {
        const newUser = await storage.createUser(userData);
        console.log(`New user created successfully: ${newUser.id} (${newUser.email})`);
      } catch (createError: any) {
        console.error('Error creating new user:', createError);
        
        // If user creation fails, try to find if user was created by someone else
        const retryUser = await storage.getUserByEmail(email.toLowerCase());
        if (retryUser) {
          console.log('User was created by another process, using existing user');
          // Update with Firebase UID if missing
          if (!retryUser.firebaseUid) {
            await storage.updateUser(retryUser.id, { firebaseUid: uid });
          }
          
          req.session.userId = retryUser.id;
          req.session.user = retryUser;
          
          return res.json({ 
            success: true, 
            message: "User found and synced",
            userId: retryUser.id
          });
        }
        
        throw createError; // Re-throw if we can't recover
      }

      const newUser = await storage.getUserByEmail(email.toLowerCase());

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

    } catch (error: any) {
      console.error('Sync Firebase user error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to sync user metadata',
        details: error.message || 'Unknown error occurred'
      });
    }
  });
}