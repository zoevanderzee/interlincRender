import type { Express } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "../../shared/schema";
import { z } from "zod";

const syncUserSchema = z.object({
  uid: z.string(),
  email: z.string().email()
});

export function registerSyncUserRoutes(app: Express) {
  // Endpoint to sync Firebase user to PostgreSQL
  app.post("/api/sync-user", async (req, res) => {
    try {
      const { uid, email } = syncUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.json({ 
          success: true, 
          message: "User already exists in database",
          userId: existingUser.id 
        });
      }

      // Create user in PostgreSQL with Firebase UID
      const userData = {
        email,
        username: email.split('@')[0], // Use email prefix as username
        passwordHash: 'firebase', // Placeholder since Firebase handles authentication
        role: 'contractor' as const, // Default role, can be updated later
        firebaseUid: uid,
        emailVerified: false, // Will be updated when Firebase email is verified
        subscriptionStatus: 'pending' as const
      };

      const newUser = await storage.createUser(userData);
      
      res.json({ 
        success: true, 
        message: "User synced to database",
        userId: newUser.id 
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