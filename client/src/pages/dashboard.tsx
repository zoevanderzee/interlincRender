import { useLocation } from "wouter";
import {
  AlertTriangle,
  FileText,
  DollarSign,
  Users,
  Plus,
  Briefcase,
  Coins,
  Loader2,
  Clock,
  Calendar,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useIntegratedData } from "@/hooks/use-integrated-data";
import { Contract, User, Payment, Milestone } from "@shared/schema";
import { useQuery } from '@tanstack/react-query';


// Define interface for dashboard data (this is now implicitly handled by useIntegratedData)
// Keep for clarity if needed, but the hook should provide typed data.
// interface DashboardData {
//   stats: {
//     activeContractsCount: number;
//     pendingApprovalsCount: number;
//     paymentsProcessed: number;
//     activeContractorsCount: number;
//     totalPendingValue?: number;
//     pendingInvitesCount?: number;
//   };
//   contracts: Contract[];
//   contractors: User[];
//   milestones: Milestone[];
//   payments: Payment[];
// }

// Define interface for budget data (this is now implicitly handled by useIntegratedData)
// Keep for clarity if needed, but the hook should provide typed data.
// interface BudgetData {
//   budgetCap: string | null;
//   budgetUsed: string;
//   budgetPeriod: string;
//   budgetStartDate: string | null;
//   budgetEndDate: string | null;
//   budgetResetEnabled: boolean;
//   remainingBudget: string | null;
// }

