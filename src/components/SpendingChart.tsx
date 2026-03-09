import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/merchant-rules";
import { Database } from "@/integrations/supabase/types";

type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

interface SpendingChartProps {
  data: Record<ExpenseCategory, number>;
}

export function SpendingChart({ data }: SpendingChartProps) {
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([category, value]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value,
      category: category as ExpenseCategory,
    }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        No spending data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Amount"]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend
          formatter={(value, entry: any) => (
            <span className="text-xs">
              {CATEGORY_ICONS[entry.payload.category]} {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
