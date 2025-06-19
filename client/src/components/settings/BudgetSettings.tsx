import React, { useState, useEffect } from "react";
import { useBudget, SetBudgetParams } from "@/hooks/use-budget";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertTriangle, Check, CreditCard, Wallet, BarChart3, FolderOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, parse, parseISO } from "date-fns";
import { isValid } from "date-fns";

export function BudgetSettings() {
  const { budgetInfo, isLoading, error, setBudget, resetBudget, isSettingBudget, isResettingBudget } = useBudget();

  const [budgetCap, setBudgetCap] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [resetEnabled, setResetEnabled] = useState(false);

  useEffect(() => {
    if (budgetInfo) {
      setBudgetCap(budgetInfo.budgetCap || "");
      setBudgetPeriod(budgetInfo.budgetPeriod as any || 'monthly');
      setResetEnabled(budgetInfo.budgetResetEnabled);
      
      if (budgetInfo.budgetStartDate) {
        try {
          const parsedStartDate = parseISO(budgetInfo.budgetStartDate);
          if (isValid(parsedStartDate)) {
            setStartDate(parsedStartDate);
          }
        } catch (e) {
          console.error("Error parsing start date:", e);
        }
      }
      
      if (budgetInfo.budgetEndDate) {
        try {
          const parsedEndDate = parseISO(budgetInfo.budgetEndDate);
          if (isValid(parsedEndDate)) {
            setEndDate(parsedEndDate);
          }
        } catch (e) {
          console.error("Error parsing end date:", e);
        }
      }
    }
  }, [budgetInfo]);

  const handleSubmit = () => {
    const data: SetBudgetParams = {
      budgetCap: parseFloat(budgetCap),
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

  const formatCurrency = (value: string | null): string => {
    if (!value) return "$0";
    return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateUsage = (): number => {
    if (!budgetInfo?.budgetCap || parseFloat(budgetInfo.budgetCap) === 0) return 0;
    return Math.min(100, (parseFloat(budgetInfo.totalProjectAllocations || '0') / parseFloat(budgetInfo.budgetCap)) * 100);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Control your outsourcing budget and spending limits</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Control your outsourcing budget and spending limits</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              There was an error loading your budget information. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Control your outsourcing budget and spending limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {budgetInfo?.budgetCap && (
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card className="md:col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Budget</p>
                        <p className="text-2xl font-bold">{formatCurrency(budgetInfo.budgetCap)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="md:col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-full bg-primary/10">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Project Allocations</p>
                        <p className="text-2xl font-bold">{formatCurrency(budgetInfo.totalProjectAllocations)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="md:col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-full bg-primary/10">
                        <BarChart3 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining</p>
                        <p className="text-2xl font-bold">{formatCurrency(budgetInfo.remainingBudget)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${calculateUsage()}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>0%</span>
                <span>{calculateUsage().toFixed(1)}% used</span>
                <span>100%</span>
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Budget period: <span className="text-muted-foreground capitalize">{budgetInfo.budgetPeriod}</span></p>
                  <p className="text-sm text-muted-foreground">
                    {budgetInfo.budgetStartDate && budgetInfo.budgetEndDate ? (
                      <>Period: {format(parseISO(budgetInfo.budgetStartDate), 'MMM dd, yyyy')} to {format(parseISO(budgetInfo.budgetEndDate), 'MMM dd, yyyy')}</>
                    ) : (
                      <>No period set</>
                    )}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => resetBudget()} 
                  disabled={isResettingBudget}
                >
                  {isResettingBudget ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Budget Usage"
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budgetCap">Company Budget Allocation</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="budgetCap"
                  type="number"
                  placeholder="Enter total company budget (e.g. 60000)"
                  className="pl-7"
                  value={budgetCap}
                  onChange={(e) => setBudgetCap(e.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Set the total budget for your company account. Individual projects will draw from this amount. Once you hit this cap, you cannot create more projects until you increase your budget or complete existing ones.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Budget Period</Label>
              <RadioGroup value={budgetPeriod} onValueChange={(value) => setBudgetPeriod(value as any)}>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="quarterly" id="quarterly" />
                    <Label htmlFor="quarterly" className="cursor-pointer">Quarterly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yearly" id="yearly" />
                    <Label htmlFor="yearly" className="cursor-pointer">Yearly</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker date={startDate} setDate={setStartDate} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <DatePicker date={endDate} setDate={setEndDate} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="resetEnabled" className="cursor-pointer">Automatic Budget Reset</Label>
                <Switch
                  id="resetEnabled"
                  checked={resetEnabled}
                  onCheckedChange={setResetEnabled}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, your budget usage will automatically reset at the end of each period.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button 
            disabled={!budgetCap || isNaN(parseFloat(budgetCap)) || isSettingBudget} 
            onClick={handleSubmit}
          >
            {isSettingBudget ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Budget Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}