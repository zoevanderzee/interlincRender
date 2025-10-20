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

export function registerDeleteUserRoutes(app: Express, requireAuth: any) {
  // Comprehensive user deletion endpoint - cascades through ALL related tables
  // Users can delete their own accounts - all data is permanently removed
  app.post("/api/delete-user", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      console.log(`[DELETE USER] Starting complete deletion of user ${user.id} (${user.email})`);

      try {
        // Delete the logged-in user's account and all related data
        await storage.deleteUserCompletely(user.id);
        
        // Destroy the session
        req.logout((err) => {
          if (err) {
            console.error('[DELETE USER] Error logging out:', err);
          }
        });
        
        console.log(`[DELETE USER] Successfully deleted user ${user.id} and all related data`);

        return res.json({
          success: true,
          message: 'Your account and all related data have been permanently deleted'
        });
      } catch (deleteError: any) {
        console.error('[DELETE USER] Error during deletion:', deleteError);
        throw deleteError;
      }

    } catch (error: any) {
      console.error('Delete user error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete account',
        details: error.message || 'Unknown error occurred'
      });
    }
  });
}
