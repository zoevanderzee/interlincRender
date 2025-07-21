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

  // Don't render anything if on auth page
  if (location.startsWith('/auth')) {
    return null;
  }

  useEffect(() => {
    if (!isLoading && !user) {
      console.log("Force redirecting to /auth");
      setLocation("/auth");
      return;
    }
    
    // Check subscription status
    if (!isLoading && user && (!user.subscriptionStatus || user.subscriptionStatus !== 'active')) {
      console.log("User needs subscription, redirecting to subscription page");
      const subscriptionUrl = `/auth?showSubscription=true&userId=${user.id}&role=${user.role}&email=${user.email}`;
      setLocation(subscriptionUrl);
      return;
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