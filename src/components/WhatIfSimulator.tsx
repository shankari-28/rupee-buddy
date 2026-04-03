import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Sparkles, Loader2, TrendingDown, IndianRupee, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { callGemini } from "@/lib/gemini";
import { CATEGORY_ICONS } from "@/lib/merchant-rules";
import { toast } from "sonner";

type CategoryKey = "food" | "transport" | "shopping" | "bills" | "entertainment" | "health" | "education" | "other";

interface SpendingByCategory {
  [key: string]: number;
}

interface WhatIfSimulatorProps {
  currentSpending: SpendingByCategory;
  monthlyIncome: number;
}

const PRESET_SCENARIOS = [
  { label: "🏠 Cook at Home", cuts: { food: 30 } },
  { label: "🚌 Use Metro", cuts: { transport: 40 } },
  { label: "📵 Cancel Subscriptions", cuts: { entertainment: 80 } },
  { label: "🛒 No Impulse Shopping", cuts: { shopping: 50 } },
  { label: "💪 Full Savings Mode", cuts: { food: 20, transport: 30, shopping: 50, entertainment: 60 } },
];

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  food: "Food & Dining",
  transport: "Transport",
  shopping: "Shopping",
  bills: "Bills & Utilities",
  entertainment: "Entertainment",
  health: "Health",
  education: "Education",
  other: "Other",
};

function generateProjectionData(
  currentSpending: SpendingByCategory,
  cuts: Record<string, number>,
  months: number
) {
  const totalCurrent = Object.values(currentSpending).reduce((s, v) => s + v, 0);
  const totalProjected = Object.entries(currentSpending).reduce((sum, [cat, val]) => {
    const cut = cuts[cat] ?? 0;
    return sum + val * (1 - cut / 100);
  }, 0);

  const monthlySaving = totalCurrent - totalProjected;

  return Array.from({ length: months }).map((_, i) => ({
    month: `Month ${i + 1}`,
    current: Math.round(totalCurrent * (i + 1)),
    projected: Math.round(totalProjected * (i + 1)),
    savings: Math.round(monthlySaving * (i + 1)),
  }));
}

