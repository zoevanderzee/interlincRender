import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "./use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  company?: string;
  position?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Query to get the current user
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      console.log("Fetching current user data...");
      try {
        // Use apiRequest which handles X-User-ID header automatically
        const res = await apiRequest("GET", "/api/user");
        
        if (!res.ok) {
          console.log("User not authenticated");
          return null;
        }
        
        const userData = await res.json();
        console.log("User authenticated:", userData?.username);
        
        // Store authentication data for headers
        localStorage.setItem('user_id', userData.id.toString());
        localStorage.setItem('firebase_uid', userData.firebaseUid || '');
        
        return userData;
      } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login...");
      
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // Important: include cookies with the request
      });
      
      console.log("Login response status:", res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        const error = new Error(errorData.message || errorData.error || "Login failed");
        // Attach error type for specific handling
        (error as any).errorType = errorData.error;
        (error as any).email = errorData.email;
        throw error;
      }
      
      // Log detailed debugging information
      console.log("=== BROWSER LOGIN DEBUG ===");
      console.log("Login successful, response status:", res.status);
      console.log("Cookies before processing response:", document.cookie);
      console.log("Response headers:", {
        'set-cookie': res.headers.get('set-cookie'),
        'content-type': res.headers.get('content-type'), 
        status: res.status,
        allHeaders: Array.from(res.headers.entries())
      });
      
      // Wait for cookie to be set
      setTimeout(() => {
        console.log("Cookies after 100ms delay:", document.cookie);
        console.log("Has creativlinc.sid cookie:", document.cookie.includes('creativlinc.sid'));
      }, 100);
      
      // Get the response data
      const userData = await res.json();
      
      console.log("Login successful, storing user data in localStorage:", userData);
      
      // Store authentication data for headers as per your fix
      localStorage.setItem('user_id', userData.id.toString());
      localStorage.setItem('firebase_uid', userData.firebaseUid || '');
      console.log("Authentication data stored:");
      console.log("- user_id:", userData.id);
      console.log("- firebase_uid:", userData.firebaseUid || 'none');
      
      return userData;
    },
    onSuccess: (data: User) => {
      console.log("Login successful, saving user data to query cache");
      queryClient.setQueryData(["/api/user"], data);
      
      // Force immediate refresh of user query with the new localStorage data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Check if user needs subscription after login (using server response flag)
      if (data.redirectToSubscription) {
        console.log("User needs subscription, redirecting to subscription page");
        toast({
          title: "Account Setup Required",
          description: "Please select your subscription plan to access your dashboard.",
        });
        
        // Redirect to subscription page with user info
        const subscriptionUrl = `/auth?showSubscription=true&userId=${data.id}&role=${data.role}&email=${data.email}`;
        window.location.href = subscriptionUrl;
        return;
      }
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.firstName}!`,
      });
    },
    onError: (error: Error & { errorType?: string; email?: string }) => {
      console.error("Login error:", error);
      
      if (error.errorType === 'unverified_email') {
        toast({
          title: "Email Verification Required",
          description: "Please verify your email address before logging in. Check your inbox for the verification link.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      console.log("Attempting registration...");
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: "include", // Important: include cookies with the request
      });
      
      console.log("Registration response status:", res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Registration failed");
      }
      
      return await res.json();
    },
    onSuccess: (data: any) => {
      console.log("Registration successful, checking subscription requirements");
      
      // Only update cache if subscription is not required
      if (!data.requiresSubscription && !data.requiresEmailVerification) {
        console.log("No subscription required, saving user data to query cache");
        queryClient.setQueryData(["/api/user"], data);
        
        // After registration, explicitly invalidate dashboard and other dependent queries
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/budget"] });
        
        toast({
          title: "Registration successful",
          description: `Welcome to Creativ Linc, ${data.firstName}!`,
        });
      } else {
        console.log("Subscription or email verification required, not updating cache");
      }
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting logout...");
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include", // Important: include cookies with the request
      });
      
      console.log("Logout response status:", res.status);
      
      if (!res.ok) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      console.log("Logout successful, clearing user data");
      
      // Clear authentication data from localStorage
      localStorage.removeItem('user_id');
      localStorage.removeItem('firebase_uid');
      localStorage.removeItem('creativlinc_user'); // Remove legacy key too
      
      // Clear user data and invalidate all protected queries
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      
      // Clear authentication data even if server logout fails
      localStorage.removeItem('user_id');
      localStorage.removeItem('firebase_uid');
      localStorage.removeItem('creativlinc_user'); // Remove legacy key too
      
      // Clear query cache data too
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}