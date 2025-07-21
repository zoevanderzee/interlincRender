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
  const [, setLocation] = useLocation();

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