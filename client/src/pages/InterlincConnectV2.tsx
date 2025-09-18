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
import { CheckCircle, Clock, XCircle, AlertCircle, Settings, CreditCard, Zap, Shield, Globe } from 'lucide-react';
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

export default function InterlincConnect() {
  const [stripeConnect, setStripeConnect] = useState<any>(null);
  const [managementConnect, setManagementConnect] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectStatusV2 | null>(null);
  const [activeTab, setActiveTab] = useState('setup');

  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  // Check V2 status
  const checkStatus = async () => {
    try {
      console.log('Checking Interlinc Connect V2 status...');
      const response = await apiRequest('GET', '/api/connect/v2/status');
      const data = await response.json();

      console.log('Interlinc Connect V2 Status:', data);
      setStatus(data);

      return data;
    } catch (error) {
      console.error('Failed to check Interlinc Connect status:', error);
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

          console.log('Creating Interlinc Connect V2 session...');
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
            throw new Error(`Failed to create Interlinc Connect session: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('Interlinc Connect V2 Session created:', data);
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
            borderRadius: '6px',
          },
        },
      });

      setStripeConnect(connectInstance);
    } catch (err) {
      console.error('Failed to initialize Interlinc Connect onboarding:', err);
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

          console.log('Creating Interlinc Connect management session...');
          const response = await fetch('/api/connect/v2/account-management-session', {
            method: 'POST',
            body: JSON.stringify({
              publishableKey
            }),
            headers: authHeaders,
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to create management session: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('Interlinc Connect management session created:', data);
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
      console.error('Failed to initialize Interlinc Connect management:', err);
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
          setActiveTab('manage');
        }

      } catch (err) {
        console.error('Interlinc Connect initialization failed:', err);
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
    console.log('Interlinc Connect onboarding completed');
    await checkStatus();
    if (status?.hasAccount) {
      await initializeManagement();
      setActiveTab('manage');
    }
  };

  const getStatusBadge = () => {
    if (!status) return <Badge variant="outline">Loading...</Badge>;

    if (status.hasAccount && !status.needsOnboarding) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>;
    } else if (status.needsOnboarding) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Setup Required</Badge>;
    }

    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ready</Badge>;
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Interlinc Connect Setup Error
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
        <h1 className="text-3xl font-bold mb-2">Interlinc Connect</h1>
        <p className="text-gray-600">
          Enhanced payment processing with advanced capabilities and seamless integration.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Interlinc Connect Status
              </span>
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              {status?.version === 'v2' ? 'Using enhanced V2 API with advanced features' : 'Initializing enhanced features'}
            </CardDescription>
          </CardHeader>

          {status && (
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Account ID:</strong>
                  <p className="text-gray-600 font-mono text-xs">{status.accountId || 'Not created'}</p>
                </div>
                <div>
                  <strong>Enhanced Features:</strong>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-green-600" />
                      <span className="text-xs">Real-time Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3 text-green-600" />
                      <span className="text-xs">Enhanced Security</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3 text-green-600" />
                      <span className="text-xs">Global Payments</span>
                    </div>
                  </div>
                </div>
              </div>

              {status.payment_methods && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <strong className="text-sm">Payment Methods Available:</strong>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3 h-3" />
                      Card: {status.payment_methods.card ? '✅' : '⏳'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="w-3 h-3" />
                      ACH: {status.payment_methods.ach ? '✅' : '⏳'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3" />
                      International: {status.payment_methods.international ? '✅' : '⏳'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Main Interface */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Initializing Interlinc Connect...
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Interlinc Connect Interface</CardTitle>
              <CardDescription>
                Enhanced embedded components with improved user experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="setup" className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Account Setup
                  </TabsTrigger>
                  <TabsTrigger value="manage" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Account Management
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="setup" className="mt-6">
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
                        <p className="text-gray-600 text-center mb-4">
                          Your Interlinc Connect account is ready to process payments.
                        </p>
                        <Button
                          onClick={() => setActiveTab('manage')}
                          className="flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          Manage Account
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="manage" className="mt-6">
                  <div className="min-h-[400px]">
                    {managementConnect && status?.hasAccount ? (
                      <ConnectComponentsProvider connectInstance={managementConnect}>
                        <ConnectAccountManagement />
                      </ConnectComponentsProvider>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="w-12 h-12 text-yellow-600 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Complete Setup First</h3>
                        <p className="text-gray-600 text-center mb-4">
                          Please complete account setup before accessing management features.
                        </p>
                        <Button
                          onClick={() => setActiveTab('setup')}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" />
                          Complete Setup
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Features Info */}
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Capabilities</CardTitle>
            <CardDescription>Interlinc Connect V2 advantages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Enhanced Onboarding</h4>
                    <p className="text-sm text-gray-600">Streamlined setup with real-time validation and better error handling.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Advanced Security</h4>
                    <p className="text-sm text-gray-600">Enhanced compliance monitoring and automated security checks.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Global Payment Support</h4>
                    <p className="text-sm text-gray-600">ACH transfers, SEPA payments, and international processing.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Embedded Management</h4>
                    <p className="text-sm text-gray-600">Complete account control without leaving your application.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}