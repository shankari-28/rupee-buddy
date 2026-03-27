# Financial Advisor - Developer Guide

This guide helps developers understand, customize, and enhance the AI Financial Advisor system.

---

## Architecture Overview

### Component Hierarchy
```
App (Router)
  └── Advisor Page
      ├── Month Navigation
      └── FinancialAdvisor Component
          ├── Profile Card
          │   ├── Classification Badge
          │   ├── Risk Level Badge
          │   └── Savings Potential
          ├── Spending Breakdown
          ├── Advice Card (Powered by Hook)
          │   └── useFinancialAdvisor
          │       ├── useExpenseStats
          │       └── generateFinancialAdvice()
          └── Motivational Message
```

### Data Flow
```
useExpenseStats (from useExpenses)
  ↓ fetches expenses from Supabase
  ↓ calculates totals by category
  ↓ returns { totalSpent, byCategory }
  ↓
useFinancialAdvisor Hook
  ↓ formats data as FinancialDataInput
  ↓ calls generateFinancialAdvice()
  ↓
generateFinancialAdvice()
  ├─ calculateFinancialMetrics()
  ├─ classifySpender()
  ├─ assessRiskLevel()
  ├─ generateBaseAdvice()
  ├─ (optional) callHuggingFaceAPI()
  └─ returns FinancialAdvice
  ↓
FinancialAdvisor Component
  ├─ renders profile metrics
  ├─ displays advice points
  ├─ shows motivational message
  └─ provides user feedback
```

---

## Key Functions & Their Responsibilities

### 1. `calculateFinancialMetrics(data: FinancialDataInput)`
**Purpose**: Math calculations for financial analysis

**Input**:
```typescript
{
  monthlyIncome: 50000,
  totalExpense: 35000,
  food: 14000,
  transport: 7000,
  others: 14000
}
```

**Output**:
```typescript
{
  foodPercent: 40,
  transportPercent: 20,
  othersPercent: 40,
  savingsPercent: 30,
  savingsAmount: 15000
}
```

**Customization**: Change thresholds here for different percentages

---

### 2. `classifySpender(savingsPercent, expense, income)`
**Purpose**: Categorize user into spending type

**Current Logic**:
```typescript
Smart Saver: ≥ 20% savings
Moderate: 10-20% savings + expense ratio ≤ 0.8
High Spender: < 10% savings
```

**To Modify**: 
Edit the threshold values (20, 10, 0.8) to suit your region/market

---

### 3. `generateBaseAdvice(data, metrics)`
**Purpose**: Generate rule-based financial recommendations

**How it Works**:
1. Checks if Food > 35% → suggests meal plans
2. Checks if Transport > 15% → suggests alternatives
3. Checks if Others > 40% → suggests budget cuts
4. Calculates savings potential
5. Checks 50-30-20 rule compliance
6. Flags critical issues

**To Enhance**:
- Add more category-specific rules
- Create region-specific suggestions
- Add seasonal recommendations
- Include time-of-month alerts

---

### 4. `callHuggingFaceAPI(prompt)`
**Purpose**: Call Hugging Face for AI-enhanced insights

**How to Modify the Prompt**:
```typescript
// Current prompt (line ~150)
const prompt = `Given monthly income of ₹${data.monthlyIncome}, 
  total expenses ₹${data.totalExpense} (Food: ${metrics.foodPercent.toFixed(1)}%, 
  Transport: ${metrics.transportPercent.toFixed(1)}%, Others: ${metrics.othersPercent.toFixed(1)}%), 
  provide 1 specific actionable financial tip in 1 sentence.`;
```

**To Make More Detailed Suggestions**:
```typescript
const prompt = `Given:
- Monthly Income: ₹${data.monthlyIncome}
- Spending: ₹${data.totalExpense} (${savingsPercent}% saved)
- Categories: Food ${foodPercent}%, Transport ${transportPercent}%, Others ${othersPercent}%
- Risk Level: ${riskLevel}
- Savings Potential: ₹${savingsAmount}

Provide 2-3 specific, actionable financial tips for an Indian student/young professional.`;
```

**To Use Different Models**:
```typescript
const AVAILABLE_MODELS = {
  'google/flan-t5-base': 'Free, good quality',
  'google/flan-t5-large': 'Better but slower',
  'mistralai/Mistral-7B': 'More advanced',
  'meta-llama/Llama-2-7b': 'Open source'
};

// Update HF_MODEL constant
const HF_MODEL = "meta-llama/Llama-2-7b";
```

---

## Customization Examples

### 1. Change Financial Thresholds

**File**: `src/lib/huggingface-advisor.ts`

