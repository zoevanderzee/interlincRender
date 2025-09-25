import { auth } from "./firebase";

/**
 * Get authentication headers for API requests
 * Returns basic headers for session-based authentication
 * (Authentication is handled via session cookies with credentials: 'include')
 */
export const getAuthHeaders = (): Record<string, string> => {
  return {
    'Content-Type': 'application/json'
  };
};

/**
 * Synchronous version that returns headers without Firebase token
 * Use for requests where Firebase auth is not required
 */
export const getBasicHeaders = (): Record<string, string> => {
  return {
    'Content-Type': 'application/json'
  };
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};