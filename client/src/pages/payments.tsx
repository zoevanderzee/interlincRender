import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
import { Payment, Contract } from "@shared/schema";
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Download,
  TrendingUp
} from "lucide-react";

export default function Payments() {
  const { user } = useAuth();
  
  const isContractor = user?.role === 'contractor';

  // Fetch payments data
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/payments'],
    enabled: !!user
  });

  // Fetch contracts data for context
  const { data: contracts = [] } = useQuery({
    queryKey: ['/api/contracts'],
    enabled: !!user
  });

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

  // Business owner view - keep existing complex functionality
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Payments</h1>
          <p className="text-gray-400 mt-1">Manage payments to contractors and track expenses</p>
        </div>
      </div>
      
      <div className="text-center py-12">
        <DollarSign className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-400 mb-2">Payment Management</h3>
        <p className="text-gray-500">Business payment management features are being developed</p>
      </div>
    </div>
  );
}