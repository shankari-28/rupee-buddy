import { toast } from "@/components/ui/use-toast";

export interface FinancialDataInput {
  monthlyIncome: number;
  totalExpense: number;
  food: number;
  transport: number;
  others: number;
  rawCategories?: Record<string, number>;
}

export interface FinancialAdvice {
  spenderType: "High Spender" | "Moderate Spender" | "Smart Saver";
  riskLevel: "Low" | "Medium" | "High";
  advicePoints: string[];
  savingsPotential: number;
  savingsPotentialBreakdown: {
    baseSavings: number;
    foodCut: number;
    transportCut: number;
    othersCut: number;
  };
  motivationalLine: string;
  spendingBreakdown: {
    food: number;
    transport: number;
    others: number;
  };
  savingsRate: number;
  aiSuggestionUsed?: boolean;
}

const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN;
const HF_MODEL = "google/flan-t5-base";

async function callHuggingFaceAPI(prompt: string): Promise<string> {
  if (!HF_API_TOKEN) {
    throw new Error("Hugging Face API token not configured. Please add VITE_HF_API_TOKEN to .env");
  }

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        headers: { Authorization: `Bearer ${HF_API_TOKEN}` },
        method: "POST",
        body: JSON.stringify({ inputs: prompt, parameters: { max_length: 512 } }),
      }
    );

    if (!response.ok) {
      throw new Error(`HF API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result[0]?.generated_text || "";
  } catch (error) {
    console.error("Hugging Face API error:", error);
    throw error;
  }
}

function calculateFinancialMetrics(data: FinancialDataInput): {
  foodPercent: number;
  transportPercent: number;
  othersPercent: number;
  savingsPercent: number;
  savingsAmount: number;
} {
  const savingsAmount = Math.max(0, data.monthlyIncome - data.totalExpense);
  const savingsPercent = data.monthlyIncome ? (savingsAmount / data.monthlyIncome) * 100 : 0;
  const foodPercent = data.totalExpense ? (data.food / data.totalExpense) * 100 : 0;
  const transportPercent = data.totalExpense ? (data.transport / data.totalExpense) * 100 : 0;
  const othersPercent = data.totalExpense ? (data.others / data.totalExpense) * 100 : 0;

  return {
    foodPercent,
    transportPercent,
    othersPercent,
    savingsPercent,
    savingsAmount,
  };
}

function classifySpender(savingsPercent: number, totalExpense: number, monthlyIncome: number): "High Spender" | "Moderate Spender" | "Smart Saver" {
  const expenseRatio = monthlyIncome ? (totalExpense / monthlyIncome) : 0;

  if (savingsPercent >= 20) return "Smart Saver";
  if (savingsPercent >= 10 && expenseRatio <= 0.8) return "Moderate Spender";
  return "High Spender";
}

function assessRiskLevel(savingsPercent: number, expenseRatio: number, data: FinancialDataInput): "Low" | "Medium" | "High" {
  // More nuanced risk assessment considering multiple factors
  const emergencyFundMonths = data.monthlyIncome > 0 ? (data.totalExpense / data.monthlyIncome) : 0;

  // High risk factors
  if (savingsPercent < 5 || expenseRatio > 0.95) return "High"; // Living paycheck to paycheck
  if (expenseRatio > 0.9 && savingsPercent < 10) return "High"; // Overspending with low savings

  // Medium risk factors
  if (savingsPercent < 15 && expenseRatio > 0.85) return "Medium"; // Moderate savings but high spending
  if (savingsPercent >= 10 && savingsPercent < 20 && expenseRatio <= 0.85) return "Medium"; // Decent savings but could be better

  // Low risk - good financial health
  if (savingsPercent >= 20 && expenseRatio <= 0.8) return "Low"; // Excellent position
  if (savingsPercent >= 15 && expenseRatio <= 0.75) return "Low"; // Very good position

  // Default to medium for balanced situations
  return "Medium";
}

interface FinancialMetrics {
  foodPercent: number;
  transportPercent: number;
  othersPercent: number;
  savingsPercent: number;
  savingsAmount: number;
}

function generateBaseAdvice(data: FinancialDataInput, metrics: FinancialMetrics): string[] {
  const advicePoints: string[] = [];
  const expenseRatio = data.totalExpense / data.monthlyIncome;

  // 1. Overall financial health assessment
  if (metrics.savingsPercent < 5) {
    advicePoints.push(
      `🚨 Critical Alert: You're spending ${(expenseRatio * 100).toFixed(1)}% of your income with only ${metrics.savingsPercent.toFixed(1)}% savings. Target: Reduce expenses by ₹${Math.round(data.totalExpense * 0.1)}/month to reach 10% savings.`
    );
  } else if (metrics.savingsPercent < 15) {
    advicePoints.push(
      `⚠️ Savings Gap: At ${metrics.savingsPercent.toFixed(1)}% savings rate, you're vulnerable to emergencies. Aim for 20% by cutting ₹${Math.round((data.monthlyIncome * 0.2 - metrics.savingsAmount))}/month in non-essentials.`
    );
  } else {
    advicePoints.push(
      `✅ Strong Foundation: ${metrics.savingsPercent.toFixed(1)}% savings rate puts you in a good position. Consider investing ₹${Math.round(metrics.savingsAmount * 0.7)}/month while keeping ₹${Math.round(metrics.savingsAmount * 0.3)} as emergency fund.`
    );
  }

  // 2. Category-specific analysis with benchmarks
  const categoryBenchmarks = {
    food: { ideal: 25, warning: 35 },
    transport: { ideal: 10, warning: 20 },
    others: { ideal: 30, warning: 45 }
  };

  if (metrics.foodPercent > categoryBenchmarks.food.warning) {
    advicePoints.push(
      `🍽️ Food Overspending: ${metrics.foodPercent.toFixed(1)}% vs ideal ${categoryBenchmarks.food.ideal}%. Try meal prepping, eating out 2x/week max, and grocery shopping with a list to save ₹${Math.round(data.food * 0.25)}/month.`
    );
  } else if (metrics.foodPercent > categoryBenchmarks.food.ideal) {
    advicePoints.push(
      `🍽️ Food Management: ${metrics.foodPercent.toFixed(1)}% is acceptable but could be optimized. Focus on quality over quantity and track impulse food purchases.`
    );
  }

  if (metrics.transportPercent > categoryBenchmarks.transport.warning) {
    advicePoints.push(
      `🚗 Transport Alert: ${metrics.transportPercent.toFixed(1)}% exceeds the ${categoryBenchmarks.transport.ideal}% benchmark. Consider carpooling, public transport passes, or cycling for ₹${Math.round(data.transport * 0.4)}/month savings.`
    );
  } else if (metrics.transportPercent > categoryBenchmarks.transport.ideal) {
    advicePoints.push(
      `🚗 Transport Optimization: ${metrics.transportPercent.toFixed(1)}% could be reduced. Look for fuel-efficient routes and consider occasional ride-sharing.`
    );
  }

  if (metrics.othersPercent > categoryBenchmarks.others.warning) {
    advicePoints.push(
      `💰 Discretionary Spending: ${metrics.othersPercent.toFixed(1)}% in 'Others' suggests lifestyle inflation. Audit subscriptions, entertainment, and shopping habits to reclaim ₹${Math.round(data.others * 0.3)}/month.`
    );
  } else if (metrics.othersPercent > categoryBenchmarks.others.ideal) {
    advicePoints.push(
      `💰 Lifestyle Check: ${metrics.othersPercent.toFixed(1)}% discretionary spending. Ensure these purchases align with your financial goals and bring genuine value.`
    );
  }

  // 3. 50-30-20 rule analysis with specific recommendations
  const needsTarget = data.monthlyIncome * 0.5;
  const wantsTarget = data.monthlyIncome * 0.3;
  const savingsTarget = data.monthlyIncome * 0.2;

  const estimatedNeeds = data.food + data.transport;
  const estimatedWants = data.others;

  if (estimatedNeeds > needsTarget) {
    advicePoints.push(
      `📊 50-30-20 Rule: Needs spending (₹${estimatedNeeds.toLocaleString()}) exceeds ${needsTarget.toLocaleString()} target. Prioritize essentials and negotiate bills to get back on track.`
    );
  }

  if (estimatedWants > wantsTarget) {
    let wantDetails = "";
    if (data.rawCategories) {
      const wantCategories = Object.entries(data.rawCategories)
        .filter(([k]) => k !== "food" && k !== "transport" && k !== "Food" && k !== "Transport")
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} (₹${Math.round(Number(v)).toLocaleString()})`)
        .join(", ");
      if (wantCategories) {
        wantDetails = ` This is coming from: ${wantCategories}.`;
      }
    }

    advicePoints.push(
      `📊 50-30-20 Rule: Wants spending (₹${Math.round(estimatedWants).toLocaleString()}) exceeds ${Math.round(wantsTarget).toLocaleString()} target. Consider a 'want' budget of ₹${Math.round(wantsTarget).toLocaleString()}/month.${wantDetails}`
    );
  }

  // 4. Savings and investment strategy
  const monthlySavings = Math.max(0, data.monthlyIncome - data.totalExpense);
  if (monthlySavings > 1000) {
    advicePoints.push(
      `💎 Investment Ready: With ₹${monthlySavings.toLocaleString()}/month surplus, allocate: 40% emergency fund (₹${Math.round(monthlySavings * 0.4)}), 40% investments (₹${Math.round(monthlySavings * 0.4)}), 20% high-yield savings (₹${Math.round(monthlySavings * 0.2)}).`
    );
  } else if (monthlySavings > 0) {
    advicePoints.push(
      `🎯 Small Wins: ₹${monthlySavings.toLocaleString()}/month surplus is a great start. Focus on building to ₹${Math.round(data.monthlyIncome * 0.05)}/month through consistent small cuts.`
    );
  }



  return advicePoints.slice(0, 6); // Limit to 6 key points for readability
}

export async function generateFinancialAdvice(data: FinancialDataInput): Promise<FinancialAdvice> {
  try {
    const metrics = calculateFinancialMetrics(data);
    const spenderType = classifySpender(metrics.savingsPercent, data.totalExpense, data.monthlyIncome);
    const riskLevel = assessRiskLevel(metrics.savingsPercent, data.totalExpense / data.monthlyIncome, data);

    // Generate base advice from our algorithm
    const baseAdvicePoints = generateBaseAdvice(data, metrics);

    // Optional: Call Hugging Face API for enhanced advice (if token available)
    let enhancedAdvice = baseAdvicePoints;
    let aiSuggestionUsed = false;
    
    if (HF_API_TOKEN) {
      try {
        console.log("🤖 Calling Hugging Face API for intelligent financial advice...");

        // Enhanced AI prompt with comprehensive context
        const prompt = `As a financial advisor, analyze this spending data and provide ONE specific, actionable recommendation:

Monthly Income: ₹${data.monthlyIncome.toLocaleString()}
Total Expenses: ₹${data.totalExpense.toLocaleString()} (${((data.totalExpense/data.monthlyIncome)*100).toFixed(1)}% of income)
- Food: ₹${data.food.toLocaleString()} (${metrics.foodPercent.toFixed(1)}%)
- Transport: ₹${data.transport.toLocaleString()} (${metrics.transportPercent.toFixed(1)}%)
- Others: ₹${data.others.toLocaleString()} (${metrics.othersPercent.toFixed(1)}%)

Current Savings Rate: ${metrics.savingsPercent.toFixed(1)}%
Risk Assessment: ${riskLevel} risk
Spender Type: ${spenderType}

Provide ONE specific, actionable financial tip that addresses their biggest opportunity for improvement. Focus on practical steps they can take immediately. Keep it to 1-2 sentences.`;

        const hfResponse = await callHuggingFaceAPI(prompt);
        if (hfResponse && hfResponse.trim() && hfResponse.length > 10) {
          console.log("✅ AI suggestion received:", hfResponse);

          // Clean up the response (remove any unwanted prefixes or formatting)
          let cleanResponse = hfResponse.trim();
          // Remove common AI prefixes that might appear
          cleanResponse = cleanResponse.replace(/^(As a financial advisor|Based on the data|Given the information|I recommend|You should)/i, '').trim();

          enhancedAdvice = [`🤖 ${cleanResponse}`, ...baseAdvicePoints.slice(1)];
          aiSuggestionUsed = true;
        } else {
          console.log("⚠️ AI returned inadequate response, using base advice");
        }
      } catch (error) {
        console.warn("❌ HF API call failed, using base advice:", error);
        // Fall back to base advice
      }
    } else {
      console.log("ℹ️ No HF token found, using rule-based advice only");
    }

    // Generate motivational line
    const motivationalLines = [
      "Every small saving today is a step towards financial freedom tomorrow! 💪",
      "Remember: It's not about earning more, it's about spending smarter. You've got this! 🎯",
      "Your future self will thank you for the financial discipline you build today. 🌟",
      "Small changes in spending habits lead to big changes in wealth over time. 📈",
      "You're on the path to better financial health—keep pushing! 💰",
    ];
    const motivationalLine = motivationalLines[Math.floor(Math.random() * motivationalLines.length)];

    const baseSavings = Math.max(0, metrics.savingsAmount);
    const foodCut = data.food * 0.15;
    const transportCut = data.transport * 0.2;
    const othersCut = data.others * 0.2;
    const savingsPotential = Math.round(baseSavings + foodCut + transportCut + othersCut);

    return {
      spenderType,
      riskLevel,
      advicePoints: enhancedAdvice,
      savingsPotential,
      savingsPotentialBreakdown: {
        baseSavings: Math.round(baseSavings),
        foodCut: Math.round(foodCut),
        transportCut: Math.round(transportCut),
        othersCut: Math.round(othersCut),
      },
      motivationalLine,
      spendingBreakdown: {
        food: metrics.foodPercent,
        transport: metrics.transportPercent,
        others: metrics.othersPercent,
      },
      savingsRate: metrics.savingsPercent,
      aiSuggestionUsed,
    };
  } catch (error) {
    console.error("Error generating financial advice:", error);
    throw error;
  }
}
