import { createUserWithEmailAndPassword, sendEmailVerification, User } from "firebase/auth";
import { auth } from "./firebase";
import { apiRequest } from "./queryClient";
import { handleFirebaseError } from "./firebase-errors";

export interface FirebaseSignupResult {
  success: boolean;
  user?: User;
  error?: string;
}

// Function to handle Firebase user signup and email verification
export const signUpUser = async (email: string, password: string): Promise<FirebaseSignupResult> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user: User = userCredential.user;

    // Send email verification
    await sendEmailVerification(user);
    console.log("Verification email sent to:", email);
    
    // Note: User will be synced to database during email verification process
    console.log("Firebase user created, email verification sent");

    return {
      success: true,
      user: user
    };

  } catch (error: any) {
    console.error("Signup or verification error:", error);
    return {
      success: false,
      error: handleFirebaseError(error)
    };
  }
};

// Function to check if user's email is verified
export const isEmailVerified = (): boolean => {
  const user = auth.currentUser;
  return user?.emailVerified ?? false;
};

// Function to resend email verification
export const resendEmailVerification = async (): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) {
    console.error("No user found for email verification");
    return false;
  }

  try {
    await sendEmailVerification(user);
    console.log("Verification email resent");
    return true;
  } catch (error) {
    console.error("Failed to resend verification email:", error);
    return false;
  }
};