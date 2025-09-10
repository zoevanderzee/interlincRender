import React, { useEffect, useState } from 'react';
// Note: Using direct SDK initialization approach since embedded components require specific setup
import { loadConnectAndInitialize } from '@stripe/connect-js/pure';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ConnectAccount {
  accountId: string;
  accountType: string;
}

interface AccountSession {
  client_secret: string;
  needsOnboarding: boolean;
}

export default function InterlincConnect() {
  const [stripeConnect, setStripeConnect] = useState<any>(null);
  const [account, setAccount] = useState<ConnectAccount | null>(null);
  const [session, setSession] = useState<AccountSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<'pending' | 'complete' | 'error'>('pending');

  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  // Initialize Stripe Connect
  useEffect(() => {
    const initializeConnect = async () => {
      try {
        if (!publishableKey) {
          throw new Error('Stripe publishable key not configured');
        }

        const connectInstance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret: async () => {
            if (!session?.client_secret) {
              throw new Error('No client secret available');
            }
            return session.client_secret;
          },
          appearance: {
            overlays: 'dialog',
            variables: {
              colorPrimary: '#635BFF',
            },
          },
        });

        setStripeConnect(connectInstance);
      } catch (err) {
        console.error('Failed to initialize Stripe Connect:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      }
    };

    if (session) {
      initializeConnect();
    }
  }, [publishableKey, session]);

  // Create account and get session
  const ensureAccountAndSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get authentication headers
      const userId = localStorage.getItem('user_id');
      const firebaseUid = localStorage.getItem('firebase_uid');
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (userId) {
        authHeaders['X-User-ID'] = userId;
      }
      if (firebaseUid) {
        authHeaders['X-Firebase-UID'] = firebaseUid;
      }

      // Create/get Express account
      const accountResponse = await fetch('/api/connect/ensure-account', {
        method: 'POST',
        body: JSON.stringify({
          country: 'GB',
          businessType: 'company',
        }),
        headers: authHeaders,
        credentials: 'include',
      });

      if (!accountResponse.ok) {
        const errorData = await accountResponse.json();
        throw new Error(errorData.error || 'Failed to create account');
      }

      const accountData: ConnectAccount = await accountResponse.json();
      setAccount(accountData);

      // Create account session
      const sessionResponse = await fetch('/api/connect/session', {
        method: 'POST',
        body: JSON.stringify({
          accountId: accountData.accountId,
          publishableKey,
        }),
        headers: authHeaders,
        credentials: 'include',
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const sessionData: AccountSession = await sessionResponse.json();
      setSession(sessionData);
      setOnboardingStatus(sessionData.needsOnboarding ? 'pending' : 'complete');
    } catch (err) {
      console.error('Setup error:', err);
      setError(err instanceof Error ? err.message : 'Setup failed');
      setOnboardingStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize on component mount
  useEffect(() => {
    ensureAccountAndSession();
  }, []);

  // Refresh session periodically to check status
  useEffect(() => {
    if (!account || onboardingStatus === 'complete') return;

    const checkStatus = async () => {
      try {
        // Get fresh auth headers for status check
        const userId = localStorage.getItem('user_id');
        const firebaseUid = localStorage.getItem('firebase_uid');
        const authHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (userId) {
          authHeaders['X-User-ID'] = userId;
        }
        if (firebaseUid) {
          authHeaders['X-Firebase-UID'] = firebaseUid;
        }

        const response = await fetch('/api/connect/session', {
          method: 'POST',
          body: JSON.stringify({
            accountId: account.accountId,
            publishableKey,
          }),
          headers: authHeaders,
          credentials: 'include',
        });

        if (response.ok) {
          const data: AccountSession = await response.json();
          if (!data.needsOnboarding) {
            setOnboardingStatus('complete');
          }
        }
      } catch (err) {
        console.error('Status check failed:', err);
      }
    };

    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [account, onboardingStatus, publishableKey]);

  const getStatusIcon = () => {
    switch (onboardingStatus) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusText = () => {
    switch (onboardingStatus) {
      case 'complete':
        return 'Account setup complete';
      case 'error':
        return 'Setup encountered an error';
      default:
        return 'Account setup in progress';
    }
  };

  const getStatusBadge = () => {
    switch (onboardingStatus) {
      case 'complete':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Complete</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Setup Error
            </CardTitle>
            <CardDescription>
              There was an issue setting up your Stripe Connect account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={ensureAccountAndSession} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Interlinc Connect</h1>
        <p className="text-gray-600">
          Set up your Stripe Connect account to receive payments from clients.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {getStatusIcon()}
                Connect Account Status
              </span>
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>{getStatusText()}</CardDescription>
          </CardHeader>
          {account && (
            <CardContent>
              <div className="text-sm text-gray-600">
                <p><strong>Account ID:</strong> {account.accountId}</p>
                <p><strong>Account Type:</strong> {account.accountType}</p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Embedded Onboarding */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Initializing account setup...
              </div>
            </CardContent>
          </Card>
        ) : stripeConnect && session && onboardingStatus !== 'complete' ? (
          <Card>
            <CardHeader>
              <CardTitle>Complete Account Setup</CardTitle>
              <CardDescription>
                Please provide the required information to start receiving payments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div id="connect-onboarding" className="min-h-[400px]">
                {/* Stripe Connect onboarding will be embedded here */}
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading account setup form...</p>
                    <p className="text-sm text-gray-500 mt-2">This will redirect to Stripe for onboarding</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : onboardingStatus === 'complete' ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Account Setup Complete!</h3>
              <p className="text-gray-600 text-center">
                Your Stripe Connect account is ready to receive payments.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>About Stripe Connect</CardTitle>
            <CardDescription>
              How payments work with Interlinc
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 mt-0.5">1</div>
              <div>
                <h4 className="font-medium">Secure Payment Processing</h4>
                <p className="text-sm text-gray-600">Stripe handles all payment processing securely and compliantly.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 mt-0.5">2</div>
              <div>
                <h4 className="font-medium">Automatic Transfers</h4>
                <p className="text-sm text-gray-600">Payments are automatically transferred to your connected bank account.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 mt-0.5">3</div>
              <div>
                <h4 className="font-medium">Transparent Fees</h4>
                <p className="text-sm text-gray-600">Standard Stripe processing fees apply to all transactions.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}