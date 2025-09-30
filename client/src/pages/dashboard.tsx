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
  CheckCircle
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

  // Use V2 connect data from integrated hook
  const connectStatus = integratedData ? integratedData.stripeConnectData : null;

  // Format the remaining budget as currency - now uses proper GBP formatting
  const formatBudgetCurrency = (value: string | null): string => {
    if (!value) return "£0.00";
    return formatCurrency(value); // Use proper GBP formatting from utils
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
    // Mock data for demonstration, replace with actual data fetching
    const mockWorkRequests = [
      { id: 'wr1', contractorId: user.id, contractId: 'c1', amount: '500', status: 'pending' },
      { id: 'wr2', contractorId: user.id, contractId: 'c1', amount: '700', status: 'paid' },
      { id: 'wr3', contractorId: user.id, contractId: 'c2', amount: '600', status: 'scheduled' },
    ];

    const mockContracts = [
      { id: 'c1', contractorId: user.id, businessId: 'b1', status: 'active' },
      { id: 'c2', contractorId: user.id, businessId: 'b2', status: 'active' },
    ];

    const mockPayments = [
      { id: 'p1', contractId: 'c1', amount: '700', status: 'completed' },
      { id: 'p2', contractId: 'c2', amount: '600', status: 'scheduled' },
    ];

    const mockMilestones = [
      { id: 'm1', contractId: 'c1', status: 'submitted' },
      { id: 'm2', contractId: 'c2', status: 'approved' },
    ];

    const mockBusinessAccounts = [
      { id: 'b1', name: 'Tech Solutions Inc.' },
      { id: 'b2', name: 'Global Enterprises' },
    ];

    // Placeholder functions - replace with actual implementations
    const handleContractClick = (contractId: string) => { console.log(`Viewing contract: ${contractId}`); navigate(`/contracts/${contractId}`); };
    const handleSubmitWork = (workRequestId: string) => { console.log(`Submitting work for: ${workRequestId}`); toast({ title: "Work Submitted", description: "Your work has been submitted for approval." }); };
    const handleApproveWork = (milestoneId: string) => { console.log(`Approving work for: ${milestoneId}`); toast({ title: "Work Approved", description: "Milestone has been approved." }); };
    const handleAcceptWorkRequest = (workRequestId: string) => { console.log(`Accepting work request: ${workRequestId}`); toast({ title: "Work Request Accepted", description: "You have accepted this work request." }); };

    // Mock data for ContractorDashboard
    const integratedData = {
      stats: {
        activeContractsCount: mockContracts.length,
        paymentsProcessed: mockPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseFloat(p.amount), 0),
        activeContractorsCount: 0, // Not directly applicable for contractor view
        pendingApprovalsCount: mockMilestones.filter(m => m.status === 'submitted').length,
        totalPendingValue: mockPayments.filter(p => p.status === 'scheduled' || p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount), 0),
        pendingInvitesCount: 0, // Not directly applicable
        remainingBudget: "1500.00" // Example remaining budget
      },
      contracts: mockContracts,
      contractors: [], // Contractors are not typically listed here for a contractor
      milestones: mockMilestones,
      payments: mockPayments,
      businesses: mockBusinessAccounts, // Businesses the contractor is working with
      workRequests: mockWorkRequests,
      stripeConnectData: { hasAccount: true, verification_status: { verification_complete: true } } // Mock stripe data
    };

    const userContracts = integratedData.contracts.filter(contract => contract.contractorId === user?.id);
    const allMilestones = integratedData.milestones;
    const payments = integratedData.payments;
    const businessAccounts = integratedData.businesses;
    const workRequests = integratedData.workRequests.filter(wr => wr.contractorId === user?.id);
    const userRole = user?.role; // Use the actual user role

    // Calculate earnings for contractor
    const contractorPayments = payments.filter((payment: Payment) => 
      contracts.some((contract: Contract) => 
        contract.id === payment.contractId && contract.contractorId === user?.id
      )
    );

    const completedPayments = contractorPayments.filter((p: Payment) => p.status === 'completed');
    const pendingPayments = contractorPayments.filter((p: Payment) => 
      p.status === 'scheduled' || p.status === 'pending'
    );

    const totalEarnings = completedPayments.reduce((sum: number, p: Payment) => 
      sum + parseFloat(p.amount), 0
    );
    const totalPendingEarnings = pendingPayments.reduce((sum: number, p: Payment) => 
      sum + parseFloat(p.amount), 0
    );

    console.log(`CONTRACTOR ${user?.id} EARNINGS CALCULATION:`, {
      totalPayments: contractorPayments.length,
      completedPayments: completedPayments.length,
      totalEarnings,
      totalPendingEarnings
    });

    const displayStats = {
      activeContractsCount: userContracts.length,
      pendingApprovalCount: allMilestones.filter((m: Milestone) => m.status === 'submitted').length,
      totalEarnings: totalEarnings,
      pendingEarnings: totalPendingEarnings
    };

    return (
      <ContractorDashboard 
        user={user}
        userRole={user?.role || 'contractor'}
        stats={displayStats}
        contracts={userContracts}
        milestones={allMilestones}
        payments={contractorPayments}
        businessAccounts={businessAccounts}
        workRequests={workRequests}
        onViewContract={handleContractClick}
        onSubmitWork={handleSubmitWork}
        onApproveWork={handleApproveWork}
        onAcceptWorkRequest={handleAcceptWorkRequest}
      />
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

      {/* Connect Status Bar */}
      <div className="mb-8">
        {!connectStatus?.hasAccount && (
          <Card className="border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-medium text-white">Payment Processing Setup Required</h3>
                    <p className="text-sm text-gray-400">Complete your Stripe Connect setup to receive payments</p>
                  </div>
                </div>
                <Button onClick={() => navigate('/interlinc-connect-v2')} className="ml-4">
                  Complete Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {connectStatus?.hasAccount && !connectStatus?.verification_status?.verification_complete && (
          <Card className="border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-medium text-white">Payment Processing Pending</h3>
                    <p className="text-sm text-gray-400">Your account is under review</p>
                  </div>
                </div>
                <Button onClick={() => navigate('/interlinc-connect-v2')} variant="outline" className="ml-4">
                  Check Status
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {connectStatus?.hasAccount && connectStatus?.verification_status?.verification_complete && (
          <Card className="border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <h3 className="font-medium text-white">Payment Processing Active</h3>
                    <p className="text-sm text-gray-400">Ready to process contractor payments</p>
                  </div>
                </div>
                <Button onClick={() => navigate('/interlinc-connect-v2')} variant="outline" className="ml-4">
                  Manage Account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
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
            <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(integratedData.stats.paymentsProcessed || 0)}</p>
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
            {/* Use proper GBP formatting for remainingBudget from integratedData */}
            <p className="text-3xl font-bold text-white tracking-tight">{formatBudgetCurrency(integratedData.stats.remainingBudget)}</p>
            <p className="text-xs text-muted-foreground mt-1">Available outsourcing budget</p>
          </CardContent>
        </Card>

        {/* Card 3: Active Projects */}
        <Card className="animate-fade-in hover:animate-glow-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground text-sm font-medium">Active Projects/Tasks</h3>
              <div className="p-3 rounded-xl bg-purple-500/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110">
                <Briefcase size={20} className="text-purple-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">{integratedData.stats.activeContractsCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Current ongoing contracts</p>
          </CardContent>
        </Card>

        {/* Card 4: Connected Companies (for contractors) or Active Contractors (for business) */}
        <Card className="animate-fade-in hover:animate-glow-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground text-sm font-medium">
                {user?.role === 'contractor' ? 'Connected Companies' : 'Active Contractors'}
              </h3>
              <div className="p-3 rounded-xl bg-indigo-500/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110">
                <Users size={20} className="text-indigo-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">
              {user?.role === 'contractor' 
                ? (integratedData.businesses?.length || 0)
                : integratedData.stats.activeContractorsCount
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {user?.role === 'contractor' ? 'Connected businesses' : 'Working professionals'}
            </p>
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