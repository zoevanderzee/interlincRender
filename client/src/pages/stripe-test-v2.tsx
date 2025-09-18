import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';

// Import Stripe.js directly
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Settings, CreditCard } from 'lucide-react';

export default function StripeTestV2() {
  const [v2Status, setV2Status] = useState<any>(null);
  const [connectStatus, setConnectStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testV2Integration = async () => {
      try {
        setIsLoading(true);

        // Test V2 feature flag status
        const statusResponse = await apiRequest('GET', '/api/test/v2-status');
        const statusData = await statusResponse.json();
        setV2Status(statusData);

        // Test V2 Connect status if enabled
        if (statusData.v2Enabled) {
          const connectResponse = await apiRequest('GET', '/api/connect/v2/status');
          const connectData = await connectResponse.json();
          setConnectStatus(connectData);
        }

      } catch (err) {
        console.error('V2 test failed:', err);
        setError(err instanceof Error ? err.message : 'V2 test failed');
      } finally {
        setIsLoading(false);
      }
    };

    testV2Integration();
  }, []);

  const testV2Demo = async () => {
    try {
      const response = await apiRequest('GET', '/api/test/v2-connect-demo');
      const data = await response.json();
      console.log('V2 Demo Response:', data);
      alert('V2 Demo successful! Check console for details.');
    } catch (err) {
      console.error('V2 demo failed:', err);
      alert('V2 demo failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Testing V2 Integration...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              V2 Integration Test Error
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
        <h1 className="text-3xl font-bold mb-2">Stripe Connect V2 Integration Test</h1>
        <p className="text-gray-600">
          Testing the enhanced V2 API with improved capabilities and embedded components.
        </p>
      </div>

      <div className="grid gap-6">
        {/* V2 Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                V2 Feature Flag Status
              </span>
              <Badge variant={v2Status?.v2Enabled ? 'default' : 'secondary'}>
                {v2Status?.v2Enabled ? 'V2 Enabled' : 'V1 Active'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Feature flag status for user ID: {v2Status?.userId}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              <div>
                <strong>Status:</strong> {v2Status?.message}
              </div>
              {v2Status?.availableEndpoints && (
                <div>
                  <strong>Available Endpoints:</strong>
                  <ul className="mt-1 space-y-1">
                    {v2Status.availableEndpoints.map((endpoint: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600 ml-4">
                        • {endpoint}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* V2 Connect Status Card */}
        {v2Status?.v2Enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                V2 Connect Account Status
              </CardTitle>
              <CardDescription>
                Enhanced Stripe Connect capabilities and account information
              </CardDescription>
            </CardHeader>

            <CardContent>
              {connectStatus && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>Account ID:</strong> 
                      <p className="text-sm text-gray-600">{connectStatus.accountId || 'Not created'}</p>
                    </div>
                    <div>
                      <strong>Version:</strong>
                      <Badge variant="outline" className="ml-2">{connectStatus.version}</Badge>
                    </div>
                  </div>

                  {connectStatus.capabilities && (
                    <div>
                      <strong>Enhanced Capabilities:</strong>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Enhanced Onboarding
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Real-time Status Updates  
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Embedded Account Management
                        </div>
                      </div>
                    </div>
                  )}

                  {connectStatus.payment_methods && (
                    <div>
                      <strong>Payment Methods:</strong>
                      <div className="mt-2 space-y-1 text-sm">
                        <div>Card Payments: {connectStatus.payment_methods.card ? '✅' : '❌'}</div>
                        <div>ACH Transfers: {connectStatus.payment_methods.ach ? '✅' : '❌'}</div>
                        <div>International: {connectStatus.payment_methods.international ? '✅' : '❌'}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Test Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              V2 Integration Tests
            </CardTitle>
            <CardDescription>
              Run comprehensive tests of the V2 API integration
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <Button onClick={testV2Demo} className="w-full" disabled={!v2Status?.v2Enabled}>
                Run V2 Demo Test
              </Button>

              {v2Status?.v2Enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={() => window.location.href = '/interlinc-connect-v2'} 
                    variant="outline"
                  >
                    Test V2 Interface
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/interlinc-connect'} 
                    variant="outline"
                  >
                    Compare V1 Interface
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}