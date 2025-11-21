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
  Settings,
  AlertCircle,
  CheckCircle,
  TrendingUp // Added for new StatsCard usage
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useIntegratedData } from "@/hooks/use-integrated-data";
import { Contract, User, Payment, Milestone } from "@shared/schema";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { ContractorDashboard } from "@/components/dashboard/ContractorDashboard";

// Placeholder for StatsCard component as it's not provided in the original code.
// Assuming it accepts title, value, description, icon, currency, and isCurrency props.
const StatsCard = ({ title, value, description, icon: Icon, currency, isCurrency }: any) => {
  const formattedValue = isCurrency ? formatCurrency(value, currency) : value;
  return (
    <Card className="animate-fade-in hover:animate-glow-pulse">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
          <div className="p-3 rounded-xl bg-accent-500/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110">
            <Icon size={20} className="text-accent-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-white tracking-tight">
          {formattedValue}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
};


const Dashboard = () => {
  const [_, navigate] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: integratedData, isLoading: isDashboardLoading, error: dashboardError } = useIntegratedData();
  const { toast } = useToast();

  const dashboardStats = integratedData?.stats; // Using stats from integratedData
  const budgetInfo = integratedData?.budgetData;

  const connectStatus = integratedData?.stripeConnectData;

  // Fetch dedicated dashboard stats for accurate metrics
  // Note: This query might be redundant if integratedData.stats is sufficient.
  // Keeping it as per original code, but consider consolidating.
  const { data: dedicatedDashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user && user.role === 'business'
  });

  // Extracting stats for business and contractor roles
  // Assuming `integratedData` and `dedicatedDashboardStats` have similar structures for stats
  const businessStats = dashboardStats || dedicatedDashboardStats || {
    paymentsProcessed: 0,
    activeContractsCount: 0,
    activeContractors: 0,
    totalPendingValue: 0,
    processingValue: 0,
    pendingInvitesCount: 0,
    assignedProjects: 0, // Added for the new StatsCard
    totalPaymentValue: 0, // Added for the new StatsCard
    currentMonthValue: 0, // Added for the new StatsCard
    totalSuccessfulPayments: 0, // Added for the new StatsCard
    remainingBudget: 0
  };

  const contractorStats = {
    totalEarnings: parseFloat(integratedData?.totalEarnings || '0'),
    pendingEarnings: parseFloat(integratedData?.pendingEarnings || '0'),
    currentMonthEarnings: parseFloat(integratedData?.currentMonthEarnings || '0'),
    completedPaymentsCount: integratedData?.completedPaymentsCount || 0,
  };

  // Format the remaining budget as currency - now uses proper GBP formatting
  const formatBudgetCurrency = (value: string | null): string => {
    if (!value) return formatCurrency(0, user?.currency || 'GBP');
    return formatCurrency(value, user?.currency || 'GBP');
  };

  const handleNewProject = () => {
    navigate('/projects/new');
  };

  const handleAddContractor = () => {
    navigate('/contractors?action=new');
  };

  const getMappedStatus = (payment: Payment) => payment.mappedStatus || payment.status;

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

  if (user && user.role === 'contractor') {
    const realWorkRequests = integratedData?.workRequests || [];
    const realContracts = integratedData?.contracts || [];
    const realPayments = integratedData?.payments || [];
    const realMilestones = integratedData?.milestones || [];
    const realBusinessAccounts = integratedData?.businesses || [];

    const handleContractClick = (contractId: string) => { console.log(`Viewing contract: ${contractId}`); navigate(`/contracts/${contractId}`); };
    const handleSubmitWork = (workRequestId: string) => { console.log(`Submitting work for: ${workRequestId}`); toast({ title: "Work Submitted", description: "Your work has been submitted for approval." }); };
    const handleApproveWork = (milestoneId: string) => { console.log(`Approving work for: ${milestoneId}`); toast({ title: "Work Approved", description: "Milestone has been approved." }); };
    const handleAcceptWorkRequest = (workRequestId: string) => { console.log(`Accepting work request: ${workRequestId}`); toast({ title: "Work Request Accepted", description: "You have accepted this work request." }); };

    const userContracts = realContracts.filter((contract: any) => contract.contractorId === user?.id);
    const allMilestones = realMilestones;
    const payments = realPayments;
    const businessAccounts = realBusinessAccounts;
    const workRequests = realWorkRequests.filter((wr: any) => wr.contractorUserId === user?.id);
    const userRole = user?.role;

    const contractorPayments = payments.filter((payment: any) =>
      userContracts.some((contract: any) =>
        contract.id === payment.contractId && contract.contractorId === user?.id
      )
    );

    const completedPayments = contractorPayments.filter((p: any) => getMappedStatus(p) === 'paid');
    const pendingPayments = contractorPayments.filter((p: any) => {
      const mapped = getMappedStatus(p);
      return mapped === 'scheduled' || mapped === 'pending' || mapped === 'allocated';
    });

    const totalEarnings = completedPayments.reduce((sum: number, p: any) =>
      sum + parseFloat(p.amount || '0'), 0
    );
    const totalPendingEarnings = pendingPayments.reduce((sum: number, p: any) =>
      sum + parseFloat(p.amount || '0'), 0
    );

    const activeWorkRequests = workRequests.filter((wr: any) => wr.status === 'accepted');

    const displayStats = {
      activeContractsCount: activeWorkRequests.length,
      pendingApprovalCount: allMilestones.filter((m: any) => m.status === 'submitted').length,
      totalEarnings: totalEarnings,
      pendingEarnings: totalPendingEarnings
    };

    // Contractor-specific stats for the StatsCard component
    const contractorStatsForCards = {
      totalEarnings: totalEarnings,
      pendingEarnings: totalPendingEarnings,
      currentMonthEarnings: 0, // Assuming this is available or needs to be calculated
      completedPaymentsCount: completedPayments.length,
    };

    return (
      <ContractorDashboard
        dashboardData={{
          stats: displayStats,
          contracts: userContracts,
          milestones: allMilestones,
          payments: contractorPayments,
          workRequests: workRequests
        }}
      />
    );
  }

  // Business Dashboard
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back. Here's your business overview at a glance.</p>
      </div>

      {/* Business Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Spend"
          value={businessStats.paymentsProcessed}
          description="Paid to contractors"
          icon={DollarSign}
          currency={user?.currency || 'GBP'}
          isCurrency={true}
        />
        <StatsCard
          title="Pending Work"
          value={businessStats.totalPendingValue}
          description="Allocated commitments"
          icon={FileText}
          currency={user?.currency || 'GBP'}
          isCurrency={true}
        />
        <StatsCard
          title="Processing"
          value={businessStats.processingValue}
          description="Collecting, awaiting payout"
          icon={TrendingUp}
          currency={user?.currency || 'GBP'}
          isCurrency={true}
        />
        <StatsCard
          title="Remaining Budget"
          value={businessStats.remainingBudget}
          description="Budget left"
          icon={Coins}
          currency={user?.currency || 'GBP'}
          isCurrency={true}
        />
      </div>

      <div className="flex flex-wrap gap-4 mb-8 mt-8">
        <Button
          size="lg"
          onClick={handleNewProject}
          className="bg-blue-600 hover:bg-blue-700 animate-scale-in"
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