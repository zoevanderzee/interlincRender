
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, ExternalLink, Store, Users, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ConnectAccount {
  id: string;
  email: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
}

export default function ConnectDemo() {
  const [accounts, setAccounts] = useState<ConnectAccount[]>([]);
  const [createForm, setCreateForm] = useState({
    email: '',
    companyName: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Create a test Connect account
  const createTestAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.email || !createForm.companyName) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Create a mock contractor user for testing
      const mockContractor = {
        id: Date.now(),
        email: createForm.email,
        companyName: createForm.companyName,
        firstName: createForm.companyName.split(' ')[0] || 'Test',
        lastName: 'User',
      };

      // This would normally call your existing contractor creation endpoint
      // For demo purposes, we'll simulate creating a Connect account
      const response = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockContractor),
      });

      if (!response.ok) {
        throw new Error('Failed to create Connect account');
      }

      const data = await response.json();
      
      toast({
        title: 'Success',
        description: 'Connect account created! You can now start onboarding.',
      });

      // Add to local list
      setAccounts([...accounts, {
        id: data.accountId,
        email: createForm.email,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      }]);

      // Reset form
      setCreateForm({ email: '', companyName: '' });
      
    } catch (error: any) {
      console.error('Error creating Connect account:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create Connect account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Stripe Connect Integration Demo</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Complete Stripe Connect integration with account creation, onboarding, product management, and storefront.
        </p>
        
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="flex items-center p-6">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold">Connected Accounts</div>
                <p className="text-sm text-muted-foreground">Create & onboard users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <Store className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold">Products & Sales</div>
                <p className="text-sm text-muted-foreground">Manage product catalog</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <CreditCard className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <div className="text-2xl font-bold">Direct Charges</div>
                <p className="text-sm text-muted-foreground">With platform fees</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Create Account Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Connect Account</CardTitle>
            <CardDescription>
              Create a new Stripe Connect account for testing. This uses the new controller properties
              instead of deprecated account types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createTestAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Corp"
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating Account...' : 'Create Connect Account'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Implementation Notes:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Uses controller properties (fees, losses, stripe_dashboard)</li>
                <li>• No top-level "type" property (follows latest API)</li>
                <li>• Platform controls fees, Stripe handles disputes</li>
                <li>• Connected accounts get full dashboard access</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Features</CardTitle>
            <CardDescription>
              This demo implements all major Stripe Connect workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                <div>
                  <h4 className="font-semibold">Account Creation & Onboarding</h4>
                  <p className="text-sm text-muted-foreground">
                    Create accounts with controller properties and Stripe-hosted onboarding flow
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                <div>
                  <h4 className="font-semibold">Product Management</h4>
                  <p className="text-sm text-muted-foreground">
                    Create and manage products using the Stripe-Account header
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                <div>
                  <h4 className="font-semibold">Public Storefront</h4>
                  <p className="text-sm text-muted-foreground">
                    Customer-facing storefront with hosted checkout sessions
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                <div>
                  <h4 className="font-semibold">Direct Charges with Fees</h4>
                  <p className="text-sm text-muted-foreground">
                    Platform monetization through application fees
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">Quick Links:</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start" 
                  onClick={() => window.location.href = '/stripe-test'}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test Basic Stripe Integration
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start" 
                  onClick={() => window.location.href = '/contractor-connect'}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Existing Connect Integration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demo Accounts List */}
      {accounts.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Demo Connect Accounts</CardTitle>
            <CardDescription>
              Manage your test Connect accounts and try the full integration flow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{account.email}</h4>
                    <p className="text-sm text-muted-foreground">Account: {account.id}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={account.details_submitted ? 'default' : 'secondary'}>
                        {account.details_submitted ? 'Onboarded' : 'Pending'}
                      </Badge>
                      <Badge variant={account.charges_enabled ? 'default' : 'secondary'}>
                        {account.charges_enabled ? 'Charges Enabled' : 'Charges Disabled'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/connect/accounts/${account.id}/onboarding`}
                    >
                      Manage Onboarding
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/connect/accounts/${account.id}/products`}
                    >
                      Manage Products
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/storefront/${account.id}`}
                    >
                      View Storefront
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Documentation */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>
            Available Connect API endpoints in this implementation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Account Management</h4>
              <div className="space-y-1 text-sm font-mono">
                <div>GET /api/connect/accounts/:id</div>
                <div>POST /api/connect/accounts/:id/account-links</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Products & Sales</h4>
              <div className="space-y-1 text-sm font-mono">
                <div>POST /api/connect/accounts/:id/products</div>
                <div>GET /api/connect/accounts/:id/products</div>
                <div>POST /api/connect/accounts/:id/checkout</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
