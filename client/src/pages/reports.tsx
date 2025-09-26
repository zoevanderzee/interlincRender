import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Cell
} from "recharts";
import { 
  Download, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle,
  DollarSign
} from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const { user } = useAuth();
  
  const isContractor = user?.role === 'contractor';

  // Fetch reports data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['/api/reports'],
    enabled: !!user
  });

  // Fetch total contracts count separately
  const { data: contractsData } = useQuery({
    queryKey: ['/api/contracts'],
    enabled: !!user && !isContractor
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your reports...</p>
        </div>
      </div>
    );
  }

  if (isContractor) {
    // Contractor view - simplified work performance focused
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white">My Work Report</h1>
            <p className="text-gray-400 mt-1">Track your work performance and earnings over time</p>
          </div>
          <Button 
            variant="outline"
            className="mt-4 md:mt-0 border-gray-700 text-white hover:bg-gray-800"
          >
            <Download className="mr-2" size={16} />
            Download Report
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-black border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Projects</CardTitle>
              <FileText className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{reportData?.summary?.totalContracts || 0}</div>
              <p className="text-xs text-gray-400">Currently working on</p>
            </CardContent>
          </Card>

          <Card className="bg-black border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(reportData?.summary?.totalEarnings || 0)}
              </div>
              <p className="text-xs text-gray-400">All time earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-black border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{reportData?.summary?.completedContracts || 0}</div>
              <p className="text-xs text-gray-400">Projects finished</p>
            </CardContent>
          </Card>

          <Card className="bg-black border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Avg Response</CardTitle>
              <Clock className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">24h</div>
              <p className="text-xs text-gray-400">Response time</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Earnings Chart */}
          <Card className="bg-black border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Monthly Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData?.monthlyPayments || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value) => [`$${value}`, 'Earnings']}
                    />
                    <Bar dataKey="amount" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Project Types Distribution */}
          <Card className="bg-black border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Project Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData?.contractDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(reportData?.contractDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#F9FAFB'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Work Activity */}
        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {(!reportData?.recentActivity || reportData.recentActivity.length === 0) ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No activity yet</h3>
                <p className="text-gray-500">Your work activity will appear here as you complete projects</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400">Project</TableHead>
                    <TableHead className="text-gray-400">Activity</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.recentActivity.map((activity, index) => (
                    <TableRow key={index} className="border-gray-800">
                      <TableCell className="text-white">
                        {new Date(activity.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-white">{activity.project}</TableCell>
                      <TableCell className="text-white">{activity.description}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.status === 'completed' 
                            ? 'bg-green-900/30 text-green-400'
                            : activity.status === 'in-progress'
                            ? 'bg-blue-900/30 text-blue-400'
                            : 'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {activity.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Business owner view - comprehensive reporting dashboard
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Business Reports</h1>
          <p className="text-gray-400 mt-1">Analyze business performance and contractor metrics</p>
        </div>
        <Button className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700">
          <Download className="mr-2" size={16} />
          Export Report
        </Button>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Contracts</CardTitle>
            <FileText className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{reportData?.summary?.totalContracts || 0}</div>
            <p className="text-xs text-gray-400">All time contracts</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Contractors</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{reportData?.summary?.totalContractors || 0}</div>
            <p className="text-xs text-gray-400">Working with you</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${reportData?.summary?.totalSpent?.toLocaleString() || '0'}</div>
            <p className="text-xs text-gray-400">All time payments</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{reportData?.summary?.completionRate || 0}%</div>
            <p className="text-xs text-gray-400">Projects completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Chart */}
        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData?.monthlyPayments || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Contract Distribution */}
        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Contract Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportData?.contractDistribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(reportData?.contractDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Business Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {(!reportData?.recentActivity || reportData.recentActivity.length === 0) ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No recent activity</h3>
              <p className="text-gray-500">Business activity and contractor interactions will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Date</TableHead>
                  <TableHead className="text-gray-400">Contractor</TableHead>
                  <TableHead className="text-gray-400">Project</TableHead>
                  <TableHead className="text-gray-400">Activity</TableHead>
                  <TableHead className="text-gray-400">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.recentActivity.map((activity, index) => (
                  <TableRow key={index} className="border-gray-800">
                    <TableCell className="text-white">
                      {new Date(activity.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-white">{activity.contractor}</TableCell>
                    <TableCell className="text-white">{activity.project}</TableCell>
                    <TableCell className="text-gray-300">{activity.activity}</TableCell>
                    <TableCell className="text-white font-medium">
                      {activity.amount ? `$${activity.amount.toLocaleString()}` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}