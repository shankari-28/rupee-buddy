import { Database } from "@/integrations/supabase/types";
import { CATEGORY_ICONS } from "@/lib/merchant-rules";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];

interface ExpenseCardProps {
  expense: Expense;
  onDelete?: (id: string) => void;
}

export function ExpenseCard({ expense, onDelete }: ExpenseCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg">
        {CATEGORY_ICONS[expense.category]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{expense.merchant}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(expense.expense_date), "dd MMM yyyy")} • {expense.category}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <p className="font-semibold text-right">₹{Number(expense.amount).toLocaleString("en-IN")}</p>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(expense.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
