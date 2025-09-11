
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Filter
} from "lucide-react";
import { useState, useMemo } from "react";

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

  // Fetch budget oversight data
  const { data: budgetData, isLoading } = useQuery<BudgetOverviewData>({
    queryKey: ['/api/budget/oversight', selectedPeriod],
    enabled: !!user && user.role === 'business'
  });

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
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Plus,
  Settings,
  Target,
  PieChart as PieChartIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Chart colors for different contractor categories
const CHART_COLORS = [
  '#8B5CF6', // UI
  '#06B6D4', // Content Creation
  '#10B981', // Marketing
  '#F59E0B', // Development
  '#EF4444', // Design
  '#6366F1', // Other
];

interface BudgetData {
  totalBudget: number;
  totalUsed: number;
  remaining: number;
  contractors: {
    category: string;
    count: number;
    totalAllocated: number;
    totalSpent: number;
  }[];
}

const BudgetOversight = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch budget data
  const { data: budgetData, isLoading } = useQuery<BudgetData>({
    queryKey: ['/api/budget-oversight'],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      return {
        totalBudget: 50000,
        totalUsed: 32000,
        remaining: 18000,
        contractors: [
          { category: 'UI Design', count: 5, totalAllocated: 15000, totalSpent: 12000 },
          { category: 'Content Creation', count: 2, totalAllocated: 8000, totalSpent: 6000 },
          { category: 'Marketing', count: 4, totalAllocated: 12000, totalSpent: 9000 },
          { category: 'Development', count: 3, totalAllocated: 10000, totalSpent: 5000 },
          { category: 'Other', count: 1, totalAllocated: 5000, totalSpent: 0 }
        ]
      };
    }
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-gray-800 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-gray-800 rounded"></div>
          <div className="h-32 bg-gray-800 rounded"></div>
          <div className="h-32 bg-gray-800 rounded"></div>
        </div>
        <div className="h-96 bg-gray-800 rounded"></div>
      </div>
    );
  }

  const budgetUtilization = budgetData ? (budgetData.totalUsed / budgetData.totalBudget) * 100 : 0;

  // Prepare data for pie chart
  const pieChartData = budgetData?.contractors.map((contractor, index) => ({
    name: contractor.category,
    value: contractor.totalSpent,
    count: contractor.count,
    allocated: contractor.totalAllocated,
    color: CHART_COLORS[index % CHART_COLORS.length]
  })) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Budget Oversight</h1>
          <p className="text-gray-400 mt-1">Monitor spending and contractor allocation across departments</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
            <Settings className="mr-2" size={16} />
            Budget Settings
          </Button>
          <Button className="bg-accent-600 hover:bg-accent-700">
            <Plus className="mr-2" size={16} />
            Set Budget Cap
          </Button>
        </div>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${budgetData?.totalBudget.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400">Annual contractor budget</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${budgetData?.totalUsed.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400">
              {budgetUtilization.toFixed(1)}% of total budget
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Remaining</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${budgetData?.remaining.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400">Available for allocation</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Budget Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Used</span>
              <span className="text-white">{budgetUtilization.toFixed(1)}%</span>
            </div>
            <Progress value={budgetUtilization} className="h-2" />
            {budgetUtilization > 80 && (
              <div className="flex items-center text-amber-500 text-sm mt-2">
                <AlertTriangle size={16} className="mr-2" />
                Budget utilization is high. Consider reviewing allocations.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contractor Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <PieChartIcon className="mr-2" size={20} />
              Contractor Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `$${value.toLocaleString()}`,
                      `${props.payload.count} contractors`
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown Table */}
        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgetData?.contractors.map((category, index) => (
                <div key={category.category} className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <h4 className="font-medium text-white">{category.category}</h4>
                    </div>
                    <Badge variant="secondary" className="bg-zinc-800 text-white">
                      {category.count} contractors
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Allocated:</span>
                      <div className="font-medium text-white">${category.totalAllocated.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Spent:</span>
                      <div className="font-medium text-white">${category.totalSpent.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress 
                      value={(category.totalSpent / category.totalAllocated) * 100} 
                      className="h-1" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
              View Detailed Reports
            </Button>
            <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
              Export Budget Data
            </Button>
            <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
              Set Spending Alerts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetOversight;
