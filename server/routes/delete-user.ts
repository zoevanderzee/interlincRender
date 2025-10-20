import type { Express } from "express";
import { storage } from "../storage";
import { z } from "zod";

const deleteUserSchema = z.object({
  userId: z.number().optional(),
  email: z.string().email().optional(),
  firebaseUid: z.string().optional()
}).refine(data => data.userId || data.email || data.firebaseUid, {
  message: "At least one identifier (userId, email, or firebaseUid) must be provided"
});

export function registerDeleteUserRoutes(app: Express) {
  // Comprehensive user deletion endpoint - cascades through ALL related tables
  // SECURITY: This endpoint is ONLY for administrative cleanup after Firebase account deletion
  // It should NEVER be exposed to regular users or be publicly accessible
  app.post("/api/delete-user", async (req, res) => {
    // SECURITY CHECK: For now, disable this endpoint completely in production
    // Only allow in development environment for testing
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is disabled in production for security reasons',
        details: 'Contact support for account deletion requests'
      });
    }
    try {
      const { userId, email, firebaseUid } = deleteUserSchema.parse(req.body);
      
      // Find the user to delete
      let userToDelete;
      if (userId) {
        userToDelete = await storage.getUser(userId);
      } else if (email) {
        userToDelete = await storage.getUserByEmail(email.toLowerCase());
      } else if (firebaseUid) {
        userToDelete = await storage.getUserByFirebaseUID(firebaseUid);
      }

      if (!userToDelete) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      console.log(`[DELETE USER] Starting complete deletion of user ${userToDelete.id} (${userToDelete.email})`);

      try {
        // Use storage method to delete user and all related data
        await storage.deleteUserCompletely(userToDelete.id);
        
        console.log(`[DELETE USER] Successfully deleted user ${userToDelete.id} and all related data`);

        return res.json({
          success: true,
          message: 'User and all related data deleted successfully',
          userId: userToDelete.id
        });
      } catch (deleteError: any) {
        console.error('[DELETE USER] Error during deletion:', deleteError);
        throw deleteError;
      }

    } catch (error: any) {
      console.error('Delete user error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        details: error.message || 'Unknown error occurred'
      });
    }
  });
}
