import { useState, useRef } from "react";
import { Camera, Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddExpense } from "@/hooks/useExpenses";
import { categorizeByMerchant, CATEGORY_ICONS } from "@/lib/merchant-rules";
import { supabase } from "@/integrations/supabase/client";
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

      const { data, error } = await supabase.functions.invoke("parse-receipt", {
        body: { image: base64, mimeType },
      });

      if (error) throw error;

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

      // Detect category column from headers
      const headers = parseCSVLine(lines[0]);
      const categoryColIndex = findCategoryColumnIndex(headers);
      const descriptionColIndex = findColumnIndex(headers, ["description", "narration", "remarks", "note", "particulars"]);

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length < 3) continue;

        let amount = 0;
        let date = format(new Date(), "yyyy-MM-dd");
        let merchant = "";
        let csvCategory = "";
        let description = "";

        // Extract category from detected column
        if (categoryColIndex !== -1 && cols[categoryColIndex]) {
          csvCategory = cols[categoryColIndex].replace(/"/g, "").trim().toLowerCase();
        }

        if (descriptionColIndex !== -1 && cols[descriptionColIndex]) {
          description = cols[descriptionColIndex].replace(/"/g, "").trim();
        }

        for (let j = 0; j < cols.length; j++) {
          if (j === categoryColIndex) continue; // skip category column
          const col = cols[j];
          const num = parseAmount(col);
          
          if (num > 0 && amount === 0) {
            amount = num;
          } else if (isDateString(col)) {
            date = normalizeExpenseDate(col);
          } else if (col.length > 2 && !merchant) {
            merchant = col.replace(/"/g, "").trim();
          }
        }

        if (amount > 0 && merchant) {
          expenses.push({
            merchant,
            amount,
            date,
            category: resolveCategory(csvCategory, merchant, description),
            source: "csv",
          });
        } else if (amount > 0 && description) {
          expenses.push({
            merchant: description,
            amount,
            date,
            category: resolveCategory(csvCategory, description, description),
            source: "csv",
          });
        }
      }

      if (expenses.length > 0) {
        setParsedExpenses(expenses);
        toast.success(`Found ${expenses.length} expense(s) in CSV`);
      } else {
        toast.error("No valid expenses found in CSV");
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
                  <div>
                    <p className="font-medium">{expense.merchant}</p>
                    <p className="text-sm text-muted-foreground">Source: {expense.source.toUpperCase()}</p>
                  </div>
                  <p className="font-semibold">₹{expense.amount.toLocaleString("en-IN")}</p>
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
