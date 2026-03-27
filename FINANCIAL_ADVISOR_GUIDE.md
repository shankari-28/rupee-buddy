# AI-Powered Financial Advisor Integration Guide

## Overview

Your Rupee Buddy app now includes an **AI-powered financial advisor** that analyzes your spending patterns and provides personalized, data-driven financial advice using the **Hugging Face Inference API**.

## Features

### 1. **Intelligent Financial Analysis**
- Analyzes your spending across three categories: Food, Transport, and Others
- Compares your spending against standard budgeting principles (50-30-20 rule)
- Identifies spending inefficiencies and risky financial behaviors
- Estimates realistic monthly savings potential with specific optimization strategies

### 2. **Spender Classification**
The advisor classifies you into one of three categories:
- **Smart Saver**: Saving ≥20% of income with healthy spending habits
- **Moderate Spender**: Balanced spending with 10-20% savings rate
- **High Spender**: Limited savings or overspending tendencies

### 3. **Risk Assessment**
Financial risk is classified as:
- **Low Risk**: Strong savings rate (≥20%) + expense ratio ≤75%
- **Medium Risk**: Moderate savings (10-20%) + controlled expenses
- **High Risk**: Minimal savings or expense ratio >85%

### 4. **Actionable Recommendations**
- Specific, practical suggestions to reduce overspending
- Category-wise optimization tips with estimated savings amounts
- Investment recommendations based on your savings potential
- Alignment with the 50-30-20 budgeting rule

### 5. **AI-Enhanced Insights** (Optional)
When you add a Hugging Face API token, the advisor uses a pre-trained transformer model (google/flan-t5-base) to enhance suggestions with contextual, AI-generated advice.

## Setup Instructions

### Step 1: Get a Hugging Face API Token (Optional but Recommended)

1. Visit [Hugging Face](https://huggingface.co/settings/tokens)
2. Sign up for a free account or log in
3. Create a new access token (select "Read" permission)
4. Copy the token

### Step 2: Add the Token to Your Environment

1. Open the `.env` file in your project root
2. Add your Hugging Face token:
   ```
   VITE_HF_API_TOKEN="your_huggingface_token_here"
   ```
3. Save and restart your development server

**Note:** The advisor works perfectly without this token using built-in financial rules. The token simply enables AI-enhanced suggestions.

## How It Works

### Data Flow

1. **Expense Data Collection**: The advisor reads your expense history from Supabase
2. **Category Analysis**: Calculates spending percentages for Food, Transport, and Others
3. **Financial Metrics**: Computes savings rate, expense ratio, and spender classification
4. **Rule-Based Analysis**: Applies financial principles to generate base advice
5. **AI Enhancement** (Optional): Calls Hugging Face API for contextual suggestions
6. **Risk Assessment**: Evaluates financial health based on multiple metrics
7. **Output Generation**: Formats advice in 5-7 actionable bullet points

### Key Financial Metrics

| Metric | Formula | Ideal Range |
|--------|---------|------------|
| Savings Rate | (Income - Total Expenses) / Income × 100 | ≥20% |
| Food Spending | Food Expenses / Total Expenses × 100 | <30% |
| Transport Spending | Transport Expenses / Total Expenses × 100 | <15% |
| Expense Ratio | Total Expenses / Income | 0.50-0.75 |

## Using the Financial Advisor

1. Navigate to the **Advisor** page (tap the Brain icon in the bottom navigation)
2. Click the **Settings** icon (⚙️) to set your monthly income
3. View insights for the current month or navigate to previous months
4. Read the personalized advice and implement recommendations
5. Track your progress month-over-month

## API Integration Details

### Hugging Face Model

- **Model**: `google/flan-t5-base` (or compatible instruction-tuned transformer)
- **API Endpoint**: `https://api-inference.huggingface.co/models/{model_name}`
- **Request Type**: POST with financial analysis prompt
- **Response**: AI-generated financial insight

### Request Example

```typescript
const prompt = `Given monthly income of ₹50000, total expenses ₹30000 (Food: 40%, Transport: 20%, Others: 40%), provide 1 specific actionable financial tip in 1 sentence.`;

const response = await fetch(
  `https://api-inference.huggingface.co/models/google/flan-t5-base`,
  {
    headers: { Authorization: `Bearer ${HF_API_TOKEN}` },
    method: "POST",
    body: JSON.stringify({ 
      inputs: prompt, 
      parameters: { max_length: 512 } 
    }),
  }
);
```

## Output Format

The advisor generates advice following this structure:

```
📊 Your Financial Profile
├── Classification: Smart Saver / Moderate Spender / High Spender
├── Risk Level: Low / Medium / High
├── Monthly Savings Potential: ₹{amount}
├── Spending Breakdown: Food %, Transport %, Others %
└── Current Savings Rate: {percentage}%

