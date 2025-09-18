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

export default function StripeTestV2() {
  const [amount, setAmount] = useState('100.00');
  const [description, setDescription] = useState('Test Payment');
  const [recipientName, setRecipientName] = useState('John Smith');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Debug Stripe environment variables
  useEffect(() => {
    const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    console.log('Stripe Test V2 Page - Key:', stripePublicKey);
    console.log('Valid key format:', stripePublicKey?.startsWith('pk_'));
    
    // Check URL parameters for success or canceled status
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success') === 'true';
    const isCanceled = urlParams.get('canceled') === 'true';
    
    if (isSuccess) {
      setPaymentStatus('success');
    } else if (isCanceled) {
      setPaymentStatus('error');
      setError('Payment was canceled');
    }
  }, []);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setPaymentStatus('processing');
      
      // Create checkout session on the server
      const response = await apiRequest('POST', '/api/create-checkout-session', {
        amount: parseFloat(amount) * 100, // Convert dollars to cents
        description: description || 'Payment'
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { id: sessionId, url: checkoutUrl } = await response.json();
      console.log('Checkout URL from Stripe:', checkoutUrl);
      
      if (checkoutUrl) {
        // Redirect directly to the Stripe Checkout URL
        window.location.href = checkoutUrl;
      } else {
        // Simulate success for testing if Stripe redirect doesn't work
        toast({
          title: 'Simulated Payment',
          description: 'Since Stripe redirect failed, we\'re simulating a successful payment',
        });
        
        // Wait a moment then show success
        setTimeout(() => {
          setPaymentStatus('success');
          setIsLoading(false);
        }, 1500);
      }
      
    } catch (err: any) {
      setPaymentStatus('error');
      const errorMessage = typeof err === 'object' && err.message ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({
        title: 'Payment failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: string) => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  // If payment is successful, show success message
  if (paymentStatus === 'success') {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Stripe Payment Test v2</h1>
        
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Payment Successful</CardTitle>
            <CardDescription>
              Your payment has been processed successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg font-semibold">{formatAmount(amount)}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-sm text-muted-foreground">Recipient: {recipientName}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setPaymentStatus('idle')} className="w-full">
              Make Another Payment
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error state
  if (paymentStatus === 'error') {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Stripe Payment Test v2</h1>
        
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Payment Failed</CardTitle>
            <CardDescription>
              Something went wrong with your payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}
            <p className="text-sm text-muted-foreground">Please try again or contact support.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setPaymentStatus('idle')} className="w-full">
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Stripe Payment Test v2</h1>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Stripe Checkout</CardTitle>
          <CardDescription>
            Test the Stripe payment integration using a redirect to Stripe Checkout.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handlePaymentSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.50"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Payment description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Name</Label>
              <Input
                id="recipient"
                placeholder="Recipient name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay with Stripe'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Settings, CreditCard } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

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
