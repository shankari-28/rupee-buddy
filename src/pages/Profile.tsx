import { useNavigate } from "react-router-dom";
import { LogOut, Download, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useExpenses, useExpenseStats } from "@/hooks/useExpenses";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: expenses = [] } = useExpenses();
  const { stats } = useExpenseStats();

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    toast.success("Signed out successfully");
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }

    const headers = ["Date", "Merchant", "Category", "Amount", "Description"];
    const rows = expenses.map((e) => [
      e.expense_date,
      e.merchant,
      e.category,
      e.amount,
      e.description || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Expenses exported!");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card/50 px-4 py-4">
        <h1 className="text-lg font-semibold">Profile</h1>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4">
        {/* User Info */}
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground">
              <UserIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium">{user.email}</p>
              <p className="text-sm text-muted-foreground">
                Joined {format(new Date(user.created_at), "MMM yyyy")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Stats</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{stats.count}</p>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
            </div>
            <div>
              <p className="text-2xl font-bold">₹{stats.totalSpent.toLocaleString("en-IN")}</p>
              <p className="text-sm text-muted-foreground">Total Spent</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExportCSV}>
              <Download className="h-4 w-4" /> Export to CSV
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
