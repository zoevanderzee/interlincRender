import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, DollarSign, History, CreditCard, Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WalletBalance {
  balance: number;
  currency: string;
  companyProfileId: string;
}

interface FundingTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  createdAt: string;
}

export default function WalletPage() {
  const [fundAmount, setFundAmount] = useState('');
  const { toast } = useToast();

  // Get wallet balance
  const { data: walletData, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/trolley/wallet-balance'],
  });

  // Get funding history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/trolley/funding-history'],
  });

  // Fund wallet mutation
  const fundWalletMutation = useMutation({
    mutationFn: (amount: number) => 
      apiRequest('POST', '/api/trolley/fund-wallet', { amount }),
    onSuccess: () => {
      toast({
        title: "Wallet Funded",
        description: `Successfully added $${fundAmount} to your wallet`,
      });
      setFundAmount('');
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/funding-history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Funding Failed",
        description: error.message || "Failed to fund wallet",
        variant: "destructive",
      });
    },
  });

  const handleFundWallet = () => {
    const amount = parseFloat(fundAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    fundWalletMutation.mutate(amount);
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (balanceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Payment Wallet</h1>
          </div>
          <p className="text-gray-600">
            Manage your payment wallet to fund contractor payments
          </p>
        </div>

        {/* Balance Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Current Balance
            </CardTitle>
            <CardDescription>
              Available funds for contractor payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {walletData ? formatCurrency(walletData.balance || 0) : '$0.00'}
            </div>
            {walletData?.companyProfileId && (
              <p className="text-sm text-gray-500 mt-2">
                Profile ID: {walletData.companyProfileId}
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="fund" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fund">Fund Wallet</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
          </TabsList>

          {/* Fund Wallet Tab */}
          <TabsContent value="fund">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Fund */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add Funds
                  </CardTitle>
                  <CardDescription>
                    Add money to your wallet for contractor payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      min="1"
                      step="0.01"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleFundWallet}
                    disabled={fundWalletMutation.isPending || !fundAmount}
                    className="w-full"
                  >
                    {fundWalletMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add ${fundAmount || '0'} to Wallet
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Funding Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Funding Methods</CardTitle>
                  <CardDescription>
                    Available ways to add funds to your wallet
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Bank Transfer (ACH)</p>
                      <p className="text-sm text-gray-500">2-3 business days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Wire Transfer</p>
                      <p className="text-sm text-gray-500">Same day processing</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Current funding is processed through Trolley's secure payment system. 
                      Contact support for setting up recurring funding or custom payment methods.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Funding History
                </CardTitle>
                <CardDescription>
                  Track all wallet funding transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : historyData && historyData.length > 0 ? (
                  <div className="space-y-4">
                    {historyData.map((transaction: FundingTransaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            transaction.status === 'completed' ? 'bg-green-100' : 
                            transaction.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                          }`}>
                            <Plus className={`h-4 w-4 ${
                              transaction.status === 'completed' ? 'text-green-600' : 
                              transaction.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">
                              {formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {transaction.method} • {formatDate(transaction.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No funding transactions yet</p>
                    <p className="text-sm text-gray-400">Fund your wallet to start making payments</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}