import { ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requiresSubscription } from "@/lib/subscription-utils";

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
    } else if (!isLoading && user && requiresSubscription(user) && path !== '/subscribe' && location !== '/subscribe') {
      console.log("Force redirecting to /subscribe - subscription required");
      setLocation("/subscribe");
    }
  }, [isLoading, user, setLocation, location, path]);

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
        // Check if user has active subscription (unless on subscription page)
        requiresSubscription(user) && path !== '/subscribe' ? (
          <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-black text-white border border-gray-800">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-orange-500">Subscription Required</CardTitle>
                <CardDescription className="text-gray-300">
                  You need an active subscription to access this feature
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/subscribe')}
                  className="w-full"
                >
                  Choose Subscription Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          children
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