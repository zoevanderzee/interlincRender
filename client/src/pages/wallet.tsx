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
import { useDataSync } from '@/hooks/use-data-sync';
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
  const [showVerifiedForm, setShowVerifiedForm] = useState(false);
  const [trolleyAccessKey, setTrolleyAccessKey] = useState('');
  const [trolleySecretKey, setTrolleySecretKey] = useState('');
  const { toast } = useToast();

  // Handler for Trolley sub-merchant creation (new businesses)
  const handleTrolleySubmerchantSetup = async () => {
    setupProfileMutation.mutate();
  };

  // Handler for verified business account connection
  const handleVerifiedAccountSetup = async () => {
    if (!trolleyAccessKey || !trolleySecretKey) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both access key and secret key",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await apiRequest("POST", "/api/trolley/connect-verified-account", {
        accessKey: trolleyAccessKey,
        secretKey: trolleySecretKey
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Account Connected!",
          description: result.description,
        });
        
        // Invalidate all relevant queries to refresh data
        invalidateFinancialData();
        invalidateUserData();
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect your verified account. Please check your credentials.",
        variant: "destructive",
      });
    }
  };

  // Get current user data for bank account status
  const { data: userData } = useQuery({
    queryKey: ['/api/user'],
  });



  // Get wallet balance with faster refresh for better integration
  const { data: walletData, isLoading: balanceLoading, error: balanceError } = useQuery({
    queryKey: ['/api/trolley/wallet-balance'],
    staleTime: 30 * 1000, // 30 seconds - financial data needs frequent updates
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });

  // Get funding history with regular refresh
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/trolley/funding-history'],
    staleTime: 60 * 1000, // 1 minute for history data
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });

  // Get budget data using the budget hook
  const { budgetInfo: budgetData, isLoading: budgetLoading, setBudget, isSettingBudget } = useBudget();

  // Get real bank account data from Trolley
  const { data: bankAccountData, isLoading: bankAccountLoading } = useQuery({
    queryKey: ['/api/trolley/bank-accounts'],
    staleTime: 5 * 60 * 1000, // 5 minutes for bank account data
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
  });

  // Import data sync hook
  const { invalidateFinancialData, invalidateUserData } = useDataSync();

  // Setup company profile mutation for both verified and new businesses
  const setupProfileMutation = useMutation({
    mutationFn: async (trolleyCredentials?: { accessKey: string; secretKey: string }) => {
      const response = await apiRequest("POST", "/api/trolley/setup-company-profile", {
        trolleyCredentials
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.isVerified) {
        toast({
          title: "Verified Account Connected",
          description: data.description || "Your verified Trolley account is ready for payments.",
        });
      } else if (data.success && data.submerchantId) {
        toast({
          title: "Sub-merchant Account Created",
          description: data.description || "Sub-merchant account created. Complete verification to enable payments.",
        });
      } else if (data.success && data.message) {
        toast({
          title: "Account Status", 
          description: data.message,
        });
      }
      // Use integrated data sync instead of individual invalidations
      invalidateFinancialData();
      invalidateUserData();
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to set up payment account",
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
        title: "🔴 LIVE MONEY TRANSFER COMPLETED",
        description: `Real $${fundAmount} transfer processed through your Trolley business account`,
      });
      setFundAmount('');
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/funding-history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Live Transfer Failed",
        description: error.message || "Real money transfer could not be processed",
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

  // Check if user needs Trolley onboarding - only show if there's an actual error
  const needsOnboarding = balanceError && (balanceError as any)?.status === 400;

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

              <div className="flex justify-center">
                <Button 
                  onClick={handleTrolleySubmerchantSetup}
                  disabled={setupProfileMutation.isPending}
                  className="bg-white text-black hover:bg-zinc-200 px-8 py-3"
                >
                  {setupProfileMutation.isPending ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mr-2" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Building2 className="h-5 w-5 mr-2" />
                      Setup Payment Account
                    </>
                  )}
                </Button>
              </div>
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
                {walletData ? formatCurrency((walletData as any)?.balance || 0) : '$0.00'}
              </div>
              {(walletData as any)?.companyProfileId && (
                <p className="text-sm text-zinc-500 mt-2">
                  Profile ID: {(walletData as any)?.companyProfileId}
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
                  {/* Pay-as-you-go Method */}
                  <div className="flex items-center gap-3 p-3 border border-zinc-700 rounded-lg">
                    <CreditCard className="h-5 w-5 text-purple-400" />
                    <div className="flex-1">
                      <p className="font-medium text-white">Pay-as-you-go</p>
                      <p className="text-sm text-zinc-500">Direct payment from your verified Trolley business account</p>
                      {((userData as any)?.trolleyCompanyProfileId || (userData as any)?.trolleyRecipientId) && (
                        <div className="mt-2">
                          <p className="text-xs text-green-400">
                            ✓ Trolley business verification complete
                          </p>
                          {(userData as any)?.trolleyBankAccountStatus === 'verified' ? (
                            <p className="text-xs text-green-400">
                              ✓ Bank account {(userData as any)?.trolleyBankAccountLast4 ? `ending in ${(userData as any)?.trolleyBankAccountLast4}` : ''} verified via Trolley
                            </p>
                          ) : (
                            <p className="text-xs text-yellow-400">
                              ⏳ Bank account verification in progress...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {((userData as any)?.trolleyCompanyProfileId || (userData as any)?.trolleyRecipientId) ? (
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-green-400">Ready</div>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-zinc-300 border-zinc-600"
                        onClick={handleTrolleySubmerchantSetup}
                      >
                        Setup Business
                      </Button>
                    )}
                  </div>
                  
                  {/* Pre-funded Account Method */}
                  <div className="flex items-center gap-3 p-3 border border-zinc-700 rounded-lg">
                    <Wallet className="h-5 w-5 text-orange-400" />
                    <div className="flex-1">
                      <p className="font-medium text-white">Pre-funded Account</p>
                      <p className="text-sm text-zinc-500">Add funds to wallet first, then pay contractors from balance</p>
                    </div>
                    <div className="text-sm text-green-400">Active</div>
                  </div>
                  
                  {/* Status Information */}
                  <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span className="text-sm text-zinc-300">
                        {(userData as any)?.trolleyBankAccountStatus === 'verified' 
                          ? 'Both payment methods available' 
                          : 'Pre-funded account available, pay-as-you-go requires business verification'
                        }
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {(userData as any)?.trolleyBankAccountStatus === 'verified' 
                        ? 'You can switch between payment methods at any time.'
                        : 'Complete Trolley business verification to enable pay-as-you-go payments.'
                      }
                    </p>
                    
                    {/* Add option for verified businesses to connect their account */}
                    {(userData as any)?.trolleyBankAccountStatus !== 'verified' && (
                      <div className="mt-4 pt-4 border-t border-zinc-700">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-zinc-300 font-medium">Have a verified Trolley account?</span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowVerifiedForm(!showVerifiedForm)}
                            className="text-zinc-300 border-zinc-600 hover:bg-zinc-700"
                          >
                            Connect Verified Account
                          </Button>
                        </div>
                        
                        {showVerifiedForm && (
                          <div className="mt-3 p-3 bg-zinc-700 rounded-lg border border-zinc-600">
                            <p className="text-xs text-zinc-400 mb-3">
                              If you already have a verified Trolley business account, you can connect it directly using your API credentials.
                            </p>
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="access-key-main" className="text-zinc-300 text-xs">
                                  Trolley Access Key
                                </Label>
                                <Input
                                  id="access-key-main"
                                  type="text"
                                  placeholder="Enter your Trolley access key"
                                  value={trolleyAccessKey}
                                  onChange={(e) => setTrolleyAccessKey(e.target.value)}
                                  className="bg-zinc-600 border-zinc-500 text-white placeholder:text-zinc-400 mt-1 text-sm"
                                />
                              </div>
                              <div>
                                <Label htmlFor="secret-key-main" className="text-zinc-300 text-xs">
                                  Trolley Secret Key
                                </Label>
                                <Input
                                  id="secret-key-main"
                                  type="password"
                                  placeholder="Enter your Trolley secret key"
                                  value={trolleySecretKey}
                                  onChange={(e) => setTrolleySecretKey(e.target.value)}
                                  className="bg-zinc-600 border-zinc-500 text-white placeholder:text-zinc-400 mt-1 text-sm"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  onClick={handleVerifiedAccountSetup}
                                  disabled={setupProfileMutation.isPending || !trolleyAccessKey || !trolleySecretKey}
                                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                  size="sm"
                                >
                                  {setupProfileMutation.isPending ? (
                                    <>
                                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                      Connecting...
                                    </>
                                  ) : (
                                    'Connect Account'
                                  )}
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => {
                                    setShowVerifiedForm(false);
                                    setTrolleyAccessKey('');
                                    setTrolleySecretKey('');
                                  }}
                                  className="text-zinc-300 border-zinc-500"
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                  {bankAccountLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                      <span className="ml-2 text-zinc-400">Loading real bank account data...</span>
                    </div>
                  ) : bankAccountData?.hasLinkedAccount ? (
                    /* Show real linked bank account from Trolley */
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 border border-zinc-700 rounded-lg bg-zinc-800">
                        <div className="w-10 h-10 rounded-full bg-green-400/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">🔴 LIVE: {bankAccountData.bankName || 'Business Bank Account'}</p>
                          <p className="text-sm text-zinc-400">
                            Real account ending in {bankAccountData.last4 || 'XXXX'}
                          </p>
                          <p className="text-xs text-green-400 mt-1">✅ LIVE: Verified through your Trolley business account</p>
                        </div>
                        <div className="text-sm text-green-400 font-medium">LIVE</div>
                      </div>
                      
                      <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span className="text-sm text-zinc-300 font-medium">Ready for pay-as-you-go payments</span>
                        </div>
                        <p className="text-sm text-zinc-400">
                          🔴 LIVE MODE: Your real business bank account is verified. Milestone approvals will automatically charge this account with REAL MONEY.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Business users link bank accounts during Trolley widget onboarding */
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                      <p className="text-zinc-400 mb-2">Bank account setup required</p>
                      <p className="text-sm text-zinc-500 mb-4">
                        Complete your Trolley business verification to link bank accounts
                      </p>
                      {!(userData as any)?.trolleyCompanyProfileId ? (
                        <Button 
                          variant="outline"
                          onClick={handleTrolleySubmerchantSetup}
                          className="text-zinc-300 border-zinc-600"
                        >
                          Start Business Verification
                        </Button>
                      ) : (
                        <p className="text-sm text-green-400">
                          ✓ Business verification complete. Bank account should be linked automatically.
                        </p>
                      )}
                    </div>
                  )}
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
                    className="w-full bg-red-600 text-white hover:bg-red-700 border-2 border-red-500"
                  >
                    {fundWalletMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        🔴 PROCESSING LIVE TRANSFER...
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 mr-2 rounded-full bg-red-500"></div>
                        🔴 LIVE: Add ${fundAmount || '0'} Real Money
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
                ) : historyData && (historyData as any)?.length > 0 ? (
                  <div className="space-y-4">
                    {(historyData as any)?.map((transaction: any) => (
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