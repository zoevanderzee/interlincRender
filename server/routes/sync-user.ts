import type { Express } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "../../shared/schema";
import { z } from "zod";

const syncUserSchema = z.object({
  firebaseUid: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean().optional(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['business', 'contractor']).optional()
});

export function registerSyncUserRoutes(app: Express) {
  // Endpoint to sync Firebase user to PostgreSQL
  app.post("/api/sync-user", async (req, res) => {
    try {
      const { firebaseUid, email, emailVerified, username, firstName, lastName, role } = syncUserSchema.parse(req.body);
      
      // Check if user already exists by email
      let existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        // Update existing user with Firebase UID and verification status
        let updatedUser = existingUser;
        if (emailVerified) {
          const result = await storage.updateUser(existingUser.id, { 
            emailVerified: true, 
            firebaseUid: firebaseUid 
          });
          updatedUser = result || existingUser;
        }
        
        // Log the user in by creating a session
        req.login(updatedUser, (err) => {
          if (err) {
            console.error('Error creating session:', err);
            return res.status(500).json({ 
              success: false, 
              error: 'Failed to create session' 
            });
          }
          
          return res.json({ 
            success: true, 
            message: "User synced and logged in",
            userId: updatedUser.id,
            user: updatedUser,
            authenticated: true
          });
        });
        return;
      }

      // Create new user in PostgreSQL with Firebase UID
      const userData = {
        email,
        username: username || email.split('@')[0],
        firstName: firstName || 'User',
        lastName: lastName || '',
        passwordHash: 'firebase',
        role: role || 'contractor' as const,
        firebaseUid: firebaseUid,
        emailVerified: emailVerified || false,
        subscriptionStatus: 'pending' as const
      };

      const newUser = await storage.createUser(userData);
      
      // Log the new user in
      req.login(newUser, (err) => {
        if (err) {
          console.error('Error creating session for new user:', err);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to create session' 
          });
        }
        
        return res.json({ 
          success: true, 
          message: "User created and logged in",
          userId: newUser.id,
          user: newUser,
          authenticated: true
        });
      });

    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to sync user to database" 
      });
    }
  });
}