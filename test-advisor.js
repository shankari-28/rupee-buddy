// Test the enhanced AI financial advisor
import { generateFinancialAdvice } from './huggingface-advisor.ts';

// Test case 1: High spender with low savings (should show Medium/High risk)
const testData1 = {
  monthlyIncome: 50000,
  totalExpense: 45000,
  food: 15000,
  transport: 8000,
  others: 22000
};

// Test case 2: Moderate spender (should show Medium risk)
const testData2 = {
  monthlyIncome: 50000,
  totalExpense: 35000,
  food: 12000,
  transport: 5000,
  others: 18000
};

// Test case 3: Smart saver (should show Low risk)
const testData3 = {
  monthlyIncome: 50000,
  totalExpense: 25000,
  food: 8000,
  transport: 3000,
  others: 14000
};

console.log('Testing Enhanced Financial Advisor...');
console.log('=====================================');

// Test each scenario
[testData1, testData2, testData3].forEach(async (data, index) => {
  console.log(`\nTest Case ${index + 1}:`);
  console.log(`Income: ₹${data.monthlyIncome}, Expenses: ₹${data.totalExpense}`);
  console.log(`Food: ₹${data.food}, Transport: ₹${data.transport}, Others: ₹${data.others}`);

  try {
    const advice = await generateFinancialAdvice(data);
    console.log(`Risk Level: ${advice.riskLevel}`);
    console.log(`Spender Type: ${advice.spenderType}`);
    console.log(`Savings Rate: ${advice.savingsRate.toFixed(1)}%`);
    console.log(`AI Enhanced: ${advice.aiSuggestionUsed ? 'Yes' : 'No'}`);
    console.log('Top Advice:', advice.advicePoints[0]);
  } catch (error) {
    console.error('Error:', error);
  }
});