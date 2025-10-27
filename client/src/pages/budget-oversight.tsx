
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useIntegratedData, useFinancialData } from "@/hooks/use-integrated-data";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Settings,
  PieChart
} from "lucide-react";

export default function BudgetOversight() {
  const { user } = useAuth();
  const { data: integratedData, isLoading } = useIntegratedData();
  const financialData = useFinancialData();
  const { toast } = useToast();

  // Local state for budget settings
  const [budgetCap, setBudgetCap] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState("monthly");
  const [budgetResetEnabled, setBudgetResetEnabled] = useState(false);

  // Initialize form with current budget data
  useEffect(() => {
    if (integratedData?.budgetData) {
      setBudgetCap(integratedData.budgetData.budgetCap || "");
      setBudgetPeriod(integratedData.budgetData.budgetPeriod || "monthly");
      setBudgetResetEnabled(integratedData.budgetData.budgetResetEnabled || false);
    }
  }, [integratedData?.budgetData]);

  const updateBudgetMutation = useMutation({
    mutationFn: async (budgetData: any) => {
      const res = await apiRequest("PUT", "/api/budget", budgetData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update budget");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Budget Updated",
        description: "Your budget settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update budget settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveBudget = () => {
    const budgetValue = budgetCap ? parseFloat(budgetCap) : null;
    
    if (budgetValue && budgetValue <= 0) {
      toast({
        title: "Invalid Budget",
        description: "Budget cap must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    updateBudgetMutation.mutate({
      budgetCap: budgetValue,
      budgetPeriod,
      budgetResetEnabled,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading budget information...</p>
        </div>
      </div>
    );
  }

  // Block contractors from accessing this page
  if (user?.role === 'contractor') {
    return (
      <div className="text-center py-12">
        <div className="h-24 w-24 mx-auto mb-6 flex items-center justify-center rounded-full bg-zinc-800">
          <AlertTriangle size={40} className="text-yellow-500" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Access Restricted</h2>
        <p className="text-gray-400 mb-6">Budget oversight is only available to business accounts.</p>
      </div>
    );
  }

  const budgetUsed = parseFloat(financialData.totalBudgetUsed || "0");
  const budgetLimit = parseFloat(integratedData?.budgetData?.budgetCap || "0");
  const remainingBudget = parseFloat(financialData.remainingBudget || "0");
  
  const budgetUtilization = budgetLimit > 0 ? (budgetUsed / budgetLimit) * 100 : 0;
  const isOverBudget = budgetUsed > budgetLimit && budgetLimit > 0;
  const isNearLimit = budgetUtilization > 80 && !isOverBudget;

  const formatCurrency = (value: number) => {
    // Use GBP formatting for UK users
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: 'GBP',
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Budget Oversight</h1>
          <p className="text-gray-400 mt-1">Monitor and manage your outsourcing budget</p>
        </div>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Budget Used</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(budgetUsed)}</div>
            <p className="text-xs text-gray-400">Current period spending</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Budget Remaining</CardTitle>
            {isOverBudget ? (
              <AlertTriangle className="h-4 w-4 text-red-400" />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
              {formatCurrency(remainingBudget)}
            </div>
            <p className="text-xs text-gray-400">Available to spend</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Budget Limit</CardTitle>
            <Settings className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {budgetLimit > 0 ? formatCurrency(budgetLimit) : "No Limit"}
            </div>
            <p className="text-xs text-gray-400">Current period cap</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Utilization</CardTitle>
            <PieChart className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-white'}`}>
              {budgetLimit > 0 ? `${budgetUtilization.toFixed(1)}%` : "N/A"}
            </div>
            <p className="text-xs text-gray-400">Of budget used</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress and Alerts */}
      {budgetLimit > 0 && (
        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              Budget Progress
              {isOverBudget && (
                <Badge variant="destructive" className="bg-red-600 text-white">
                  Over Budget
                </Badge>
              )}
              {isNearLimit && (
                <Badge variant="secondary" className="bg-yellow-600 text-white">
                  Near Limit
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Used: {formatCurrency(budgetUsed)}</span>
                <span className="text-gray-400">Limit: {formatCurrency(budgetLimit)}</span>
              </div>
              <Progress 
                value={Math.min(budgetUtilization, 100)} 
                className={`h-3 ${isOverBudget ? 'bg-red-900' : isNearLimit ? 'bg-yellow-900' : 'bg-gray-800'}`}
              />
            </div>

            {isOverBudget && (
              <div className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-800 rounded-md">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Budget Exceeded</p>
                  <p className="text-xs text-red-300 mt-1">
                    You have exceeded your budget by {formatCurrency(budgetUsed - budgetLimit)}. 
                    Consider reviewing your spending or adjusting your budget limit.
                  </p>
                </div>
              </div>
            )}

            {isNearLimit && !isOverBudget && (
              <div className="flex items-start gap-3 p-3 bg-yellow-900/20 border border-yellow-800 rounded-md">
                <Clock className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">Approaching Budget Limit</p>
                  <p className="text-xs text-yellow-300 mt-1">
                    You have used {budgetUtilization.toFixed(1)}% of your budget. 
                    {formatCurrency(remainingBudget)} remaining.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Budget Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Budget Settings</CardTitle>
            <CardDescription className="text-gray-400">
              Configure your outsourcing budget limits and controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="budgetCap" className="text-white">Budget Cap</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="budgetCap"
                  type="number"
                  placeholder="Enter budget limit (leave empty for no limit)"
                  value={budgetCap}
                  onChange={(e) => setBudgetCap(e.target.value)}
                  className="pl-9 bg-white dark:bg-[hsl(215,50%,12%)] border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                />
              </div>
              <p className="text-xs text-gray-400">
                Set a spending limit for your outsourcing budget. Leave empty for unlimited spending.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetPeriod">Budget Period</Label>
              <Select value={budgetPeriod} onValueChange={setBudgetPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select budget period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="budgetReset" className="text-white">Auto-Reset Budget</Label>
                <p className="text-xs text-gray-400">
                  Automatically reset budget usage at the start of each period
                </p>
              </div>
              <Switch
                id="budgetReset"
                checked={budgetResetEnabled}
                onCheckedChange={setBudgetResetEnabled}
              />
            </div>

            <Separator className="bg-zinc-800" />

            <Button 
              onClick={handleSaveBudget}
              disabled={updateBudgetMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {updateBudgetMutation.isPending ? "Saving..." : "Save Budget Settings"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Spending Summary</CardTitle>
            <CardDescription className="text-gray-400">
              Overview of your current spending patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Active Contracts</span>
                <span className="text-sm font-medium text-white">
                  {integratedData?.stats?.activeContractsCount || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Payments Processed</span>
                <span className="text-sm font-medium text-white">
                  {formatCurrency(integratedData?.stats?.paymentsProcessed || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Allocated Budget (Active Contracts)</span>
                <span className="text-sm font-medium text-white">
                  {formatCurrency(integratedData?.stats?.totalPendingValue || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Active Contractors</span>
                <span className="text-sm font-medium text-white">
                  {integratedData?.stats?.activeContractorsCount || 0}
                </span>
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-white">Budget tracking active</span>
              </div>
              
              {integratedData?.budgetData?.budgetResetEnabled && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-white">
                    Auto-reset: {integratedData.budgetData.budgetPeriod}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-white">
                  {integratedData?.payments?.length || 0} total transactions
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
