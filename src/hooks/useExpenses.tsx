import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Database } from "@/integrations/supabase/types";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];
type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

export function useExpenses(dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["expenses", user?.id, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false });

      if (dateRange) {
        query = query
          .gte("expense_date", dateRange.start.toISOString().split("T")[0])
          .lte("expense_date", dateRange.end.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user,
  });
}

export function useExpenseStats(dateRange?: { start: Date; end: Date }) {
  const { data: expenses = [], isLoading } = useExpenses(dateRange);

  const stats = {
    totalSpent: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    byCategory: expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<ExpenseCategory, number>),
    topMerchants: Object.entries(
      expenses.reduce((acc, e) => {
        acc[e.merchant] = (acc[e.merchant] || 0) + Number(e.amount);
        return acc;
      }, {} as Record<string, number>)
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([merchant, amount]) => ({ merchant, amount })),
    count: expenses.length,
  };

  return { stats, isLoading };
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (expense: Omit<ExpenseInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...expense, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
