import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  path: string;
  children: ReactNode;
};

export function ProtectedRoute({ path, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [authVerified, setAuthVerified] = useState(false);

  console.log("ProtectedRoute:", { path, isLoading, hasUser: !!user });

  // Double-check authentication with server on every protected route access
  useEffect(() => {
    async function verifyAuth() {
      try {
        const response = await fetch("/api/user", {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });
        
        if (response.status === 401) {
          console.log("Server confirms user not authenticated, forcing redirect");
          localStorage.clear();
          sessionStorage.clear();
          setLocation("/auth");
          return;
        }
        
        if (response.ok) {
          const userData = await response.json();
          if (userData) {
            setAuthVerified(true);
            return;
          }
        }
        
        // Any other case, redirect to auth
        console.log("Authentication verification failed, redirecting");
        setLocation("/auth");
      } catch (error) {
        console.error("Auth verification error:", error);
        setLocation("/auth");
      }
    }

    if (!isLoading) {
      verifyAuth();
    }
  }, [isLoading, setLocation, path]);

  useEffect(() => {
    if (!isLoading && !user) {
      console.log("Force redirecting to /auth");
      setLocation("/auth");
    }
  }, [isLoading, user, setLocation]);

  return (
    <Route path={path}>
      {isLoading || !authVerified ? (
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
            <p className="text-white">Verifying authentication...</p>
          </div>
        </div>
      ) : user ? (
        children
      ) : (
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="text-center">
            <p className="text-white">Redirecting to login...</p>
          </div>
        </div>
      )}
    </Route>
  );
}