**Current Thresholds**:
```typescript
// Line ~95
if (metrics.foodPercent > 35) { // 35% threshold
  advicePoints.push(`...`);
}
```

**To Change for Different Markets**:
```typescript
// For US market (lower food costs)
if (metrics.foodPercent > 25) { // 25% threshold
  advicePoints.push(`Your food expenses exceed US standard...`);
}

// For rural India (higher transport)
if (metrics.transportPercent > 20) { // 20% threshold
  advicePoints.push(`Consider carpooling or vehicle ownership...`);
}
```

### 2. Add New Advice Categories

**Current Categories**:
- Food spending
- Transport spending
- Others spending
- Savings potential
- 50-30-20 comparison
- Critical alerts

**To Add Entertainment Tracking**:

```typescript
// Step 1: Update FinancialDataInput
export interface FinancialDataInput {
  monthlyIncome: number;
  totalExpense: number;
  food: number;
  transport: number;
  entertainment: number;  // NEW
  others: number;
}

// Step 2: Update database schema (Supabase)
// Add 'entertainment' to expense_category enum

// Step 3: Update useExpenseStats to calculate entertainment total

// Step 4: Add advice generation logic
if (metrics.entertainmentPercent > 15) {
  advicePoints.push(
    `Your entertainment spending (${entertainmentPercent}%) is high. 
     Try free activities to save ₹${amount}/month.`
  );
}
```

### 3. Customize Motivational Messages

**File**: `src/lib/huggingface-advisor.ts`, lines 200-210

**Current**:
```typescript
const motivationalLines = [
  "Every small saving today is a step towards financial freedom tomorrow! 💪",
  // ... more lines
];
```

**To Add Regional Messages**:
```typescript
const motivationalLines = {
  EN: [
    "Every small saving today is a step towards financial freedom tomorrow! 💪",
    "Remember: It's not about earning more, it's about spending smarter. 🎯",
  ],
  HI: [
    "आज की हर छोटी बचत कल की स्वतंत्रता की ओर एक कदम है! 💪",
    "याद रखें: ज्यादा कमाना नहीं, स्मार्ट खर्च करना जरूरी है। 🎯",
  ],
  TA: [
    "இன்றைய சிறிய சேமிப்பு நாளைய சுதந்திரத்தின் ஒரு படி! 💪",
  ]
};

const language = getUserLanguage(); // Get from user settings
const message = motivationalLines[language][randomIndex];
```

### 4. Add Monthly Income History

**Current**: Income is set but not saved

**To Persist Income**:

```typescript
// 1. Create a new table in Supabase
CREATE TABLE user_income_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  income DECIMAL(10, 2),
  month DATE,
  created_at TIMESTAMP
);

// 2. Create a hook to fetch/save income
export function useUserIncome() {
  const { user } = useAuth();
  
  const { data: income } = useQuery({
    queryKey: ['user-income', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_income_history')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: false })
        .limit(1);
      
      return data?.[0]?.income || 50000;
    }
  });
  
  const saveIncome = async (amount: number) => {
    await supabase
      .from('user_income_history')
      .insert({
        user_id: user.id,
        income: amount,
        month: new Date().toISOString().split('T')[0]
      });
  };
  
  return { income, saveIncome };
}

// 3. Use in Advisor.tsx
const { income, saveIncome } = useUserIncome();

const handleSaveIncome = async () => {
  await saveIncome(tempIncome);
  setMonthlyIncome(tempIncome);
};
```

### 5. Add Spending Alerts

**File**: Create new `src/hooks/useSpendingAlerts.tsx`

```typescript
export function useSpendingAlerts(metrics: FinancialMetrics) {
  const alerts = [];
  
  // Alert if Food spending increasing
  if (metrics.foodPercent > 35) {
    alerts.push({
      severity: 'warning',
      message: 'Food spending increased 📈',
      action: 'Review dining habits'
    });
  }
  
  // Critical alert if overspending
  if (metrics.savingsPercent < 0) {
    alerts.push({
      severity: 'critical',
      message: 'You\'re spending more than income! 🚨',
      action: 'Cut expenses or increase income'
    });
  }
  
  return alerts;
}
```

---

## Testing the Advisor

### Testing with Mock Data

**File**: Create `src/lib/__tests__/huggingface-advisor.test.ts`

