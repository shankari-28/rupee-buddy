# Quick Start Guide - Financial Advisor

## 30-Second Setup

1. **Start the app**:
   ```bash
   npm install
   npm run dev
   ```

2. **Navigate to Advisor**: Click the Brain icon (🧠) in the bottom navigation

3. **Set your income**: Click the settings icon (⚙️) and enter your monthly income

4. **View advice**: See personalized financial recommendations based on your expenses!

---

## First Steps

### 1. Log Some Expenses (If You Haven't)
- Click **Add** to log your daily expenses
- Categorize them as Food, Transport, or Others
- The more data, the better the advice!

### 2. Open the Financial Advisor
- Click the Brain icon (🧠) in the bottom navigation bar
- You'll land on the Advisor page

### 3. Set Your Monthly Income (Important!)
- **Look for the orange card** at the top saying "Set Your Monthly Income"
- Click the **"Set Income"** button
- Enter your **actual monthly income** (after taxes)
- Click **Save Income**
- The orange card will disappear once configured

**Why this matters:** The advisor needs your income to calculate savings rates, classify your spending type, and give accurate advice. Without it, you'll see generic advice based on a ₹50,000 default.

### 4. Read the Advice
Your personalized report includes:
- **Your Profile**: Spender classification + Risk level
- **5-7 Actionable Tips**: Specific ways to save money
- **Savings Potential**: How much more you could save
- **Motivational Message**: A boost to keep you going

### 5. Track Progress
- Navigate to previous months to see trends
- Implement one suggestion and monitor the impact
- Check back monthly to track improvements

---

## Understanding the Metrics

### Classification
| Type | What It Means |
|------|--------------|
| 🏆 Smart Saver | You save ≥20% of income (excellent!) |
| 📈 Moderate Spender | You save 10-20% (good balance) |
| 🔴 High Spender | You save <10% (time to cut back) |

### Risk Level
| Level | What It Means |
|-------|--------------|
| 🟢 Low Risk | Strong savings buffer, healthy spending |
| 🟡 Medium Risk | Moderate savings, manageable expenses |
| 🔴 High Risk | Low savings, risky spending patterns |

### Spending Breakdown
- **Food**: Ideal < 30% of expenses
- **Transport**: Ideal < 15% of expenses
- **Others**: Ideal < 40% of expenses

**Reference**: 50-30-20 Rule
- 50% on needs (food, transport, essentials)
- 30% on wants (entertainment, dining out)
- 20% on savings & debt payoff

---

## Tips for Better Advice

1. **Log all expenses**: Even small purchases matter for analysis
2. **Be honest about categories**: Correct categorization = better advice
3. **Update income**: If your income changes, update it in settings
4. **Check monthly**: View different months to see spending trends
5. **Act on suggestions**: Implement recommendations and track results

---

## Optional: Enable AI-Enhanced Suggestions

The advisor works great without this, but you can get AI-enhanced suggestions:

1. Get a free Hugging Face token: https://huggingface.co/settings/tokens
2. Add to `.env`:
   ```
   VITE_HF_API_TOKEN="your_token_here"
   ```
3. Restart the dev server
4. See AI-generated contextual advice in addition to rules-based tips

---

## FAQs

**Q: Do I need a Hugging Face token?**
A: No! The advisor works perfectly with built-in financial rules. The token just adds AI-generated insights.

**Q: Why isn't the advisor showing suggestions?**
A: You need at least one expense logged for the current month. Log an expense and refresh.

**Q: How is my advice personalized?**
A: It's based on YOUR spending data, not generic tips. We analyze YOUR categories, percentages, and income.

**Q: Can I change my monthly income?**
A: Yes! Click the settings icon (⚙️) anytime to update it.

**Q: Is my data safe?**
A: Absolutely! Your data stays in Supabase. We only send financial metrics to Hugging Face (if you opt-in).

---

## Need Help?

- See detailed docs: [FINANCIAL_ADVISOR_GUIDE.md](../FINANCIAL_ADVISOR_GUIDE.md)
- Check main README: [README.md](../README.md)
- Review troubleshooting section for common issues

---

## What's Next?

- ✅ Log expenses regularly
- ✅ Monitor your progress monthly
- ✅ Implement suggestions to improve savings
- ✅ Build better financial habits
- ✅ Watch your wealth grow! 📈

**Your financial freedom starts with tracking. Your advisor helps you optimize. Let's make it happen!** 💪💰
