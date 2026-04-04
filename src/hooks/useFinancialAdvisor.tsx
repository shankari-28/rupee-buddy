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

      const foodAmount = stats.byCategory.food || 0;
      const transportAmount = stats.byCategory.transport || 0;
      const othersAmount = stats.totalSpent - foodAmount - transportAmount;

      const financialData: FinancialDataInput = {
        monthlyIncome,
        totalExpense: stats.totalSpent,
        food: foodAmount,
        transport: transportAmount,
        others: othersAmount,
        rawCategories: stats.byCategory as Record<string, number>,
      };

      return generateFinancialAdvice(financialData);
    },
    enabled: !!user && !statsLoading && stats.totalSpent > 0,
  });
}
