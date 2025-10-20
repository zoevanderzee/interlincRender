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

      // Check if user already exists by Firebase UID ONLY (not email)
      // Email should NOT be used to find existing users - prevents linking deleted accounts
      let existingUser = await storage.getUserByFirebaseUID(uid);

      if (existingUser) {
        // Build update data - always update email verification
        const updateData: any = { 
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

        // Clean up pending registration data if it was used
        if (registrationData) {
          try {
            await storage.deletePendingRegistrationByFirebaseUid(uid);
            console.log(`Cleaned up pending registration for ${email}`);
          } catch (cleanupError) {
            console.error('Error cleaning up pending registration:', cleanupError);
          }
        }

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

      // SECURITY CHECK: Verify no existing user with this email exists
      // This prevents resurrecting deleted accounts
      const emailCheck = await storage.getUserByEmail(email.toLowerCase());
      if (emailCheck) {
        console.error(`SECURITY BLOCK: Email ${email} already exists in database (user ID: ${emailCheck.id})`);
        console.error(`This suggests a deleted account was not properly purged. Blocking registration.`);
        return res.status(409).json({
          success: false,
          error: 'Email already registered',
          details: 'This email is already associated with an account. If you deleted your previous account, please contact support.'
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

      const newUser = await storage.createUser(userData);
      console.log(`New user created successfully: ${newUser.id} (${newUser.email})`);
      
      // Clean up pending registration data after successful user creation
      try {
        await storage.deletePendingRegistrationByFirebaseUid(uid);
        console.log(`Cleaned up pending registration for ${email}`);
      } catch (cleanupError) {
        console.error('Error cleaning up pending registration:', cleanupError);
      }

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