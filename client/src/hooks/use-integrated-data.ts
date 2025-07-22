import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

// Define interfaces for integrated data across the app
interface IntegratedStats {
  activeContractsCount: number;
  pendingApprovalsCount: number;
  paymentsProcessed: number;
  activeContractorsCount: number;
  totalPendingValue: number;
  pendingInvitesCount: number;
  totalBudgetUsed: string;
  remainingBudget: string | null;
}

interface IntegratedData {
  stats: IntegratedStats;
  walletBalance: number;
  hasActiveSubscription: boolean;
  paymentMethodsEnabled: boolean;
  trolleyVerificationStatus: string;
}

// Custom hook for integrated data management across all pages
export function useIntegratedData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Dashboard data query
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/dashboard'],
    enabled: !!user && user.role === 'business',
    staleTime: 1 * 60 * 1000, // 1 minute - more frequent updates for critical business data
  });

  // Budget data query
  const { data: budgetData, isLoading: isBudgetLoading } = useQuery({
    queryKey: ['/api/budget'],
    enabled: !!user && user.role === 'business',
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Wallet balance query
  const { data: walletData, isLoading: isWalletLoading } = useQuery({
    queryKey: ['/api/trolley/wallet-balance'],
    enabled: !!user && user.role === 'business',
    staleTime: 30 * 1000, // 30 seconds - financial data needs frequent updates
  });

  // Function to invalidate all related caches when data changes
  const invalidateAllData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/budget'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/wallet-balance'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/funding-history'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/user'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] }),
    ]);
  };

  // Function to update data optimistically across all components
  const updateDataOptimistically = (updates: Partial<IntegratedData>) => {
    // Update dashboard stats
    if (updates.stats) {
      queryClient.setQueryData(['/api/dashboard'], (oldData: any) => ({
        ...oldData,
        stats: { ...oldData?.stats, ...updates.stats }
      }));
    }

    // Update wallet balance
    if (updates.walletBalance !== undefined) {
      queryClient.setQueryData(['/api/trolley/wallet-balance'], (oldData: any) => ({
        ...oldData,
        balance: updates.walletBalance
      }));
    }

    // Update budget data
    if (updates.stats?.totalBudgetUsed) {
      queryClient.setQueryData(['/api/budget'], (oldData: any) => ({
        ...oldData,
        budgetUsed: updates.stats.totalBudgetUsed
      }));
    }
  };

  // Aggregate integrated data from all sources
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
    },
    walletBalance: walletData?.balance || 0,
    hasActiveSubscription: user?.subscriptionStatus === 'active',
    paymentMethodsEnabled: user?.trolleyBankAccountStatus === 'verified',
    trolleyVerificationStatus: user?.trolleySubmerchantStatus || 'pending',
  };

  return {
    data: integratedData,
    isLoading: isDashboardLoading || isBudgetLoading || isWalletLoading,
    invalidateAllData,
    updateDataOptimistically,
    // Individual data sources for specific use cases
    dashboardData,
    budgetData,
    walletData,
  };
}

// Hook specifically for financial data that needs frequent updates
export function useFinancialData() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['/api/financial-summary'],
    enabled: !!user && user.role === 'business',
    staleTime: 10 * 1000, // 10 seconds - very fresh financial data
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

// Hook for real-time project updates
export function useProjectUpdates() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['/api/project-updates'],
    enabled: !!user,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}