import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Settings, Sparkles, Wallet, CalendarDays, Target, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BottomNav } from "@/components/BottomNav";
import { FinancialAdvisor } from "@/components/FinancialAdvisor";
import { WhatIfSimulator } from "@/components/WhatIfSimulator";
import { MerchantIntelligence } from "@/components/MerchantIntelligence";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useExpenses, useExpenseStats } from "@/hooks/useExpenses";

const INCOME_PRESETS = [30000, 50000, 75000, 100000];

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
  const prevMonth = {
    start: startOfMonth(subMonths(currentDate, 1)),
    end: endOfMonth(subMonths(currentDate, 1)),
  };
  const isCurrentMonth = isSameMonth(currentDate, new Date());

  const { data: expenses = [] } = useExpenses(currentMonth);
  const { data: prevExpenses = [] } = useExpenses(prevMonth);
  const { stats } = useExpenseStats(currentMonth);

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

  const recommendedSavings = Math.round(monthlyIncome * 0.2);
  const recommendedNeeds = Math.round(monthlyIncome * 0.5);
  const recommendedWants = Math.round(monthlyIncome * 0.3);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card/70 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Money Intelligence</p>
            <h1 className="text-xl font-bold">Advisor</h1>
          </div>
          <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" onClick={handleOpenIncomeDialog}>
                <Settings className="h-4 w-4" /> Edit Income
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Monthly Income</DialogTitle>
                <DialogDescription>
                  Use your after-tax monthly income so insights and savings targets stay realistic.
                </DialogDescription>
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
                <div className="grid grid-cols-2 gap-2">
                  {INCOME_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      onClick={() => setTempIncome(preset)}
                    >
                      ₹{preset.toLocaleString("en-IN")}
                    </Button>
                  ))}
                </div>
                <Button onClick={handleSaveIncome} className="w-full">
                  Save Income
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <Card className="overflow-hidden border-none bg-gradient-to-br from-emerald-600 via-cyan-600 to-blue-600 text-white shadow-lg">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-2 border-white/30 bg-white/20 text-white">Financial Pulse</Badge>
                <h2 className="text-xl font-semibold">Smarter Monthly Decisions</h2>
                <p className="mt-1 text-sm text-white/90">
                  AI + budgeting principles to classify spending, risk, and monthly savings opportunities.
                </p>
              </div>
              <Sparkles className="h-6 w-6 shrink-0 text-white/90" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-white/15 p-3">
                <p className="text-xs text-white/80">Month</p>
                <p className="text-sm font-semibold">{format(currentDate, "MMMM yyyy")}</p>
              </div>
              <div className="rounded-lg bg-white/15 p-3">
                <p className="text-xs text-white/80">Income Basis</p>
                <p className="text-sm font-semibold">₹{monthlyIncome.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-lg bg-white/15 p-3">
                <p className="text-xs text-white/80">Savings Target</p>
                <p className="text-sm font-semibold">₹{recommendedSavings.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" className="gap-1" onClick={goToPrevMonth}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>

              <div className="text-center">
                <p className="flex items-center justify-center gap-1 font-semibold">
                  <CalendarDays className="h-4 w-4" /> {format(currentDate, "MMMM yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Income: ₹{monthlyIncome.toLocaleString("en-IN")}
                  {!incomeConfigured && <span className="ml-1 text-orange-600">(default)</span>}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {!incomeConfigured && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold text-orange-900">Set Your Monthly Income</h3>
                  <p className="text-sm text-orange-700">
                    Set your real monthly income for accurate classification, risk, and savings recommendations.
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

        {/* Main Feature Tabs */}
        <Tabs defaultValue="advisor">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="advisor">🧠 Advisor</TabsTrigger>
            <TabsTrigger value="whatif">🔮 What-if</TabsTrigger>
            <TabsTrigger value="merchant">🏪 Merchants</TabsTrigger>
          </TabsList>

          <TabsContent value="advisor" className="mt-4">
            <FinancialAdvisor dateRange={currentMonth} monthlyIncome={monthlyIncome} />
          </TabsContent>

          <TabsContent value="whatif" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  🔮 What-if Simulator
                  <span className="text-xs font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    Gemini AI
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  "If I cut food by 15%, how much will I save in 6 months?" — drag sliders to find out.
                </p>
              </CardHeader>
              <CardContent>
                <WhatIfSimulator
                  currentSpending={stats.byCategory as Record<string, number>}
                  monthlyIncome={monthlyIncome}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="merchant" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  🏪 Merchant Intelligence
                  <span className="text-xs font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    Gemini AI
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Where you overspend, cheaper alternatives, timing patterns.
                </p>
              </CardHeader>
              <CardContent>
                <MerchantIntelligence
                  expenses={expenses.map(e => ({
                    merchant: e.merchant,
                    amount: Number(e.amount),
                    category: e.category,
                    expense_date: e.expense_date,
                  }))}
                  prevMonthExpenses={prevExpenses.map(e => ({
                    merchant: e.merchant,
                    amount: Number(e.amount),
                    category: e.category,
                    expense_date: e.expense_date,
                  }))}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" /> Reference Budget Split
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <p className="font-medium">Needs (50%)</p>
                <p className="text-xs text-muted-foreground">Food, commute, bills</p>
                <p className="mt-1 text-sm font-semibold">₹{recommendedNeeds.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="font-medium">Wants (30%)</p>
                <p className="text-xs text-muted-foreground">Shopping, entertainment</p>
                <p className="mt-1 text-sm font-semibold">₹{recommendedWants.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="font-medium">Savings/Invest (20%)</p>
                <p className="text-xs text-muted-foreground">Emergency fund + investing</p>
                <p className="mt-1 text-sm font-semibold">₹{recommendedSavings.toLocaleString("en-IN")}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky-200 bg-sky-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-sky-900">
                <ShieldCheck className="h-4 w-4" /> How Advisor Scores You
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-sky-900">
              <p>1. Reads your month-wise spending totals and category mix.</p>
              <p>2. Calculates savings ratio against your income.</p>
              <p>3. Labels spender type and financial risk level.</p>
              <p>4. Builds action points with monthly savings potential.</p>
              <p>5. Enhances one recommendation with AI when configured.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" /> Quick Action Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="rounded bg-muted p-2">Set your income once and revisit it whenever salary changes.</p>
            <p className="rounded bg-muted p-2">Review one previous month and one current month to spot trend shifts.</p>
            <p className="rounded bg-muted p-2">Pick one advice point and apply it for 30 days before re-checking.</p>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
