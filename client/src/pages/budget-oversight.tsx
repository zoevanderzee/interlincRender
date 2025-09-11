
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useBudget } from "@/hooks/use-budget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from "recharts";
import { 
  Download, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Briefcase,
  AlertTriangle,
  Settings,
  Target,
  Calendar,
  Filter,
  Edit
} from "lucide-react";

// Budget form schema
const budgetFormSchema = z.object({
  budgetCap: z.number().min(1, "Budget must be at least $1"),
  budgetPeriod: z.enum(["monthly", "quarterly", "yearly"]),
  resetEnabled: z.boolean(),
});
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Define category colors
const CATEGORY_COLORS = {
  'UI/UX Design': '#3B82F6',
  'Content Creation': '#10B981', 
  'Marketing': '#F59E0B',
  'Development': '#8B5CF6',
  'Consulting': '#EF4444',
  'Other': '#6B7280'
};

interface BudgetCategory {
  category: string;
  contractorsCount: number;
  totalAllocated: number;
  totalSpent: number;
  remaining: number;
  contracts: Array<{
    id: number;
    contractorName: string;
    projectName: string;
    allocated: number;
    spent: number;
    status: string;
  }>;
}

interface BudgetOverviewData {
  totalBudget: number;
  totalAllocated: number;
  totalSpent: number;
  remaining: number;
  categories: BudgetCategory[];
  monthlySpending: Array<{
    month: string;
    amount: number;
    category: string;
  }>;
  alerts: Array<{
    type: 'warning' | 'danger';
    message: string;
    category?: string;
  }>;
}

