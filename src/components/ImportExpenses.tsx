import { useState, useRef } from "react";
import { Camera, Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddExpense } from "@/hooks/useExpenses";
import { categorizeByMerchant, CATEGORY_ICONS } from "@/lib/merchant-rules";
import { toast } from "sonner";
import { format } from "date-fns";
import { Constants } from "@/integrations/supabase/types";

const validCategories = Constants.public.Enums.expense_category;
type ExpenseCategory = (typeof validCategories)[number];

const CATEGORY_ALIASES: Record<string, ExpenseCategory> = {
  food: "food",
  foods: "food",
  "food dining": "food",
  dining: "food",
  grocery: "food",
  groceries: "food",
  restaurant: "food",

  transport: "transport",
  travel: "transport",
  fuel: "transport",
  cab: "transport",
  taxi: "transport",

  shopping: "shopping",
  ecommerce: "shopping",
  "online shopping": "shopping",
  retail: "shopping",

  bills: "bills",
  utility: "bills",
  utilities: "bills",
  recharge: "bills",

  entertainment: "entertainment",
  movies: "entertainment",
  subscription: "entertainment",
  subscriptions: "entertainment",

  health: "health",
  medical: "health",
  pharmacy: "health",

  education: "education",
  books: "education",
  course: "education",
  courses: "education",

  other: "other",
  others: "other",
  misc: "other",
  miscellaneous: "other",
};

function normalizeCategory(rawCategory?: string): ExpenseCategory | undefined {
  if (!rawCategory) return undefined;

  const lowered = rawCategory.toLowerCase().trim();
  const cleaned = lowered.replace(/[_&/-]+/g, " ").replace(/\s+/g, " ").trim();

  if (validCategories.includes(cleaned as ExpenseCategory)) {
    return cleaned as ExpenseCategory;
  }

  if (CATEGORY_ALIASES[cleaned]) {
    return CATEGORY_ALIASES[cleaned];
  }

  for (const [key, value] of Object.entries(CATEGORY_ALIASES)) {
    if (cleaned.includes(key)) return value;
  }

  return undefined;
}

function resolveCategory(rawCategory: string | undefined, merchant: string, description?: string): ExpenseCategory {
  const normalized = normalizeCategory(rawCategory);
  if (normalized) return normalized;

  const merchantCategory = categorizeByMerchant(merchant);
  if (merchantCategory !== "other") return merchantCategory;

  if (description) {
    const descriptionCategory = categorizeByMerchant(description);
    if (descriptionCategory !== "other") return descriptionCategory;
  }

  return "other";
}

interface ParsedExpense {
  merchant: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  source: "ocr" | "csv";
  description?: string;
}

