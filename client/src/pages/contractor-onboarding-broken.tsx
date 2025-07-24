import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, DollarSign, ExternalLink } from 'lucide-react';
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

interface OnboardingStatus {
  status: string;
  recipientId?: string;
  widgetUrl?: string;
}

export default function ContractorOnboarding() {
  const [widgetType, setWidgetType] = useState<'quickSetup' | 'fullOnboarding'>('quickSetup');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  const { data: onboardingStatus } = useQuery<OnboardingStatus>({
    queryKey: ['/api/trolley/onboarding-status'],
    enabled: !!user?.id,
  });

  const initializeOnboardingMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/trolley/initialize-contractor-onboarding'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/onboarding-status'] });
      toast({
        title: 'Onboarding Initialized',
        description: 'Your Trolley recipient account setup has been started.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to initialize onboarding',
        variant: 'destructive',
      });
    },
  });

  const handleWidgetComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/trolley/onboarding-status'] });
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    toast({
      title: 'Onboarding Complete',
      description: 'Your payment account is now set up and ready to receive payments.',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'incomplete':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Incomplete</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
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

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Payment Setup</h1>
          <p className="text-zinc-400">Complete your payment account setup to receive payments from projects.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Account Status
              </CardTitle>
              <CardDescription>
                Your current payment account verification status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Account Setup</span>
                {getStatusBadge(onboardingStatus?.status || 'not_started')}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Payout Enabled</span>
                {user.payoutEnabled ? (
                  <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Enabled</Badge>
                ) : (
                  <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Disabled</Badge>
                )}
              </div>

              {user.trolleyRecipientId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Recipient ID</span>
                  <span className="text-xs font-mono text-zinc-300">{user.trolleyRecipientId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setup Options</CardTitle>
              <CardDescription>
                Choose how you'd like to set up your payment account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button
                  variant={widgetType === 'quickSetup' ? 'default' : 'outline'}
                  onClick={() => setWidgetType('quickSetup')}
                  className="w-full justify-start"
                >
                  Quick Setup
                </Button>
                <p className="text-xs text-zinc-400 pl-4">
                  Fast setup with basic payment information
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  variant={widgetType === 'fullOnboarding' ? 'default' : 'outline'}
                  onClick={() => setWidgetType('fullOnboarding')}
                  className="w-full justify-start"
                >
                  Full Onboarding
                </Button>
                <p className="text-xs text-zinc-400 pl-4">
                  Complete setup with all payment methods and verification
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {!user.trolleyRecipientId && (
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Initialize your payment account setup to begin receiving payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => initializeOnboardingMutation.mutate()}
                disabled={initializeOnboardingMutation.isPending}
                className="w-full"
              >
                {initializeOnboardingMutation.isPending ? 'Setting up...' : 'Start Payment Setup'}
              </Button>
            </CardContent>
          </Card>
        )}

        {user.trolleyRecipientId && (
          <Card>
            <CardHeader>
              <CardTitle>Setup Complete</CardTitle>
              <CardDescription>
                Your payment account is ready to receive payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Payment Setup Complete!</h3>
                <p className="text-zinc-400 text-sm">
                  You can now receive payments when milestones are approved.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}