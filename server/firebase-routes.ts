import type { Express } from "express";
import { storage } from "./storage";

export function registerFirebaseRoutes(app: Express) {
  // Send email verification during registration
  app.post("/api/auth/send-verification-email", async (req, res) => {
    try {
      const { email, userId } = req.body;
      
      if (!email || !userId) {
        return res.status(400).json({ error: "Email and userId are required" });
      }

      // Check if user exists in our database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate email verification token
      const verificationToken = require('crypto').randomUUID();
      const verificationExpires = new Date(Date.now() + 86400000); // 24 hours from now

      // Save verification token to database
      await storage.saveEmailVerificationToken(user.id, verificationToken, verificationExpires);

      // Send verification email via Firebase (client-side)
      res.json({ 
        success: true, 
        message: "Verification email sent",
        verificationToken // This will be used client-side to trigger Firebase email
      });
    } catch (error) {
      console.error("Send verification email error:", error);
      res.status(500).json({ error: "Failed to send verification email" });
    }
  });

  // Verify email with token
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const user = await storage.verifyEmailToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      res.json({ 
        success: true, 
        message: "Email verified successfully",
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified
        }
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Send password reset email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if user exists in our database (handle missing columns gracefully)
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(404).json({ error: "No user found with this email address" });
        }
      } catch (dbError: any) {
        console.error("Database error during forgot password:", dbError);
        // If it's a missing column error, return a generic response
        if (dbError.code === '42703') {
          return res.status(500).json({ error: "Service temporarily unavailable. Please try again later." });
        }
        throw dbError;
      }

      // Generate password reset token
      const resetToken = require('crypto').randomUUID();
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token to database
      await storage.savePasswordResetToken(user.id, resetToken, resetExpires);

      // Send password reset email via Firebase (client-side)
      res.json({ 
        success: true, 
        message: "Password reset instructions sent to your email",
        resetToken // This will be used client-side to trigger Firebase email
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      // Verify reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Update password and clear reset token
      await storage.updatePassword(user.id, newPassword);
      await storage.clearPasswordResetToken(user.id);

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Send email verification
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      res.json({ 
        success: true, 
        message: "Verification email sent",
        email: email
      });
    } catch (error) {
      console.error("Send verification error:", error);
      res.status(500).json({ error: "Failed to send verification email" });
    }
  });

  // Verify email
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Update user's email verification status
      await storage.verifyUserEmail(email);

      res.json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });
}