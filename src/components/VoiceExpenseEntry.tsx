
import { useState, useCallback } from "react";
import { Mic, MicOff, Loader2, CheckCircle, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAddExpense } from "@/hooks/useExpenses";
import { categorizeByMerchant, CATEGORY_ICONS } from "@/lib/merchant-rules";
import { callGemini } from "@/lib/gemini";
import { Constants } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const categories = Constants.public.Enums.expense_category;
type ExpenseCategory = (typeof categories)[number];

interface ParsedExpense {
  merchant: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
}

// Tanglish regex patterns – handles common Tamil-English spend phrases
const TANGLISH_PATTERNS = [
  // "Swiggy pe 420 spend panni iruken" / "Swiggy la 420 poyechu"
  /([a-z0-9 ]+?)\s+(?:pe|la|le|ku|il)\s+(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:spend|apend|panni|poyechu|pay|paid|kuduthen|koduthen|pottu|pottu iruken|iruken|airken)?/i,
  // "420 Swiggy ku poyechu"
  /(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s+([a-z0-9 ]+?)\s+(?:pe|la|le|ku|il|ku)\s+(?:poyechu|spend|pay|paid|kuduthen)/i,
  // "paid 420 to Swiggy" / "420 to Swiggy"
  /(?:paid|pay|spent|spend)?\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s+(?:to|for|at|in)\s+([a-z0-9 ]+)/i,
  // "Swiggy 420"
  /^([a-z][a-z0-9 ]{1,20})\s+(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)$/i,
];

function parseTanglishLocally(text: string): ParsedExpense | null {
  const cleaned = text.replace(/[.,!?]/g, "").trim().toLowerCase();

  for (const pattern of TANGLISH_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      // Figure out which group is merchant vs amount
      const g1 = match[1]?.trim();
      const g2 = match[2]?.trim();

      let merchant = "";
      let amount = 0;

      if (g1 && g2) {
        const g1num = parseFloat(g1);
        const g2num = parseFloat(g2);
        if (!isNaN(g1num) && isNaN(g2num)) {
          amount = g1num;
          merchant = g2;
        } else if (!isNaN(g2num) && isNaN(g1num)) {
          merchant = g1;
          amount = g2num;
        } else if (!isNaN(g2num)) {
          merchant = g1;
          amount = g2num;
        }
      }

      if (merchant && amount > 0) {
        // Capitalise merchant
        const capitalised = merchant
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        const category = categorizeByMerchant(merchant) as ExpenseCategory;
        return { merchant: capitalised, amount, category };
      }
    }
  }
  return null;
}

async function parseWithGemini(transcript: string): Promise<ParsedExpense | null> {
  const prompt = `You are parsing a voice expense entry in Tanglish (Tamil-English mix) for an Indian expense tracking app.

User said: "${transcript}"

Extract the expense details from this Tanglish/English phrase. Common Tamil words:
- "pe", "la", "le", "ku", "il" = at/on/to (prepositions)
- "spend panni iruken" / "apend panni iruken" = "I spent"
- "poyechu" = "it went" (money was spent)
- "kuduthen" / "koduthen" = "I paid"
- "pottu" / "pottu iruken" = "put in" (spent)
- "airken" / "iruken" = "I have" (did)

Return ONLY a JSON object with these exact fields (no markdown, no extra text):
{
  "merchant": "merchant name (properly capitalised)",
  "amount": 420,
  "category": "food",
  "description": "optional short note"
}

Category must be one of: food, transport, shopping, bills, entertainment, health, education, other

If you cannot parse the expense, return: {"error": "cannot parse"}`;

  try {
    const raw = await callGemini(prompt);
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.error || !parsed.merchant || !parsed.amount) return null;
    return {
      merchant: parsed.merchant,
      amount: Number(parsed.amount),
      category: (parsed.category as ExpenseCategory) || "other",
      description: parsed.description,
    };
  } catch {
    return null;
  }
}

interface VoiceExpenseEntryProps {
  onSuccess?: () => void;
}

type RecordingState = "idle" | "recording" | "processing" | "parsed" | "error";

