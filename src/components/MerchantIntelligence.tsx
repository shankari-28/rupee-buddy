import { useState } from "react";
import { Loader2, Sparkles, Store, ArrowDown, ArrowUp, Minus, Clock, AlertTriangle, Send, User, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { callGemini } from "@/lib/gemini";
import { CATEGORY_ICONS } from "@/lib/merchant-rules";
import { Input } from "@/components/ui/input";
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
  const [messages, setMessages] = useState<{ role: "user" | "model"; text: string }[]>([
    { role: "model", text: "I've analyzed your merchants! Ask me about alternatives, spending habits, or how to reduce your specific bills (e.g., 'Cheaper alternatives for Netflix?')." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);

  // Build merchant stats
  const merchantMap: Record<string, { amount: number; count: number; category: string }> = {};
  expenses.forEach((e) => {
    const genericNames = ["debit", "withdrawal", "unknown", "payment", "upi", "upi payment"];
    const resolvedMerchant = genericNames.includes(e.merchant.toLowerCase().trim())
      ? e.category.charAt(0).toUpperCase() + e.category.slice(1)
      : e.merchant;

    if (!merchantMap[resolvedMerchant]) {
      merchantMap[resolvedMerchant] = { amount: 0, count: 0, category: e.category };
    }
    merchantMap[resolvedMerchant].amount += e.amount;
    merchantMap[resolvedMerchant].count++;
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

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setChatInput("");
    setIsChatLoading(true);

    const topMerchants = merchants
      .slice(0, 4)
      .map((m) => `${m.merchant}: ₹${Math.round(m.amount)} (${m.percentOfTotal.toFixed(0)}% of spend)`)
      .join(", ");

    const systemPrompt = `You are a helpful, witty Indian personal finance AI assistant analyzing this user's specific merchant spending.
Context:
Top merchants this month: ${topMerchants}
Total spend: ₹${Math.round(totalSpend).toLocaleString("en-IN")}
Weekend vs Weekday spending ratio: ${weekendStats.ratio.toFixed(1)}x

Be short, punchy, and conversational. Give specific Indian alternatives (Zepto, Rapido, JioCinema etc) if asked. Do not use complex markdown formatting other than bolding text. Answer the user's latest query directly based on the context.

Chat History:
${messages.map(m => `${m.role === 'model' ? 'AI' : 'User'}: ${m.text}`).join('\n')}
User: ${userMessage}
AI:`;

    try {
      const tips = await callGemini(systemPrompt);
      setMessages((prev) => [...prev, { role: "model", text: tips }]);
    } catch {
      toast.error("Couldn't reach Gemini. Check API key.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
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

      {/* Gemini Chat Interface */}
      <Card className="border-purple-200 shadow-sm overflow-hidden flex flex-col">
        <CardHeader className="bg-purple-50 pb-3 pt-4 border-b border-purple-100 flex flex-row items-center gap-2 space-y-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-200">
            <Sparkles className="h-4 w-4 text-purple-700" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-purple-900">Merchant AI Assistant</CardTitle>
            <p className="text-xs text-purple-600/80">Ask about cheaper alternatives & tips</p>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex flex-col">
          {/* Chat Messages Area */}
          <div className="h-[280px] overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-sm ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`rounded-2xl px-4 py-2.5 max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-white border text-foreground rounded-tl-sm shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex gap-3 text-sm flex-row">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl px-4 py-2 bg-white border text-foreground rounded-tl-sm shadow-sm flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                  <span className="ml-2 text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Area */}
          <div className="p-3 bg-white border-t flex gap-2">
            <Input
              placeholder="E.g. What's a cheaper alternative to Swiggy?"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isChatLoading}
              className="flex-1 focus-visible:ring-purple-500 bg-slate-50"
            />
            <Button 
              size="icon" 
              onClick={handleSendChat} 
              disabled={!chatInput.trim() || isChatLoading}
              className="bg-purple-600 hover:bg-purple-700 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