export function ImportExpenses({ onSuccess }: { onSuccess?: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const addExpense = useAddExpense();

  const updateParsedExpenseCategory = (index: number, category: ExpenseCategory) => {
    setParsedExpenses((prev) =>
      prev.map((expense, i) => (i === index ? { ...expense, category } : expense))
    );
  };

  const updateParsedExpenseDate = (index: number, date: string) => {
    setParsedExpenses((prev) =>
      prev.map((expense, i) =>
        i === index ? { ...expense, date: normalizeExpenseDate(date) } : expense
      )
    );
  };

  const setAllDatesToToday = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setParsedExpenses((prev) => prev.map((expense) => ({ ...expense, date: today })));
  };

  const handleFileUpload = async (file: File, source: "camera" | "upload") => {
    setIsProcessing(true);
    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type;

      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error("Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.");
      }

      const prompt = `You are an Indian receipt/invoice OCR system. Extract expense details from the image.
The available expense categories are: food, transport, shopping, bills, entertainment, health, education, other.
You MUST assign the most appropriate category based on the merchant/items.

Return ONLY valid JSON with this structure:
{
  "merchant": "store name",
  "amount": 123.45,
  "date": "YYYY-MM-DD",
  "category": "food",
  "items": [{"name": "item", "price": 10}]
}
For bank statements with multiple transactions, return:
{
  "expenses": [
    {"merchant": "name", "amount": 100, "date": "YYYY-MM-DD", "category": "food"},
    ...
  ]
}
Use today's date if not visible. Amount should be the total. Handle ₹ symbol.
Category guidelines: restaurants/food delivery=food, cab/train/fuel=transport, online shopping/retail=shopping, phone/electricity/gas=bills, movies/streaming/games=entertainment, pharmacy/hospital/doctor=health, courses/books/tuition=education.

Extract expense details from this receipt/invoice/statement.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType || "image/jpeg",
                      data: base64,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 1000,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        throw new Error("AI processing failed. Check your Gemini API key.");
      }

      const aiResponse = await response.json();
      const content = aiResponse.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("") || "";

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse receipt data from AI response");
      }

      const data = JSON.parse(jsonMatch[0]);

      if (data?.expenses && data.expenses.length > 0) {
        const expenses = data.expenses
          .map((e: any) => ({
            merchant: String(e.merchant || "").trim() || "Unknown",
            amount: parseAmount(e.amount),
            date: normalizeExpenseDate(e.date),
            category: resolveCategory(e.category, e.merchant || "", e.description),
            source: "ocr" as const,
          }))
          .filter((e: ParsedExpense) => e.amount > 0);

        if (expenses.length === 0) {
          toast.error("Could not detect valid amount(s) from receipt");
          return;
        }

        setParsedExpenses(expenses);
        toast.success(`Found ${expenses.length} expense(s)`);
      } else if (data?.merchant) {
        const expense = {
          merchant: String(data.merchant || "").trim() || "Unknown",
          amount: parseAmount(data.amount),
          date: normalizeExpenseDate(data.date),
          category: resolveCategory(data.category, data.merchant, data.description),
          source: "ocr" as const,
          description: data.description,
        };

        if (expense.amount <= 0) {
          toast.error("Could not detect a valid amount from receipt");
          return;
        }

        setParsedExpenses([expense]);
        toast.success("Receipt parsed successfully");
      } else {
        toast.error("Could not parse receipt");
      }
    } catch (error: any) {
      console.error("Parse error:", error);
      toast.error(error.message || "Failed to parse receipt");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCSVUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const expenses: ParsedExpense[] = [];

      // Detect columns from headers
      const headers = parseCSVLine(lines[0]);
      const categoryColIndex = findCategoryColumnIndex(headers);
      const descriptionColIndex = findColumnIndex(headers, ["description", "narration", "remarks", "note", "particulars", "transaction details"]);
      const debitColIndex = findColumnIndex(headers, ["debit", "withdrawal", "dr"]);
      const creditColIndex = findColumnIndex(headers, ["credit", "deposit", "cr"]);

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length < 3) continue;

        let amount = 0;
        let date = format(new Date(), "yyyy-MM-dd");
        let merchant = "";
        let csvCategory = "";
        let description = "";
        let isExpense = false;
        let hasExplicitDebitCreditMatch = false;

        // 1. Extract known columns
        if (categoryColIndex !== -1 && cols[categoryColIndex]) {
          csvCategory = cols[categoryColIndex].replace(/"/g, "").trim().toLowerCase();
        }
        if (descriptionColIndex !== -1 && cols[descriptionColIndex]) {
          description = cols[descriptionColIndex].replace(/"/g, "").trim();
        }

        // 2. Check for explicit Debit/Credit columns FIRST (Best Case)
        if (debitColIndex !== -1 && cols[debitColIndex]) {
          const debitVal = parseSignedAmount(cols[debitColIndex]);
          if (debitVal !== null && debitVal > 0) {
            amount = debitVal;
            isExpense = true;
            hasExplicitDebitCreditMatch = true;
          }
        }
        if (creditColIndex !== -1 && cols[creditColIndex] && !hasExplicitDebitCreditMatch) {
          const creditVal = parseSignedAmount(cols[creditColIndex]);
          if (creditVal !== null && creditVal > 0) {
            amount = creditVal; // It's money coming in
            isExpense = false; // We ignore this
            hasExplicitDebitCreditMatch = true;
          }
        }

        // 3. Fuzzy loop for remaining missing data (Dates, Merchants, fallback amounts)
        for (let j = 0; j < cols.length; j++) {
          if (j === categoryColIndex) continue;
          
          const col = cols[j];
          
          if (isDateString(col)) {
            date = normalizeExpenseDate(col);
          } else if (col.length > 2 && !merchant && j !== descriptionColIndex && j !== debitColIndex && j !== creditColIndex && Number.isNaN(Number(col.replace(/[₹,\s"]/g, "")))) {
            merchant = col.replace(/"/g, "").trim();
          }

          // If we didn't find amount via explicit Debit/Credit columns, look for a signed number
          if (amount === 0 && j !== debitColIndex && j !== creditColIndex) {
            const num = parseSignedAmount(col);
            if (num !== null && num !== 0) {
              if (num < 0) {
                // Negative signifies money going out (Expense)
                amount = Math.abs(num);
                isExpense = true;
                hasExplicitDebitCreditMatch = true;
              } else {
                amount = num;
              }
            }
          }
        }

        // Use description as merchant fallback if needed
        if (!merchant && description) {
          merchant = description;
        }

        // 4. Text-based detection (if no explicit minus sign or debit column was found)
        if (!hasExplicitDebitCreditMatch && amount > 0) {
          const descLower = description.toLowerCase();
          const expenseKw = ["upi", "pos", "debit", "swiggy", "zomato", "amazon", "uber", "bill", "atm", "ach", "chq", "withdrawal"];
          const incomeKw = ["salary", "refund", "credit", "neft inward", "rtgs inward", "interest", "deposit", "reversal"];

          if (incomeKw.some(kw => descLower.includes(kw))) {
            isExpense = false;
          } else if (expenseKw.some(kw => descLower.includes(kw))) {
            isExpense = true;
          } else {
            // If completely ambiguous in a single-column positive amount setup, we assume expense to be safe, unless it's a huge round number which might be deposit
            isExpense = true;
          }
        }

        // 5. Final check: ONLY push if it was flagged as an expense!
        if (isExpense && amount > 0 && merchant) {
          expenses.push({
            merchant,
            amount,
            date,
            category: resolveCategory(csvCategory, merchant, description),
            source: "csv",
            description,
          });
        }
      }

      if (expenses.length > 0) {
        setParsedExpenses(expenses);
        toast.success(`Found ${expenses.length} actual expense(s). Ignored credits/deposits.`);
      } else {
        toast.error("No valid expenses found. The CSV might only contain credits/deposits.");
      }
    } catch (error) {
      console.error("CSV parse error:", error);
      toast.error("Failed to parse CSV file");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveExpenses = async () => {
    setIsProcessing(true);
    let saved = 0;
    
    for (const expense of parsedExpenses) {
      try {
        await addExpense.mutateAsync({
          merchant: expense.merchant,
          amount: expense.amount,
          category: expense.category as any,
          expense_date: expense.date,
          source: expense.source,
        });
        saved++;
      } catch (error) {
        console.error("Save error:", error);
      }
    }

    if (saved === 0) {
      toast.error("No expenses were saved. Please check detected amounts and dates.");
      setIsProcessing(false);
      return;
    }

    toast.success(`Saved ${saved} expense(s)`);
    setParsedExpenses([]);
    setIsProcessing(false);
    onSuccess?.();
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="camera">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="camera">
            <Camera className="mr-2 h-4 w-4" />
            Camera
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="csv">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera" className="space-y-4">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "camera");
            }}
          />
          <Button
            className="w-full"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            Scan Receipt
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Point your camera at a receipt to scan it
          </p>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "upload");
            }}
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload Receipt Image or PDF
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Supports JPG, PNG, and PDF files
          </p>
        </TabsContent>

        <TabsContent value="csv" className="space-y-4">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCSVUpload(file);
            }}
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => csvInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Import Bank Statement CSV
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Works with HDFC, ICICI, SBI statements
          </p>
        </TabsContent>
      </Tabs>

      {parsedExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Found {parsedExpenses.length} Expense(s)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Home screen shows current month only. Adjust dates if needed.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={setAllDatesToToday}>
              Set All Dates to Today
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsedExpenses.map((expense, i) => (
              <div
                key={i}
                className="space-y-3 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-[70%]">
                    <p className="font-medium truncate" title={expense.description || expense.merchant}>
                      {expense.description || expense.merchant}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={expense.merchant !== expense.description ? expense.merchant : ""}>
                      {expense.merchant !== expense.description && expense.merchant ? `Matched: ${expense.merchant} ` : ""}
                      <span className="opacity-70">[{expense.source.toUpperCase()}]</span>
                    </p>
                  </div>
                  <p className="font-semibold text-right whitespace-nowrap pl-2">
                    ₹{expense.amount.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Date</p>
                  <input
                    type="date"
                    value={expense.date}
                    onChange={(e) => updateParsedExpenseDate(i, e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    max={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Category (auto-detected, you can change)
                  </p>
                  <Select
                    value={expense.category}
                    onValueChange={(value) => updateParsedExpenseCategory(i, value as ExpenseCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {validCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            <Button className="w-full" onClick={saveExpenses} disabled={isProcessing}>
              {isProcessing ? "Saving..." : "Save All Expenses"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Utilities
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function isDateString(str: string): boolean {
  const cleaned = str.replace(/"/g, "").trim();
  return /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/.test(cleaned);
}

function normalizeExpenseDate(value: unknown): string {
  if (!value) return format(new Date(), "yyyy-MM-dd");

  const str = String(value).replace(/"/g, "").trim();
  if (!str) return format(new Date(), "yyyy-MM-dd");

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/.test(str)) {
    return parseIndianDate(str);
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return format(parsed, "yyyy-MM-dd");
  }

  return format(new Date(), "yyyy-MM-dd");
}

function parseIndianDate(str: string): string {
  const cleaned = str.replace(/"/g, "").trim();
  const parts = cleaned.split(/[-\/]/);
  if (parts.length === 3) {
    let [part1, part2, part3] = parts;
    const fullYear = part3.length === 2 ? `20${part3}` : part3;

    const first = Number(part1);
    const second = Number(part2);

    const dayFirst = first > 12 || second <= 12;
    const day = dayFirst ? part1 : part2;
    const month = dayFirst ? part2 : part1;

    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return format(new Date(), "yyyy-MM-dd");
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value > 0 ? value : 0;

  const cleaned = String(value ?? "")
    .replace(/[₹,\s"]/g, "")
    .replace(/[()]/g, "")
    .trim();

  const num = Number(cleaned);
  if (!Number.isFinite(num)) return 0;
  return Math.abs(num);
}

function parseSignedAmount(value: unknown): number | null {
  if (typeof value === "number") return value;

  let cleaned = String(value ?? "")
    .replace(/[₹,\s"]/g, "")
    .trim();

  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = "-" + cleaned.slice(1, -1);
  } else if (cleaned.toLowerCase().endsWith("cr")) {
    cleaned = cleaned.toLowerCase().replace("cr", "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? Math.abs(num) : null;
  } else if (cleaned.toLowerCase().endsWith("dr")) {
    cleaned = "-" + cleaned.toLowerCase().replace("dr", "");
  }

  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return num;
}

function findCategoryColumnIndex(headers: string[]): number {
  const normalized = headers.map((h) => h ? h.toLowerCase().replace(/[_\s]+/g, " ").trim() : "");
  const names = ["category", "expense category", "type", "classification"];

  for (const name of names) {
    const idx = normalized.indexOf(name);
    if (idx !== -1) return idx;
  }
  for (const name of names) {
    const idx = normalized.findIndex((h) => h.includes(name));
    if (idx !== -1) return idx;
  }
  return -1;
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map((h) => (h ? h.toLowerCase().replace(/[_\s]+/g, " ").trim() : ""));

  for (const alias of aliases) {
    const exact = normalized.indexOf(alias);
    if (exact !== -1) return exact;
  }

  for (const alias of aliases) {
    const fuzzy = normalized.findIndex((h) => h.includes(alias));
    if (fuzzy !== -1) return fuzzy;
  }

  return -1;
}
