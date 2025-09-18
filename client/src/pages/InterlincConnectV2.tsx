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
import { CheckCircle, Clock, XCircle, AlertCircle, Settings, CreditCard, Zap, Shield, Globe, Building, Users, ArrowRight } from 'lucide-react';
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
            colorPrimary: '#6366f1',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            spacingUnit: '4px',
            borderRadius: '12px',
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
            colorPrimary: '#6366f1',
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

  const getStatusInfo = () => {
    if (!status) return { variant: 'outline', text: 'Loading...', color: 'text-gray-500' };

    if (status.hasAccount && !status.needsOnboarding) {
      return { variant: 'success', text: 'Connected & Active', color: 'text-green-600' };
    } else if (status.needsOnboarding) {
      return { variant: 'warning', text: 'Setup Required', color: 'text-amber-600' };
    }

    return { variant: 'info', text: 'Ready to Configure', color: 'text-blue-600' };
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Connection Error</CardTitle>
            <CardDescription>Unable to initialize Interlinc Connect</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-red-700 text-sm mb-6 bg-red-50 p-3 rounded-lg">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Interlinc Connect</h1>
              <p className="text-lg text-gray-600">
                Enhanced payment processing with advanced capabilities
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusInfo.variant} className="px-4 py-2">
                {statusInfo.text}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid gap-8">
          {/* Status Overview */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Interlinc Connect Status</h3>
                  <p className="text-blue-100">
                    Advanced payment processing with enhanced capabilities
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-3">
                  <CheckCircle className="w-8 h-8" />
                </div>
              </div>
            </div>

            {status && (
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Account ID</label>
                      <p className="mt-1 font-mono text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                        {status.accountId || 'Not created yet'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Payment Methods</label>
                      <div className="mt-2 space-y-2">
                        {status.payment_methods && (
                          <>
                            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-gray-600" />
                                <span className="text-sm">Card Payments</span>
                              </div>
                              {status.payment_methods.card ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-gray-600" />
                                <span className="text-sm">ACH Transfers</span>
                              </div>
                              {status.payment_methods.ach ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-gray-600" />
                                <span className="text-sm">International</span>
                              </div>
                              {status.payment_methods.international ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Enhanced Features</label>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Zap className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Real-time Status Updates</p>
                            <p className="text-xs text-gray-500">Live monitoring and notifications</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Shield className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Enhanced Security</p>
                            <p className="text-xs text-gray-500">Advanced compliance monitoring</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Settings className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Embedded Management</p>
                            <p className="text-xs text-gray-500">Complete control within your app</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Main Interface */}
          {isLoading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Initializing Interlinc Connect</h3>
                <p className="text-gray-600 text-center">Setting up your payment processing...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-2xl">Payment Setup</CardTitle>
                <CardDescription className="text-base">
                  Configure and manage your payment processing capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="border-b border-gray-100 px-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-50">
                      <TabsTrigger value="setup" className="flex items-center gap-2 data-[state=active]:bg-white">
                        <CreditCard className="w-4 h-4" />
                        Account Setup
                      </TabsTrigger>
                      <TabsTrigger value="manage" className="flex items-center gap-2 data-[state=active]:bg-white">
                        <Settings className="w-4 h-4" />
                        Management
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="setup" className="mt-0 p-6">
                    <div className="min-h-[500px]">
                      {stripeConnect && status?.needsOnboarding ? (
                        <div className="space-y-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-blue-900">Account Setup Required</h4>
                                <p className="text-sm text-blue-700">Complete your business information to start processing payments</p>
                              </div>
                            </div>
                          </div>

                          <ConnectComponentsProvider connectInstance={stripeConnect}>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <ConnectAccountOnboarding onExit={handleOnboardingExit} />
                            </div>
                          </ConnectComponentsProvider>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-2">Setup Complete!</h3>
                          <p className="text-gray-600 text-center mb-6 max-w-md">
                            Your Interlinc Connect account is fully configured and ready to process payments.
                          </p>
                          <Button
                            onClick={() => setActiveTab('manage')}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                          >
                            <Settings className="w-4 h-4" />
                            Access Management
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="manage" className="mt-0 p-6">
                    <div className="min-h-[500px]">
                      {managementConnect && status?.hasAccount ? (
                        <div className="space-y-4">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                                <Settings className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-green-900">Account Management</h4>
                                <p className="text-sm text-green-700">Update your business details, banking information, and settings</p>
                              </div>
                            </div>
                          </div>

                          <ConnectComponentsProvider connectInstance={managementConnect}>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <ConnectAccountManagement />
                            </div>
                          </ConnectComponentsProvider>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-8 h-8 text-amber-600" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-2">Setup Required First</h3>
                          <p className="text-gray-600 text-center mb-6 max-w-md">
                            Please complete your account setup before accessing management features.
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
        </div>
      </div>
    </div>
  );
}