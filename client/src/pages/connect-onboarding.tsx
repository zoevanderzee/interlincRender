
import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ConnectAccount {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
  };
  business_profile?: {
    name?: string;
    url?: string;
  };
}

export default function ConnectOnboarding() {
  const params = useParams();
  const accountId = params.accountId as string;
  const [account, setAccount] = useState<ConnectAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const { toast } = useToast();

  // Fetch account details
  const fetchAccountDetails = async () => {
    if (!accountId) return;
    
    try {
      setLoading(true);
      const response = await apiRequest('GET', `/api/connect/accounts/${accountId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch account details');
      }
      
      const data = await response.json();
      setAccount(data.account);
    } catch (error: any) {
      console.error('Error fetching account details:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch account details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new account link for onboarding
  const startOnboarding = async () => {
    if (!accountId) return;
    
    try {
      setOnboardingLoading(true);
      const response = await apiRequest('POST', `/api/connect/accounts/${accountId}/account-links`, {
        type: 'account_onboarding'
      });
      
      if (!response.ok) {
        throw new Error('Failed to create onboarding link');
      }
      
      const data = await response.json();
      
      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error creating onboarding link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start onboarding',
        variant: 'destructive',
      });
    } finally {
      setOnboardingLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountDetails();
  }, [accountId]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Account Not Found</CardTitle>
            <CardDescription>
              The Connect account could not be found.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isFullyOnboarded = account.charges_enabled && account.details_submitted;
  const hasPendingRequirements = account.requirements.currently_due.length > 0 || 
                                account.requirements.past_due.length > 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stripe Connect Onboarding</h1>
        <p className="text-muted-foreground">
          Manage your payment account setup and onboarding status.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Account Status
              {isFullyOnboarded ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
            </CardTitle>
            <CardDescription>
              Current onboarding and verification status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Account ID</label>
                <p className="text-sm text-muted-foreground font-mono">{account.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Business Name</label>
                <p className="text-sm text-muted-foreground">
                  {account.business_profile?.name || 'Not set'}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Charges Enabled</span>
                <Badge variant={account.charges_enabled ? 'default' : 'secondary'}>
                  {account.charges_enabled ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Payouts Enabled</span>
                <Badge variant={account.payouts_enabled ? 'default' : 'secondary'}>
                  {account.payouts_enabled ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Details Submitted</span>
                <Badge variant={account.details_submitted ? 'default' : 'secondary'}>
                  {account.details_submitted ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Requirements
              {hasPendingRequirements && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </CardTitle>
            <CardDescription>
              Outstanding verification requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasPendingRequirements ? (
              <p className="text-green-600 text-sm">✓ All requirements completed</p>
            ) : (
              <div className="space-y-3">
                {account.requirements.past_due.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-1">Past Due</h4>
                    <ul className="text-xs space-y-1">
                      {account.requirements.past_due.map((req, index) => (
                        <li key={index} className="text-red-600">• {req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {account.requirements.currently_due.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-yellow-600 mb-1">Currently Due</h4>
                    <ul className="text-xs space-y-1">
                      {account.requirements.currently_due.map((req, index) => (
                        <li key={index} className="text-yellow-600">• {req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {account.requirements.pending_verification.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-600 mb-1">Pending Verification</h4>
                    <ul className="text-xs space-y-1">
                      {account.requirements.pending_verification.map((req, index) => (
                        <li key={index} className="text-blue-600">• {req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">
                  {isFullyOnboarded ? 'Onboarding Complete' : 'Continue Onboarding'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isFullyOnboarded 
                    ? 'Your account is fully set up and ready to accept payments.'
                    : 'Complete your account setup to start accepting payments.'
                  }
                </p>
              </div>
              <div className="space-x-2">
                <Button 
                  onClick={() => fetchAccountDetails()} 
                  variant="outline" 
                  size="sm"
                >
                  Refresh Status
                </Button>
                {!isFullyOnboarded && (
                  <Button 
                    onClick={startOnboarding}
                    disabled={onboardingLoading}
                    className="gap-2"
                  >
                    {onboardingLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Continue Setup
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isFullyOnboarded && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Manage Products</h3>
                  <p className="text-sm text-muted-foreground">
                    Create and manage your products for sale.
                  </p>
                </div>
                <Button 
                  onClick={() => window.location.href = `/connect/accounts/${accountId}/products`}
                  variant="outline"
                >
                  Manage Products
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
