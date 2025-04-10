import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { User } from '@shared/schema';

export default function ContractorConnect() {
  const { id } = useParams();
  const contractorId = id ? parseInt(id) : 0;
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  // Get contractor details
  const { data: contractor, isLoading: isLoadingContractor } = useQuery({
    queryKey: ['/api/users', contractorId],
    queryFn: () => apiRequest('GET', `/api/users/${contractorId}`).then(res => res.json()),
    enabled: !!contractorId,
  });

  // Get Connect account status
  const { data: connectStatus, isLoading: isLoadingConnectStatus, refetch: refetchConnectStatus } = useQuery({
    queryKey: ['/api/contractors/connect-status', contractorId],
    queryFn: () => apiRequest('GET', `/api/contractors/${contractorId}/connect-status`).then(res => res.json()),
    enabled: !!contractorId,
    refetchInterval: (data: any) => {
      // If status is pending, refresh every 10 seconds
      return data?.status === 'pending' ? 10000 : false;
    },
  });

  // Create Connect account mutation
  const createConnectAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/contractors/${contractorId}/connect-account`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.accountLink) {
        setOnboardingUrl(data.accountLink);
        window.open(data.accountLink, '_blank');
        toast({
          title: 'Stripe Connect account created',
          description: 'Complete the onboarding process in the new window',
        });
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['/api/contractors/connect-status', contractorId] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', contractorId] });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating Connect account',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  // Handle creating a Connect account
  const handleCreateConnectAccount = () => {
    createConnectAccountMutation.mutate();
  };

  // Check if the current user is the contractor or an admin
  const canManageConnectAccount = user && (
    user.id === contractorId || 
    user.role === 'admin' || 
    user.role === 'business'
  );

  if (isLoadingContractor || isLoadingConnectStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md bg-black border border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Contractor Not Found</CardTitle>
            <CardDescription className="text-gray-400">
              The contractor you're looking for doesn't exist
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/contractors">Back to Contractors</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 bg-black text-white min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Contractor Payment Setup</h1>
        <Button asChild variant="outline">
          <Link href="/contractors">Back to Contractors</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-black border border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Contractor Details</CardTitle>
            <CardDescription className="text-gray-400">
              {contractor.companyName || `${contractor.firstName} ${contractor.lastName}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white">{contractor.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Role</p>
              <p className="text-white capitalize">{contractor.role}</p>
            </div>
            {contractor.title && (
              <div>
                <p className="text-sm text-gray-400">Title</p>
                <p className="text-white">{contractor.title}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-black border border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Stripe Connect Status</CardTitle>
            <CardDescription className="text-gray-400">
              Direct payment capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectStatus?.status === 'not_created' && (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-white">No Stripe Connect account</span>
              </div>
            )}
            {connectStatus?.status === 'pending' && (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-white">Account setup in progress</span>
              </div>
            )}
            {connectStatus?.status === 'active' && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-white">Account active and ready to receive payments</span>
              </div>
            )}

            {connectStatus?.accountId && (
              <div>
                <p className="text-sm text-gray-400">Account ID</p>
                <p className="text-white font-mono text-sm truncate">{connectStatus.accountId}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            {canManageConnectAccount && (
              <>
                {connectStatus?.status === 'not_created' && (
                  <Button 
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    onClick={handleCreateConnectAccount}
                    disabled={createConnectAccountMutation.isPending}
                  >
                    {createConnectAccountMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>Create Connect Account</>
                    )}
                  </Button>
                )}

                {connectStatus?.status === 'pending' && onboardingUrl && (
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => window.open(onboardingUrl, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Complete Onboarding
                  </Button>
                )}

                {connectStatus?.status === 'pending' && !onboardingUrl && (
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={handleCreateConnectAccount}
                    disabled={createConnectAccountMutation.isPending}
                  >
                    {createConnectAccountMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating link...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Generate Onboarding Link
                      </>
                    )}
                  </Button>
                )}

                {connectStatus?.status === 'active' && (
                  <div className="text-center text-green-500 font-medium">
                    ✓ Ready to receive payments
                  </div>
                )}
              </>
            )}

            {!canManageConnectAccount && (
              <div className="text-center text-yellow-500">
                You don't have permission to manage this Connect account
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}