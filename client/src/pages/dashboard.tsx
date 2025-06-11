import { useQuery } from "@tanstack/react-query";
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
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Contract, User, Payment, Milestone } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ContractorDashboard } from "@/components/dashboard/ContractorDashboard";

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

// Define interface for budget data
interface BudgetData {
  budgetCap: string | null;
  budgetUsed: string;
  budgetPeriod: string;
  budgetStartDate: string | null;
  budgetEndDate: string | null;
  budgetResetEnabled: boolean;
  remainingBudget: string | null;
}

const Dashboard = () => {
  const [_, navigate] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  // Dashboard data query with fallback authentication
  const { 
    data: dashboardData, 
    isLoading: isDashboardLoading, 
    error: dashboardError 
  } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    queryFn: async () => {
      const headers: HeadersInit = {
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      };
      
      // Add user ID from localStorage as fallback
      const storedUser = localStorage.getItem('creativlinc_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id) {
            headers['X-User-ID'] = parsedUser.id.toString();
          }
        } catch (e) {
          console.error("Error parsing stored user:", e);
        }
      }
      
      const res = await fetch("/api/dashboard", {
        method: "GET",
        credentials: "include",
        headers
      });
      
      if (!res.ok) {
        throw new Error("Could not load dashboard data");
      }
      
      return await res.json();
    },
    enabled: !!user,
  });

  // Budget data query with fallback authentication
  const { 
    data: budgetData, 
    isLoading: isBudgetLoading 
  } = useQuery<BudgetData>({
    queryKey: ['/api/budget'],
    queryFn: async () => {
      const headers: HeadersInit = {
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      };
      
      // Add user ID from localStorage as fallback
      const storedUser = localStorage.getItem('creativlinc_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id) {
            headers['X-User-ID'] = parsedUser.id.toString();
          }
        } catch (e) {
          console.error("Error parsing stored user:", e);
        }
      }
      
      const res = await fetch("/api/budget", {
        method: "GET",
        credentials: "include",
        headers
      });
      
      if (!res.ok) {
        throw new Error("Could not load budget data");
      }
      
      return await res.json();
    },
    enabled: !!user,
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

  // Show contractor or business dashboard based on role

  // Show loading state
  const isLoading = isAuthLoading || isDashboardLoading || isBudgetLoading;
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
  if (user && !isDashboardLoading && !dashboardData) {
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
  if (user && user.role === 'contractor' && dashboardData) {
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
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm font-medium">Active Projects</h3>
              <div className="p-2 rounded-full bg-accent-500/10">
                <Briefcase size={20} className="text-accent-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {dashboardData.contracts.filter(c => c.status === 'active').length}
            </p>
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
            <p className="text-3xl font-bold text-white">
              ${dashboardData.payments
                .filter(p => p.status === 'completed')
                .reduce((sum, payment) => sum + parseFloat(payment.amount), 0)
                .toLocaleString('en-US')}
            </p>
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
            <p className="text-3xl font-bold text-white">
              ${dashboardData.payments
                .filter(p => p.status !== 'completed')
                .reduce((sum, payment) => sum + parseFloat(payment.amount), 0)
                .toLocaleString('en-US')}
            </p>
            <p className="text-xs text-gray-500 mt-1">Upcoming payments</p>
          </div>
        </div>
        
        {/* Quick Actions for Contractors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Assignments */}
          <Button 
            variant="outline"
            className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white h-auto py-3 justify-start"
            onClick={() => navigate('/projects')}
          >
            <Briefcase className="mr-3" size={18} />
            <div className="text-left">
              <div className="font-medium">My Assignments</div>
              <div className="text-xs text-gray-400">View your work assignments</div>
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
            <FileText className="mr-3" size={18} />
            <div className="text-left">
              <div className="font-medium">Profile</div>
              <div className="text-xs text-gray-400">Update your information</div>
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
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Payments Processed</h3>
            <div className="p-2 rounded-full bg-green-500/10">
              <DollarSign size={20} className="text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">${dashboardData?.stats.paymentsProcessed?.toLocaleString('en-US') || '0'}</p>
          <p className="text-xs text-gray-500 mt-1">Total value of processed payments</p>
        </div>
        
        {/* Card 2: Budget Remaining */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Budget Remaining</h3>
            <div className="p-2 rounded-full bg-blue-500/10">
              <Coins size={20} className="text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(budgetData?.remainingBudget || "0")}</p>
          <p className="text-xs text-gray-500 mt-1">Available outsourcing budget</p>
        </div>
        
        {/* Card 3: Active Projects */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Active Projects</h3>
            <div className="p-2 rounded-full bg-accent-500/10">
              <Briefcase size={20} className="text-accent-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{dashboardData?.stats.activeContractsCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Current ongoing contracts</p>
        </div>
        
        {/* Card 4: Active Contractors */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Active Contractors</h3>
            <div className="p-2 rounded-full bg-purple-500/10">
              <Users size={20} className="text-purple-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{dashboardData?.stats.activeContractorsCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Working professionals</p>
        </div>
      </div>
      
      {/* Action Buttons - Simplified */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button 
          className="bg-accent-500 hover:bg-accent-600 text-white"
          onClick={handleNewProject}
        >
          <Plus className="mr-2" size={16} />
          New Project
        </Button>
        
        <Button 
          variant="outline"
          className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
          onClick={handleAddContractor}
        >
          <Plus className="mr-2" size={16} />
          Add Contractor
        </Button>
      </div>
      
      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Contract Management */}
        <Button 
          variant="outline"
          className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white h-auto py-3 justify-start"
          onClick={() => navigate('/projects')}
        >
          <FileText className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">Projects</div>
            <div className="text-xs text-gray-400">Manage all projects</div>
          </div>
        </Button>
        
        {/* Payments Management */}
        <Button 
          variant="outline"
          className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white h-auto py-3 justify-start"
          onClick={() => navigate('/payments')}
        >
          <DollarSign className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">Payments</div>
            <div className="text-xs text-gray-400">Process and track payments</div>
          </div>
        </Button>
        
        {/* Budget Configuration */}
        <Button 
          variant="outline"
          className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white h-auto py-3 justify-start"
          onClick={() => navigate('/settings')}
        >
          <Coins className="mr-3" size={18} />
          <div className="text-left">
            <div className="font-medium">Budget</div>
            <div className="text-xs text-gray-400">Manage budget settings</div>
          </div>
        </Button>
      </div>
    </>
  );
};

export default Dashboard;