const Dashboard = () => {
  const [_, navigate] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  // Use the integrated data hook
  const { data: integratedData, isLoading: isDashboardLoading, error: dashboardError } = useIntegratedData();
  const { toast } = useToast();

  // Fetch connect status using V2 API
  const { data: connectStatus } = useQuery({
    queryKey: ['/api/connect/v2/status'],
    enabled: !!user
  });

  // Format the remaining budget as currency
  const formatCurrency = (value: string | null): string => {
    if (!value) return "$0";
    return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Navigate to create project page
  const handleNewProject = () => {
    navigate('/contracts/new');
  };

  // Navigate to add contractor page
  const handleAddContractor = () => {
    navigate('/contractors?action=new');
  };

  // Show error state
  if (dashboardError) {
    return (
      <div className="text-center py-12">
        <div className="h-24 w-24 mx-auto mb-6 flex items-center justify-center rounded-full bg-zinc-800">
          <AlertTriangle size={40} className="text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Error Loading Dashboard</h2>
        <p className="text-gray-400 mb-6">Could not load dashboard data. Please try again later.</p>
        <Button
          className="bg-accent-500 hover:bg-accent-600 text-white"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>
      </div>
    );
  }

  // Show loading state
  const isLoading = isAuthLoading || isDashboardLoading;
  if (!user || isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-1/4 bg-zinc-800 rounded mb-2"></div>
        <div className="h-4 w-2/3 bg-zinc-800 rounded mb-8"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-zinc-900 h-32 rounded-lg shadow-sm border border-zinc-800"></div>
          ))}
        </div>

        <div className="h-10 w-1/3 bg-zinc-800 rounded mb-6"></div>
      </div>
    );
  }

  // If user is authenticated but no data was returned, show a message
  // Use integratedData and check for stats property which should always exist if data is present
  if (user && !isDashboardLoading && (!integratedData || !integratedData.stats)) {
    return (
      <div className="text-center py-12">
        <div className="h-24 w-24 mx-auto mb-6 flex items-center justify-center rounded-full bg-zinc-800">
          <AlertTriangle size={40} className="text-yellow-500" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">No Dashboard Data</h2>
        <p className="text-gray-400 mb-6">We couldn't find any data for your dashboard.</p>
        {user.role === 'business' ? (
          <Button
            className="bg-accent-500 hover:bg-accent-600 text-white"
            onClick={handleNewProject}
          >
            Create Your First Project
          </Button>
        ) : (
          <Button
            className="bg-accent-500 hover:bg-accent-600 text-white"
            onClick={() => navigate('/settings')}
          >
            Complete Your Profile
          </Button>
        )}
      </div>
    );
  }

  // If user is a contractor, show a specialized contractor interface
  if (user && user.role === 'contractor') {
    return (
      <>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Contractor Dashboard</h1>
          <p className="text-gray-400 mt-1">View your assigned projects and track your payments</p>
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
              <p className="text-3xl font-bold text-white tracking-tight">
                {integratedData.stats.activeContractsCount}
              </p>
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
              <p className="text-3xl font-bold text-white tracking-tight">
                ${integratedData.payments
                  .filter(p => p.status === 'completed')
                  .reduce((sum, payment) => sum + parseFloat(payment.amount), 0)
                  .toLocaleString('en-US')}
              </p>
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
              <p className="text-3xl font-bold text-white tracking-tight">
                ${integratedData.payments
                  .filter(p => p.status !== 'completed')
                  .reduce((sum, payment) => sum + parseFloat(payment.amount), 0)
                  .toLocaleString('en-US')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Upcoming payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions for Contractors */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Button
            variant="ghost"
            className="h-auto py-4 px-6 justify-start animate-slide-in"
            onClick={() => navigate('/projects')}
          >
            <Briefcase className="mr-3" size={18} />
            <div className="text-left">
              <div className="font-medium">My Assignments</div>
              <div className="text-xs text-muted-foreground">View your work assignments</div>
            </div>
          </Button>

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

          {/* Changed route from /payment-setup to /contractor-onboarding */}
          <Button
            variant="ghost"
            className="h-auto py-4 px-6 justify-start animate-slide-in"
            onClick={() => navigate('/contractor-onboarding')}
          >
            <Settings className="mr-3" size={18} />
            <div className="text-left">
              <div className="font-medium">Payment Setup</div>
              <div className="text-xs text-muted-foreground">Configure payout details</div>
            </div>
          </Button>

          <Button
            variant="ghost"
            className="h-auto py-4 px-6 justify-start animate-slide-in"
            onClick={() => navigate('/settings')}
          >
            <FileText className="mr-3" size={18} />
            <div className="text-left">
              <div className="font-medium">Profile</div>
              <div className="text-xs text-muted-foreground">Update your information</div>
            </div>
          </Button>
        </div>
      </>
    );
  }

  // Otherwise, show the business dashboard
  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back. Here's your business overview at a glance.</p>
      </div>

      {/* Primary Metrics: 4 Key Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Payments Processed */}
        <Card className="animate-fade-in hover:animate-glow-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground text-sm font-medium">Payments Processed</h3>
              <div className="p-3 rounded-xl bg-green-500/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110">
                <DollarSign size={20} className="text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">${integratedData.stats.paymentsProcessed?.toLocaleString('en-US') || '0'}</p>
            <p className="text-xs text-muted-foreground mt-1">Total value of processed payments</p>
          </CardContent>
        </Card>

        {/* Card 2: Budget Remaining */}
        <Card className="animate-fade-in hover:animate-glow-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground text-sm font-medium">Budget Remaining</h3>
              <div className="p-3 rounded-xl bg-blue-500/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110">
                <Coins size={20} className="text-blue-400" />
              </div>
            </div>
            {/* Use formatCurrency for remainingBudget from integratedData */}
            <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(integratedData.stats.remainingBudget)}</p>
            <p className="text-xs text-muted-foreground mt-1">Available outsourcing budget</p>
          </CardContent>
        </Card>

        {/* Card 3: Active Projects */}
        <Card className="animate-fade-in hover:animate-glow-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground text-sm font-medium">Active Projects</h3>
              <div className="p-3 rounded-xl bg-purple-500/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110">
                <Briefcase size={20} className="text-purple-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">{integratedData.stats.activeContractsCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Current ongoing contracts</p>
          </CardContent>
        </Card>

        {/* Card 4: Active Contractors */}
        <Card className="animate-fade-in hover:animate-glow-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground text-sm font-medium">Active Contractors</h3>
              <div className="p-3 rounded-xl bg-indigo-500/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110">
                <Users size={20} className="text-indigo-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">{integratedData.stats.activeContractorsCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Working professionals</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons - Simplified */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Button
          size="lg"
          onClick={handleNewProject}
          className="animate-scale-in"
        >
          <Plus className="mr-2" size={16} />
          New Project
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={handleAddContractor}
          className="animate-scale-in"
        >
          <Plus className="mr-2" size={16} />
          Add Contractor
        </Button>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Button
          variant="ghost"
          className="h-auto py-4 px-6 justify-start animate-slide-in"
          onClick={() => navigate('/projects')}
        >
          <FileText className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">Projects</div>
            <div className="text-xs text-muted-foreground">Manage all projects</div>
          </div>
        </Button>

        <Button
          variant="ghost"
          className="h-auto py-4 px-6 justify-start animate-slide-in"
          onClick={() => navigate('/payments')}
        >
          <DollarSign className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">Payments</div>
            <div className="text-xs text-muted-foreground">Process and track payments</div>
          </div>
        </Button>

        <Button
          variant="ghost"
          className="h-auto py-4 px-6 justify-start animate-slide-in"
          onClick={() => navigate('/budget-oversight')}
        >
          <Coins className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">Budget</div>
            <div className="text-xs text-muted-foreground">Manage budget settings</div>
          </div>
        </Button>
      </div>
    </>
  );
};

export default Dashboard;