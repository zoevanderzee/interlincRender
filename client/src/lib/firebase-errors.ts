// Firebase error code to user-friendly message mapping
export const getFirebaseErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please try signing in instead.';
    
    case 'auth/weak-password':
      return 'Your password is too weak. Please choose a stronger password with at least 6 characters.';
    
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    
    case 'auth/user-not-found':
      return 'No account found with this email address. Please check your email or create a new account.';
    
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or reset your password.';
    
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes before trying again.';
    
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    
    case 'auth/invalid-action-code':
      return 'This verification link is invalid or has expired. Please request a new one.';
    
    case 'auth/expired-action-code':
      return 'This verification link has expired. Please request a new verification email.';
    
    case 'auth/invalid-verification-code':
      return 'Invalid verification code. Please check the code and try again.';
    
    case 'auth/missing-email':
      return 'Please enter your email address.';
    
    case 'auth/missing-password':
      return 'Please enter your password.';
    
    case 'auth/invalid-credential':
      return 'Invalid login credentials. Please check your email and password.';
    
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    
    case 'auth/requires-recent-login':
      return 'For security, please sign in again to complete this action.';
    
    case 'auth/email-not-verified':
      return 'Please verify your email address before signing in.';
    
    default:
      return 'Something went wrong. Please try again or contact support if the problem continues.';
  }
};

// Extract Firebase error code from error message
export const extractFirebaseErrorCode = (errorMessage: string): string => {
  const match = errorMessage.match(/\(([^)]+)\)/);
  return match ? match[1] : '';
};

// Get user-friendly error message from Firebase error
export const handleFirebaseError = (error: any): string => {
  let errorCode = '';
  
  if (error?.code) {
    errorCode = error.code;
  } else if (error?.message) {
    errorCode = extractFirebaseErrorCode(error.message);
  }
  
  return getFirebaseErrorMessage(errorCode);
};