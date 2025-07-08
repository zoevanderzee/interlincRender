import { createUserWithEmailAndPassword, sendEmailVerification, User } from "firebase/auth";
import { auth } from "./firebase";
import { apiRequest } from "./queryClient";

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
    
    // Sync user data to PostgreSQL
    try {
      await apiRequest("POST", "/api/sync-user", {
        uid: user.uid,
        email: user.email
      });
      console.log("User synced to database");
    } catch (syncError) {
      console.error("Failed to sync user to database:", syncError);
      // Still return success since Firebase user was created
    }

    return {
      success: true,
      user: user
    };

  } catch (error: any) {
    console.error("Signup or verification error:", error.message);
    return {
      success: false,
      error: error.message
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