📊 Personalized Advice (5-7 points)
├── Category-specific optimization tips
├── Spending pattern analysis
├── Realistic savings potential
├── Investment recommendations
├── Budget rule comparisons
└── Critical alerts (if needed)

💡 Motivational Line
```

## Example Output

For a user with:
- Monthly Income: ₹50,000
- Total Expenses: ₹35,000
- Food: ₹14,000 (40%)
- Transport: ₹7,000 (20%)
- Others: ₹14,000 (40%)

**Classification**: High Spender  
**Risk Level**: High  
**Savings Potential**: ₹8,500/month

**Advice Points**:
1. Your food expenses (40%) exceed the 35% threshold. Meal planning could save ₹2,800/month.
2. Transport costs (20%) are reasonable. Consider bike sharing to save ₹2,100/month.
3. Your 'Others' category (40%) is substantial. Track discretionary spending and cut non-essentials to save ₹3,500/month.
4. By optimizing the above, you could realistically save ₹8,500/month (17% more savings).
5. Your current spending exceeds the 50-30-20 rule. Build an emergency fund (₹3,000), then allocate saved funds to SIP (₹3,400) and high-yield savings (₹2,100).
6. Critical: You're living paycheck-to-paycheck at 70% expense ratio. Build a ₹150,000 emergency fund immediately.

## Configuration & Customization

### Monthly Income Update

Users can update their monthly income directly in the app:
1. Click Settings icon in the Advisor header
2. Enter your estimated monthly income
3. The system will recalculate all metrics and advice

### Spending Categories

Current categories (mapped from your database):
- **Food**: All food and dining expenses
- **Transport**: All transportation costs
- **Others**: All remaining expenses

To customize, modify the `useExpenseStats` hook in `src/hooks/useExpenses.tsx`

### Advice Thresholds

Edit `src/lib/huggingface-advisor.ts` to customize:
- Food spending threshold (currently 35%)
- Transport spending threshold (currently 15%)
- Others spending threshold (currently 40%)
- Savings rate classifications
- Risk assessment criteria

## Troubleshooting

### "Hugging Face API token not configured"

**Solution**: Add `VITE_HF_API_TOKEN` to your `.env` file. The advisor still works without it using built-in rules.

### No advice is generating

**Possible causes**:
1. You have no expenses logged for the selected month
2. Total expenses are 0
3. Hugging Face API is temporarily down (app falls back to built-in rules)

**Solution**: Log some expenses and try again. Check the browser console for detailed error messages.

### Advice seems generic

**Reason**: You haven't added a Hugging Face token, so the advisor uses rule-based suggestions.

**Solution**: Add your Hugging Face token to unlock AI-enhanced insights.

### Numbers don't match my calculations

**Reason**: Percentages are calculated from total expenses, not income.

**Formula**: (Category Spending / Total Expenses) × 100 = Category %

## Privacy & Security

- ✅ All advice is generated locally using your expense data
- ✅ No personal financial data is sent to external servers (except Hugging Face API if token is provided)
- ✅ Hugging Face API tokens are never logged or stored permanently
- ✅ All calculations respect user privacy and data security

## Future Enhancements

Planned features:
- [ ] Save user monthly income to profile
- [ ] Monthly advice history tracking
- [ ] Custom spending categories
- [ ] Budget goal setting and tracking
- [ ] Investment recommendation strategy refinement
- [ ] Multi-language support (especially Hindi)
- [ ] Export advice as PDF
- [ ] Pushes notifications for spending alerts

## Technical Stack

- **Frontend**: React 18 + TypeScript
- **API**: Hugging Face Inference API
- **Database**: Supabase
- **State Management**: React Query
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS

## File Structure

```
src/
├── lib/
│   └── huggingface-advisor.ts        # AI advisor logic & API integration
├── hooks/
│   └── useFinancialAdvisor.tsx       # React hook for fetching advice
├── components/
│   └── FinancialAdvisor.tsx          # Advisor UI component
├── pages/
│   └── Advisor.tsx                   # Advisor page
└── App.tsx                           # Route registration
```

## Contributing

To enhance the advisor:
1. Improve financial thresholds in `generateBaseAdvice()`
2. Add new advice categories or rules
3. Enhance the Hugging Face prompt for better AI suggestions
4. Add support for more expense categories

## Support

For issues or feature requests, please refer to the main project README or contact the development team.

---

**Happy budgeting! Let your AI advisor help you build better financial habits.** 💰📊✨
