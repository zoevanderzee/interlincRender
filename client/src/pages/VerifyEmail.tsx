import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { applyActionCode, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get('oobCode');
    const mode = urlParams.get('mode');

    if (mode === 'verifyEmail' && oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => {
          console.log("Firebase email verification successful");
          setMessage("Email verified! Setting up your account...");
          
          // Wait for auth state to update and sync user to database
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && user.emailVerified) {
              console.log("User is verified, syncing to database:", user.email);
              
              try {
                // Sync the verified user to PostgreSQL
                const syncResponse = await apiRequest("POST", "/api/sync-user", {
                  firebaseUid: user.uid,
                  email: user.email,
                  emailVerified: true
                });
                
                if (syncResponse.ok) {
                  const userData = await syncResponse.json();
                  console.log("User synced successfully:", userData);
                  
                  setStatus('success');
                  setMessage("Your account is ready! You can now sign in.");
                  
                  // Redirect to login after 3 seconds
                  setTimeout(() => {
                    setLocation('/auth');
                  }, 3000);
                } else {
                  throw new Error('Failed to sync user to database');
                }
              } catch (error) {
                console.error('Error syncing user:', error);
                setStatus('success');
                setMessage("Email verified! Please try signing in.");
                
                // Still redirect to login even if sync fails
                setTimeout(() => {
                  setLocation('/auth');
                }, 3000);
              }
              
              unsubscribe(); // Clean up listener
            }
          });
        })
        .catch((error) => {
          console.error('Email verification error:', error);
          setStatus('error');
          setMessage("This verification link is invalid or expired.");
        });
    } else {
      setStatus('error');
      setMessage("Invalid verification link.");
    }
  }, [setLocation]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-16 h-16 text-green-500" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500" />;
    }
  };

  const getCardColor = () => {
    switch (status) {
      case 'loading':
        return "border-blue-500";
      case 'success':
        return "border-green-500";
      case 'error':
        return "border-red-500";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md border-2 ${getCardColor()} bg-zinc-900 text-white`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription className="text-zinc-400">
            {status === 'success' && "You'll be redirected to login shortly."}
            {status === 'error' && "Please try requesting a new verification email."}
            {status === 'loading' && "Please wait while we verify your email address."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg">{message}</p>
          {status === 'success' && (
            <p className="text-sm text-zinc-400 mt-4">
              Redirecting in 3 seconds...
            </p>
          )}
          {status === 'error' && (
            <button 
              onClick={() => setLocation('/auth')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Back to Login
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}