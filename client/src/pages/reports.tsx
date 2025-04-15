import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend 
} from "recharts";
import { 
  Download, 
  FileText, 
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon,
  Calendar,
  Loader2
} from "lucide-react";

// Default empty data for charts
const EMPTY_DATA = {
  monthlyPayments: [
    { name: 'Jan', amount: 0 },
    { name: 'Feb', amount: 0 },
    { name: 'Mar', amount: 0 },
    { name: 'Apr', amount: 0 },
    { name: 'May', amount: 0 },
    { name: 'Jun', amount: 0 }
  ],
  contractDistribution: [
    { name: 'Fixed Price', value: 0 },
    { name: 'Time & Materials', value: 0 },
    { name: 'Retainer', value: 0 }
  ],
  statusDistribution: [
    { name: 'Active', value: 0 },
    { name: 'Pending', value: 0 },
    { name: 'Completed', value: 0 }
  ],
  contractGrowth: [
    { name: 'Jan', contracts: 0 },
    { name: 'Feb', contracts: 0 },
    { name: 'Mar', contracts: 0 },
    { name: 'Apr', contracts: 0 },
    { name: 'May', contracts: 0 },
    { name: 'Jun', contracts: 0 }
  ]
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Reports = () => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('year');
  const [isExporting, setIsExporting] = useState(false);
  
  // Fetch real report data from the API
  const { data, isLoading } = useQuery({
    queryKey: ['/api/reports', timeRange],
  });
  
  // Handle export reports
  const handleExport = (format: string) => {
    setIsExporting(true);
    
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      toast({
        title: "Report exported",
        description: `Your report has been exported as ${format.toUpperCase()}.`,
      });
    }, 1500);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }
  
  // Create report data from API or fall back to empty data
  const reportData = {
    monthlyPayments: EMPTY_DATA.monthlyPayments,
    contractDistribution: EMPTY_DATA.contractDistribution,
    statusDistribution: data?.contractsByStatus?.map((item: any) => ({
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' '),
      value: item.count || 0
    })) || EMPTY_DATA.statusDistribution,
    contractGrowth: EMPTY_DATA.contractGrowth
  };
  
  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary-900">Financial Reports</h1>
          <p className="text-primary-500 mt-1">Track performance and analyze payment data</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="hidden md:flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download size={16} className="mr-2" />
              )}
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText size={16} className="mr-2" />
              )}
              PDF
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile Export Button Group */}
      <div className="flex md:hidden space-x-2 mb-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => handleExport('csv')}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download size={16} className="mr-2" />
          )}
          Export as CSV
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText size={16} className="mr-2" />
          )}
          Export as PDF
        </Button>
      </div>
      
      {/* Report Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center">
            <BarChartIcon size={16} className="mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center">
            <LineChartIcon size={16} className="mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center">
            <PieChartIcon size={16} className="mr-2" />
            Contracts
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Payments Chart */}
            <Card className="p-5 border border-primary-100">
              <h3 className="text-lg font-medium text-primary-900 mb-4">Monthly Payments</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reportData.monthlyPayments}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`$${value}`, 'Amount']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            {/* Contract Distribution Chart */}
            <Card className="p-5 border border-primary-100">
              <h3 className="text-lg font-medium text-primary-900 mb-4">Contract Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.contractDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData.contractDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} contracts`, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            {/* Status Distribution Chart */}
            <Card className="p-5 border border-primary-100 md:col-span-2">
              <h3 className="text-lg font-medium text-primary-900 mb-4">Contract Status Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reportData.statusDistribution}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip formatter={(value) => [`${value} contracts`, 'Count']} />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>
        
        {/* Payments Tab */}
        <TabsContent value="payments">
          <div className="grid grid-cols-1 gap-6">
            <Card className="p-5 border border-primary-100">
              <h3 className="text-lg font-medium text-primary-900 mb-4">Payment Trends</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={reportData.monthlyPayments}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#3b82f6" 
                      activeDot={{ r: 8 }} 
                      name="Payment Amount"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            {/* Payment Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 border border-primary-100">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-accent-500 mr-2" />
                  <h3 className="text-lg font-medium text-primary-900">This Month</h3>
                </div>
                <p className="text-3xl font-semibold text-primary-900">
                  $0
                </p>
                <p className="text-sm text-primary-500 mt-1">Total payments processed</p>
              </Card>
              
              <Card className="p-5 border border-primary-100">
                <div className="flex items-center mb-2">
                  <BarChartIcon className="h-5 w-5 text-accent-500 mr-2" />
                  <h3 className="text-lg font-medium text-primary-900">Average</h3>
                </div>
                <p className="text-3xl font-semibold text-primary-900">
                  $0
                </p>
                <p className="text-sm text-primary-500 mt-1">Monthly average</p>
              </Card>
              
              <Card className="p-5 border border-primary-100">
                <div className="flex items-center mb-2">
                  <LineChartIcon className="h-5 w-5 text-accent-500 mr-2" />
                  <h3 className="text-lg font-medium text-primary-900">Year to Date</h3>
                </div>
                <p className="text-3xl font-semibold text-primary-900">
                  $0
                </p>
                <p className="text-sm text-primary-500 mt-1">Total for the year</p>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <div className="grid grid-cols-1 gap-6">
            <Card className="p-5 border border-primary-100">
              <h3 className="text-lg font-medium text-primary-900 mb-4">Contract Growth</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={reportData.contractGrowth}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} contracts`, 'Count']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="contracts" 
                      stroke="#10b981" 
                      activeDot={{ r: 8 }} 
                      name="Active Contracts"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5 border border-primary-100">
                <h3 className="text-lg font-medium text-primary-900 mb-4">Contract Types</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.contractDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {reportData.contractDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} contracts`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              
              <Card className="p-5 border border-primary-100">
                <h3 className="text-lg font-medium text-primary-900 mb-4">Contract Status</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData.statusDistribution}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} contracts`, 'Count']} />
                      <Bar dataKey="value" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Reports;