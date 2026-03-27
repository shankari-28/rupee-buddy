import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { FinancialAdvisor } from "@/components/FinancialAdvisor";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Advisor() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Load saved income from localStorage or use default
  const [monthlyIncome, setMonthlyIncome] = useState(() => {
    const saved = localStorage.getItem(`monthlyIncome_${user?.id}`);
    return saved ? parseInt(saved, 10) : 50000;
  });
  
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [tempIncome, setTempIncome] = useState(monthlyIncome);
  
  // Check if income has been configured (saved to localStorage)
  const [incomeConfigured, setIncomeConfigured] = useState(() => {
    return localStorage.getItem(`monthlyIncome_${user?.id}`) !== null;
  });

  const currentMonth = {
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  };
  const isCurrentMonth = isSameMonth(currentDate, new Date());

  const goToPrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const goToNextMonth = () => {
    if (!isCurrentMonth) setCurrentDate((prev) => addMonths(prev, 1));
  };

  const handleSaveIncome = () => {
    if (tempIncome > 0 && user) {
      setMonthlyIncome(tempIncome);
      setIncomeConfigured(true);
      setShowIncomeDialog(false);
      
      // Save to localStorage with user ID
      localStorage.setItem(`monthlyIncome_${user.id}`, tempIncome.toString());
    }
  };

  const handleOpenIncomeDialog = () => {
    setTempIncome(monthlyIncome);
    setShowIncomeDialog(true);
  };

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b bg-card/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Financial Advisor</h1>
            <p className="text-sm text-muted-foreground">AI-powered insights & personalized advice</p>
          </div>
          <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleOpenIncomeDialog}>
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Monthly Income</DialogTitle>
                <DialogDescription>Set your estimated monthly income for accurate financial advice</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="income">Monthly Income (₹)</Label>
                  <Input
                    id="income"
                    type="number"
                    value={tempIncome}
                    onChange={(e) => setTempIncome(Number(e.target.value))}
                    placeholder="e.g., 50000"
                    className="mt-2"
                  />
                </div>
                <Button onClick={handleSaveIncome} className="w-full">
                  Save Income
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {/* Month Navigation */}
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <Button variant="outline" size="sm" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold">{format(currentDate, "MMMM yyyy")}</p>
              <p className="text-xs text-muted-foreground">
                Income: ₹{monthlyIncome.toLocaleString("en-IN")}
                {!incomeConfigured && <span className="text-orange-600 ml-1">(default)</span>}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Income Setup Card - Show when income not configured */}
        {!incomeConfigured && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold text-orange-900">Set Your Monthly Income</h3>
                  <p className="text-sm text-orange-700">
                    To get personalized financial advice, please set your monthly income first.
                  </p>
                  <p className="text-xs text-orange-600">
                    Current: ₹{monthlyIncome.toLocaleString("en-IN")} (default)
                  </p>
                </div>
                <Button onClick={handleOpenIncomeDialog} className="bg-orange-600 hover:bg-orange-700">
                  Set Income
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Advisor Component */}
        <FinancialAdvisor dateRange={currentMonth} monthlyIncome={monthlyIncome} />

        {/* Information Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">💡 How This Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-900">
            <p>
              • <strong>First:</strong> Set your monthly income using the settings button (⚙️) for accurate advice
            </p>
            <p>
              • This advisor analyzes your spending patterns against standard budgeting principles
            </p>
            <p>
              • It classifies you as a Smart Saver, Moderate Spender, or High Spender based on
              your savings ratio
            </p>
            <p>
              • Risk assessment is based on your emergency fund capacity and spending habits
            </p>
            <p>
              • All advice is data-driven and specific to your expenses—no generic suggestions!
            </p>
            <p>
              • Navigate months to see how your financial profile changes over time
            </p>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🎯 Quick Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded bg-muted p-2">
              <p className="font-medium">Update Your Income</p>
              <p className="text-xs text-muted-foreground">Click the settings icon to set your actual monthly income for more accurate advice</p>
            </div>
            <div className="rounded bg-muted p-2">
              <p className="font-medium">Track All Expenses</p>
              <p className="text-xs text-muted-foreground">The more expenses you log, the better the AI can analyze your patterns</p>
            </div>
            <div className="rounded bg-muted p-2">
              <p className="font-medium">Implement Suggestions</p>
              <p className="text-xs text-muted-foreground">Try one suggestion this month and track how it impacts your savings</p>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
