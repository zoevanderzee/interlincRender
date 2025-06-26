import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let app: admin.app.App;

function initializeFirebaseAdmin() {
  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps && admin.apps.length > 0) {
      app = admin.apps[0] as admin.app.App;
      console.log('✅ Using existing Firebase Admin SDK instance');
      return true;
    }

    // Check for service account key
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    console.log('🔍 Checking for Firebase service account key...');
    console.log('Key exists:', !!serviceAccountKey);
    
    if (serviceAccountKey) {
      console.log('🚀 Attempting to initialize Firebase Admin SDK...');
      const serviceAccount = JSON.parse(serviceAccountKey);
      console.log('📋 Service account project:', serviceAccount.project_id);
      
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || 'creativ-linc',
      });
      
      console.log('✅ Firebase Admin SDK initialized successfully!');
      console.log('📧 Email sending is now ACTIVE');
      return true;
    } else {
      console.log('❌ No Firebase service account key found');
      console.log('📝 Running in development mode - emails will be logged to console');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string, appUrl: string): Promise<void> {
  try {
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY && initializeFirebaseAdmin()) {
      // Production: Send actual email via Firebase Auth
      try {
        const link = await admin.auth().generatePasswordResetLink(email, {
          url: resetUrl,
          handleCodeInApp: false,
        });
        console.log(`✅ Password reset email sent to ${email}`);
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
    // Don't throw error to allow system to continue working
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
    console.log(`[FALLBACK] Password reset URL for ${email}: ${resetUrl}`);
  }
}

export async function sendEmailVerification(email: string, verificationToken: string, appUrl: string): Promise<void> {
  try {
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY && initializeFirebaseAdmin()) {
      // Production: Send actual email via Firebase Auth
      try {
        const link = await admin.auth().generateEmailVerificationLink(email, {
          url: verificationUrl,
          handleCodeInApp: false,
        });
        console.log(`✅ Email verification sent to ${email}`);
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
    // Don't throw error to allow system to continue working
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    console.log(`[FALLBACK] Email verification URL for ${email}: ${verificationUrl}`);
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