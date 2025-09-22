import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Contract, Payment, Milestone } from '@shared/schema';
import { DollarSign, FileText, Calendar, Clock, AlertTriangle, CheckCircle, Briefcase, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

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
  businesses: any[]; // Assuming businesses is an array of objects with companyName, email etc.
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

  const { stats, contracts, payments, milestones, businesses } = dashboardData;

  // Calculate upcoming payments (next 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const upcomingPayments = payments.filter(payment => {
    const paymentDate = new Date(payment.scheduledDate);
    return payment.status !== 'completed' && 
           paymentDate >= now && 
           paymentDate <= thirtyDaysFromNow;
  });

  // Active projects for this contractor - match database case 'Active'
  const activeProjects = contracts.filter(c => c.status === 'Active');

  // Calculate total and pending earnings
  const totalEarnings = calculateTotalEarnings(payments);
  const pendingEarnings = calculatePendingEarnings(payments);

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
        <Card className="animate-fade-in hover:animate-glow-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground text-sm font-medium">Active Projects</h3>
              <div className="p-3 rounded-xl bg-blue-500/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110">
                <Briefcase size={20} className="text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">{stats.activeContractsCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Current projects in progress</p>
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
            <p className="text-3xl font-bold text-white tracking-tight">${totalEarnings.toLocaleString('en-US')}</p>
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
            <p className="text-3xl font-bold text-white tracking-tight">${pendingEarnings.toLocaleString('en-US')}</p>
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
        {/* My Projects */}
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

        {/* Profile */}
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

      {/* Combined section for Active Companies and Upcoming Payments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Active Companies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Active Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {businesses && businesses.length > 0 ? (
              <div className="space-y-3">
                {businesses.slice(0, 5).map((business: any) => (
                  <div key={business.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">
                        {business.companyName || 
                         (business.firstName && business.lastName ? 
                           `${business.firstName} ${business.lastName}` : 
                           business.username || "Business")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {business.email}
                      </p>
                    </div>
                    <Badge variant="default" className="bg-green-500">
                      Connected
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No companies connected</p>
                <p className="text-sm">Accept connection requests to see companies here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingPayments.length > 0 ? (
              <div className="space-y-3">
                {upcomingPayments.slice(0, 4).map((payment) => {
                  const contract = contracts.find(c => c.id === payment.contractId);
                  return (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">${parseFloat(payment.amount).toLocaleString('en-US')}</p>
                        <p className="text-sm text-muted-foreground">
                          {contract?.contractName || 'Unknown Project'}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.scheduledDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="mb-2 text-lg font-medium text-white">No Upcoming Payments</h3>
                <p className="text-sm">
                  You don't have any scheduled payments in the next 30 days.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}