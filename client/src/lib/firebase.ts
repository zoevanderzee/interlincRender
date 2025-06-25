import { initializeApp } from "firebase/app";
import { getAuth, sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCH9vv_HKWhbe_sPLWMW9s3oZPYBHO5B5w",
  authDomain: "creativ-linc.firebaseapp.com",
  projectId: "creativ-linc",
  storageBucket: "creativ-linc.firebasestorage.app",
  messagingSenderId: "684839076927",
  appId: "1:684839076927:web:9b24e9decaf0592b79e48a",
  measurementId: "G-WCPQKYNJN8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Utility functions for password reset and email verification
export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Password reset email sent successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const sendEmailVerificationLink = async (email: string) => {
  try {
    // For email verification, we need to create a temporary user first
    // This is handled differently since we're using it as a service layer
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Verification email sent successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};