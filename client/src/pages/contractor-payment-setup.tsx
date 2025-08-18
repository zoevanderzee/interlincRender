import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, DollarSign, ExternalLink, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  trolleyRecipientId?: string;
  payoutEnabled: boolean;
}

interface TrolleyOnboardingStatus {
  status: 'not_started' | 'pending' | 'completed' | 'failed';
  recipientId?: string;
  widgetUrl?: string;
  payoutEnabled: boolean;
}

export default function ContractorPaymentSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  const { data: trolleyStatus } = useQuery<TrolleyOnboardingStatus>({
    queryKey: ['/api/trolley/contractor-status'],
    enabled: !!user?.id,
  });

  const generateTrolleyWidgetMutation = useMutation({
    mutationFn: async () => {
      try {
        // CRITICAL: Generate fresh widget URL each time (30-second HMAC validity)
        console.log('Generating fresh Trolley widget URL for existing account access...');
        
        // First initialize contractor onboarding if needed
        const initRes = await apiRequest('POST', '/api/trolley/initialize-contractor-onboarding');
        const initResponse = await initRes.json();
        console.log('Contractor onboarding initialized:', initResponse);
        
        // Generate fresh widget URL (HMAC signature only valid for 30 seconds)
        const widgetRes = await apiRequest('POST', '/api/trolley/generate-widget');
        const widgetResponse = await widgetRes.json();
        console.log('Fresh widget URL generated:', widgetResponse);
        
        return widgetResponse;
      } catch (error) {
        console.error('Error in Trolley setup:', error);
        throw error;
      }
    },
    onSuccess: (response: any) => {
      console.log('Trolley setup response:', response);
      
      if (response.widgetUrl) {
        console.log('Opening Trolley widget URL:', response.widgetUrl);
        
        try {
          // CRITICAL: Open widget immediately after generation (30-second HMAC validity)
          console.log('Opening fresh widget URL immediately (HMAC expires in 30 seconds)');
          
          // Try to open popup window - must be triggered by user click
          const newWindow = window.open(
            response.widgetUrl, 
            'trolley_setup', 
            'width=1000,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no,left=200,top=100'
          );
          
          // Check if popup opened successfully
          if (newWindow && !newWindow.closed && typeof newWindow.closed !== 'undefined') {
            console.log('Trolley popup opened successfully');
            toast({
              title: 'Trolley Setup Started',
              description: 'Complete the setup in the popup window.',
            });
            
            // Focus on the new window
            newWindow.focus();
            
            // Monitor popup closure to refresh status
            const checkClosed = setInterval(() => {
              if (newWindow.closed) {
                clearInterval(checkClosed);
                console.log('Trolley popup closed, refreshing status...');
                // Give user a moment to complete, then refresh
                setTimeout(() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/trolley/contractor-status'] });
                }, 2000);
              }
            }, 1000);
            
          } else {
            console.log('Popup blocked by browser - redirecting to widget URL');
            // If popup is blocked, redirect to the widget URL directly
            window.location.href = response.widgetUrl;
          }
        } catch (error) {
          console.error('Error opening Trolley widget:', error);
          // Last resort: navigate to the URL directly
          window.location.href = response.widgetUrl;
        }
      } else {
        console.error('No widget URL in response:', response);
        toast({
          title: 'Setup Error',
          description: 'Failed to generate setup link. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Trolley setup error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to start Trolley setup. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const checkStatusMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/trolley/check-status'),
    onSuccess: (response: any) => {
      if (response.success && response.status === 'completed') {
        toast({
          title: 'Account Verified!',
          description: response.message,
        });
        // Refresh user data to update payout status
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      } else {
        toast({
          title: 'Status Update',
          description: response.message || 'Status checked successfully',
        });
      }
      // Refresh both user data and trolley status
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/contractor-status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Status Check Failed',
        description: error.message || 'Failed to check account status',
        variant: 'destructive',
      });
    },
  });



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready for Payments
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Setup In Progress
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Setup Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Setup Required
          </Badge>
        );
    }
  };

  if (!user || user.role !== 'contractor') {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
        <p className="text-zinc-400">This page is only available to contractors.</p>
      </div>
    );
  }

  const isSetupComplete = trolleyStatus?.status === 'completed' && user.payoutEnabled;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Payment Setup</h1>
        <p className="text-zinc-400">
          Set up your payment details to receive direct bank transfers from approved milestones.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Account Status
            </CardTitle>
            <CardDescription>
              Your current payment account setup status with Trolley
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Setup Status</span>
              {getStatusBadge(trolleyStatus?.status || 'not_started')}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Payout Enabled</span>
              {trolleyStatus?.payoutEnabled ? (
                <Badge className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Disabled
                </Badge>
              )}
            </div>

            {user.trolleyRecipientId && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Recipient ID</span>
                <span className="text-xs font-mono text-zinc-300">
                  {user.trolleyRecipientId.substring(0, 20)}...
                </span>
              </div>
            )}

            <Button
              onClick={() => checkStatusMutation.mutate()}
              disabled={checkStatusMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {checkStatusMutation.isPending ? 'Checking...' : 'Refresh Status'}
            </Button>
          </CardContent>
        </Card>

        {/* Setup Action Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {isSetupComplete ? 'Payment Setup Complete' : 'Start Payment Setup'}
            </CardTitle>
            <CardDescription>
              {isSetupComplete 
                ? 'You can now receive payments from approved milestones'
                : 'Complete your Trolley setup to start receiving payments'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSetupComplete ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">All Set!</h3>
                <p className="text-zinc-400 text-sm">
                  You'll receive payments directly to your bank account when milestones are approved.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <h4 className="font-medium text-white">Setup includes:</h4>
                  <ul className="text-sm text-zinc-400 space-y-1">
                    <li>• Bank account verification</li>
                    <li>• Identity verification</li>
                    <li>• Tax information (if required)</li>
                    <li>• Payment preferences</li>
                  </ul>
                </div>

                <Button
                  onClick={() => generateTrolleyWidgetMutation.mutate()}
                  disabled={generateTrolleyWidgetMutation.isPending}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {generateTrolleyWidgetMutation.isPending 
                    ? 'Generating Setup Link...' 
                    : 'Start Trolley Setup'
                  }
                </Button>

                <div className="text-xs text-zinc-500 space-y-1">
                  <p className="text-center font-medium">Setup Instructions:</p>
                  <ul className="space-y-1">
                    <li>• A new window will open with Trolley's secure setup form</li>
                    <li>• Complete all required verification steps</li>
                    <li>• Add your bank account details for direct deposits</li>
                    <li>• Use "Check Status" button below to verify completion</li>
                  </ul>
                  <p className="text-center mt-2">Powered by Trolley for secure international payments</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How It Works Section */}
      <Card>
        <CardHeader>
          <CardTitle>How Contractor Payments Work</CardTitle>
          <CardDescription>
            Understanding your payment process with the Trolley affiliate system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border border-zinc-700 rounded-lg">
              <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-semibold">1</span>
              </div>
              <h4 className="font-medium text-white mb-1">Complete Setup</h4>
              <p className="text-sm text-zinc-400">
                Verify your identity and bank account through Trolley
              </p>
            </div>

            <div className="text-center p-4 border border-zinc-700 rounded-lg">
              <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-semibold">2</span>
              </div>
              <h4 className="font-medium text-white mb-1">Work on Projects</h4>
              <p className="text-sm text-zinc-400">
                Complete assigned milestones and submit your work
              </p>
            </div>

            <div className="text-center p-4 border border-zinc-700 rounded-lg">
              <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-semibold">3</span>
              </div>
              <h4 className="font-medium text-white mb-1">Get Paid</h4>
              <p className="text-sm text-zinc-400">
                Receive automatic payments when milestones are approved
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-zinc-800 rounded-lg">
            <h5 className="font-medium text-white mb-2">Payment Details:</h5>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• Payments processed through business Trolley submerchant accounts</li>
              <li>• Direct bank transfers to your verified account</li>
              <li>• International payments supported with competitive rates</li>
              <li>• Automatic processing when milestones are approved</li>
              <li>• Full payment tracking and history available</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}