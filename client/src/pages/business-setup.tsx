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
              <CardTitle>Create Company Profile</CardTitle>
              <CardDescription>
                Set up your business profile to start sending payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={companyDetails.name}
                      onChange={(e) => setCompanyDetails(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your Company Name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={companyDetails.phone}
                      onChange={(e) => setCompanyDetails(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Business Address *</Label>
                  <Textarea
                    id="address"
                    value={companyDetails.address}
                    onChange={(e) => setCompanyDetails(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Business St, City, State, ZIP"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={companyDetails.website}
                    onChange={(e) => setCompanyDetails(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://yourcompany.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Business Description</Label>
                  <Textarea
                    id="description"
                    value={companyDetails.description}
                    onChange={(e) => setCompanyDetails(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of your business"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createCompanyProfileMutation.isPending}
                  className="w-full"
                >
                  {createCompanyProfileMutation.isPending ? 'Creating Profile...' : 'Create Company Profile'}
                </Button>
              </form>
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