import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Contract, Payment, Milestone } from '@shared/schema';
import { DollarSign, FileText, Calendar, Clock, AlertTriangle, CheckCircle, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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

// Calculate total earnings from completed payments
const calculateTotalEarnings = (payments: Payment[]) => {
  return payments
    .filter(p => p.status === 'completed')
    .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
};

// Calculate pending earnings from upcoming payments
const calculatePendingEarnings = (payments: Payment[]) => {
  return payments
    .filter(p => p.status !== 'completed')
    .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
};

export function ContractorDashboard({ dashboardData }: { dashboardData: DashboardData }) {
  const [_, navigate] = useLocation();
  
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
  
  // Active projects for this contractor
  const activeProjects = dashboardData.contracts.filter(c => c.status === 'active');
  
  // Calculate total and pending earnings
  const totalEarnings = calculateTotalEarnings(dashboardData.payments);
  const pendingEarnings = calculatePendingEarnings(dashboardData.payments);

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
            <div className="p-2 rounded-full bg-accent-500/10">
              <Briefcase size={20} className="text-accent-500" />
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
      
      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Projects */}
        <Button 
          variant="outline"
          className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white h-auto py-3 justify-start"
          onClick={() => navigate('/contracts')}
        >
          <Briefcase className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">My Projects</div>
            <div className="text-xs text-gray-400">View active projects</div>
          </div>
        </Button>
        
        {/* Payments */}
        <Button 
          variant="outline"
          className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white h-auto py-3 justify-start"
          onClick={() => navigate('/payments')}
        >
          <DollarSign className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">Payments</div>
            <div className="text-xs text-gray-400">View payment history</div>
          </div>
        </Button>
        
        {/* Settings */}
        <Button 
          variant="outline"
          className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white h-auto py-3 justify-start"
          onClick={() => navigate('/settings')}
        >
          <Clock className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">Profile</div>
            <div className="text-xs text-gray-400">Update your information</div>
          </div>
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