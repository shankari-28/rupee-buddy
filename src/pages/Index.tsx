import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, TrendingUp, ArrowRight } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { SpendingChart } from "@/components/SpendingChart";
import { ExpenseCard } from "@/components/ExpenseCard";
import { useExpenses, useExpenseStats } from "@/hooks/useExpenses";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

export default function Index() {
  const { user } = useAuth();
  const [currentMonth] = useState(() => ({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  }));

  const { data: expenses = [], isLoading } = useExpenses(currentMonth);
  const { stats } = useExpenseStats(currentMonth);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">TrackSpend</h1>
          <p className="mt-2 text-muted-foreground">Simple expense tracking for India</p>
        </div>
        <div className="flex gap-4">
          <Button asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </div>
    );
  }

  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b bg-card/50 px-4 py-4">
        <div className="mx-auto max-w-md">
          <p className="text-sm text-muted-foreground">{format(new Date(), "MMMM yyyy")}</p>
          <h1 className="text-2xl font-bold">
            ₹{stats.totalSpent.toLocaleString("en-IN")}
          </h1>
          <p className="text-xs text-muted-foreground">Total spent this month</p>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4">
        {/* Quick Add */}
        <Button asChild className="w-full gap-2" size="lg">
          <Link to="/add">
            <Plus className="h-5 w-5" /> Add Expense
          </Link>
        </Button>

        {/* Spending Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <SpendingChart data={stats.byCategory} />
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/history" className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : recentExpenses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No expenses yet. Add your first expense!
              </p>
            ) : (
              recentExpenses.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Top Merchants */}
        {stats.topMerchants.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topMerchants.map(({ merchant, amount }, i) => (
                  <div key={merchant} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">{i + 1}.</span>
                      <span className="text-sm">{merchant}</span>
                    </span>
                    <span className="text-sm font-medium">₹{amount.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
