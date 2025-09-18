
import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  console.log("Auth check in requireAuth middleware:", req.isAuthenticated(), "Session ID:", req.sessionID);

  // Log request headers for debugging
  console.log("API request headers in requireAuth:", {
    cookie: req.headers.cookie,
    'user-agent': req.headers['user-agent'],
    'x-user-id': req.headers['x-user-id'],
    'x-firebase-uid': req.headers['x-firebase-uid'],
    path: req.path
  });

  // First check traditional session-based authentication
  if (req.isAuthenticated()) {
    return next();
  }

  // Priority 2: Check for Firebase UID header (Firebase Auth)
  const firebaseUID = req.headers['x-firebase-uid'];
  if (firebaseUID) {
    try {
      const user = await storage.getUserByFirebaseUID(firebaseUID as string);
      if (user) {
        console.log(`Firebase Auth: User found via UID ${firebaseUID}`);
        // Manually set user on request object
        req.user = user;
        return next();
      }
    } catch (error) {
      console.error('Error in Firebase UID auth:', error);
    }
  }

  // Priority 3: Fallback - Check X-User-ID header for localStorage-based authentication
  const userIdHeader = req.headers['x-user-id'];
  if (userIdHeader) {
    try {
      const userId = parseInt(userIdHeader as string);
      if (!isNaN(userId)) {
        const user = await storage.getUser(userId);
        if (user) {
          console.log(`Using X-User-ID header fallback authentication for user ID: ${userId}`);
          // Manually set user on request object
          req.user = user;
          return next();
        }
      }
    } catch (error) {
      console.error('Error in X-User-ID fallback authentication:', error);
    }
  }

  // If all authentication methods fail
  console.log("Authentication failed - no valid session, Firebase UID, or user ID");
  return res.status(401).json({ error: "Not authenticated" });
};
