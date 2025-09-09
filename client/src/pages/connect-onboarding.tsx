import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { loadStripe } from '@stripe/stripe-js'; // This import is no longer directly used for initialization but might be for other Stripe functionalities. We will rely on the new import for connect-js.
import { loadConnectAndInitialize } from '@stripe/connect-js'; // New import for Stripe Connect JS
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Loader2, ExternalLink, User, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/layout/Layout';

// Declare Stripe global
declare global {
  interface Window {
    Stripe: any;
  }
}

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
  const [country, setCountry] = useState('US');

  // Account state
  const [accountStatus, setAccountStatus] = useState<ConnectedAccountStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [stripe, setStripe] = useState<any>(null); // State for Stripe instance
  const [error, setError] = useState<string | null>(null); // State for error messages
  const [onboardingComponent, setOnboardingComponent] = useState<any>(null); // Track the component instance

  // Initialize embedded onboarding when account is created
  useEffect(() => {
    if (!accountStatus?.accountId || !user?.id || stripe) {
      return; // Don't reinitialize if already done
    }

    const initializeEmbeddedOnboarding = async () => {
      try {
        const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

        if (!stripePublicKey) {
          setError('Stripe configuration is missing. Please contact support.');
          return;
        }

        console.log('Initializing Stripe Connect for account:', accountStatus.accountId);

        // Initialize Stripe Connect.js
        const connect = await loadConnectAndInitialize({
          publishableKey: stripePublicKey,
          fetchClientSecret: async () => {
            const response = await fetch(`/api/stripe-connect/accounts/${accountStatus.accountId}/onboarding-session`, {
              method: 'POST',
              headers: {
                'X-User-ID': user.id.toString(),
              },
            });

            if (!response.ok) {
              throw new Error('Failed to fetch client secret');
            }

            const { client_secret } = await response.json();
            return client_secret;
          },
        });

        setStripe(connect);
        console.log('Stripe Connect initialized successfully for account:', accountStatus.accountId);
      } catch (err) {
        console.error('Error loading Stripe Connect:', err);
        setError('Failed to load Stripe Connect. Please refresh the page.');
      }
    };

    initializeEmbeddedOnboarding();
  }, [accountStatus?.accountId, user?.id]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (onboardingComponent) {
        try {
          onboardingComponent.unmount();
        } catch (err) {
          console.log('Component cleanup:', err);
        }
      }
    };
  }, [onboardingComponent]);


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

  const startOnboarding = async () => {
    if (!accountStatus?.accountId) {
      toast({
        title: 'No account found',
        description: 'Please create an account first.',
        variant: 'destructive'
      });
      return;
    }

    if (!stripe) {
      toast({
        title: 'Stripe not ready',
        description: 'Stripe Connect is still loading. Please wait a moment.',
        variant: 'destructive'
      });
      return;
    }

    // Prevent creating multiple components
    if (onboardingComponent) {
      console.log('Onboarding component already exists');
      return;
    }

    try {
      const container = document.getElementById('onboarding-container');
      if (!container) {
        console.error('Onboarding container not found');
        return;
      }

      // Clear any existing content
      container.innerHTML = '';

      console.log('Creating embedded onboarding component with Stripe Connect instance');

      // Create the account onboarding component
      const accountOnboarding = stripe.create('account-onboarding');

      if (!accountOnboarding) {
        throw new Error('Failed to create account onboarding component');
      }

      console.log('Account onboarding component created successfully');

      // Store the component instance
      setOnboardingComponent(accountOnboarding);

      // Handle events first, before mounting
      accountOnboarding.on('ready', () => {
        console.log('Account onboarding component is ready');
      });

      accountOnboarding.on('onboarding.completed', () => {
        console.log('Onboarding completed');
        toast({
          title: 'Onboarding completed!',
          description: 'Your account verification is complete.',
        });
        checkAccountStatus(accountStatus.accountId);
        setOnboardingComponent(null); // Clear the component
      });

      accountOnboarding.on('onboarding.exited', () => {
        console.log('Onboarding exited');
        toast({
          title: 'Onboarding exited',
          description: 'You can continue verification later.',
        });
        setOnboardingComponent(null); // Clear the component
      });

      // Mount the component to the container
      accountOnboarding.mount(container);

      console.log('Account onboarding component mounted to container');

    } catch (error) {
      console.error('Error starting onboarding:', error);
      setOnboardingComponent(null); // Clear on error
      toast({
        title: 'Error starting onboarding',
        description: error instanceof Error ? error.message : 'Failed to start onboarding flow',
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
                We'll create your payment account that allows you to receive payments while giving you full access to payment management.
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
                  <option value="US">United States</option>
                  <option value="AU">Australia</option>
                  <option value="AT">Austria</option>
                  <option value="BE">Belgium</option>
                  <option value="BG">Bulgaria</option>
                  <option value="BR">Brazil</option>
                  <option value="CA">Canada</option>
                  <option value="HR">Croatia</option>
                  <option value="CY">Cyprus</option>
                  <option value="CZ">Czech Republic</option>
                  <option value="DK">Denmark</option>
                  <option value="EE">Estonia</option>
                  <option value="FI">Finland</option>
                  <option value="FR">France</option>
                  <option value="DE">Germany</option>
                  <option value="GI">Gibraltar</option>
                  <option value="GR">Greece</option>
                  <option value="HK">Hong Kong</option>
                  <option value="HU">Hungary</option>
                  <option value="IN">India</option>
                  <option value="IE">Ireland</option>
                  <option value="IT">Italy</option>
                  <option value="JP">Japan</option>
                  <option value="LV">Latvia</option>
                  <option value="LI">Liechtenstein</option>
                  <option value="LT">Lithuania</option>
                  <option value="LU">Luxembourg</option>
                  <option value="MY">Malaysia</option>
                  <option value="MT">Malta</option>
                  <option value="MX">Mexico</option>
                  <option value="NL">Netherlands</option>
                  <option value="NZ">New Zealand</option>
                  <option value="NO">Norway</option>
                  <option value="PL">Poland</option>
                  <option value="PT">Portugal</option>
                  <option value="RO">Romania</option>
                  <option value="SG">Singapore</option>
                  <option value="SK">Slovakia</option>
                  <option value="SI">Slovenia</option>
                  <option value="ES">Spain</option>
                  <option value="SE">Sweden</option>
                  <option value="CH">Switzerland</option>
                  <option value="TH">Thailand</option>
                  <option value="AE">United Arab Emirates</option>
                  <option value="GB">United Kingdom</option>
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
          // Account Status Display
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
                  <CardTitle>Complete Onboarding</CardTitle>
                  <CardDescription>
                    Complete your account setup to start receiving payments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={startOnboarding} className="w-full">
                    Start Identity Verification
                  </Button>

                  {/* Embedded onboarding container */}
                  <div 
                    id="onboarding-container" 
                    className="min-h-[400px] border rounded-lg p-4 bg-white"
                    style={{ minHeight: '400px' }}
                  >
                    {/* Stripe embedded onboarding component will mount here */}
                    <div className="text-center text-gray-500 py-8">
                      Click "Start Identity Verification" to begin the embedded onboarding process
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                    <p>✓ Secure verification handled by Stripe</p>
                    <p>✓ Industry-standard identity verification</p>
                    <p>✓ Complete in a few minutes</p>
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
            <li>• Full access to payment dashboard for managing your payments</li>
            <li>• Secure payment processing with enterprise-grade compliance</li>
            <li>• Automatic payouts to your bank account</li>
            <li>• Platform takes a small application fee per transaction</li>
            <li>• You maintain control over your customer relationships</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}