import type { Express } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "../../shared/schema";
import { z } from "zod";

const syncUserSchema = z.object({
  firebaseUid: z.string().optional(),
  uid: z.string().optional(), // Alternative field name
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
      const { firebaseUid, uid, email, emailVerified, username, firstName, lastName, role } = syncUserSchema.parse(req.body);
      
      // Use either firebaseUid or uid parameter
      const fbUid = firebaseUid || uid;
      
      // Check if user already exists by email
      let existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        // Update existing user with Firebase UID and verification status
        let updatedUser = existingUser;
        if (emailVerified) {
          const updateData: any = { emailVerified: true };
          if (fbUid) {
            updateData.firebaseUid = fbUid;
          }
          const result = await storage.updateUser(existingUser.id, updateData);
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

      // For existing users, just return success if they're already synced
      return res.json({
        success: true,
        message: "User already exists and is synced",
        user: existingUser,
        authenticated: false // They need to login separately
      });
      
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