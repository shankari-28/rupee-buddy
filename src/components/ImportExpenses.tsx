import { useState, useRef } from "react";
import { Camera, Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAddExpense } from "@/hooks/useExpenses";
import { categorizeByMerchant } from "@/lib/merchant-rules";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Constants } from "@/integrations/supabase/types";

const validCategories = Constants.public.Enums.expense_category;

function resolveCategory(aiCategory: string | undefined, merchant: string): string {
  // First try AI-suggested category
  if (aiCategory && validCategories.includes(aiCategory as any)) {
    return aiCategory;
  }
  // Fallback to merchant-based rules
  return categorizeByMerchant(merchant);
}

interface ParsedExpense {
  merchant: string;
  amount: number;
  date: string;
  category: string;
}

export function ImportExpenses({ onSuccess }: { onSuccess?: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const addExpense = useAddExpense();

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
        const expenses = data.expenses.map((e: any) => ({
          merchant: e.merchant || "Unknown",
          amount: e.amount || 0,
          date: e.date || format(new Date(), "yyyy-MM-dd"),
          category: resolveCategory(e.category, e.merchant || ""),
        }));
        setParsedExpenses(expenses);
        toast.success(`Found ${expenses.length} expense(s)`);
      } else if (data?.merchant) {
        const expense = {
          merchant: data.merchant,
          amount: data.amount || 0,
          date: data.date || format(new Date(), "yyyy-MM-dd"),
          category: categorizeByMerchant(data.merchant),
        };
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

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length < 3) continue;

        // Try to find amount, date, and description
        let amount = 0;
        let date = format(new Date(), "yyyy-MM-dd");
        let merchant = "";

        for (const col of cols) {
          const cleaned = col.replace(/[₹,\s"]/g, "").trim();
          const num = parseFloat(cleaned);
          
          if (!isNaN(num) && num > 0 && amount === 0) {
            amount = num;
          } else if (isDateString(col)) {
            date = parseIndianDate(col);
          } else if (col.length > 2 && !merchant) {
            merchant = col.replace(/"/g, "").trim();
          }
        }

        if (amount > 0 && merchant) {
          expenses.push({
            merchant,
            amount,
            date,
            category: categorizeByMerchant(merchant),
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
          source: "ocr",
        });
        saved++;
      } catch (error) {
        console.error("Save error:", error);
      }
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
          </CardHeader>
          <CardContent className="space-y-3">
            {parsedExpenses.map((expense, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{expense.merchant}</p>
                  <p className="text-sm text-muted-foreground">
                    {expense.date} • {expense.category}
                  </p>
                </div>
                <p className="font-semibold">₹{expense.amount.toLocaleString("en-IN")}</p>
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
  return /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(str);
}

function parseIndianDate(str: string): string {
  const cleaned = str.replace(/"/g, "").trim();
  const parts = cleaned.split(/[-\/]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return format(new Date(), "yyyy-MM-dd");
}
