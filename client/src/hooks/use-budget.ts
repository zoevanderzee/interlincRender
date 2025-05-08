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

  const { 
    data: budget,
    isLoading,
    error,
    isError,
  } = useQuery<BudgetInfo, Error>({
    queryKey: ["/api/budget"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/budget");
      if (!res.ok) {
        throw new Error("Failed to fetch budget information");
      }
      return res.json();
    },
  });

  const setBudgetMutation = useMutation({
    mutationFn: async (data: SetBudgetParams) => {
      const res = await apiRequest("POST", "/api/budget", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to set budget");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Budget updated",
        description: "Your budget settings have been updated successfully.",
      });
      queryClient.setQueryData(["/api/budget"], data);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetBudgetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/budget/reset");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to reset budget");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Budget reset",
        description: "Your budget usage has been reset to zero.",
      });
      queryClient.setQueryData(["/api/budget"], data);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    budget,
    isLoading,
    error,
    isError,
    setBudget: setBudgetMutation.mutate,
    resetBudget: resetBudgetMutation.mutate,
    isBudgetUpdating: setBudgetMutation.isPending,
    isBudgetResetting: resetBudgetMutation.isPending,
  };
}