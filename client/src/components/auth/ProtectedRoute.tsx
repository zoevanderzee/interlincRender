import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route } from "wouter";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  path: string;
  children: ReactNode;
};

export function ProtectedRoute({ path, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen bg-black">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      ) : user ? (
        children
      ) : (
        <Redirect to="/auth" />
      )}
    </Route>
  );
}