import { Database } from "@/integrations/supabase/types";

type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

// Indian merchant to category mapping
export const MERCHANT_CATEGORIES: Record<string, ExpenseCategory> = {
  // Food & Dining
  swiggy: "food",
  zomato: "food",
  "uber eats": "food",
  dunzo: "food",
  bigbasket: "food",
  zepto: "food",
  blinkit: "food",
  instamart: "food",
  dominos: "food",
  "pizza hut": "food",
  mcdonalds: "food",
  kfc: "food",
  starbucks: "food",
  "cafe coffee day": "food",
  ccd: "food",
  
  // Transport
  uber: "transport",
  ola: "transport",
  rapido: "transport",
  meru: "transport",
  irctc: "transport",
  redbus: "transport",
  makemytrip: "transport",
  goibibo: "transport",
  cleartrip: "transport",
  yatra: "transport",
  "indian oil": "transport",
  "hp petrol": "transport",
  "bharat petroleum": "transport",
  bpcl: "transport",
  iocl: "transport",
  fastag: "transport",
  
  // Shopping
  amazon: "shopping",
  flipkart: "shopping",
  myntra: "shopping",
  ajio: "shopping",
  nykaa: "shopping",
  meesho: "shopping",
  snapdeal: "shopping",
  "reliance digital": "shopping",
  croma: "shopping",
  dmart: "shopping",
  bigbazaar: "shopping",
  
  // Bills & Utilities
  jio: "bills",
  airtel: "bills",
  vodafone: "bills",
  vi: "bills",
  bsnl: "bills",
  "tata power": "bills",
  "adani electricity": "bills",
  bescom: "bills",
  mahanagar: "bills",
  "indane gas": "bills",
  "hp gas": "bills",
  "bharatgas": "bills",
  
  // Entertainment
  netflix: "entertainment",
  hotstar: "entertainment",
  "disney+": "entertainment",
  "prime video": "entertainment",
  spotify: "entertainment",
  gaana: "entertainment",
  "jio saavn": "entertainment",
  bookmyshow: "entertainment",
  pvr: "entertainment",
  inox: "entertainment",
  
  // Health
  apollo: "health",
  "1mg": "health",
  pharmeasy: "health",
  netmeds: "health",
  practo: "health",
  medplus: "health",
  
  // Education
  byju: "education",
  unacademy: "education",
  vedantu: "education",
  coursera: "education",
  udemy: "education",
};

// UPI notification patterns
export const UPI_PATTERNS = {
  // Pattern: "₹500 debited from A/c XX1234 to SWIGGY"
  debit: /₹?\s*([\d,]+\.?\d*)\s*(?:debited|debit|paid|sent)\s*(?:from|to)\s*(?:A\/c|account)?\s*\w+\s*(?:to|for)?\s*(\w+)/i,
  
  // Pattern: "UPI: Rs.500.00 paid to SWIGGY@ybl"
  upi: /(?:UPI|IMPS|NEFT):\s*(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:paid|debited|sent)\s*to\s*([^@\s]+)/i,
  
  // Pattern: "Payment of Rs 500 to merchant SWIGGY successful"
  payment: /payment\s*(?:of)?\s*(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s*to\s*(?:merchant)?\s*(\w+)/i,
};

export function categorizeByMerchant(merchant: string): ExpenseCategory {
  const normalizedMerchant = merchant.toLowerCase().trim();
  
  for (const [key, category] of Object.entries(MERCHANT_CATEGORIES)) {
    if (normalizedMerchant.includes(key)) {
      return category;
    }
  }
  
  return "other";
}

export function parseUPINotification(text: string): { amount: number; merchant: string } | null {
  for (const pattern of Object.values(UPI_PATTERNS)) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ""));
      const merchant = match[2].replace(/@.*$/, "").trim();
      if (!isNaN(amount) && merchant) {
        return { amount, merchant };
      }
    }
  }
  return null;
}

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: "hsl(var(--category-food))",
  transport: "hsl(var(--category-transport))",
  shopping: "hsl(var(--category-shopping))",
  bills: "hsl(var(--category-bills))",
  entertainment: "hsl(var(--category-entertainment))",
  health: "hsl(var(--category-health))",
  education: "hsl(var(--category-education))",
  other: "hsl(var(--category-other))",
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  food: "🍔",
  transport: "🚗",
  shopping: "🛍️",
  bills: "📄",
  entertainment: "🎬",
  health: "💊",
  education: "📚",
  other: "📦",
};
