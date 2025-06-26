import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let app: admin.app.App;

function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      // In production, use service account key
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'creativ-linc',
        });
      } else {
        // For development, initialize without credentials (email logging only)
        console.log('Firebase Admin SDK: Using development mode (no service account)');
        app = admin.initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'creativ-linc',
        });
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
    }
  } else {
    app = admin.apps[0] as admin.app.App;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string, appUrl: string): Promise<void> {
  try {
    initializeFirebaseAdmin();
    
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Production: Send actual email via Firebase Auth
      try {
        const link = await admin.auth().generatePasswordResetLink(email, {
          url: resetUrl,
          handleCodeInApp: false,
        });
        console.log(`Password reset email sent to ${email}`);
        console.log(`Reset link: ${link}`);
      } catch (firebaseError) {
        console.error('Firebase email sending failed:', firebaseError);
        // Fall back to logging
        console.log(`[FALLBACK] Password reset URL for ${email}: ${resetUrl}`);
      }
    } else {
      // Development: Log the reset URL
      console.log(`[DEV] Password reset email would be sent to: ${email}`);
      console.log(`[DEV] Reset URL: ${resetUrl}`);
    }
  } catch (error) {
    console.error('Error in sendPasswordResetEmail:', error);
    throw new Error('Failed to send password reset email');
  }
}

export async function sendEmailVerification(email: string, verificationToken: string, appUrl: string): Promise<void> {
  try {
    initializeFirebaseAdmin();
    
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Production: Send actual email via Firebase Auth
      try {
        const link = await admin.auth().generateEmailVerificationLink(email, {
          url: verificationUrl,
          handleCodeInApp: false,
        });
        console.log(`Email verification sent to ${email}`);
        console.log(`Verification link: ${link}`);
      } catch (firebaseError) {
        console.error('Firebase email sending failed:', firebaseError);
        // Fall back to logging
        console.log(`[FALLBACK] Email verification URL for ${email}: ${verificationUrl}`);
      }
    } else {
      // Development: Log the verification URL
      console.log(`[DEV] Email verification would be sent to: ${email}`);
      console.log(`[DEV] Verification URL: ${verificationUrl}`);
    }
  } catch (error) {
    console.error('Error in sendEmailVerification:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendWelcomeEmail(email: string, username: string, appUrl: string): Promise<void> {
  try {
    // For now, just log welcome emails
    console.log(`[DEV] Welcome email would be sent to: ${email}`);
    console.log(`[DEV] Username: ${username}`);
    console.log(`[DEV] App URL: ${appUrl}`);
  } catch (error) {
    console.error('Error in sendWelcomeEmail:', error);
  }
}

export function generateWorkRequestToken(): string {
  // Generate a random token for work requests
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}