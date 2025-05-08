import React, { useState } from "react";
import { useBudget, type SetBudgetParams } from "@/hooks/use-budget";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export function BudgetSettings() {
  const { budget, isLoading, isError, setBudget, resetBudget, isBudgetUpdating, isBudgetResetting } = useBudget();
  const [budgetCap, setBudgetCap] = useState(budget?.budgetCap ? parseFloat(budget.budgetCap) : 0);
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>(
    (budget?.budgetPeriod as any) || 'yearly'
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    budget?.budgetStartDate ? new Date(budget.budgetStartDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    budget?.budgetEndDate ? new Date(budget.budgetEndDate) : undefined
  );
  const [resetEnabled, setResetEnabled] = useState(budget?.budgetResetEnabled || false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Format currency for display
  const formatCurrency = (amount: string | null) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(amount));
  };
  
  // Calculate budget usage percentage
  const usagePercentage = React.useMemo(() => {
    if (!budget?.budgetCap || parseFloat(budget.budgetCap) === 0) return 0;
    return Math.min(100, (parseFloat(budget.budgetUsed) / parseFloat(budget.budgetCap)) * 100);
  }, [budget]);

  const handleSave = () => {
    const data: SetBudgetParams = {
      budgetCap,
      budgetPeriod,
      resetEnabled,
    };
    
    if (startDate) {
      data.startDate = format(startDate, 'yyyy-MM-dd');
    }
    
    if (endDate) {
      data.endDate = format(endDate, 'yyyy-MM-dd');
    }
    
    setBudget(data);
  };

  const handleConfirmReset = () => {
    resetBudget();
    setResetDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Loading budget information...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Failed to load budget information</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              There was a problem loading your budget information. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Budget Management</CardTitle>
        <CardDescription>
          Set and manage your outsourcing budget caps to control spending
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Budget Usage Display */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Budget Usage</span>
            <span className="text-sm text-muted-foreground">
              {formatCurrency(budget?.budgetUsed || '0')} / {formatCurrency(budget?.budgetCap || '0')}
            </span>
          </div>
          <Progress value={usagePercentage} 
            className={usagePercentage > 90 ? "bg-red-200" : usagePercentage > 75 ? "bg-amber-200" : ""} />
          
          {budget?.remainingBudget && parseFloat(budget.remainingBudget) < 0 && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Budget Exceeded</AlertTitle>
              <AlertDescription>
                You have exceeded your budget by {formatCurrency((parseFloat(budget.remainingBudget) * -1).toString())}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Budget Cap Input */}
        <div className="space-y-2">
          <Label htmlFor="budgetCap">Budget Cap</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
            <Input
              id="budgetCap"
              type="number"
              min="0"
              step="0.01"
              value={budgetCap}
              onChange={(e) => setBudgetCap(parseFloat(e.target.value) || 0)}
              className="pl-8"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Set the maximum amount you want to spend on outsourcing
          </p>
        </div>

        {/* Budget Period Selection */}
        <div className="space-y-2">
          <Label htmlFor="budgetPeriod">Budget Period</Label>
          <Select
            value={budgetPeriod}
            onValueChange={(value) => setBudgetPeriod(value as 'monthly' | 'quarterly' | 'yearly')}
          >
            <SelectTrigger id="budgetPeriod">
              <SelectValue placeholder="Select a budget period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Choose how often your budget resets
          </p>
        </div>

        {/* Date Range Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <DatePicker
              date={startDate}
              setDate={setStartDate}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <DatePicker
              date={endDate}
              setDate={setEndDate}
              className="w-full"
            />
          </div>
        </div>

        {/* Auto Reset Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="resetEnabled" className="block">Auto-Reset Budget</Label>
            <p className="text-sm text-muted-foreground">
              Automatically reset budget usage at the end of each period
            </p>
          </div>
          <Switch
            id="resetEnabled"
            checked={resetEnabled}
            onCheckedChange={setResetEnabled}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={isBudgetResetting}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Usage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Budget Usage</DialogTitle>
              <DialogDescription>
                Are you sure you want to reset your budget usage to zero? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmReset} disabled={isBudgetResetting}>
                {isBudgetResetting ? "Resetting..." : "Reset Usage"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button onClick={handleSave} disabled={isBudgetUpdating}>
          {isBudgetUpdating ? "Saving..." : "Save Budget Settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}