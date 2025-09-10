import React, { useEffect, useState } from 'react';
// Using Stripe Connect React components
import { loadConnectAndInitialize } from '@stripe/connect-js/pure';
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<'pending' | 'complete' | 'error'>('pending');

  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  // Initialize Stripe Connect
  useEffect(() => {
    const initializeConnect = async () => {
      try {
        console.log('Starting Stripe Connect initialization...');
        console.log('Publishable key available:', !!publishableKey);
        
        if (!publishableKey) {
          throw new Error('Stripe publishable key not configured');
        }

        console.log('Creating Stripe Connect instance...');
        const connectInstance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret: async () => {
            console.log('fetchClientSecret called by Stripe Connect');
            // This function is called by Stripe when it needs a client secret
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

            console.log('Making session request to backend...');
            const response = await fetch('/api/connect/session', {
              method: 'POST',
              body: JSON.stringify({
                publishableKey,
                country: 'GB',
              }),
              headers: authHeaders,
              credentials: 'include',
            });

            if (!response.ok) {
              throw new Error(`Failed to create session: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Session created successfully, client_secret received');
            return data.client_secret;
          },
          appearance: {
            overlays: 'dialog',
            variables: {
              colorPrimary: '#635BFF',
            },
          },
        });

        console.log('Stripe Connect instance created successfully:', !!connectInstance);
        setStripeConnect(connectInstance);
        setIsLoading(false);
        console.log('Stripe Connect state updated, isLoading set to false');
      } catch (err) {
        console.error('Failed to initialize Stripe Connect:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsLoading(false);
      }
    };

    console.log('useEffect triggered, publishableKey:', !!publishableKey);
    if (publishableKey) {
      initializeConnect();
    }
  }, [publishableKey]);

  // Handle onboarding completion
  const handleOnboardingExit = () => {
    console.log('Onboarding completed or exited');
    setOnboardingStatus('complete');
    // Refresh the page or update status
    window.location.reload();
  };




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
            <Button onClick={() => window.location.reload()} variant="outline">
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
        ) : stripeConnect && onboardingStatus === 'pending' ? (
          <Card>
            <CardHeader>
              <CardTitle>Complete Account Setup</CardTitle>
              <CardDescription>
                Please provide the required information to start receiving payments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[400px]">
                <ConnectComponentsProvider connectInstance={stripeConnect}>
                  <ConnectAccountOnboarding
                    onExit={handleOnboardingExit}
                  />
                </ConnectComponentsProvider>
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