export default function BudgetOversight() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  
  // Budget management hook
  const { budgetInfo, setBudget, isSettingBudget } = useBudget();

  // Fetch budget oversight data
  const { data: budgetData, isLoading } = useQuery<BudgetOverviewData>({
    queryKey: ['/api/budget/oversight', selectedPeriod],
    enabled: !!user && user.role === 'business'
  });

  // Budget form
  const budgetForm = useForm<z.infer<typeof budgetFormSchema>>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      budgetCap: budgetInfo?.budgetCap ? parseFloat(budgetInfo.budgetCap) : 10000,
      budgetPeriod: (budgetInfo?.budgetPeriod as any) || "yearly",
      resetEnabled: budgetInfo?.budgetResetEnabled || false,
    }
  });

  const onBudgetSubmit = (values: z.infer<typeof budgetFormSchema>) => {
    setBudget({
      budgetCap: values.budgetCap,
      budgetPeriod: values.budgetPeriod,
      resetEnabled: values.resetEnabled,
    });
    setBudgetDialogOpen(false);
  };

  // Calculate pie chart data
  const pieData = useMemo(() => {
    if (!budgetData) return [];
    return budgetData.categories.map(cat => ({
      name: cat.category,
      value: cat.totalAllocated,
      count: cat.contractorsCount,
      spent: cat.totalSpent,
      remaining: cat.remaining
    }));
  }, [budgetData]);

  // Calculate trend data for spending over time
  const trendData = useMemo(() => {
    if (!budgetData) return [];
    const monthlyData = budgetData.monthlySpending.reduce((acc, item) => {
      const existing = acc.find(m => m.month === item.month);
      if (existing) {
        existing.total += item.amount;
        existing[item.category] = (existing[item.category] || 0) + item.amount;
      } else {
        acc.push({
          month: item.month,
          total: item.amount,
          [item.category]: item.amount
        });
      }
      return acc;
    }, [] as any[]);
    return monthlyData;
  }, [budgetData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading budget oversight...</p>
        </div>
      </div>
    );
  }

  if (!budgetData) {
    return (
      <div className="text-center py-8">
        <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-400 mb-2">No budget data available</h3>
        <p className="text-gray-500">Set up your budget and create projects to see insights</p>
      </div>
    );
  }

  const budgetUtilization = ((budgetData.totalSpent / budgetData.totalBudget) * 100).toFixed(1);
  const allocationRate = ((budgetData.totalAllocated / budgetData.totalBudget) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-white">Budget Oversight</h1>
          <p className="text-gray-400 mt-1">Monitor contractor spending across categories and projects</p>
        </div>
        <div className="flex gap-3 mt-4 lg:mt-0">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40 bg-black border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Period</SelectItem>
              <SelectItem value="last3months">Last 3 Months</SelectItem>
              <SelectItem value="last6months">Last 6 Months</SelectItem>
              <SelectItem value="lastyear">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-gray-700">
                <Settings className="mr-2" size={16} />
                Set Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-white">Configure Budget Settings</DialogTitle>
              </DialogHeader>
              <Form {...budgetForm}>
                <form onSubmit={budgetForm.handleSubmit(onBudgetSubmit)} className="space-y-4">
                  <FormField
                    control={budgetForm.control}
                    name="budgetCap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Total Budget Cap</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10000"
                            className="bg-gray-900 border-gray-700 text-white"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={budgetForm.control}
                    name="budgetPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Budget Period</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-900 border-gray-700">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={budgetForm.control}
                    name="resetEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-gray-300">Auto-Reset Budget</FormLabel>
                          <p className="text-sm text-gray-400">
                            Automatically reset budget usage at the end of each period
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 border-gray-700"
                      onClick={() => setBudgetDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isSettingBudget}
                    >
                      {isSettingBudget ? "Saving..." : "Save Budget"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" className="border-gray-700">
            <Download className="mr-2" size={16} />
            Export Report
          </Button>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetData.alerts && budgetData.alerts.length > 0 && (
        <div className="space-y-2">
          {budgetData.alerts.map((alert, index) => (
            <Card key={index} className={`border-l-4 ${alert.type === 'danger' ? 'border-l-red-500 bg-red-900/10' : 'border-l-yellow-500 bg-yellow-900/10'} bg-black border-gray-800`}>
              <CardContent className="flex items-center p-4">
                <AlertTriangle className={`mr-3 ${alert.type === 'danger' ? 'text-red-400' : 'text-yellow-400'}`} size={20} />
                <div>
                  <p className="text-white font-medium">{alert.message}</p>
                  {alert.category && <p className="text-sm text-gray-400">Category: {alert.category}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${budgetData.totalBudget.toLocaleString()}</div>
            <p className="text-xs text-gray-400">Budget cap for period</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Allocated</CardTitle>
            <Briefcase className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${budgetData.totalAllocated.toLocaleString()}</div>
            <p className="text-xs text-gray-400">{allocationRate}% of total budget</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${budgetData.totalSpent.toLocaleString()}</div>
            <p className="text-xs text-gray-400">{budgetUtilization}% utilization</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Remaining</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${budgetData.remaining.toLocaleString()}</div>
            <p className="text-xs text-gray-400">Available to allocate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Pie Chart */}
        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Budget by Category</CardTitle>
            <p className="text-sm text-gray-400">Contractor allocation across work categories</p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, count }) => `${name}: $${value.toLocaleString()} (${count})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS.Other} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value: any, name: string, props: any) => [
                      `$${value.toLocaleString()}`, 
                      `${props.payload.count} contractors`
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Spending Trend */}
        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Spending Trend</CardTitle>
            <p className="text-sm text-gray-400">Monthly spending across all categories</p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Spent']}
                  />
                  <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Category Breakdown</CardTitle>
              <p className="text-sm text-gray-400">Detailed view of contractors and spending by category</p>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 bg-black border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {budgetData.categories.map(cat => (
                  <SelectItem key={cat.category} value={cat.category}>{cat.category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {budgetData.categories
              .filter(cat => selectedCategory === 'all' || cat.category === selectedCategory)
              .map((category) => (
              <div key={category.category} className="border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: CATEGORY_COLORS[category.category] || CATEGORY_COLORS.Other }}
                    />
                    <h3 className="text-lg font-medium text-white">{category.category}</h3>
                    <Badge variant="secondary">{category.contractorsCount} contractors</Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">${category.totalAllocated.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">
                      ${category.totalSpent.toLocaleString()} spent • ${category.remaining.toLocaleString()} remaining
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((category.totalSpent / category.totalAllocated) * 100, 100)}%` }}
                  />
                </div>

                {/* Contractors table */}
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-400">Contractor</TableHead>
                      <TableHead className="text-gray-400">Project</TableHead>
                      <TableHead className="text-gray-400">Allocated</TableHead>
                      <TableHead className="text-gray-400">Spent</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.contracts.map((contract, index) => (
                      <TableRow key={index} className="border-gray-800">
                        <TableCell className="text-white">{contract.contractorName}</TableCell>
                        <TableCell className="text-white">{contract.projectName}</TableCell>
                        <TableCell className="text-white">${contract.allocated.toLocaleString()}</TableCell>
                        <TableCell className="text-green-400">${contract.spent.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={contract.status === 'active' ? 'default' : 'secondary'}
                            className={contract.status === 'active' ? 'bg-green-900/30 text-green-400' : ''}
                          >
                            {contract.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
