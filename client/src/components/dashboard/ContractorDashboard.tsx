import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Contract, Payment, Milestone } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
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
  workRequests?: any[]; // Making workRequests optional as it might not always be present
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

  // Active assignments are work requests that have been ACCEPTED by the contractor
  const activeAssignments = dashboardData.workRequests?.filter((wr: any) => 
    wr.status === 'accepted'
  ) || [];

  // Fetch contractor earnings from Stripe Connect
  const { data: contractorEarnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['/api/contractors/earnings'],
    queryFn: async () => {
      const userId = localStorage.getItem('user_id');
      const firebaseUid = localStorage.getItem('firebase_uid');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (userId) {
        headers['X-User-ID'] = userId;
      }
      if (firebaseUid) {
        headers['X-Firebase-UID'] = firebaseUid;
      }

      const response = await fetch('/api/contractors/earnings', {
        credentials: 'include',
        headers
      });
      if (!response.ok) {
        throw new Error('Failed to fetch earnings');
      }
      return response.json();
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Use Connect account data as source of truth
  const totalEarnings = contractorEarnings?.totalEarnings || 0;
  const pendingEarnings = contractorEarnings?.pendingEarnings || 0;
  const currency = contractorEarnings?.currency || 'GBP';

  // Format currency based on Connect account settings
  const formatEarnings = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  console.log('Contractor Dashboard Earnings (from Connect account):', {
    totalEarnings,
    pendingEarnings,
    availableBalance: contractorEarnings?.availableBalance || 0,
    pendingBalance: contractorEarnings?.pendingBalance || 0,
    currency
  });

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Contractor Dashboard</h1>
        <p className="text-gray-400 mt-1">Manage your projects and track your payments</p>
      </div>

      {/* Primary Metrics: 3 Key Cards for contractors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Active Assignments */}
        <Card className="animate-fade-in hover:animate-glow-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground text-sm font-medium">Active Assignments</h3>
              <div className="p-3 rounded-xl bg-blue-500/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110">
                <Briefcase size={20} className="text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">{activeAssignments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Current assignments in progress</p>
          </CardContent>
        </Card>

        {/* Card 2: Total Earnings */}
        <Card className="animate-fade-in hover:animate-glow-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground text-sm font-medium">Total Earnings</h3>
              <div className="p-3 rounded-xl bg-green-500/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110">
                <DollarSign size={20} className="text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">{formatEarnings(totalEarnings)}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed payments</p>
          </CardContent>
        </Card>

        {/* Card 3: Pending Earnings */}
        <Card className="animate-fade-in hover:animate-glow-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground text-sm font-medium">Pending Earnings</h3>
              <div className="p-3 rounded-xl bg-yellow-500/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110">
                <Clock size={20} className="text-yellow-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">{formatEarnings(pendingEarnings)}</p>
            <p className="text-xs text-muted-foreground mt-1">Upcoming payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Button 
          size="lg"
          onClick={() => navigate('/contracts')}
          className="animate-scale-in"
        >
          <FileText className="mr-2" size={16} />
          View All Projects
        </Button>

        <Button 
          variant="outline"
          size="lg"
          onClick={() => navigate('/payments')}
          className="animate-scale-in"
        >
          <DollarSign className="mr-2" size={16} />
          Payment History
        </Button>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Projects */}
        <Button 
          variant="ghost"
          className="h-auto py-4 px-6 justify-start animate-slide-in"
          onClick={() => navigate('/contracts')}
        >
          <Briefcase className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">My Projects</div>
            <div className="text-xs text-muted-foreground">View active projects</div>
          </div>
        </Button>

        {/* Payments */}
        <Button 
          variant="ghost"
          className="h-auto py-4 px-6 justify-start animate-slide-in"
          onClick={() => navigate('/payments')}
        >
          <DollarSign className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">Payments</div>
            <div className="text-xs text-muted-foreground">View payment history</div>
          </div>
        </Button>

        {/* Settings */}
        <Button 
          variant="ghost"
          className="h-auto py-4 px-6 justify-start animate-slide-in"
          onClick={() => navigate('/settings')}
        >
          <Clock className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">Profile</div>
            <div className="text-xs text-muted-foreground">Update your information</div>
          </div>
        </Button>
      </div>

      {/* Active Assignments */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Active Assignments</h2>
        {activeAssignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAssignments.slice(0, 4).map((assignment) => {
              // Get status badge color based on actual work request status
              const getStatusBadge = (status: string) => {
                switch(status) {
                  case 'assigned':
                  case 'pending':
                    return 'bg-yellow-500/20 text-yellow-400';
                  case 'accepted':
                    return 'bg-blue-500/20 text-blue-400';
                  case 'in_review':
                    return 'bg-purple-500/20 text-purple-400';
                  case 'approved':
                    return 'bg-green-500/20 text-green-400';
                  default:
                    return 'bg-gray-500/20 text-gray-400';
                }
              };

              return (
                <Card key={assignment.id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-white">
                        {assignment.title || 'Assignment'}
                      </CardTitle>
                      <div className={`px-2 py-1 rounded text-xs ${getStatusBadge(assignment.status)}`}>
                        {assignment.status?.replace('_', ' ').toUpperCase() || 'ACTIVE'}
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {assignment.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Due Date</span>
                        <span className="text-white">
                          {assignment.dueDate ? format(new Date(assignment.dueDate), 'MMM d, yyyy') : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status</span>
                        <span className="text-white capitalize">
                          {assignment.status?.replace('_', ' ') || 'Active'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Value</span>
                        <span className="text-white">
                          {formatEarnings(parseFloat(assignment.amount || 0))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="ghost" 
                      className="w-full text-accent-500 hover:text-accent-400 hover:bg-accent-500/10"
                      onClick={() => navigate('/projects')}
                      data-testid="button-view-assignment-details"
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">No Active Assignments</h3>
              <p className="text-sm text-gray-400">
                You don't have any active assignments at the moment.
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
                      <CardTitle className="text-white">{formatEarnings(parseFloat(payment.amount))}</CardTitle>
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