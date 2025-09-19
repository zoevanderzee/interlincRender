
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, DollarSign, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface ConnectStatus {
  hasAccount: boolean;
  accountId?: string;
  needsOnboarding: boolean;
  version: string;
  verification_status?: {
    details_submitted: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    verification_complete: boolean;
  };
  requirements?: {
    currently_due: string[];
    past_due: string[];
    pending_verification: string[];
    disabled_reason: string | null;
    is_complete: boolean;
  };
}

export default function ContractorOnboarding() {
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get V2 Connect status
  const { data: connectStatus, isLoading: isLoadingStatus } = useQuery<ConnectStatus>({
    queryKey: ['/api/connect/v2/status'],
    enabled: !!user?.id,
    refetchInterval: (data: ConnectStatus | undefined) => {
      // Refresh every 10 seconds if still needs onboarding
      return data?.needsOnboarding ? 10000 : false;
    },
  });

  // Create Connect account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/connect/v2/create-account', {
        country: 'GB',
        business_type: 'individual'
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.accountLink) {
        setOnboardingUrl(data.accountLink);
        window.open(data.accountLink, '_blank');
        toast({
          title: 'Account Created Successfully',
          description: 'Complete your setup in the new window',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/connect/v2/status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to create payment account',
        variant: 'destructive',
      });
    },
  });

  const handleCreateAccount = () => {
    createAccountMutation.mutate();
  };

  const getStatusBadge = (status: ConnectStatus | undefined) => {
    if (!status) return <Badge variant="outline">Loading...</Badge>;
    
    if (!status.hasAccount) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Not Started</Badge>;
    }
    
    if (status.verification_status?.verification_complete) {
      return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
    }
    
    if (status.verification_status?.details_submitted) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Under Review</Badge>;
    }
    
    if (status.needsOnboarding) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Setup Required</Badge>;
    }
    
    return <Badge variant="outline">Pending</Badge>;
  };

  if (!user || user.role !== 'contractor') {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
        <p className="text-zinc-400">This page is only available to contractors.</p>
      </div>
    );
  }

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payment setup status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Payment Setup</h1>
        <p className="text-zinc-400">Complete your Stripe Connect setup to receive payments from projects.</p>
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
              <span className="text-sm text-zinc-400">Account Status</span>
              {getStatusBadge(connectStatus)}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Payout Enabled</span>
              {connectStatus?.verification_status?.payouts_enabled ? (
                <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Enabled</Badge>
              ) : (
                <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Disabled</Badge>
              )}
            </div>

            {connectStatus?.hasAccount && connectStatus.accountId && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Account ID</span>
                <span className="text-xs font-mono text-zinc-300">{connectStatus.accountId}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup Actions</CardTitle>
            <CardDescription>
              Complete your payment setup process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!connectStatus?.hasAccount && (
              <Button
                onClick={handleCreateAccount}
                disabled={createAccountMutation.isPending}
                className="w-full"
              >
                {createAccountMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Start Payment Setup'
                )}
              </Button>
            )}

            {connectStatus?.hasAccount && connectStatus.needsOnboarding && (
              <Button
                onClick={() => window.open('/interlinc-connect-v2', '_blank')}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Complete Setup
              </Button>
            )}

            {connectStatus?.verification_status?.verification_complete && (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Setup Complete!</h3>
                <p className="text-zinc-400 text-sm">
                  You can now receive payments when work is approved.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Requirements Section */}
      {connectStatus?.hasAccount && connectStatus.requirements && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Requirements</CardTitle>
            <CardDescription>
              Complete these steps to activate your payment account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectStatus.requirements.currently_due.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-white">Required Information:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {connectStatus.requirements.currently_due.map((req, index) => (
                    <li key={index} className="text-sm text-zinc-400">{req.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}

            {connectStatus.requirements.past_due.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-red-400">Overdue Requirements:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {connectStatus.requirements.past_due.map((req, index) => (
                    <li key={index} className="text-sm text-red-300">{req.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}

            {connectStatus.requirements.is_complete && (
              <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-md">
                <p className="text-green-400 text-sm">✅ All requirements completed</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
