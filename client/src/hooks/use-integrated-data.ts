import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { apiRequest } from "@/lib/queryClient";

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
  businesses: any[];
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

  // Extracting userId and firebaseUid from the user object for cleaner access
  const userId = user?.id;
  const firebaseUid = user?.firebaseUid;

  // Core dashboard data - contains contracts, contractors, stats, payments, milestones
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['/api/dashboard'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard');
      return response.json();
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data to show real payment calculations
    refetchInterval: 10000, // 10 seconds for faster updates
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnReconnect: true, // Refresh on reconnect
  });

  // Budget data - financial information
  const { data: budgetData, isLoading: isBudgetLoading } = useQuery({
    queryKey: ['/api/budget'],
    enabled: !!user && user.role === 'business',
    staleTime: 0, // Always fetch fresh budget data to show real payment calculations  
    refetchInterval: 10 * 1000,
  });

  // Connect status query - V2 only
  const connectStatusQuery = useQuery({
    queryKey: ['/api/connect/v2/status'],
    queryFn: async () => {
      const response = await fetch('/api/connect/v2/status', {
        credentials: 'include',
        headers: {
          'X-User-ID': userId?.toString() || '',
          'X-Firebase-UID': firebaseUid || ''
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!userId && !!firebaseUid,
    retry: 1,
    staleTime: 60000,
    refetchInterval: false,
    refetchOnWindowFocus: false
  });

  // Projects data - separate from contracts
  const { data: projectsData, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    enabled: !!user,
    staleTime: 30 * 1000,
    select: (data) => data || [],
  });

  // Work requests for contractors and businesses
  const { data: workRequestsData, isLoading: isWorkRequestsLoading } = useQuery({
    queryKey: ['/api/work-requests'],
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchInterval: 30000, // Refresh every 30 seconds to catch updates
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnReconnect: true, // Refresh on reconnect
    select: (data) => {
      if (!user?.id || !Array.isArray(data)) return [];
      return data.filter((request: any) =>
        request.contractorUserId === user.id || request.businessId === user.id
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
      queryClient.invalidateQueries({ queryKey: ['/api/connect/v2/status'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/user'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] }),
    ]);

    // Permanently remove ALL V1 Connect queries
    queryClient.removeQueries({ queryKey: ['/api/connect/status'], exact: false });
    queryClient.removeQueries({ queryKey: ['connect-status'], exact: false });
    queryClient.removeQueries({ queryKey: ['connect'], exact: false });
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
      queryClient.setQueryData(['connect-status-v2'], (oldData: any) => ({
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
    businesses: dashboardData?.businesses || [], // Add businesses array for contractor dashboard
    walletBalance: 0, // Stripe Connect doesn't have a wallet balance concept
    budgetData: budgetData || null,
    hasActiveSubscription: user?.subscriptionStatus === 'active',
    paymentMethodsEnabled: connectStatusQuery?.data?.hasAccount && !connectStatusQuery?.data?.needsOnboarding,
    trolleyVerificationStatus: 'active', // V1 Trolley system removed - using V2 Stripe Connect only
    notificationCount: parseInt(notificationData?.count || '0', 10),
  };

  const isLoading = isDashboardLoading || isBudgetLoading || connectStatusQuery.isLoading ||
                   isProjectsLoading || isWorkRequestsLoading || isNotificationLoading;

  return {
    data: {
      ...integratedData,
      stripeConnectData: connectStatusQuery.data
    },
    isLoading,
    error: dashboardError,
    invalidateAllData,
    updateDataOptimistically,
    // Individual data sources for specific use cases
    dashboardData,
    budgetData,
    stripeConnectData: connectStatusQuery.data,
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