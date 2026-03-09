import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAddExpense } from "@/hooks/useExpenses";
import { categorizeByMerchant, CATEGORY_ICONS } from "@/lib/merchant-rules";
import { Constants } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categories = Constants.public.Enums.expense_category;
type ExpenseCategory = (typeof categories)[number];

const formSchema = z.object({
  merchant: z.string().min(1, "Merchant is required"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Enter a valid amount"),
  category: z.string(),
  expense_date: z.date(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddExpenseFormProps {
  onSuccess?: () => void;
}

export function AddExpenseForm({ onSuccess }: AddExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addExpense = useAddExpense();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      merchant: "",
      amount: "",
      category: "other",
      expense_date: new Date(),
      description: "",
    },
  });

  const watchMerchant = form.watch("merchant");

  // Auto-categorize when merchant changes
  const handleMerchantChange = (value: string) => {
    form.setValue("merchant", value);
    const suggestedCategory = categorizeByMerchant(value);
    if (suggestedCategory !== "other") {
      form.setValue("category", suggestedCategory);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await addExpense.mutateAsync({
        merchant: data.merchant,
        amount: Number(data.amount),
        category: data.category as any,
        expense_date: format(data.expense_date, "yyyy-MM-dd"),
        description: data.description || null,
        source: "manual",
      });
      toast.success("Expense added successfully!");
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="merchant"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Merchant / Store</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Swiggy, Amazon, Uber"
                  {...field}
                  onChange={(e) => handleMerchantChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (₹)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expense_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : "Pick a date"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Add a note..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Expense"}
        </Button>
      </form>
    </Form>
  );
}
