import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNav } from "@/components/BottomNav";
import { ExpenseCard } from "@/components/ExpenseCard";
import { useExpenses, useDeleteExpense } from "@/hooks/useExpenses";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Constants } from "@/integrations/supabase/types";
import { CATEGORY_ICONS } from "@/lib/merchant-rules";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const categories = Constants.public.Enums.expense_category;

export default function History() {
  const { user, loading: authLoading } = useAuth();
  const { data: expenses = [], isLoading } = useExpenses();
  const deleteExpense = useDeleteExpense();
  
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.merchant.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteExpense.mutateAsync(deleteId);
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete expense");
    }
    setDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card/50 px-4 py-4">
        <h1 className="text-lg font-semibold">Expense History</h1>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search merchants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expense List */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          ) : filteredExpenses.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {search || categoryFilter !== "all" ? "No matching expenses" : "No expenses yet"}
            </p>
          ) : (
            filteredExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onDelete={(id) => setDeleteId(id)}
              />
            ))
          )}
        </div>
      </main>

      <BottomNav />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
