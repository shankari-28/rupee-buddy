import { useState } from "react";
import { Loader2, Sparkles, Store, ArrowDown, ArrowUp, Minus, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { callGemini } from "@/lib/gemini";
import { CATEGORY_ICONS } from "@/lib/merchant-rules";
import { toast } from "sonner";

interface Expense {
  merchant: string;
  amount: number;
  category: string;
  expense_date: string;
}

interface MerchantIntelligenceProps {
  expenses: Expense[];
  prevMonthExpenses?: Expense[];
}

interface MerchantStat {
  merchant: string;
  amount: number;
  count: number;
  category: string;
  percentOfTotal: number;
  prevAmount: number;
  trend: "up" | "down" | "same";
  trendPct: number;
}

// Hardcoded intelligent alternatives for known Indian merchants
const MERCHANT_ALTERNATIVES: Record<string, { alt: string; savingTip: string; savePct: number }> = {
  swiggy: { alt: "Zomato Pro / BigBasket", savingTip: "Cook 3 meals/week at home", savePct: 35 },
  zomato: { alt: "BigBasket / Zepto", savingTip: "Meal-prep on Sundays saves ~₹300/order", savePct: 30 },
  uber: { alt: "Rapido / Ola / Metro", savingTip: "Use Metro or Rapido for <8km trips", savePct: 45 },
  ola: { alt: "Rapido / Metro", savingTip: "Rapido bike for solo commutes cuts cost 50%", savePct: 40 },
  amazon: { alt: "Meesho / Flipkart Sale", savingTip: "Add to cart & wait for Sale events", savePct: 20 },
  flipkart: { alt: "Meesho / Amazon Day", savingTip: "Wait for Big Billion / Sale events", savePct: 15 },
  netflix: { alt: "JioCinema / MX Player", savingTip: "JioCinema free tier has most content", savePct: 100 },
  hotstar: { alt: "JioCinema Free", savingTip: "IPL is free on JioCinema!", savePct: 100 },
  spotify: { alt: "JioSaavn / Gaana", savingTip: "JioSaavn has a generous free tier", savePct: 80 },
  myntra: { alt: "Ajio / Meesho", savingTip: "Meesho has 60-80% lower prices for basics", savePct: 40 },
  bigbasket: { alt: "Zepto / DMART", savingTip: "DMART in-store prices are 20% cheaper", savePct: 20 },
  blinkit: { alt: "BigBasket Scheduled / Zepto", savingTip: "Schedule delivery instead of instant = save 15%", savePct: 15 },
  rapido: { alt: "Metro / BMTC", savingTip: "Monthly metro pass < 20 Rapido rides", savePct: 55 },
};

function getMerchantAlternative(merchant: string) {
  const key = merchant.toLowerCase().trim();
  for (const [name, data] of Object.entries(MERCHANT_ALTERNATIVES)) {
    if (key.includes(name)) return data;
  }
  return null;
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay(); // 0=Sun, 6=Sat
}

function analyzeWeekendVsWeekday(expenses: Expense[]) {
  let weekendTotal = 0;
  let weekdayTotal = 0;
  let weekendCount = 0;
  let weekdayCount = 0;

  expenses.forEach((e) => {
    const day = getDayOfWeek(e.expense_date);
    if (day === 0 || day === 6) {
      weekendTotal += e.amount;
      weekendCount++;
    } else {
      weekdayTotal += e.amount;
      weekdayCount++;
    }
  });

  const weekendAvg = weekendCount > 0 ? weekendTotal / weekendCount : 0;
  const weekdayAvg = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;
  const ratio = weekdayAvg > 0 ? weekendAvg / weekdayAvg : 0;

  return { weekendAvg, weekdayAvg, ratio, weekendTotal, weekdayTotal };
}

export function MerchantIntelligence({ expenses, prevMonthExpenses = [] }: MerchantIntelligenceProps) {
  const [geminiTips, setGeminiTips] = useState<string>("");
  const [loadingTips, setLoadingTips] = useState(false);

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);

  // Build merchant stats
  const merchantMap: Record<string, { amount: number; count: number; category: string }> = {};
  expenses.forEach((e) => {
    if (!merchantMap[e.merchant]) {
      merchantMap[e.merchant] = { amount: 0, count: 0, category: e.category };
    }
    merchantMap[e.merchant].amount += e.amount;
    merchantMap[e.merchant].count++;
  });

  // Prev month merchant map
  const prevMap: Record<string, number> = {};
  prevMonthExpenses.forEach((e) => {
    prevMap[e.merchant] = (prevMap[e.merchant] || 0) + e.amount;
  });

  const merchants: MerchantStat[] = Object.entries(merchantMap)
    .map(([merchant, data]) => {
      const prevAmount = prevMap[merchant] ?? 0;
      const diff = data.amount - prevAmount;
      const trendPct = prevAmount > 0 ? Math.abs(diff / prevAmount) * 100 : 0;
      return {
        merchant,
        amount: data.amount,
        count: data.count,
        category: data.category,
        percentOfTotal: totalSpend > 0 ? (data.amount / totalSpend) * 100 : 0,
        prevAmount,
        trend: (diff > 50 ? "up" : diff < -50 ? "down" : "same") as "up" | "down" | "same",
        trendPct,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const weekendStats = analyzeWeekendVsWeekday(expenses);

  const fetchGeminiTips = async () => {
    setLoadingTips(true);
    const topMerchants = merchants
      .slice(0, 4)
      .map((m) => `${m.merchant}: ₹${Math.round(m.amount)} (${m.percentOfTotal.toFixed(0)}% of spend)`)
      .join(", ");

    const prompt = `You are a sharp Indian personal finance analyst. Analyze this user's merchant spending and give specific, actionable advice.

Top merchants this month: ${topMerchants}
Total spend: ₹${Math.round(totalSpend).toLocaleString("en-IN")}
Weekend spending avg: ₹${Math.round(weekendStats.weekendAvg)} per transaction
Weekday spending avg: ₹${Math.round(weekendStats.weekdayAvg)} per transaction

Give 3 very specific, India-context merchant intelligence tips. For example:
- "Your Swiggy spend is ₹X — 40% goes to delivery fees. Switch to Swiggy Instamart for groceries and save the cab fare"
- "Booking Ola on weekday mornings (8-9am) is 30% more than weekends — adjust commute timing"

Format as 3 short punchy tips, each starting with 💡. No fluff. Be specific with rupee amounts where possible.`;

    try {
      const tips = await callGemini(prompt);
      setGeminiTips(tips);
    } catch {
      toast.error("Couldn't get merchant tips. Check API key.");
    } finally {
      setLoadingTips(false);
    }
  };

  if (merchants.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Store className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No merchant data yet.</p>
        <p className="text-sm mt-1">Add expenses to see store intelligence!</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Merchants Ranked */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Where Your Money Goes
        </p>
        <div className="space-y-3">
          {merchants.map((m, i) => {
            const alt = getMerchantAlternative(m.merchant);
            return (
              <div key={m.merchant} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {i + 1}
                    </span>
                    <span>{CATEGORY_ICONS[m.category as keyof typeof CATEGORY_ICONS] ?? "📦"}</span>
                    <span className="font-medium truncate max-w-[120px]">{m.merchant}</span>
                    <span className="text-xs text-muted-foreground">×{m.count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">₹{Math.round(m.amount).toLocaleString("en-IN")}</span>
                    {m.trend === "up" && m.trendPct > 5 && (
                      <Badge variant="destructive" className="text-xs px-1 py-0 h-5">
                        <ArrowUp className="h-2.5 w-2.5 mr-0.5" />
                        {m.trendPct.toFixed(0)}%
                      </Badge>
                    )}
                    {m.trend === "down" && m.trendPct > 5 && (
                      <Badge className="text-xs px-1 py-0 h-5 bg-green-100 text-green-700 hover:bg-green-100">
                        <ArrowDown className="h-2.5 w-2.5 mr-0.5" />
                        {m.trendPct.toFixed(0)}%
                      </Badge>
                    )}
                    {(m.trend === "same" || m.trendPct <= 5) && m.prevAmount > 0 && (
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <Progress value={m.percentOfTotal} className="h-1.5" />
                {alt && (
                  <p className="text-xs text-muted-foreground pl-8">
                    💡 Try <span className="font-medium text-foreground">{alt.alt}</span> — save ~{alt.savePct}% · {alt.savingTip}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekend vs Weekday */}
      {expenses.length >= 5 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
              <Clock className="h-4 w-4" /> Spending Timing Pattern
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-900">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/60 p-2 text-center">
                <p className="text-xs text-amber-600">Avg Weekend Spend</p>
                <p className="text-base font-bold">₹{Math.round(weekendStats.weekendAvg).toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-lg bg-white/60 p-2 text-center">
                <p className="text-xs text-amber-600">Avg Weekday Spend</p>
                <p className="text-base font-bold">₹{Math.round(weekendStats.weekdayAvg).toLocaleString("en-IN")}</p>
              </div>
            </div>
            {weekendStats.ratio > 1.5 && (
              <div className="flex items-start gap-2 text-xs rounded-lg bg-white/60 p-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  You spend <strong>{weekendStats.ratio.toFixed(1)}× more</strong> per transaction on weekends.
                  Plan weekend outings with a fixed budget to avoid impulse spends.
                </span>
              </div>
            )}
            {weekendStats.ratio <= 1.5 && weekendStats.ratio > 0 && (
              <p className="text-xs text-center text-amber-700">
                ✅ Your weekend and weekday spending are relatively balanced!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gemini Intelligence */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
          onClick={fetchGeminiTips}
          disabled={loadingTips}
        >
          {loadingTips ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loadingTips ? "Gemini analyzing your merchants..." : "✨ Get Personalized Merchant Tips"}
        </Button>

        {geminiTips && (
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-purple-100">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-600 mb-2">Gemini Merchant Analysis</p>
                  <div className="text-sm text-purple-900 leading-relaxed whitespace-pre-line">{geminiTips}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
