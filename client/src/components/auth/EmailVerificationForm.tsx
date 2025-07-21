import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { resendEmailVerification } from "@/lib/firebase-auth";
import { handleFirebaseError } from "@/lib/firebase-errors";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface EmailVerificationFormProps {
  email: string;
  userId: number;
  verificationToken?: string;
  registrationData?: any;
  onBack: () => void;
  onVerified: (userData: any) => void;
}

export function EmailVerificationForm({ 
  email, 
  userId, 
  verificationToken, 
  registrationData,
  onBack, 
  onVerified 
}: EmailVerificationFormProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(true); // Firebase already sent email
  const { toast } = useToast();

  // Check Firebase email verification status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        // Email is verified, sync with database
        try {
          const syncPayload = {
            firebaseUid: user.uid,
            email: user.email,
            emailVerified: true,
            ...registrationData
          };
          
          const syncResponse = await apiRequest('POST', '/api/sync-user', syncPayload);
          
          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            toast({
              title: "Email Automatically Verified",
              description: "Your email has been successfully verified!",
            });
            onVerified(syncData.user);
          }
        } catch (error) {
          console.error("Error in automatic verification:", error);
          // Don't show error toast here, user can still click the button
        }
      }
    });

    return () => unsubscribe();
  }, [onVerified, registrationData, apiRequest, toast]);

  const handleSendVerificationEmail = async () => {
    setIsResending(true);
    try {
      const success = await resendEmailVerification();
      
      if (success) {
        setEmailSent(true);
        toast({
          title: "Verification Email Sent",
          description: "Please check your inbox and click the verification link.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send verification email. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsVerifying(true);
    
    try {
      // Force refresh the current user to check if email is verified
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          // Now sync the user with the database
          const syncPayload = {
            firebaseUid: auth.currentUser.uid,
            email: auth.currentUser.email,
            emailVerified: true,
            ...registrationData
          };
          
          const syncResponse = await apiRequest('POST', '/api/sync-user', syncPayload);
          
          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            toast({
              title: "Email Verified",
              description: "Your email has been successfully verified!",
            });
            // Pass user data with authentication status
            onVerified({
              ...syncData.user,
              authenticated: syncData.authenticated || true
            });
          } else {
            const errorData = await syncResponse.json();
            throw new Error(errorData.error || 'Failed to sync user data');
          }
        } else {
          toast({
            title: "Email Not Verified Yet",
            description: "Please check your email and click the verification link first, then try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Error checking verification:", error);
      const userFriendlyMessage = handleFirebaseError(error);
      toast({
        title: "Verification Check Failed",
        description: userFriendlyMessage,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-zinc-700 bg-zinc-900 text-white">
        <CardHeader>
          <div className="flex items-center mb-2">
            <button 
              type="button" 
              onClick={onBack}
              className="p-1 mr-2 rounded-full hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4 text-zinc-400" />
            </button>
            <CardTitle>Verify Your Email</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            We've sent a verification link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>

        {emailSent ? (
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Mail className="h-16 w-16 text-blue-500 mb-2" />
              <h3 className="text-xl font-medium text-white">Check Your Email</h3>
              <p className="text-zinc-400">
                We've sent a verification link to your email address. Click the link in the email to verify your account.
              </p>
              
              <div className="w-full space-y-3 pt-4">
                <p className="text-zinc-400 text-sm">
                  Check your email inbox and click the verification link, then click the button below.
                </p>
                <Button 
                  type="button"
                  onClick={handleCheckVerification}
                  className="w-full bg-white text-black hover:bg-zinc-200"
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "I've Verified My Email"
                  )}
                </Button>
              </div>

              <div className="pt-4 border-t border-zinc-700 w-full">
                <p className="text-sm text-zinc-400 mb-2">Didn't receive the email?</p>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => handleSendVerificationEmail()}
                  disabled={isResending}
                  className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Resend Verification Email"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        ) : (
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <p className="text-zinc-400">
                Click the button below to send a verification email to your address.
              </p>
              <Button 
                type="button" 
                onClick={() => handleSendVerificationEmail()}
                disabled={isResending}
                className="bg-white text-black hover:bg-zinc-200"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Verification Email"
                )}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}