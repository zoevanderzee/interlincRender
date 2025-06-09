import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Payment, Contract, User, Milestone } from "@shared/schema";

// Define interface for dashboard data
interface DashboardData {
  stats: {
    activeContractsCount: number;
    pendingApprovalsCount: number;
    paymentsProcessed: number;
    activeContractorsCount: number;
    totalPendingValue?: number;
    pendingInvitesCount?: number;
  };
  contracts: Contract[];
  contractors: User[];
  milestones: Milestone[];
  payments: Payment[];
}
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Download,
  TrendingUp,
  CreditCard
} from "lucide-react";

export default function Payments() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const isContractor = user?.role === 'contractor';

  // Use dashboard data for payments and contracts
  const { data: dashboardData, isLoading: paymentsLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: !!user
  });

  const payments = dashboardData?.payments || [];
  const contracts = dashboardData?.contracts || [];

  if (paymentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your payments...</p>
        </div>
      </div>
    );
  }

  // Calculate payment totals
  const completedPayments = payments.filter((p: Payment) => p.status === 'completed');
  const pendingPayments = payments.filter((p: Payment) => p.status === 'scheduled' || p.status === 'pending');
  const processingPayments = payments.filter((p: Payment) => p.status === 'processing');

  const totalEarned = completedPayments.reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);
  const totalPending = pendingPayments.reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);
  const totalProcessing = processingPayments.reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);

  // Get contract details for payment context
  const getContractName = (contractId: number) => {
    const contract = contracts.find((c: Contract) => c.id === contractId);
    return contract?.contractName || `Contract #${contractId}`;
  };

  if (isContractor) {
    // Contractor view - simplified and earnings-focused
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white">My Earnings</h1>
            <p className="text-gray-400 mt-1">Track your payment history and upcoming earnings</p>
          </div>
          <Button 
            variant="outline"
            className="mt-4 md:mt-0 border-gray-700 text-white hover:bg-gray-800"
          >
            <Download className="mr-2" size={16} />
            Download Statement
          </Button>
        </div>

        {/* Earnings Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-black border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Earned</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${totalEarned.toLocaleString()}</div>
              <p className="text-xs text-gray-400">{completedPayments.length} payments completed</p>
            </CardContent>
          </Card>

          <Card className="bg-black border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${totalPending.toLocaleString()}</div>
              <p className="text-xs text-gray-400">{pendingPayments.length} payments scheduled</p>
            </CardContent>
          </Card>

          <Card className="bg-black border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Processing</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${totalProcessing.toLocaleString()}</div>
              <p className="text-xs text-gray-400">{processingPayments.length} payments processing</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No payments yet</h3>
                <p className="text-gray-500">Your payment history will appear here once you start earning</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400">Project</TableHead>
                    <TableHead className="text-gray-400">Amount</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: Payment) => (
                    <TableRow key={payment.id} className="border-gray-800">
                      <TableCell className="text-white">
                        {new Date(payment.scheduledDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-white">
                        {getContractName(payment.contractId)}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        ${parseFloat(payment.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === 'completed' 
                            ? 'bg-green-900/30 text-green-400'
                            : payment.status === 'processing'
                            ? 'bg-blue-900/30 text-blue-400'
                            : 'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {payment.status === 'completed' ? 'Paid' : 
                           payment.status === 'processing' ? 'Processing' : 'Pending'}
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

  // Business owner view - full payment management functionality
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Payment Management</h1>
          <p className="text-gray-400 mt-1">Manage payments to contractors and track expenses</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            onClick={() => navigate('/pay-contractor')}
            className="bg-green-600 hover:bg-green-700"
          >
            <CreditCard className="mr-2" size={16} />
            Pay Contractor
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <DollarSign className="mr-2" size={16} />
            Process Payment
          </Button>
        </div>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${totalEarned.toLocaleString()}</div>
            <p className="text-xs text-gray-400">{completedPayments.length} payments completed</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${totalPending.toLocaleString()}</div>
            <p className="text-xs text-gray-400">{pendingPayments.length} payments scheduled</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Processing</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${totalProcessing.toLocaleString()}</div>
            <p className="text-xs text-gray-400">{processingPayments.length} payments processing</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Monthly Total</CardTitle>
            <Calendar className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${(totalEarned + totalPending + totalProcessing).toLocaleString()}</div>
            <p className="text-xs text-gray-400">This month's activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Management Table */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Payment History & Management</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Payments Yet</h3>
              <p className="text-gray-400">Payments to contractors will appear here once you start processing them</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Contractor</TableHead>
                  <TableHead className="text-gray-400">Project</TableHead>
                  <TableHead className="text-gray-400">Amount</TableHead>
                  <TableHead className="text-gray-400">Due Date</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment: Payment) => (
                  <TableRow key={payment.id} className="border-gray-800">
                    <TableCell className="text-white">
                      {payment.contractorId ? `Contractor #${payment.contractorId}` : 'Contractor'}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {getContractName(payment.contractId)}
                    </TableCell>
                    <TableCell className="text-white font-medium">
                      ${parseFloat(payment.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'Not set'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                        payment.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                        payment.status === 'scheduled' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {payment.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {payment.status === 'pending' || payment.status === 'scheduled' ? (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Process Now
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="border-gray-700 text-gray-400">
                          View Details
                        </Button>
                      )}
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