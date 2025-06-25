import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import Logo from "@assets/CD_icon_light@2x.png";

export default function VerifyEmailPage() {
  const [location, navigate] = useLocation();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    
    if (!token) {
      setVerificationStatus('error');
      setMessage('Invalid verification link. Missing token.');
      return;
    }
    
    // Verify the email token
    const verifyEmail = async () => {
      try {
        const response = await apiRequest("POST", "/api/auth/verify-email", {
          token
        });
        
        if (response.ok) {
          const data = await response.json();
          setVerificationStatus('success');
          setMessage('Your email has been successfully verified! You can now log in to your account.');
        } else {
          const errorData = await response.json();
          setVerificationStatus('error');
          setMessage(errorData.error || 'Invalid or expired verification link.');
        }
      } catch (error) {
        console.error("Email verification error:", error);
        setVerificationStatus('error');
        setMessage('Failed to verify email. Please try again or contact support.');
      }
    };
    
    verifyEmail();
  }, []);
  
  const handleGoToLogin = () => {
    navigate('/auth');
  };
  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={Logo} alt="Creativ Linc Logo" className="h-16" />
        </div>
        
        <Card className="border-zinc-700 bg-zinc-900 text-white">
          <CardHeader>
            <CardTitle>Email Verification</CardTitle>
            <CardDescription className="text-zinc-400">
              Processing your email verification...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              {verificationStatus === 'loading' && (
                <>
                  <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-2" />
                  <h3 className="text-xl font-medium text-white">Verifying Email...</h3>
                  <p className="text-zinc-400">Please wait while we verify your email address.</p>
                </>
              )}
              
              {verificationStatus === 'success' && (
                <>
                  <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
                  <h3 className="text-xl font-medium text-white">Email Verified!</h3>
                  <p className="text-zinc-400">{message}</p>
                  <Button 
                    onClick={handleGoToLogin}
                    className="mt-4 bg-white text-black hover:bg-zinc-200"
                  >
                    Go to Login
                  </Button>
                </>
              )}
              
              {verificationStatus === 'error' && (
                <>
                  <XCircle className="h-16 w-16 text-red-500 mb-2" />
                  <h3 className="text-xl font-medium text-white">Verification Failed</h3>
                  <p className="text-zinc-400">{message}</p>
                  <Button 
                    onClick={handleGoToLogin}
                    className="mt-4 bg-white text-black hover:bg-zinc-200"
                  >
                    Back to Login
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}