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
        // Try to get user data from localStorage first as a fallback
        const storedUser = localStorage.getItem('creativlinc_user');
        
        const res = await fetch("/api/user", {
          method: "GET",
          credentials: "include", // Important: include cookies with the request
          headers: {
            "Accept": "application/json",
            "Cache-Control": "no-cache"
          }
        });
        
        console.log("User data response status:", res.status);
        
        if (!res.ok) {
          console.log("User not authenticated via API, checking localStorage");
          
          // If API call fails, try using localStorage data
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              console.log("Using stored user data:", parsedUser?.username);
              return parsedUser as User;
            } catch (e) {
              console.error("Error parsing stored user:", e);
              localStorage.removeItem('creativlinc_user');
            }
          }
          
          return null;
        }
        
        const userData = await res.json();
        console.log("User authenticated:", userData?.username);
        
        // Update localStorage with fresh user data
        localStorage.setItem('creativlinc_user', JSON.stringify(userData));
        
        return userData;
      } catch (error) {
        console.error("Error fetching user data:", error);
        
        // On error, try using localStorage as fallback
        const storedUser = localStorage.getItem('creativlinc_user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log("Using stored user data after fetch error:", parsedUser?.username);
            return parsedUser as User;
          } catch (e) {
            console.error("Error parsing stored user after fetch error:", e);
            localStorage.removeItem('creativlinc_user');
          }
        }
        
        return null;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    initialData: null // Ensure we always have a User | null type
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login...");
      
      // Ensure there are no existing cookies that might interfere
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name.includes('creativlinc')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        }
      });
      
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
        throw new Error(errorData.error || "Login failed");
      }
      
      // Log the cookies after login for debugging
      console.log("Cookies after login:", document.cookie);
      
      // Get the response data
      const userData = await res.json();
      
      // Store the user data in localStorage for session persistence
      // This acts as a fallback when cookies fail
      localStorage.setItem('creativlinc_user', JSON.stringify(userData));
      
      return userData;
    },
    onSuccess: (data: User) => {
      console.log("Login successful, saving user data to query cache");
      queryClient.setQueryData(["/api/user"], data);
      
      // After login, explicitly invalidate dashboard and other dependent queries
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget"] });
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.firstName}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
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
    onSuccess: (data: User) => {
      console.log("Registration successful, saving user data to query cache");
      queryClient.setQueryData(["/api/user"], data);
      
      // After registration, explicitly invalidate dashboard and other dependent queries
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget"] });
      
      toast({
        title: "Registration successful",
        description: `Welcome to Creativ Linc, ${data.firstName}!`,
      });
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
      
      // Clear localStorage-based authentication data
      localStorage.removeItem('creativlinc_user');
      
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
      
      // Clear localStorage-based authentication data even if server logout fails
      localStorage.removeItem('creativlinc_user');
      
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