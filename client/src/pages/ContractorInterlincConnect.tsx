
import React, { useEffect, useState } from 'react';
// Using Stripe Connect React components
import { loadConnectAndInitialize } from '@stripe/connect-js/pure';
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface ConnectAccount {
  accountId: string;
  accountType: string;
}

interface AccountSession {
  client_secret: string;
  needsOnboarding: boolean;
}

export default function ContractorInterlincConnect() {
  const { user } = useAuth();
  const [stripeConnect, setStripeConnect] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<'pending' | 'complete' | 'error'>('pending');
  const [statusLoading, setStatusLoading] = useState(true);

  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  // Check account status from server first
  useEffect(() => {
    const checkAccountStatus = async () => {
      try {
        console.log('Checking contractor account status from server...');
        const response = await apiRequest('GET', '/api/connect/status');
        const data = await response.json();
        
        console.log('Contractor account status response:', data);
        
        if (data.hasAccount && !data.needsOnboarding) {
          console.log('Contractor account setup is complete, no onboarding needed');
          setOnboardingStatus('complete');
        } else {
          console.log('Contractor account needs onboarding');
          setOnboardingStatus('pending');
        }
      } catch (error) {
        console.error('Failed to check contractor account status:', error);
        setOnboardingStatus('pending'); // Default to pending on error
      } finally {
        setStatusLoading(false);
      }
    };
    
    if (user?.role === 'contractor') {
      checkAccountStatus();
    } else {
      setStatusLoading(false);
      setError('Only contractor accounts can access this page');
    }
  }, [user]);

  // Initialize Stripe Connect only if onboarding is needed
  useEffect(() => {
    const initializeConnect = async () => {
      try {
        console.log('Starting Stripe Connect initialization for contractor...');
        console.log('Publishable key available:', !!publishableKey);
        
        if (!publishableKey) {
          throw new Error('Stripe publishable key not configured');
        }

        console.log('Creating Stripe Connect instance for contractor...');
        const connectInstance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret: async () => {
            console.log('fetchClientSecret called by Stripe Connect for contractor');
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

            console.log('Making session request to backend for contractor...');
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
              throw new Error(`Failed to create contractor session: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Contractor session created successfully, client_secret received');
            return data.client_secret;
          },
          appearance: {
            overlays: 'dialog',
            variables: {
              colorPrimary: '#635BFF',
            },
          },
        });

        console.log('Stripe Connect instance created successfully for contractor:', !!connectInstance);
        setStripeConnect(connectInstance);
        setIsLoading(false);
        console.log('Stripe Connect state updated for contractor, isLoading set to false');
      } catch (err) {
        console.error('Failed to initialize Stripe Connect for contractor:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsLoading(false);
      }
    };

    // Only initialize Stripe Connect if onboarding is needed and we have the publishable key
    console.log('Checking if Stripe Connect should be initialized for contractor:', { onboardingStatus, publishableKey: !!publishableKey, statusLoading });
    if (onboardingStatus === 'pending' && publishableKey && !statusLoading) {
      initializeConnect();
    } else if (onboardingStatus === 'complete') {
      setIsLoading(false); // Don't need to initialize Stripe Connect
    }
  }, [onboardingStatus, publishableKey, statusLoading]);

  // Handle onboarding completion
  const handleOnboardingExit = async () => {
    console.log('Contractor onboarding completed or exited');
    
    try {
      // Re-check account status from server
      console.log('Re-checking contractor account status after onboarding...');
      const response = await apiRequest('GET', '/api/connect/status');
      const data = await response.json();
      
      console.log('Updated contractor account status:', data);
      
      if (data.hasAccount && !data.needsOnboarding) {
        console.log('Contractor onboarding completed successfully!');
        setOnboardingStatus('complete');
      } else {
        console.log('Contractor onboarding not yet complete');
        setOnboardingStatus('pending');
      }
    } catch (error) {
      console.error('Failed to check updated contractor account status:', error);
      setOnboardingStatus('error');
    }
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
        return 'Payment account setup complete';
      case 'error':
        return 'Setup encountered an error';
      default:
        return 'Payment account setup in progress';
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

  // Check if user is a contractor
  if (user?.role !== 'contractor') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Only contractor accounts can access payment setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">
              This page is only available to contractor accounts. Please log in with a contractor account to set up payment receiving.
            </p>
            <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              There was an issue setting up your payment account.
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
        <h1 className="text-3xl font-bold mb-2">Individual Payment Setup</h1>
        <p className="text-gray-600">
          Set up your personal payment account as an individual contractor to receive payments from clients securely.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {getStatusIcon()}
                Payment Account Status
              </span>
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>{getStatusText()}</CardDescription>
          </CardHeader>
        </Card>

        {/* Embedded Onboarding */}
        {statusLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Checking account status...
              </div>
            </CardContent>
          </Card>
        ) : isLoading && onboardingStatus === 'pending' ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Initializing payment setup...
              </div>
            </CardContent>
          </Card>
        ) : stripeConnect && onboardingStatus === 'pending' ? (
          <Card>
            <CardHeader>
              <CardTitle>Complete Individual Account Setup</CardTitle>
              <CardDescription>
                Please provide your personal information as an individual contractor to start receiving payments from clients.
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
              <h3 className="text-lg font-semibold mb-2">Individual Account Setup Complete!</h3>
              <p className="text-gray-600 text-center">
                Your personal payment account is ready to receive payments from clients as an individual contractor.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Contractor Payment Setup</CardTitle>
            <CardDescription>
              Understanding how individual contractor payments work with Interlinc
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 mt-0.5">1</div>
              <div>
                <h4 className="font-medium">Individual Express Account</h4>
                <p className="text-sm text-gray-600">You'll set up a personal Stripe Express account designed for individual contractors, not businesses.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 mt-0.5">2</div>
              <div>
                <h4 className="font-medium">Personal Information Required</h4>
                <p className="text-sm text-gray-600">You'll provide your personal details, tax information, and bank account as an individual.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 mt-0.5">3</div>
              <div>
                <h4 className="font-medium">Direct Personal Payments</h4>
                <p className="text-sm text-gray-600">Payments are transferred directly to your personal bank account as an individual contractor.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 mt-0.5">4</div>
              <div>
                <h4 className="font-medium">Secure & Compliant</h4>
                <p className="text-sm text-gray-600">All processing meets banking regulations with standard Stripe processing fees.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
