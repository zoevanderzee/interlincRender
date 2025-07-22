import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useBudget } from '@/hooks/use-budget';
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

interface BudgetData {
  budgetCap: string | null;
  budgetUsed: string;
  budgetPeriod: string;
  budgetStartDate: string | null;
  budgetEndDate: string | null;
  budgetResetEnabled: boolean;
  remainingBudget: string | null;
}

export default function WalletPage() {
  const [fundAmount, setFundAmount] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const { toast } = useToast();

  // Get wallet balance
  const { data: walletData, isLoading: balanceLoading, error: balanceError } = useQuery({
    queryKey: ['/api/trolley/wallet-balance'],
  });

  // Get funding history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/trolley/funding-history'],
  });

  // Get budget data using the budget hook
  const { budgetInfo: budgetData, isLoading: budgetLoading, setBudget, isSettingBudget } = useBudget();

  // Setup company profile mutation
  const setupProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trolley/setup-company-profile");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Created",
        description: "Trolley company profile created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/funding-history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to create company profile",
        variant: "destructive",
      });
    },
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

  const handleSetBudget = () => {
    const amount = parseFloat(budgetAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid budget amount",
        variant: "destructive",
      });
      return;
    }
    setBudget({ budgetCap: amount, budgetPeriod: budgetPeriod });
    setBudgetAmount('');
    setShowBudgetForm(false);
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  // Check if user needs Trolley onboarding
  const needsOnboarding = balanceError && balanceError.status === 400;

  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="h-8 w-8 text-white" />
              <h1 className="text-3xl font-bold text-white">Payment Wallet</h1>
            </div>
            <p className="text-zinc-400">
              Set up your payment wallet to start funding contractor payments
            </p>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-white text-2xl">
                <Building2 className="h-6 w-6" />
                Setup Required
              </CardTitle>
              <CardDescription className="text-zinc-400 text-lg">
                Create your company profile to enable wallet funding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="p-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <h3 className="font-medium text-white mb-2">Create Profile</h3>
                  <p className="text-sm text-zinc-400">Set up your company profile with Trolley</p>
                </div>
                <div className="p-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <h3 className="font-medium text-white mb-2">Fund Wallet</h3>
                  <p className="text-sm text-zinc-400">Add money to your payment wallet</p>
                </div>
                <div className="p-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <h3 className="font-medium text-white mb-2">Pay Contractors</h3>
                  <p className="text-sm text-zinc-400">Process payments directly from your wallet</p>
                </div>
              </div>

              <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700">
                <h3 className="text-white font-medium mb-3">What you'll get:</h3>
                <ul className="space-y-2 text-zinc-300">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Secure payment processing through Trolley
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Direct bank transfers to contractors
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Automatic payment tracking and reporting
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Compliance with international payment regulations
                  </li>
                </ul>
              </div>

              <Button 
                onClick={() => setupProfileMutation.mutate()}
                disabled={setupProfileMutation.isPending}
                className="w-full bg-white text-black hover:bg-zinc-200 py-3 text-lg"
              >
                {setupProfileMutation.isPending ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mr-2" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Building2 className="h-5 w-5 mr-2" />
                    Create Company Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Payment Wallet</h1>
          </div>
          <p className="text-zinc-400">
            Manage your payment wallet to fund contractor payments
          </p>
        </div>

        {/* Balance and Budget Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Current Balance Card */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="h-5 w-5" />
                Current Balance
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Available funds for contractor payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">
                {walletData ? formatCurrency(walletData.balance || 0) : '$0.00'}
              </div>
              {walletData?.companyProfileId && (
                <p className="text-sm text-zinc-500 mt-2">
                  Profile ID: {walletData.companyProfileId}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Budget Card */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Wallet className="h-5 w-5" />
                Budget Overview
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Spending limits for both payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-zinc-400">Budget Cap</span>
                    <span className="text-white font-medium">
                      {budgetData?.budgetCap ? formatCurrency(parseFloat(budgetData.budgetCap)) : 'No limit set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-zinc-400">Used</span>
                    <span className="text-white font-medium">
                      {budgetData ? formatCurrency(parseFloat(budgetData.budgetUsed || '0')) : '$0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Remaining</span>
                    <span className="text-green-400 font-medium">
                      {budgetData?.remainingBudget ? formatCurrency(parseFloat(budgetData.remainingBudget)) : 'Unlimited'}
                    </span>
                  </div>
                </div>
                
                {budgetData?.budgetCap && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Usage</span>
                      <span className="text-zinc-400">
                        {budgetData.budgetCap ? Math.round((parseFloat(budgetData.budgetUsed || '0') / parseFloat(budgetData.budgetCap)) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2">
                      <div 
                        className="bg-blue-400 h-2 rounded-full" 
                        style={{ 
                          width: `${budgetData.budgetCap ? Math.min((parseFloat(budgetData.budgetUsed || '0') / parseFloat(budgetData.budgetCap)) * 100, 100) : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-4">
                  <div className="text-xs text-zinc-500">
                    Period: {budgetData?.budgetPeriod ? budgetData.budgetPeriod.charAt(0).toUpperCase() + budgetData.budgetPeriod.slice(1) : 'Yearly'}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowBudgetForm(!showBudgetForm)}
                    className="text-zinc-300 border-zinc-600 hover:bg-zinc-800"
                  >
                    {budgetData?.budgetCap ? 'Edit Budget' : 'Set Budget'}
                  </Button>
                </div>
                
                {showBudgetForm && (
                  <div className="mt-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="budget-amount" className="text-zinc-300 text-sm">
                          Budget Limit (USD)
                        </Label>
                        <Input
                          id="budget-amount"
                          type="number"
                          placeholder="0.00"
                          value={budgetAmount}
                          onChange={(e) => setBudgetAmount(e.target.value)}
                          min="1"
                          step="0.01"
                          className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-500 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-300 text-sm">
                          Budget Period
                        </Label>
                        <Select value={budgetPeriod} onValueChange={(value: 'monthly' | 'yearly') => setBudgetPeriod(value)}>
                          <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-700 border-zinc-600">
                            <SelectItem value="monthly" className="text-white focus:bg-zinc-600">Monthly</SelectItem>
                            <SelectItem value="yearly" className="text-white focus:bg-zinc-600">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-zinc-500 mt-1">
                          Budget will reset automatically at the end of each {budgetPeriod} period
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSetBudget}
                          disabled={isSettingBudget || !budgetAmount}
                          className="bg-white text-black hover:bg-zinc-200 flex-1"
                          size="sm"
                        >
                          {isSettingBudget ? 'Updating...' : 'Update Budget'}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setShowBudgetForm(false);
                            setBudgetAmount('');
                          }}
                          className="text-zinc-300 border-zinc-600"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="methods" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border-zinc-700">
            <TabsTrigger value="methods" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Payment Methods</TabsTrigger>
            <TabsTrigger value="fund" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Fund Wallet</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Transaction History</TabsTrigger>
          </TabsList>

          {/* Payment Methods Tab */}
          <TabsContent value="methods">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Payment Methods</CardTitle>
                  <CardDescription className="text-zinc-400">
                    How you pay your contractors
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border border-zinc-700 rounded-lg">
                    <CreditCard className="h-5 w-5 text-purple-400" />
                    <div className="flex-1">
                      <p className="font-medium text-white">Pay-as-you-go</p>
                      <p className="text-sm text-zinc-500">Direct payment from linked bank account when you approve milestones</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-zinc-300 border-zinc-600">
                      Setup
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border border-zinc-700 rounded-lg">
                    <Wallet className="h-5 w-5 text-orange-400" />
                    <div className="flex-1">
                      <p className="font-medium text-white">Pre-funded Account</p>
                      <p className="text-sm text-zinc-500">Add funds to wallet first, then pay contractors from balance</p>
                    </div>
                    <div className="text-sm text-green-400">Active</div>
                  </div>
                  
                  <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span className="text-sm text-zinc-300">Budget validation: Working for both payment methods</span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      You can switch between payment methods at any time. Pay-as-you-go requires linking a bank account.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Linked Bank Accounts */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Linked Bank Accounts</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Bank accounts for pay-as-you-go payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400 mb-4">No bank accounts linked</p>
                    <Button className="bg-white text-black hover:bg-zinc-200">
                      <Plus className="h-4 w-4 mr-2" />
                      Link Bank Account
                    </Button>
                  </div>
                  
                  <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                    <p className="text-sm text-zinc-300 mb-2">
                      <strong>Secure Bank Linking:</strong>
                    </p>
                    <ul className="text-sm text-zinc-400 space-y-1">
                      <li>• Bank-grade encryption and security</li>
                      <li>• Instant verification through Trolley</li>
                      <li>• Support for major US and international banks</li>
                      <li>• Automatic payment processing</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fund Wallet Tab */}
          <TabsContent value="fund">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Fund */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Plus className="h-5 w-5" />
                    Add Funds
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Add money to your wallet for contractor payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="amount" className="text-zinc-300">Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      min="1"
                      step="0.01"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleFundWallet}
                    disabled={fundWalletMutation.isPending || !fundAmount}
                    className="w-full bg-white text-black hover:bg-zinc-200"
                  >
                    {fundWalletMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full mr-2" />
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
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Funding Methods</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Available ways to add funds to your pre-funded wallet
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border border-zinc-700 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="font-medium text-white">Bank Transfer (ACH)</p>
                      <p className="text-sm text-zinc-500">2-3 business days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border border-zinc-700 rounded-lg">
                    <CreditCard className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="font-medium text-white">Wire Transfer</p>
                      <p className="text-sm text-zinc-500">Same day processing</p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                    <p className="text-sm text-zinc-300">
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
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <History className="h-5 w-5" />
                  Funding History
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Track all wallet funding transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                  </div>
                ) : historyData && historyData.length > 0 ? (
                  <div className="space-y-4">
                    {historyData.map((transaction: FundingTransaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border border-zinc-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            transaction.status === 'completed' ? 'bg-green-900' : 
                            transaction.status === 'pending' ? 'bg-yellow-900' : 'bg-red-900'
                          }`}>
                            <Plus className={`h-4 w-4 ${
                              transaction.status === 'completed' ? 'text-green-400' : 
                              transaction.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-sm text-zinc-500">
                              {transaction.method} • {formatDate(transaction.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status === 'completed' ? 'bg-green-900 text-green-300' : 
                            transaction.status === 'pending' ? 'bg-yellow-900 text-yellow-300' : 
                            'bg-red-900 text-red-300'
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400">No funding transactions yet</p>
                    <p className="text-sm text-zinc-500">Fund your wallet to start making payments</p>
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