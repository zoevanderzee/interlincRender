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
    } else if (!isLoading && user && user.subscriptionStatus !== 'active') {
      // If user is authenticated but doesn't have active subscription, redirect to subscription page
      const currentPath = location;
      const isAlreadyOnSubscriptionPage = currentPath.includes('showSubscription=true');
      
      if (!isAlreadyOnSubscriptionPage) {
        console.log("User needs subscription, redirecting to subscription page from ProtectedRoute");
        const subscriptionUrl = `/auth?showSubscription=true&userId=${user.id}&role=${user.role}&email=${user.email}`;
        setLocation(subscriptionUrl);
      }
    }
  }, [isLoading, user, setLocation, location]);

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