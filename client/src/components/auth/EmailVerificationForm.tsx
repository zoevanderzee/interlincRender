import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { sendEmailVerification } from "@/lib/firebase";

interface EmailVerificationFormProps {
  email: string;
  userId: number;
  verificationToken?: string;
  onBack: () => void;
  onVerified: () => void;
}

export function EmailVerificationForm({ 
  email, 
  userId, 
  verificationToken, 
  onBack, 
  onVerified 
}: EmailVerificationFormProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(!!verificationToken);
  const { toast } = useToast();

  // Send verification email on component mount if token provided
  useState(() => {
    if (verificationToken && !emailSent) {
      handleSendVerificationEmail(verificationToken);
    }
  });

  const handleSendVerificationEmail = async (token?: string) => {
    setIsResending(true);
    try {
      const tokenToUse = token || await requestNewVerificationToken();
      
      if (tokenToUse) {
        // Send email via Firebase
        await sendEmailVerification(email, tokenToUse);
        setEmailSent(true);
        toast({
          title: "Verification Email Sent",
          description: "Please check your inbox and click the verification link.",
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

  const requestNewVerificationToken = async (): Promise<string | null> => {
    try {
      const response = await apiRequest("POST", "/api/auth/send-verification-email", {
        email,
        userId
      });
      
      const data = await response.json();
      return data.verificationToken || null;
    } catch (error) {
      console.error("Error requesting new verification token:", error);
      return null;
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter the verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const response = await apiRequest("POST", "/api/auth/verify-email", {
        token: verificationCode
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Email Verified",
          description: "Your email has been successfully verified. You can now log in.",
        });
        onVerified();
      } else {
        const errorData = await response.json();
        toast({
          title: "Verification Failed",
          description: errorData.error || "Invalid or expired verification code.",
          variant: "destructive",  
        });
      }
    } catch (error) {
      console.error("Email verification error:", error);
      toast({
        title: "Error",
        description: "Failed to verify email. Please try again.",
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
              
              <div className="w-full space-y-2 pt-4">
                <Label htmlFor="verificationCode" className="text-white">
                  Or enter verification code manually:
                </Label>
                <form onSubmit={handleVerifyEmail} className="space-y-3">
                  <Input
                    id="verificationCode"
                    type="text"
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-white text-black hover:bg-zinc-200"
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Email"
                    )}
                  </Button>
                </form>
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