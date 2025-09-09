import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2, Building, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/layout/Layout';

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string;

interface ConnectedAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export default function ConnectOnboarding() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [email, setEmail] = useState(user?.email || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [businessName, setBusinessName] = useState(user?.companyName || '');
  const [country, setCountry] = useState('GB');

  // Account state
  const [accountStatus, setAccountStatus] = useState<ConnectedAccountStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Embedded onboarding state
  const [isStartingOnboarding, setIsStartingOnboarding] = useState(false);
  const started = useRef(false);

  // Check if user already has a connected account
  useEffect(() => {
    if (user?.stripeConnectAccountId) {
      checkAccountStatus(user.stripeConnectAccountId);
    }
  }, [user]);

  const checkAccountStatus = async (accountId: string) => {
    setIsLoadingStatus(true);
    try {
      const response = await fetch(`/api/stripe-connect/accounts/${accountId}/status`, {
        headers: {
          'X-User-ID': user?.id?.toString() || '',
        },
      });

      if (response.ok) {
        const status = await response.json();
        setAccountStatus(status);
      } else {
        console.error('Failed to check account status');
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const createConnectedAccount = async () => {
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address.',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/stripe-connect/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          businessName,
          country,
        }),
      });

      if (response.ok) {
        const account = await response.json();
        setAccountStatus(account);

        toast({
          title: 'Connected account created',
          description: 'Your Stripe Connect account has been created successfully.',
        });
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error creating connected account:', error);
      toast({
        title: 'Error creating account',
        description: error instanceof Error ? error.message : 'Failed to create connected account',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const startEmbeddedOnboarding = async () => {
    if (started.current) return;
    started.current = true;
    setIsStartingOnboarding(true);
    setError(null);

    try {
      const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      if (!stripePublicKey) {
        throw new Error('Stripe configuration is missing. Please contact support.');
      }

      console.log('Starting embedded onboarding for account:', accountStatus?.accountId);

      // Create account session
      const resp = await fetch("/api/connect/create-account-session", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'X-User-ID': user?.id?.toString() || '',
        },
        body: JSON.stringify({ 
          accountId: accountStatus?.accountId || null, 
          country 
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${resp.status}: Failed to create account session`);
      }

      const { accountId, client_secret } = await resp.json();

      console.log('Account session created:', { accountId, hasClientSecret: !!client_secret });

      // Validate response format
      if (!accountId || !accountId.startsWith("acct_")) {
        throw new Error("Invalid account ID received from server");
      }

      if (!client_secret || !client_secret.startsWith("acct_")) {
        throw new Error("Invalid client secret format received from server");
      }

      // Initialize Stripe Connect
      const connect = await loadConnectAndInitialize({
        publishableKey: stripePublicKey,
        fetchClientSecret: async () => client_secret,
      });

      // Create and mount onboarding component
      const onboarding = connect.create("account-onboarding");

      // Handle events
      onboarding.on('ready', () => {
        console.log('Embedded onboarding ready');
        setIsStartingOnboarding(false);
      });

      onboarding.on('onboarding.completed', () => {
        console.log('Onboarding completed');
        toast({
          title: 'Onboarding completed!',
          description: 'Your account verification is complete.',
        });
        if (accountId) {
          checkAccountStatus(accountId);
        }
      });

      onboarding.on('onboarding.exited', () => {
        console.log('Onboarding exited');
        toast({
          title: 'Onboarding exited',
          description: 'You can continue verification later.',
        });
      });

      // Mount to container
      onboarding.mount("#onboarding-container");

    } catch (error) {
      console.error("Embedded onboarding failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start onboarding';
      setError(errorMessage);
      setIsStartingOnboarding(false);
      started.current = false;
      toast({
        title: 'Error starting onboarding',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled ? 'text-green-600' : 'text-orange-600';
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Interlinc Connect Setup</h1>
          <p className="text-muted-foreground">
            Set up your payment account to receive payments through our platform.
          </p>
        </div>

        {error && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Configuration Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {!accountStatus ? (
          // Create Connected Account Form
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Create Payment Account
              </CardTitle>
              <CardDescription>
                We'll create your payment account that allows you to receive payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name (Optional)</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="AU">Australia</option>
                  <option value="CA">Canada</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="IT">Italy</option>
                  <option value="ES">Spain</option>
                  <option value="NL">Netherlands</option>
                </select>
              </div>

              <Button
                onClick={createConnectedAccount}
                disabled={isCreating || !email}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Connected Account'
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Account Status and Embedded Onboarding
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Account Status
                </CardTitle>
                <CardDescription>
                  Connected Account ID: {accountStatus.accountId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStatus ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Checking status...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 ${getStatusColor(accountStatus.detailsSubmitted)}`}>
                      {getStatusIcon(accountStatus.detailsSubmitted)}
                      <span>Details Submitted: {accountStatus.detailsSubmitted ? 'Complete' : 'Pending'}</span>
                    </div>

                    <div className={`flex items-center gap-2 ${getStatusColor(accountStatus.chargesEnabled)}`}>
                      {getStatusIcon(accountStatus.chargesEnabled)}
                      <span>Charges Enabled: {accountStatus.chargesEnabled ? 'Yes' : 'No'}</span>
                    </div>

                    <div className={`flex items-center gap-2 ${getStatusColor(accountStatus.payoutsEnabled)}`}>
                      {getStatusIcon(accountStatus.payoutsEnabled)}
                      <span>Payouts Enabled: {accountStatus.payoutsEnabled ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {!accountStatus.detailsSubmitted && (
              <Card>
                <CardHeader>
                  <CardTitle>Embedded Connect Onboarding</CardTitle>
                  <CardDescription>
                    Complete your account setup directly here - no redirects required.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!started.current && (
                    <Button 
                      onClick={startEmbeddedOnboarding} 
                      disabled={isStartingOnboarding}
                      className="w-full"
                    >
                      {isStartingOnboarding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading Onboarding...
                        </>
                      ) : (
                        'Start Identity Verification'
                      )}
                    </Button>
                  )}

                  {/* Embedded onboarding container */}
                  <div 
                    id="onboarding-container" 
                    className="min-h-[520px] border rounded-lg bg-white"
                    style={{ minHeight: '520px' }}
                  >
                    {!started.current && (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Click "Start Identity Verification" to begin the embedded onboarding process
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                    <p>✓ Secure verification handled by Stripe</p>
                    <p>✓ Industry-standard identity verification</p>
                    <p>✓ Complete in a few minutes</p>
                    <p>✓ No redirects - everything happens here</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {accountStatus.detailsSubmitted && accountStatus.chargesEnabled && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">Ready to Accept Payments!</CardTitle>
                  <CardDescription className="text-green-600">
                    Your account is fully set up and ready to receive payments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button onClick={() => navigate('/connect-products')} variant="default">
                      Manage Products
                    </Button>
                    <Button
                      onClick={() => checkAccountStatus(accountStatus.accountId)}
                      variant="outline"
                    >
                      Refresh Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">About Interlinc Connect</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Embedded onboarding with no redirects</li>
            <li>• Full access to payment dashboard</li>
            <li>• Secure payment processing with enterprise-grade compliance</li>
            <li>• Automatic payouts to your bank account</li>
            <li>• Platform takes a small application fee per transaction</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}