import React from 'react';
import { useNavigate } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Contract, Payment, Milestone } from '@shared/schema';
import { DollarSign, FileText, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

interface DashboardData {
  stats: {
    activeContractsCount: number;
    pendingApprovalsCount: number;
    paymentsProcessed: number;
    totalPendingValue: number;
    activeContractorsCount: number;
    pendingInvitesCount: number;
  };
  contracts: Contract[];
  milestones: Milestone[];
  payments: Payment[];
}

export function ContractorDashboard({ userId }: { userId: number }) {
  const navigate = useNavigate();
  
  // Fetch contractor-specific data
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    queryFn: async () => {
      try {
        // Add user ID from localStorage
        const headers: HeadersInit = {
          "Accept": "application/json",
          "Cache-Control": "no-cache",
          "X-User-ID": userId.toString()
        };
        
        const res = await fetch("/api/dashboard", {
          method: "GET",
          credentials: "include",
          headers
        });
        
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error fetching contractor dashboard:", error);
        throw error;
      }
    }
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-1/4 bg-zinc-800 rounded mb-2"></div>
        <div className="h-4 w-2/3 bg-zinc-800 rounded mb-8"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900 h-32 rounded-lg shadow-sm border border-zinc-800"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <div className="h-24 w-24 mx-auto mb-6 flex items-center justify-center rounded-full bg-zinc-800">
          <AlertTriangle size={40} className="text-yellow-500" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">No Project Data</h2>
        <p className="text-gray-400 mb-6">We couldn't find any projects assigned to you yet.</p>
      </div>
    );
  }

  // Active projects for this contractor
  const activeProjects = dashboardData.contracts.filter(c => c.status === 'active');
  
  // Calculate upcoming payments (next 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);
  
  const upcomingPayments = dashboardData.payments.filter(payment => {
    const paymentDate = new Date(payment.scheduledDate);
    return payment.status !== 'completed' && 
           paymentDate >= now && 
           paymentDate <= thirtyDaysFromNow;
  });
  
  // Get next payment
  const nextPayment = upcomingPayments.length > 0 
    ? upcomingPayments.sort((a, b) => 
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      )[0]
    : null;
  
  // Calculate total earnings
  const totalEarnings = dashboardData.payments
    .filter(p => p.status === 'completed')
    .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  
  // Calculate pending earnings
  const pendingEarnings = dashboardData.payments
    .filter(p => p.status !== 'completed')
    .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Contractor Dashboard</h1>
        <p className="text-gray-400 mt-1">Manage your projects and track your payments</p>
      </div>
      
      {/* Primary Metrics: 3 Key Cards for contractors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Active Projects */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Active Projects</h3>
            <div className="p-2 rounded-full bg-blue-500/10">
              <FileText size={20} className="text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{activeProjects.length}</p>
          <p className="text-xs text-gray-500 mt-1">Current projects in progress</p>
        </div>
        
        {/* Card 2: Total Earnings */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Total Earnings</h3>
            <div className="p-2 rounded-full bg-green-500/10">
              <DollarSign size={20} className="text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">${totalEarnings.toLocaleString('en-US')}</p>
          <p className="text-xs text-gray-500 mt-1">Completed payments</p>
        </div>
        
        {/* Card 3: Pending Earnings */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Pending Earnings</h3>
            <div className="p-2 rounded-full bg-yellow-500/10">
              <Clock size={20} className="text-yellow-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">${pendingEarnings.toLocaleString('en-US')}</p>
          <p className="text-xs text-gray-500 mt-1">Upcoming payments</p>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button 
          className="bg-accent-500 hover:bg-accent-600 text-white"
          onClick={() => navigate('/contracts')}
        >
          <FileText className="mr-2" size={16} />
          View All Projects
        </Button>
        
        <Button 
          variant="outline"
          className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
          onClick={() => navigate('/payments')}
        >
          <DollarSign className="mr-2" size={16} />
          Payment History
        </Button>
      </div>
      
      {/* Active Projects */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Active Projects</h2>
        {activeProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeProjects.slice(0, 4).map((contract) => (
              <Card key={contract.id} className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-white">{contract.contractName}</CardTitle>
                    <div className="px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-400">
                      {contract.contractCode}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {contract.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Start Date</span>
                      <span className="text-white">{contract.startDate ? format(new Date(contract.startDate), 'MMM d, yyyy') : 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">End Date</span>
                      <span className="text-white">{contract.endDate ? format(new Date(contract.endDate), 'MMM d, yyyy') : 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Value</span>
                      <span className="text-white">${parseFloat(contract.value).toLocaleString('en-US')}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="ghost" 
                    className="w-full text-accent-500 hover:text-accent-400 hover:bg-accent-500/10"
                    onClick={() => navigate(`/contract/${contract.id}`)}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">No Active Projects</h3>
              <p className="text-sm text-gray-400">
                You don't have any active projects at the moment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Upcoming Payments */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Upcoming Payments</h2>
        {upcomingPayments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingPayments.slice(0, 4).map((payment) => {
              const contract = dashboardData.contracts.find(c => c.id === payment.contractId);
              return (
                <Card key={payment.id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-white">${parseFloat(payment.amount).toLocaleString('en-US')}</CardTitle>
                      <div className="px-2 py-1 bg-yellow-500/20 rounded text-xs text-yellow-400">
                        {payment.status}
                      </div>
                    </div>
                    <CardDescription>
                      {contract?.contractName || 'Unknown Project'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Payment Date</span>
                        <span className="text-white">{format(new Date(payment.scheduledDate), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Project Code</span>
                        <span className="text-white">{contract?.contractCode || 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">No Upcoming Payments</h3>
              <p className="text-sm text-gray-400">
                You don't have any scheduled payments in the next 30 days.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}