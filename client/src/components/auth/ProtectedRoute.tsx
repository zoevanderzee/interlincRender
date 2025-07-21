import { ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  path: string;
  children: ReactNode;
};

export function ProtectedRoute({ path, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  console.log("ProtectedRoute:", { path, isLoading, hasUser: !!user });

  useEffect(() => {
    if (!isLoading && !user) {
      console.log("Force redirecting to /auth");
      setLocation("/auth");
    }
  }, [isLoading, user, setLocation]);

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
            <p className="text-white">Loading...</p>
          </div>
        </div>
      ) : user ? (
        // Check subscription status - if inactive, block access to dashboard
        user.subscriptionStatus === 'active' ? (
          children
        ) : (
          <div className="flex items-center justify-center min-h-screen bg-black">
            <div className="text-center">
              <p className="text-white">Subscription required to access dashboard</p>
              <p className="text-white text-sm mt-2">Please complete your subscription to continue</p>
            </div>
          </div>
        )
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