
import React, { useEffect, useState } from 'react';
import { loadConnectAndInitialize } from '@stripe/connect-js/pure';
import { 
  ConnectAccountOnboarding, 
  ConnectAccountManagement,
  ConnectComponentsProvider 
} from '@stripe/react-connect-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, XCircle, AlertCircle, Settings, CreditCard } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ConnectStatusV2 {
  hasAccount: boolean;
  accountId?: string;
  needsOnboarding: boolean;
  version: string;
  capabilities?: {
    card_payments: string;
    transfers: string;
    enhanced_onboarding: boolean;
    real_time_status: boolean;
    embedded_management: boolean;
  };
  payment_methods?: {
    card: boolean;
    ach: boolean;
    international: boolean;
  };
  requirements?: {
    currently_due: string[];
    past_due: string[];
    pending_verification: string[];
    disabled_reason: string | null;
  };
}

export default function InterlincConnectV2() {
  const [stripeConnect, setStripeConnect] = useState<any>(null);
  const [managementConnect, setManagementConnect] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectStatusV2 | null>(null);
  const [activeTab, setActiveTab] = useState('onboarding');

  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  // Check V2 status
  const checkStatus = async () => {
    try {
      console.log('Checking V2 Connect status...');
      const response = await apiRequest('GET', '/api/connect/v2/status');
      const data = await response.json();
      
      console.log('V2 Status response:', data);
      setStatus(data);
      
      return data;
    } catch (error) {
      console.error('Failed to check V2 status:', error);
      throw error;
    }
  };

  // Initialize V2 Connect for onboarding
  const initializeOnboarding = async () => {
    try {
      const connectInstance = loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => {
          const userId = localStorage.getItem('user_id');
          const firebaseUid = localStorage.getItem('firebase_uid');
          const authHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          
          if (userId) authHeaders['X-User-ID'] = userId;
          if (firebaseUid) authHeaders['X-Firebase-UID'] = firebaseUid;

          console.log('Creating V2 session...');
          const response = await fetch('/api/connect/v2/session', {
            method: 'POST',
            body: JSON.stringify({
              publishableKey,
              country: 'GB',
              enabledComponents: {
                account_management: true
              }
            }),
            headers: authHeaders,
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to create V2 session: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('V2 Session created:', data);
          return data.client_secret;
        },
        appearance: {
          overlays: 'dialog',
          variables: {
            colorPrimary: '#635BFF',
            colorBackground: '#ffffff',
            colorText: '#30313d',
            colorDanger: '#df1b41',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            spacingUnit: '2px',
            borderRadius: '4px',
          },
        },
      });

      setStripeConnect(connectInstance);
    } catch (err) {
      console.error('Failed to initialize V2 onboarding:', err);
      throw err;
    }
  };

  // Initialize V2 Connect for account management
  const initializeManagement = async () => {
    try {
      const managementInstance = loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => {
          const userId = localStorage.getItem('user_id');
          const firebaseUid = localStorage.getItem('firebase_uid');
          const authHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          
          if (userId) authHeaders['X-User-ID'] = userId;
          if (firebaseUid) authHeaders['X-Firebase-UID'] = firebaseUid;

          console.log('Creating V2 management session...');
          const response = await fetch('/api/connect/v2/account-management-session', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: authHeaders,
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to create management session: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('V2 Management session created:', data);
          return data.client_secret;
        },
        appearance: {
          overlays: 'dialog',
          variables: {
            colorPrimary: '#635BFF',
          },
        },
      });

      setManagementConnect(managementInstance);
    } catch (err) {
      console.error('Failed to initialize V2 management:', err);
      throw err;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        const statusData = await checkStatus();
        
        if (statusData.needsOnboarding) {
          await initializeOnboarding();
        }
        
        if (statusData.hasAccount) {
          await initializeManagement();
          setActiveTab('management');
        }
        
      } catch (err) {
        console.error('V2 initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    };

    if (publishableKey) {
      initialize();
    }
  }, [publishableKey]);

  const handleOnboardingExit = async () => {
    console.log('V2 Onboarding completed');
    await checkStatus();
    if (status?.hasAccount) {
      await initializeManagement();
      setActiveTab('management');
    }
  };

  const getStatusBadge = () => {
    if (!status) return <Badge variant="outline">Loading...</Badge>;
    
    if (status.hasAccount && !status.needsOnboarding) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">V2 Active</Badge>;
    } else if (status.needsOnboarding) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">V2 Setup Required</Badge>;
    }
    
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">V2 Ready</Badge>;
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              V2 Setup Error
            </CardTitle>
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
        <h1 className="text-3xl font-bold mb-2">Interlinc Connect V2</h1>
        <p className="text-gray-600">
          Enhanced Stripe Connect with improved onboarding and account management.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                V2 Connect Status
              </span>
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              {status?.version === 'v2' ? 'Using enhanced V2 API' : 'Initializing V2 features'}
            </CardDescription>
          </CardHeader>
          
          {status && (
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Account ID:</strong> {status.accountId || 'Not created'}
                </div>
                <div>
                  <strong>Payment Methods:</strong>
                  <ul className="mt-1">
                    <li>Card: {status.payment_methods?.card ? '✅' : '❌'}</li>
                    <li>ACH: {status.payment_methods?.ach ? '✅' : '❌'}</li>
                    <li>International: {status.payment_methods?.international ? '✅' : '❌'}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Main Interface */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Initializing V2 Connect...
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>V2 Connect Interface</CardTitle>
              <CardDescription>
                Enhanced embedded components with improved UX
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="onboarding" className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Setup Account
                  </TabsTrigger>
                  <TabsTrigger value="management" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Manage Account
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="onboarding" className="mt-6">
                  <div className="min-h-[400px]">
                    {stripeConnect && status?.needsOnboarding ? (
                      <ConnectComponentsProvider connectInstance={stripeConnect}>
                        <ConnectAccountOnboarding
                          onExit={handleOnboardingExit}
                        />
                      </ConnectComponentsProvider>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Account Setup Complete!</h3>
                        <p className="text-gray-600">Switch to the Management tab to configure your account.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="management" className="mt-6">
                  <div className="min-h-[400px]">
                    {managementConnect && status?.hasAccount ? (
                      <ConnectComponentsProvider connectInstance={managementConnect}>
                        <ConnectAccountManagement />
                      </ConnectComponentsProvider>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="w-12 h-12 text-yellow-600 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Complete Setup First</h3>
                        <p className="text-gray-600">Please complete account setup before accessing management features.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Feature Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>V2 Enhancements</CardTitle>
            <CardDescription>New capabilities in this version</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium">Enhanced Onboarding</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Real-time validation</li>
                  <li>• Progressive disclosure</li>
                  <li>• Better error handling</li>
                  <li>• Mobile optimized</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Account Management</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Embedded settings</li>
                  <li>• Document management</li>
                  <li>• Payout preferences</li>
                  <li>• Compliance tracking</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
