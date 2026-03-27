import { useQuery } from "@tanstack/react-query";
import { useExpenseStats } from "./useExpenses";
import { useAuth } from "./useAuth";
import { generateFinancialAdvice, FinancialAdvice, FinancialDataInput } from "@/lib/huggingface-advisor";

interface UseFinancialAdvisorOptions {
  monthlyIncome?: number;
  dateRange?: { start: Date; end: Date };
}

export function useFinancialAdvisor(options?: UseFinancialAdvisorOptions) {
  const { user } = useAuth();
  const { stats, isLoading: statsLoading } = useExpenseStats(options?.dateRange);

  return useQuery({
    queryKey: ["financial-advice", user?.id, options?.dateRange?.start, options?.dateRange?.end, options?.monthlyIncome],
    queryFn: async (): Promise<FinancialAdvice> => {
      // Use provided income or default
      const monthlyIncome = options?.monthlyIncome || 50000;

      const financialData: FinancialDataInput = {
        monthlyIncome,
        totalExpense: stats.totalSpent,
        food: stats.byCategory.Food || 0,
        transport: stats.byCategory.Transport || 0,
        others: stats.byCategory.Others || 0,
      };

      return generateFinancialAdvice(financialData);
    },
    enabled: !!user && !statsLoading && stats.totalSpent > 0,
  });
}