export function WhatIfSimulator({ currentSpending, monthlyIncome }: WhatIfSimulatorProps) {
  const activeCategories = Object.entries(currentSpending).filter(([, v]) => v > 0);
  const [cuts, setCuts] = useState<Record<string, number>>(() =>
    Object.fromEntries(activeCategories.map(([k]) => [k, 0]))
  );
  const [geminiInsight, setGeminiInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [months] = useState(6);

  const totalCurrent = activeCategories.reduce((s, [, v]) => s + v, 0);
  const totalProjected = activeCategories.reduce((sum, [cat, val]) => {
    return sum + val * (1 - (cuts[cat] ?? 0) / 100);
  }, 0);
  const monthlySaving = totalCurrent - totalProjected;
  const sixMonthSaving = monthlySaving * months;
  const savingsPercent = totalCurrent > 0 ? (monthlySaving / totalCurrent) * 100 : 0;

  const projectionData = generateProjectionData(currentSpending, cuts, months);

  const applyPreset = (preset: (typeof PRESET_SCENARIOS)[number]) => {
    setCuts((prev) => {
      const next = { ...prev };
      Object.entries(preset.cuts).forEach(([cat, val]) => {
        if (next[cat] !== undefined) next[cat] = val;
      });
      return next;
    });
    setGeminiInsight("");
  };

  const fetchGeminiInsight = async () => {
    if (monthlySaving <= 0) {
      toast.info("Adjust at least one slider to see AI insights!");
      return;
    }
    setLoadingInsight(true);
    const cutSummary = Object.entries(cuts)
      .filter(([, v]) => v > 0)
      .map(([cat, v]) => `${CATEGORY_DISPLAY_NAMES[cat] ?? cat}: cut ${v}%`)
      .join(", ");

    const prompt = `You are a witty, encouraging Indian personal finance advisor (think Zerodha + fun).

A user in India is using a "What-if" expense simulator. Here's their scenario:
- Monthly income: ₹${monthlyIncome.toLocaleString("en-IN")}
- Current monthly spend: ₹${Math.round(totalCurrent).toLocaleString("en-IN")}
- Planned cuts: ${cutSummary || "none yet"}
- Monthly savings from this plan: ₹${Math.round(monthlySaving).toLocaleString("en-IN")}
- Total savings in 6 months: ₹${Math.round(sixMonthSaving).toLocaleString("en-IN")}

Give a 2-3 sentence personalized insight that:
1. Celebrates what they can achieve (e.g., "That's enough for a new iPhone Pro!" or "You could invest in a SIP with that!")
2. Gives ONE practical tip for the category they're cutting most
3. Uses a relatable India-specific reference (Zepto, BigBasket, Rapido, SIP, etc.)

Be conversational, positive, and specific. No bullet points. Just natural flowing text.`;

    try {
      const insight = await callGemini(prompt);
      setGeminiInsight(insight);
    } catch {
      toast.error("Couldn't get AI insight. Check your Gemini API key.");
    } finally {
      setLoadingInsight(false);
    }
  };

  // Auto-fetch insight when cuts change (debounced)
  useEffect(() => {
    setGeminiInsight("");
  }, [cuts]);

  if (activeCategories.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No spending data for this month.</p>
        <p className="text-sm mt-1">Add some expenses first to run simulations!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preset Scenarios */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Quick Scenarios</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_SCENARIOS.map((scenario) => (
            <Button
              key={scenario.label}
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => applyPreset(scenario)}
            >
              {scenario.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8 text-muted-foreground"
            onClick={() => {
              setCuts(Object.fromEntries(activeCategories.map(([k]) => [k, 0])));
              setGeminiInsight("");
            }}
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Reset
          </Button>
        </div>
      </div>

      {/* Category Sliders */}
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Adjust Spending Cuts</p>
        {activeCategories.map(([cat, currentAmt]) => {
          const cutPct = cuts[cat] ?? 0;
          const savedAmt = Math.round(currentAmt * (cutPct / 100));
          return (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <span>{CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] ?? "📦"}</span>
                  <span className="font-medium">{CATEGORY_DISPLAY_NAMES[cat] ?? cat}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">₹{currentAmt.toLocaleString("en-IN")}</span>
                  {cutPct > 0 && (
                    <Badge variant="secondary" className="text-green-700 bg-green-100 text-xs">
                      -{cutPct}% saves ₹{savedAmt.toLocaleString("en-IN")}
                    </Badge>
                  )}
                </span>
              </div>
              <Slider
                min={0}
                max={90}
                step={5}
                value={[cutPct]}
                onValueChange={([val]) => setCuts((prev) => ({ ...prev, [cat]: val }))}
                className="cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-none bg-orange-50">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-xs text-orange-600">Monthly Save</p>
            <p className="text-lg font-bold text-orange-700">₹{Math.round(monthlySaving).toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-green-50">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-xs text-green-600">6 Month Total</p>
            <p className="text-lg font-bold text-green-700">₹{Math.round(sixMonthSaving).toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-blue-50">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-xs text-blue-600">Cut %</p>
            <p className="text-lg font-bold text-blue-700">{savingsPercent.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* 6-Month Projection Chart */}
      {monthlySaving > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-600" /> 6-Month Spending Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `₹${value.toLocaleString("en-IN")}`,
                    name === "current" ? "Current path" : "With your cuts",
                  ]}
                />
                <Area type="monotone" dataKey="current" stroke="#f97316" fill="url(#colorCurrent)" strokeWidth={2} />
                <Area type="monotone" dataKey="projected" stroke="#22c55e" fill="url(#colorProjected)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-orange-400" /> Current</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-green-500" /> With Cuts</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gemini AI Insight */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
          onClick={fetchGeminiInsight}
          disabled={loadingInsight}
        >
          {loadingInsight ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loadingInsight ? "Gemini is thinking..." : "✨ Get Gemini AI Insight"}
        </Button>

        {geminiInsight && (
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-purple-100">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-600 mb-1">Gemini says</p>
                  <p className="text-sm text-purple-900 leading-relaxed">{geminiInsight}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly Savings math */}
      {monthlySaving > 0 && (
        <div className="rounded-lg border border-dashed border-green-300 bg-green-50 p-3 text-sm text-green-800 flex items-center gap-2">
          <IndianRupee className="h-4 w-4 shrink-0" />
          <span>
            At this rate → <strong>₹{Math.round(sixMonthSaving).toLocaleString("en-IN")}</strong> in 6 months, 
            {" "}<strong>₹{Math.round(monthlySaving * 12).toLocaleString("en-IN")}</strong> in a year!
          </span>
        </div>
      )}
    </div>
  );
}
