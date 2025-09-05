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
      
      // Check if user already exists by Firebase UID first
      let existingUser = await storage.getUserByFirebaseUID(uid);
      
      if (!existingUser) {
        // If not found by UID, try by email
        existingUser = await storage.getUserByEmail(email);
      }
      
      if (existingUser) {
        console.log(`Firebase sync: Found existing user ${existingUser.id} for email ${email}`);
        
        // Update existing user with Firebase UID and verification status if needed
        const updateData: any = {};
        if (!existingUser.firebaseUid || existingUser.firebaseUid !== uid) {
          updateData.firebaseUid = uid;
        }
        if (existingUser.emailVerified !== emailVerified) {
          updateData.emailVerified = emailVerified;
        }
        
        let finalUser = existingUser;
        if (Object.keys(updateData).length > 0) {
          console.log(`Updating user ${existingUser.id} with Firebase data:`, updateData);
          const result = await storage.updateUserAuthFields(existingUser.id, updateData);
          finalUser = result || existingUser;
        }
        
        // Create session for the user
        req.login(finalUser, (err) => {
          if (err) {
            console.error('Error creating session after Firebase sync:', err);
            return res.status(500).json({ 
              success: false, 
              error: 'Failed to create session' 
            });
          }
          
          console.log(`Firebase sync successful: User ${finalUser.id} logged in`);
          return res.json({ 
            success: true, 
            message: "User synced and logged in",
            userId: finalUser.id,
            user: finalUser
          });
        });
        return;
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
      
      // Create session for the new user
      req.login(newUser, (err) => {
        if (err) {
          console.error('Error creating session for new Firebase user:', err);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to create session' 
          });
        }
        
        return res.json({ 
          success: true, 
          message: "User created and logged in",
          userId: newUser.id,
          user: newUser
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