export function VoiceExpenseEntry({ onSuccess }: VoiceExpenseEntryProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null);
  const [editedExpense, setEditedExpense] = useState<ParsedExpense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addExpense = useAddExpense();

  const isSpeechSupported =
    typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice input not supported in this browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    setState("recording");
    setTranscript("");
    setParsedExpense(null);
    setEditedExpense(null);

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setState("processing");

      // Try local parse first (fast)
      const localResult = parseTanglishLocally(text);
      if (localResult) {
        setParsedExpense(localResult);
        setEditedExpense(localResult);
        setState("parsed");
        return;
      }

      // Fall back to Gemini
      try {
        const geminiResult = await parseWithGemini(text);
        if (geminiResult) {
          setParsedExpense(geminiResult);
          setEditedExpense(geminiResult);
          setState("parsed");
        } else {
          setState("error");
          toast.error("Couldn't parse the expense. Try again or use manual entry.");
        }
      } catch {
        setState("error");
        toast.error("Gemini parsing failed. Check API key.");
      }
    };

    recognition.onerror = () => {
      setState("error");
      toast.error("Microphone error. Check permissions and try again.");
    };

    recognition.onend = () => {
      if (state === "recording") setState("idle");
    };

    recognition.start();
  }, [state]);

  const handleSubmit = async () => {
    if (!editedExpense) return;
    setIsSubmitting(true);
    try {
      await addExpense.mutateAsync({
        merchant: editedExpense.merchant,
        amount: editedExpense.amount,
        category: editedExpense.category,
        expense_date: format(new Date(), "yyyy-MM-dd"),
        description: editedExpense.description || null,
        source: "manual",
      });
      toast.success(`₹${editedExpense.amount} at ${editedExpense.merchant} added! 🎉`);
      setState("idle");
      setTranscript("");
      setParsedExpense(null);
      setEditedExpense(null);
      onSuccess?.();
    } catch {
      toast.error("Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setState("idle");
    setTranscript("");
    setParsedExpense(null);
    setEditedExpense(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}


      {/* Mic Button */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={state === "idle" || state === "error" ? startRecording : undefined}
          disabled={state === "processing" || state === "parsed" || !isSpeechSupported}
          className={cn(
            "relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 focus:outline-none",
            state === "recording"
              ? "bg-red-500 shadow-[0_0_0_8px_rgba(239,68,68,0.3)] animate-pulse cursor-default"
              : state === "processing"
              ? "bg-purple-500 cursor-wait"
              : state === "parsed"
              ? "bg-green-500 cursor-default"
              : state === "error"
              ? "bg-orange-500 cursor-pointer hover:bg-orange-600"
              : "bg-primary cursor-pointer hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105"
          )}
        >
          {state === "recording" ? (
            <MicOff className="h-10 w-10 text-white" />
          ) : state === "processing" ? (
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          ) : state === "parsed" ? (
            <CheckCircle className="h-10 w-10 text-white" />
          ) : (
            <Mic className="h-10 w-10 text-white" />
          )}
          {state === "recording" && (
            <span className="absolute -inset-1 rounded-full border-2 border-red-400 animate-ping" />
          )}
        </button>

        <p className="text-sm font-medium text-muted-foreground">
          {state === "idle" && (isSpeechSupported ? "Tap to speak" : "Voice not supported in this browser")}
          {state === "recording" && "🎙️ Listening... speak now"}
          {state === "processing" && "✨ Parsing with Gemini AI..."}
          {state === "parsed" && "✅ Expense parsed!"}
          {state === "error" && "❌ Tap to try again"}
        </p>
      </div>

      {/* Transcript */}
      {transcript && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-purple-600 font-medium mb-1">You said:</p>
            <p className="text-sm text-purple-900 italic">"{transcript}"</p>
          </CardContent>
        </Card>
      )}

      {/* Parsed Result – Editable */}
      {state === "parsed" && editedExpense && (
        <Card className="border-green-200">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-purple-500" /> AI Detected
              </p>
              <Badge variant="outline" className="text-xs border-green-400 text-green-700">
                Edit if needed
              </Badge>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Merchant</label>
                <Input
                  value={editedExpense.merchant}
                  onChange={(e) => setEditedExpense((prev) => prev ? { ...prev, merchant: e.target.value } : prev)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Amount (₹)</label>
                  <Input
                    type="number"
                    value={editedExpense.amount}
                    onChange={(e) => setEditedExpense((prev) => prev ? { ...prev, amount: Number(e.target.value) } : prev)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                  <Select
                    value={editedExpense.category}
                    onValueChange={(v) => setEditedExpense((prev) => prev ? { ...prev, category: v as ExpenseCategory } : prev)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
              <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {isSubmitting ? "Adding..." : `Add ₹${editedExpense.amount} · ${editedExpense.merchant}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isSpeechSupported && (
        <p className="text-center text-xs text-destructive">
          Use Chrome or Edge on Android for voice input support.
        </p>
      )}
    </div>
  );
}
