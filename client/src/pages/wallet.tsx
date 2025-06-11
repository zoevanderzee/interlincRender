import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, CreditCard, Building, ArrowUpRight } from "lucide-react";

export default function WalletPage() {
  const { toast } = useToast();
  const [fundAmount, setFundAmount] = useState("");

  // Get current user and wallet balance
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
  });

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ["/api/trolley/wallet-balance"],
    enabled: !!user?.trolleyCompanyProfileId,
  });

  // Fund wallet mutation
  const fundWalletMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest("POST", "/api/trolley/fund-wallet", { amount });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Wallet Funded",
        description: `Successfully added $${fundAmount} to your wallet`,
      });
      setFundAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/trolley/wallet-balance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Funding Failed",
        description: error.message || "Failed to fund wallet",
        variant: "destructive",
      });
    },
  });

  // Setup banking mutation
  const setupBankingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trolley/setup-banking");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
      }
      toast({
        title: "Banking Setup",
        description: "Please complete your banking setup in the new window",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup banking",
        variant: "destructive",
      });
    },
  });

  const handleFundWallet = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    fundWalletMutation.mutate(amount);
  };

  if (userLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (user?.role !== 'business') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Wallet management is only available for business accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentBalance = walletData?.balance || 0;
  const hasBankingSetup = walletData?.hasBankingSetup || false;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Wallet Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage your payment wallet for contractor payments
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${walletLoading ? "..." : currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for contractor payments
            </p>
          </CardContent>
        </Card>

        {/* Banking Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banking Setup</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasBankingSetup ? "Connected" : "Not Connected"}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasBankingSetup ? "Bank account linked" : "Link bank account to fund wallet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Banking Setup */}
      {!hasBankingSetup && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Setup Banking
            </CardTitle>
            <CardDescription>
              Connect your bank account to fund your wallet for contractor payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setupBankingMutation.mutate()}
              disabled={setupBankingMutation.isPending}
              className="w-full"
            >
              {setupBankingMutation.isPending ? "Setting up..." : "Connect Bank Account"}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Fund Wallet */}
      {hasBankingSetup && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Fund Wallet
            </CardTitle>
            <CardDescription>
              Add funds from your connected bank account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFundWallet} className="space-y-4">
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
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={fundWalletMutation.isPending}
                className="w-full"
              >
                {fundWalletMutation.isPending ? "Processing..." : "Add Funds"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your recent wallet activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Transaction history coming soon
          </div>
        </CardContent>
      </Card>
    </div>
  );
}