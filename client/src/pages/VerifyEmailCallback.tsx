import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { applyActionCode, getAuth } from 'firebase/auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function VerifyEmailCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the verification code from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const oobCode = urlParams.get('oobCode');

        if (mode !== 'verifyEmail' || !oobCode) {
          throw new Error('Invalid verification link');
        }

        // Apply the action code using Firebase Web SDK
        const auth = getAuth();
        await applyActionCode(auth, oobCode);

        // Get the user info to extract email
        const user = auth.currentUser;
        if (!user || !user.email) {
          throw new Error('No user found after verification');
        }

        // Sync verification status to our database
        await apiRequest('POST', '/api/confirm-verification', {
          email: user.email,
          firebaseUid: user.uid
        });

        setStatus('success');
        toast({
          title: "Email Verified",
          description: "Your email has been verified successfully. You can now log in.",
        });

        // Redirect to login page after 2 seconds
        setTimeout(() => {
          setLocation('/auth');
        }, 2000);

      } catch (error: any) {
        console.error('Email verification failed:', error);
        setStatus('error');
        toast({
          title: "Verification Failed",
          description: error.message || "Failed to verify email address.",
          variant: "destructive",
        });

        // Redirect to auth page after 3 seconds
        setTimeout(() => {
          setLocation('/auth');
        }, 3000);
      }
    };

    verifyEmail();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {status === 'verifying' && (
            <>
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Verifying your email...</h2>
              <p className="text-gray-600 mt-2">Please wait while we confirm your email address.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Email Verified!</h2>
              <p className="text-gray-600 mt-2">Redirecting to login page...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
              <p className="text-gray-600 mt-2">Redirecting to login page...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}