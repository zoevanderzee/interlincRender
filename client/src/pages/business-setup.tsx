import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Clock, AlertCircle, Building, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/layout/Layout';
import { apiRequest } from '@/lib/queryClient';

export default function BusinessSetup() {
  const [companyDetails, setCompanyDetails] = useState({
    name: '',
    address: '',
    phone: '',
    website: '',
    description: ''
  });
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  const { data: companyProfile } = useQuery({
    queryKey: ['/api/trolley/company-profile'],
    enabled: !!user?.id && user.role === 'business',
  });

  const { data: accountBalance } = useQuery({
    queryKey: ['/api/trolley/balance'],
    enabled: !!user?.trolleyCompanyProfileId,
  });

  const createCompanyProfileMutation = useMutation({
    mutationFn: (data: typeof companyDetails) => 
      apiRequest('POST', '/api/trolley/create-company-profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/company-profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'Company Profile Created',
        description: 'Your Trolley business account has been set up successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to create company profile',
        variant: 'destructive',
      });
    },
  });

  const handleStartVerification = async () => {
    setIsGeneratingLink(true);
    try {
      const response = await apiRequest("POST", "/api/trolley/business-onboarding-link", {});
      const data = await response.json();
      
      if (data.onboardingUrl) {
        // Use direct navigation instead of popup to avoid popup blockers
        window.location.href = data.onboardingUrl;
      } else {
        throw new Error('Failed to generate verification link');
      }
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || "Failed to start verification process",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCompanyProfileMutation.mutate(companyDetails);
  };

  const getStatusBadge = (hasProfile: boolean) => {
    if (hasProfile) {
      return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
    }
    return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Not Set Up</Badge>;
  };

  if (!user || user.role !== 'business') {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-zinc-400">This page is only available to business accounts.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Business Payment Setup</h1>
          <p className="text-zinc-400">Set up your company profile to send payments to contractors.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Status
              </CardTitle>
              <CardDescription>
                Your current business account status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Company Profile</span>
                {getStatusBadge(!!user.trolleyCompanyProfileId)}
              </div>
              
              {user.trolleyCompanyProfileId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Profile ID</span>
                  <span className="text-xs font-mono text-zinc-300">{user.trolleyCompanyProfileId}</span>
                </div>
              )}

              {accountBalance && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Account Balance</span>
                  <span className="text-sm font-semibold text-green-400">
                    ${parseFloat(accountBalance.balance || '0').toFixed(2)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Capabilities
              </CardTitle>
              <CardDescription>
                What you can do with your current setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {user.trolleyCompanyProfileId ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm">Send payments to contractors</span>
              </div>
              <div className="flex items-center gap-2">
                {user.trolleyCompanyProfileId ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm">Process milestone payments</span>
              </div>
              <div className="flex items-center gap-2">
                {accountBalance && parseFloat(accountBalance.balance || '0') > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm">Account funded for payments</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {!user.trolleyCompanyProfileId && (
          <Card>
            <CardHeader>
              <CardTitle>Complete Trolley Business Verification</CardTitle>
              <CardDescription>
                To send payments to contractors, you must complete business verification with Trolley
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2">Required Documents for Business Onboarding:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Proof of ID for Signing Officer (front and back, all corners visible)</li>
                  <li>• Proof of Residence for Signing Officer (utility/credit card bill, dated within 60 days)</li>
                  <li>• Share Registry of the company or Cap Table</li>
                  <li>• Corporate Bank Statement (3 months of transactions, non-redacted)</li>
                  <li>• Articles of Incorporation</li>
                  <li>• Volumes table filled out by country</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="bg-zinc-900 p-4 rounded-lg">
                  <p className="text-sm text-zinc-300 mb-3">
                    <strong>Important:</strong> Business verification must be completed through Trolley's secure platform to ensure compliance with financial regulations.
                  </p>
                  <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                    <li>Prepare all required documents listed above</li>
                    <li>Visit Trolley's business onboarding portal</li>
                    <li>Complete the verification process with your documents</li>
                    <li>Return here once approved to link your account</li>
                  </ol>
                </div>

                <Button
                  onClick={handleStartVerification}
                  disabled={isGeneratingLink}
                  className="w-full"
                  size="lg"
                >
                  {isGeneratingLink ? 'Generating Verification Link...' : 'Start Business Verification with Trolley'}
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-xs text-zinc-500">
                    Already completed verification? Use the sync button below.
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        const response = await apiRequest('POST', '/api/trolley/sync-status', {});
                        const data = await response.json();
                        if (data.success) {
                          toast({
                            title: 'Status Updated',
                            description: 'Your Trolley approval status has been synchronized.',
                          });
                          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
                        }
                      } catch (error: any) {
                        toast({
                          title: 'Sync Failed',
                          description: error.message || 'Failed to sync Trolley status',
                          variant: 'destructive',
                        });
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Sync Trolley Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {user.trolleyCompanyProfileId && (
          <Card>
            <CardHeader>
              <CardTitle>Fund Your Account</CardTitle>
              <CardDescription>
                Add funds to your account to send payments to contractors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-zinc-900 p-4 rounded-lg">
                <p className="text-sm text-zinc-300 mb-2">
                  To add funds to your Trolley account:
                </p>
                <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
                  <li>Log into your Trolley dashboard</li>
                  <li>Navigate to "Account Balance" or "Funding"</li>
                  <li>Add funds via bank transfer or other available methods</li>
                  <li>Funds will be available for contractor payments once processed</li>
                </ol>
              </div>
              
              <Button
                onClick={() => window.open('https://app.trolley.com', '_blank')}
                variant="outline"
                className="w-full"
              >
                Open Trolley Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}