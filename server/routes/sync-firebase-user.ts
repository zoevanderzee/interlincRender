import type { Express } from "express";
import { storage } from "../storage";
import { z } from "zod";

const syncFirebaseUserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  displayName: z.string().optional(),
  registrationData: z.object({
    role: z.enum(['business', 'contractor']),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    username: z.string().optional(),
    company: z.string().optional(),
    position: z.string().optional(),
    workerType: z.string().optional()
  }).optional()
});

export function registerSyncFirebaseUserRoutes(app: Express) {
  // Endpoint to sync Firebase user metadata to PostgreSQL (optional)
  app.post("/api/sync-firebase-user", async (req, res) => {
    try {
      const { uid, email, emailVerified, displayName, registrationData } = syncFirebaseUserSchema.parse(req.body);

      // Check if user already exists by email (case-insensitive)
      let existingUser = await storage.getUserByEmail(email.toLowerCase());
      
      // Also check by Firebase UID in case email doesn't match
      if (!existingUser) {
        existingUser = await storage.getUserByFirebaseUID(uid);
      }

      if (existingUser) {
        // Build update data - always update Firebase UID and email verification
        const updateData: any = { 
          firebaseUid: uid,
          emailVerified: emailVerified 
        };
        
        // If registration data is provided, update role and profile fields
        if (registrationData) {
          updateData.role = registrationData.role;
          if (registrationData.firstName) updateData.firstName = registrationData.firstName;
          if (registrationData.lastName) updateData.lastName = registrationData.lastName;
          if (registrationData.username) updateData.username = registrationData.username;
          if (registrationData.company) updateData.companyName = registrationData.company;
          if (registrationData.position) updateData.position = registrationData.position;
          if (registrationData.workerType) updateData.workerType = registrationData.workerType;
          console.log(`Updating existing user ${existingUser.id} with role: ${registrationData.role}`);
        }
        
        const result = await storage.updateUser(existingUser.id, updateData);
        const updatedUser = result || existingUser;

        // User found and synced successfully  
        console.log(`User metadata synced for user ID ${updatedUser.id} (${updatedUser.username}) with role: ${updatedUser.role}`);

        // Ensure session is properly set with updated user data
        req.session.userId = updatedUser.id;
        req.session.user = updatedUser;

        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Session save error:', err);
              reject(err);
            } else {
              console.log(`Session saved for user ${updatedUser.id}`);
              resolve();
            }
          });
        });

        return res.json({ 
          success: true, 
          message: "User metadata synced",
          userId: updatedUser.id,
          user: updatedUser
        });
      }

      // VALIDATION: registrationData with role is REQUIRED for new users
      if (!registrationData || !registrationData.role) {
        console.error(`Registration data or role missing for new user: ${email}`);
        return res.status(400).json({
          success: false,
          error: 'Registration data with role is required for new user creation',
          details: 'Role must be either "business" or "contractor"'
        });
      }

      console.log(`Creating new user account for email ${email} with Firebase UID ${uid} and role ${registrationData.role}`);
      
      // Create user record for Firebase authentication
      const userData = {
        email: email.toLowerCase(),
        username: registrationData.username || email.split('@')[0].toLowerCase() + '_' + Date.now(),
        firstName: registrationData.firstName || displayName?.split(' ')[0] || 'User',
        lastName: registrationData.lastName || displayName?.split(' ').slice(1).join(' ') || '',
        password: 'firebase_managed',
        role: registrationData.role, // NO FALLBACK - role is required and validated above
        workerType: registrationData.workerType || null,
        companyName: registrationData.company || null,
        position: registrationData.position || null,
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