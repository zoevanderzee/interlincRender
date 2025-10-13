
import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  console.log("Auth check in requireAuth middleware:", {
    isAuthenticated: req.isAuthenticated(),
    sessionID: req.sessionID,
    hasSessionCookie: !!req.headers.cookie,
    passportUser: req.session?.passport?.user,
    path: req.path
  });

  // Use ONLY session-based authentication
  // This forces proper session management instead of localStorage workarounds
  if (req.isAuthenticated() && req.user) {
    return next();
  }

  // If session authentication fails, user must log in again
  console.log("Session authentication failed - user must log in");
  return res.status(401).json({ error: "Not authenticated" });
};

// Add the missing setupAuth function
export const setupAuth = (app: any) => {
  // This function can be used to setup authentication middleware globally
  // Currently just a placeholder since auth is handled in individual routes
  console.log("Authentication setup completed");
};
