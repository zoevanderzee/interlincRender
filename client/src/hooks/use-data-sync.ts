
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

// Hook for synchronizing data across all pages when updates occur
export function useDataSync() {
  const queryClient = useQueryClient();

  // Invalidate all related caches when financial data changes
  const invalidateFinancialData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/budget'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/wallet-balance'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/funding-history'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/user'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] }),
    ]);
    console.log('✅ Financial data cache invalidated across all pages');
  }, [queryClient]);

  // Invalidate all project-related data when contracts/milestones change
  const invalidateProjectData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/budget'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] }),
    ]);
    console.log('✅ Project data cache invalidated across all pages');
  }, [queryClient]);

  // Invalidate user profile and authentication data
  const invalidateUserData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/user'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/wallet-balance'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] }),
    ]);
    console.log('✅ User data cache invalidated across all pages');
  }, [queryClient]);

  // Invalidate all data - use when major changes occur
  const invalidateAllData = useCallback(async () => {
    await queryClient.invalidateQueries();
    console.log('✅ All data cache invalidated across entire application');
  }, [queryClient]);

  // Optimistically update data across multiple components
  const updateOptimistically = useCallback((updates: {
    budgetUsed?: string;
    walletBalance?: number;
    contractCount?: number;
    milestoneCount?: number;
    paymentCount?: number;
    notificationCount?: number;
  }) => {
    // Update budget data
    if (updates.budgetUsed !== undefined) {
      queryClient.setQueryData(['/api/budget'], (oldData: any) => ({
        ...oldData,
        budgetUsed: updates.budgetUsed
      }));
    }

    // Update wallet balance
    if (updates.walletBalance !== undefined) {
      queryClient.setQueryData(['/api/trolley/wallet-balance'], (oldData: any) => ({
        ...oldData,
        balance: updates.walletBalance
      }));
    }

    // Update dashboard stats
    if (updates.contractCount !== undefined || updates.milestoneCount !== undefined || updates.paymentCount !== undefined) {
      queryClient.setQueryData(['/api/dashboard'], (oldData: any) => ({
        ...oldData,
        stats: {
          ...oldData?.stats,
          ...(updates.contractCount !== undefined && { activeContractsCount: updates.contractCount }),
          ...(updates.milestoneCount !== undefined && { pendingApprovalsCount: updates.milestoneCount }),
          ...(updates.paymentCount !== undefined && { paymentsProcessed: updates.paymentCount }),
        }
      }));
    }

    // Update notification count
    if (updates.notificationCount !== undefined) {
      queryClient.setQueryData(['/api/notifications/count'], (oldData: any) => ({
        ...oldData,
        count: updates.notificationCount.toString()
      }));
    }

    console.log('✅ Optimistic updates applied across components', updates);
  }, [queryClient]);

  // Auto-sync when user performs actions
  const syncAfterAction = useCallback(async (actionType: 'payment' | 'contract' | 'budget' | 'user' | 'all') => {
    switch (actionType) {
      case 'payment':
        await invalidateFinancialData();
        break;
      case 'contract':
        await invalidateProjectData();
        break;
      case 'budget':
        await invalidateFinancialData();
        break;
      case 'user':
        await invalidateUserData();
        break;
      case 'all':
        await invalidateAllData();
        break;
    }
  }, [invalidateFinancialData, invalidateProjectData, invalidateUserData, invalidateAllData]);

  return {
    invalidateFinancialData,
    invalidateProjectData,
    invalidateUserData,
    invalidateAllData,
    updateOptimistically,
    syncAfterAction,
  };
}

// Hook for auto-syncing data when the window regains focus
export function useAutoDataSync() {
  const { invalidateAllData } = useDataSync();

  // Auto-refresh data when window regains focus (user switches back to the app)
  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden) {
      // User switched back to the app, refresh all data
      invalidateAllData();
    }
  }, [invalidateAllData]);

  // Set up event listener for visibility changes
  const setupAutoSync = useCallback(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  return { setupAutoSync };
}
