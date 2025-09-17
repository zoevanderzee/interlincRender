import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

// Define comprehensive interfaces for all integrated data
interface IntegratedStats {
  activeContractsCount: number;
  pendingApprovalsCount: number;
  paymentsProcessed: number;
  activeContractorsCount: number;
  totalPendingValue: number;
  pendingInvitesCount: number;
  totalBudgetUsed: string;
  remainingBudget: string | null;
  totalProjectsCount: number;
}

interface IntegratedData {
  stats: IntegratedStats;
  contracts: any[];
  contractors: any[];
  milestones: any[];
  payments: any[];
  invites: any[];
  projects: any[];
  workRequests: any[];
  walletBalance: number;
  budgetData: any;
  hasActiveSubscription: boolean;
  paymentMethodsEnabled: boolean;
  trolleyVerificationStatus: string;
  notificationCount: number;
}

// Master hook for all data integration across the application
export function useIntegratedData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Core dashboard data - contains contracts, contractors, stats, payments, milestones
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['/api/dashboard'],
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds for real-time updates
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });

  // Budget data - financial information
  const { data: budgetData, isLoading: isBudgetLoading } = useQuery({
    queryKey: ['/api/budget'],
    enabled: !!user && user.role === 'business',
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Stripe Connect account status - replaces Trolley wallet balance
  const { data: stripeConnectData, isLoading: isStripeConnectLoading } = useQuery({
    queryKey: ['/api/connect/status'],
    enabled: !!user && user.role === 'business',
    staleTime: 30 * 1000, // Financial data needs frequent updates
    refetchInterval: 60 * 1000,
  });

  // Projects data - separate from contracts
  const { data: projectsData, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    enabled: !!user,
    staleTime: 30 * 1000,
    select: (data) => data || [],
  });

  // Work requests for contractors
  const { data: workRequestsData, isLoading: isWorkRequestsLoading } = useQuery({
    queryKey: ['/api/work-requests'],
    enabled: !!user && user.role === 'contractor',
    staleTime: 30 * 1000,
    select: (data) => {
      if (!user?.id || !Array.isArray(data)) return [];
      return data.filter((request: any) => 
        request.contractorUserId === user.id || request.businessUserId === user.id
      );
    }
  });

  // Notification count
  const { data: notificationData, isLoading: isNotificationLoading } = useQuery({
    queryKey: ['/api/notifications/count'],
    enabled: !!user,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });

  // Function to invalidate all related caches when data changes
  const invalidateAllData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/budget'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/connect/status'] }), // Invalidates Stripe Connect status
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/funding-history'] }), // Trolley related query, kept for potential future use or if other parts of the app still use it
      queryClient.invalidateQueries({ queryKey: ['/api/user'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] }),
    ]);
  };

  // Function to update data optimistically across all components
  const updateDataOptimistically = (updates: any) => {
    // Update dashboard stats
    if (updates.stats) {
      queryClient.setQueryData(['/api/dashboard'], (oldData: any) => ({
        ...oldData,
        stats: { ...oldData?.stats, ...updates.stats }
      }));
    }

    // Update contracts
    if (updates.contracts) {
      queryClient.setQueryData(['/api/dashboard'], (oldData: any) => ({
        ...oldData,
        contracts: updates.contracts
      }));
    }

    // Update Stripe Connect status if relevant updates are provided
    if (updates.stripeConnectStatus) {
      queryClient.setQueryData(['/api/connect/status'], (oldData: any) => ({
        ...oldData,
        ...updates.stripeConnectStatus
      }));
    }

    // Update budget data
    if (updates.budgetData) {
      queryClient.setQueryData(['/api/budget'], (oldData: any) => ({
        ...oldData,
        ...updates.budgetData
      }));
    }

    // Update projects
    if (updates.projects) {
      queryClient.setQueryData(['/api/projects'], updates.projects);
    }

    // Update work requests
    if (updates.workRequests) {
      queryClient.setQueryData(['/api/work-requests'], updates.workRequests);
    }
  };

  // Aggregate all integrated data from all sources
  const integratedData: IntegratedData = {
    stats: {
      activeContractsCount: dashboardData?.stats?.activeContractsCount || 0,
      pendingApprovalsCount: dashboardData?.stats?.pendingApprovalsCount || 0,
      paymentsProcessed: dashboardData?.stats?.paymentsProcessed || 0,
      activeContractorsCount: dashboardData?.stats?.activeContractorsCount || 0,
      totalPendingValue: dashboardData?.stats?.totalPendingValue || 0,
      pendingInvitesCount: dashboardData?.stats?.pendingInvitesCount || 0,
      totalBudgetUsed: budgetData?.budgetUsed || "0.00",
      remainingBudget: budgetData?.remainingBudget || null,
      totalProjectsCount: dashboardData?.stats?.totalProjectsCount || projectsData?.length || 0,
    },
    contracts: dashboardData?.contracts || [],
    contractors: dashboardData?.contractors || [],
    milestones: dashboardData?.milestones || [],
    payments: dashboardData?.payments || [],
    invites: dashboardData?.invites || [],
    projects: projectsData || [], // Use actual projects data, not contracts
    workRequests: workRequestsData || [],
    walletBalance: 0, // Stripe Connect doesn't have a wallet balance concept
    budgetData: budgetData || null,
    hasActiveSubscription: user?.subscriptionStatus === 'active',
    paymentMethodsEnabled: stripeConnectData?.hasAccount && !stripeConnectData?.needsOnboarding,
    trolleyVerificationStatus: user?.trolleySubmerchantStatus || 'pending', // Kept for potential future use or if other parts of the app still use it
    notificationCount: parseInt(notificationData?.count || '0', 10),
  };

  const isLoading = isDashboardLoading || isBudgetLoading || isStripeConnectLoading || 
                   isProjectsLoading || isWorkRequestsLoading || isNotificationLoading;

  return {
    data: integratedData,
    isLoading,
    error: dashboardError,
    invalidateAllData,
    updateDataOptimistically,
    // Individual data sources for specific use cases
    dashboardData,
    budgetData,
    stripeConnectData,
    projectsData,
    workRequestsData,
  };
}

// Hook for financial data that needs frequent updates
export function useFinancialData() {
  const { data } = useIntegratedData();
  return {
    walletBalance: data.walletBalance,
    budgetData: data.budgetData,
    remainingBudget: data.stats.remainingBudget,
    totalBudgetUsed: data.stats.totalBudgetUsed,
    paymentsProcessed: data.stats.paymentsProcessed,
    payments: data.payments,
  };
}

// Hook for project-related data
export function useProjectData() {
  const { data } = useIntegratedData();
  return {
    contracts: data.contracts,
    projects: data.projects,
    milestones: data.milestones,
    contractors: data.contractors,
    activeContractsCount: data.stats.activeContractsCount,
    pendingApprovalsCount: data.stats.pendingApprovalsCount,
  };
}

// Hook for contractor-specific data
export function useContractorData() {
  const { data } = useIntegratedData();
  return {
    workRequests: data.workRequests,
    payments: data.payments,
    contracts: data.contracts,
    milestones: data.milestones,
  };
}