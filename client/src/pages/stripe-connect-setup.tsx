
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';

export default function StripeConnectSetup() {
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/user');
      const userData = await response.json();
      
      if (userData.stripeConnectAccountId) {
        setAccountStatus({
          accountId: userData.stripeConnectAccountId,
          status: userData.stripeConnectStatus,
          isReady: userData.stripeConnectStatus === 'active'
        });
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async () => {
    try {
      setIsCreatingAccount(true);
      const response = await apiRequest('POST', '/api/stripe-connect/contractor/create-account');
      const result = await response.json();
      
      if (response.ok) {
        setAccountStatus(result.status);
        toast({
          title: 'Stripe Connect account created',
          description: 'Complete onboarding to start receiving payments',
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: 'Error creating account',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const getOnboardingLink = async () => {
    try {
      const response = await apiRequest('POST', '/api/stripe-connect/contractor/onboarding-link');
      const result = await response.json();
      
      if (response.ok) {
        setOnboardingUrl(result.onboardingUrl);
        // Open in new window
        window.open(result.onboardingUrl, '_blank');
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: 'Error creating onboarding link',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Payment Setup</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect - Contractor Payments</CardTitle>
          <CardDescription>
            Set up your payment account to receive payments from businesses instantly.
            Powered by Stripe Connect - the same system used by Uber, Lyft, and thousands of platforms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!accountStatus ? (
            // Step 1: Create account
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Create Payment Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Create your Stripe Connect account to receive payments from businesses.
                  </p>
                  <Button 
                    onClick={createAccount} 
                    disabled={isCreatingAccount}
                    className="mt-2"
                  >
                    {isCreatingAccount ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Payment Account'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : !accountStatus.isReady ? (
            // Step 2: Complete onboarding
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="flex-shrink-0 w-6 h-6 text-green-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-700">Account Created</h3>
                  <p className="text-sm text-muted-foreground">Account ID: {accountStatus.accountId}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Complete Verification</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete identity verification and add your bank account details via Stripe's secure onboarding.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Verify your identity with government ID</li>
                    <li>Add bank account for instant transfers</li>
                    <li>Tax information collection</li>
                  </ul>
                  <Button 
                    onClick={getOnboardingLink}
                    className="mt-2"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Complete Verification
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Step 3: Complete and ready
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="flex-shrink-0 w-6 h-6 text-green-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-700">Payment Setup Complete</h3>
                  <p className="text-sm text-muted-foreground">
                    Your Stripe Connect account is verified and ready to receive payments.
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Ready for Payments</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Businesses can now send you payments instantly. Funds arrive in your bank account automatically.
                </p>
              </div>
            </div>
          )}

          <div className="pt-6 border-t">
            <h4 className="font-semibold mb-2">How Payments Work</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. Business approves your completed deliverable</p>
              <p>2. Payment is automatically charged from business account</p>
              <p>3. Funds transfer directly to your bank account (no platform fees)</p>
              <p>4. You receive email confirmation and payment appears in dashboard</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
