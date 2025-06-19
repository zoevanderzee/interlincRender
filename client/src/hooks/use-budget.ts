import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type BudgetInfo = {
  budgetCap: string | null;
  budgetUsed: string;
  budgetPeriod: string;
  budgetStartDate: string | null;
  budgetEndDate: string | null;
  budgetResetEnabled: boolean;
  totalProjectAllocations: string;
  remainingBudget: string | null;
};

export type SetBudgetParams = {
  budgetCap: number;
  budgetPeriod?: 'monthly' | 'quarterly' | 'yearly';
  startDate?: string;
  endDate?: string;
  resetEnabled?: boolean;
};

export function useBudget() {
  const { toast } = useToast();
  
  const { data: budgetInfo, isLoading, error } = useQuery<BudgetInfo>({
    queryKey: ["/api/budget"],
    refetchOnWindowFocus: false,
  });
  
  const setBudgetMutation = useMutation({
    mutationFn: async (data: SetBudgetParams) => {
      const res = await apiRequest("POST", "/api/budget", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to set budget");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget"] });
      toast({
        title: "Budget updated",
        description: "Your budget settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update budget settings",
        variant: "destructive",
      });
    },
  });
  
  const resetBudgetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/budget/reset");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reset budget");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget"] });
      toast({
        title: "Budget reset",
        description: "Your budget has been reset successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset budget",
        variant: "destructive",
      });
    },
  });
  
  return {
    budgetInfo,
    isLoading,
    error,
    setBudget: setBudgetMutation.mutate,
    resetBudget: resetBudgetMutation.mutate,
    isSettingBudget: setBudgetMutation.isPending,
    isResettingBudget: resetBudgetMutation.isPending,
  };
}