```typescript
import { generateFinancialAdvice } from '../huggingface-advisor';

describe('Financial Advisor', () => {
  test('correctly classifies Smart Saver', async () => {
    const advice = await generateFinancialAdvice({
      monthlyIncome: 50000,
      totalExpense: 30000,
      food: 10000,
      transport: 5000,
      others: 15000
    });
    
    expect(advice.spenderType).toBe('Smart Saver');
    expect(advice.riskLevel).toBe('Low');
    expect(advice.savingsRate).toBe(40);
  });
  
  test('correctly classifies High Spender', async () => {
    const advice = await generateFinancialAdvice({
      monthlyIncome: 50000,
      totalExpense: 48000,
      food: 20000,
      transport: 8000,
      others: 20000
    });
    
    expect(advice.spenderType).toBe('High Spender');
    expect(advice.riskLevel).toBe('High');
    expect(advice.savingsRate).toBeLessThan(10);
  });
});
```

### Manual Testing Checklist

- [ ] No expenses logged → Shows "log expenses" message
- [ ] One expense → Calculates correctly
- [ ] Multiple months → Navigation works
- [ ] Income update → Advice recalculates
- [ ] No API token → Falls back to base advice
- [ ] With API token → Includes AI suggestion
- [ ] Mobile view → Looks good on 375px
- [ ] Dark mode → (if implemented)

---

## Performance Optimization

### 1. React Query Caching

Current setup caches advice for 5 minutes by default.

**To Customize**:
```typescript
// In useFinancialAdvisor hook
return useQuery({
  queryKey: [...],
  queryFn: async () => { ... },
  staleTime: 1000 * 60 * 30,  // 30 minutes (increase from 5)
  cacheTime: 1000 * 60 * 60,  // 1 hour cache
});
```

### 2. Lazy Load Heavy Components

**If Advisor becomes large**:
```typescript
import { lazy, Suspense } from 'react';

const FinancialAdvisor = lazy(() => 
  import('@/components/FinancialAdvisor')
);

export default function Advisor() {
  return (
    <Suspense fallback={<Skeleton />}>
      <FinancialAdvisor {...props} />
    </Suspense>
  );
}
```

### 3. Optimize HF API Calls

**Current**: Calls HF API for every advice generation

**To Implement Batching**:
```typescript
// Only call HF once per month
const shouldCallHF = (currentDate) => {
  const lastCallDate = localStorage.getItem('last_hf_call');
  return !lastCallDate || 
         !isSameMonth(new Date(lastCallDate), currentDate);
};
```

---

## Debugging Tips

### Enable Console Logging

**File**: `src/lib/huggingface-advisor.ts`

```typescript
// Add at appropriate points
console.log('Financial Metrics:', metrics);
console.log('Spender Type:', spenderType);
console.log('Risk Level:', riskLevel);
console.log('HF API Response:', hfResponse);
```

### Monitor React Query

```typescript
// In App.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  {/* ... */}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Test Hugging Face API Locally

```bash
curl -X POST https://api-inference.huggingface.co/models/google/flan-t5-base \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs":"Given monthly income of ₹50000, total expenses ₹30000, provide one financial tip"}'
```

---

## Common Modifications

### Region-Specific Advice
See [Customization Examples](#customization-examples) section above

### Language Localization
Add i18n support:
```typescript
import { useTranslation } from 'i18next';

export function FinancialAdvisor() {
  const { t } = useTranslation('advisor');
  
  return (
    <Card>
      <CardTitle>{t('yourProfile')}</CardTitle>
      {/* Use t('key') for all text */}
    </Card>
  );
}
```

### Grade System
Add letter grades (A+, A, B, etc.) based on spending patterns:
```typescript
function gradeFinancialHealth(metrics: FinancialMetrics): string {
  if (metrics.savingsPercent >= 30) return 'A+';
  if (metrics.savingsPercent >= 25) return 'A';
  if (metrics.savingsPercent >= 20) return 'B+';
  // ... etc
}
```

---

## Contributing Enhancements

### Before Making Changes
1. Create a feature branch
2. Review this guide
3. Check existing tests
4. Run `npm run lint`
5. Run `npm run build`

### After Changes
1. Update corresponding tests
2. Update documentation
3. Test with mock data
4. Check performance
5. Run `npm run lint && npm run build`

### PR Checklist
- [ ] Code passes linting
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Build succeeds
- [ ] No console errors/warnings
- [ ] Tested on mobile view

---

## Summary

The Financial Advisor is:
- **Modular**: Easy to modify individual components
- **Extensible**: Add new features without breaking existing code
- **Testable**: Rule-based logic is easy to unit test
- **Documented**: Clear code comments throughout
- **Performant**: Caching and optimization built-in

Happy developing! 🚀

---

**Questions?** Check the main [README.md](./README.md) or [FINANCIAL_ADVISOR_GUIDE.md](./FINANCIAL_ADVISOR_GUIDE.md)
