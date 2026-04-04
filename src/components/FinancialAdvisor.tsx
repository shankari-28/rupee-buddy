import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, TrendingUp, Award, Zap } from "lucide-react";
import { useFinancialAdvisor } from "@/hooks/useFinancialAdvisor";
import { cn } from "@/lib/utils";

interface FinancialAdvisorProps {
  dateRange?: { start: Date; end: Date };
  monthlyIncome?: number;
  className?: string;
}

export function FinancialAdvisor({ dateRange, monthlyIncome = 50000, className }: FinancialAdvisorProps) {
  const { data: advice, isLoading, error } = useFinancialAdvisor({ dateRange, monthlyIncome });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !advice) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to generate financial advice. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case "Low":
        return "default";
      case "Medium":
        return "secondary";
      case "High":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getSpenderBadgeColor = (spenderType: string) => {
    switch (spenderType) {
      case "Smart Saver":
        return "bg-green-100 text-green-900 hover:bg-green-100";
      case "Moderate Spender":
        return "bg-blue-100 text-blue-900 hover:bg-blue-100";
      case "High Spender":
        return "bg-orange-100 text-orange-900 hover:bg-orange-100";
      default:
        return "";
    }
  };

  const getSpenderIcon = (spenderType: string) => {
    switch (spenderType) {
      case "Smart Saver":
        return <Award className="mr-2 h-4 w-4" />;
      case "Moderate Spender":
        return <TrendingUp className="mr-2 h-4 w-4" />;
      case "High Spender":
        return <AlertCircle className="mr-2 h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Your Financial Profile
              </CardTitle>
              <CardDescription>
                AI-powered insights based on your spending patterns
                {import.meta.env.VITE_HF_API_TOKEN && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                    🔗 AI Connected
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Spender Type */}
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">Classification</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge className={cn("mt-1", getSpenderBadgeColor(advice.spenderType))}>
                  {getSpenderIcon(advice.spenderType)}
                  {advice.spenderType}
                </Badge>
              </div>
            </div>

            {/* Risk Level */}
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={getRiskBadgeVariant(advice.riskLevel)} className="text-sm">
                  {advice.riskLevel} Risk
                </Badge>
                {advice.aiSuggestionUsed && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    🤖 AI Enhanced
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {advice.riskLevel === "Low" && "Strong financial position"}
                {advice.riskLevel === "Medium" && "Room for improvement"}
                {advice.riskLevel === "High" && "Needs immediate attention"}
              </p>
            </div>

            {/* Savings Potential */}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-lg border p-4 cursor-help relative group bg-card transition-colors hover:bg-muted/30">
                    <p className="text-sm font-medium text-muted-foreground border-b border-dashed border-muted-foreground/30 inline-block pb-0.5">
                      Monthly Savings Potential
                    </p>
                    <p className="mt-2 text-2xl font-bold text-green-600">₹{advice.savingsPotential.toLocaleString()}</p>
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 w-56 text-xs space-y-1.5 shadow-lg relative z-[100]">
                  <p className="font-semibold border-b pb-1 mb-2 text-sm text-foreground">Potential Breakdown</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Current Unspent:</span> 
                    <span className="font-medium text-foreground">₹{advice.savingsPotentialBreakdown?.baseSavings?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Food (-15%):</span> 
                    <span className="font-semibold text-green-500">+₹{advice.savingsPotentialBreakdown?.foodCut?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Transport (-20%):</span> 
                    <span className="font-semibold text-green-500">+₹{advice.savingsPotentialBreakdown?.transportCut?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Others (-20%):</span> 
                    <span className="font-semibold text-green-500">+₹{advice.savingsPotentialBreakdown?.othersCut?.toLocaleString() || 0}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Spending Breakdown */}
          <div className="mt-4 rounded-lg bg-muted p-3">
            <p className="mb-3 text-sm font-medium">Spending Distribution</p>
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Food</p>
                <p className="font-semibold">{advice.spendingBreakdown.food.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transport</p>
                <p className="font-semibold">{advice.spendingBreakdown.transport.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Others</p>
                <p className="font-semibold">{advice.spendingBreakdown.others.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Savings Rate */}
          <div className="mt-3 rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-3">
            <p className="text-sm font-medium text-blue-900">Current Savings Rate</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{advice.savingsRate.toFixed(1)}%</p>
            <p className="text-xs text-blue-700">of your monthly income</p>
          </div>
        </CardContent>
      </Card>

      {/* Advice Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Personalized Advice</CardTitle>
          <CardDescription>
            Based on your spending analysis and financial patterns
            {advice.aiSuggestionUsed && (
              <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                🤖 AI Enhanced
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {advice.advicePoints.map((point, index) => (
              <li key={index} className="flex gap-3 rounded-lg border border-muted bg-card p-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="text-sm leading-relaxed text-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Motivational Section */}
      <Alert className="border-green-200 bg-green-50">
        <AlertCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <span className="font-semibold">Remember: </span>
          {advice.motivationalLine}
        </AlertDescription>
      </Alert>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground">
        💡 <span className="font-medium">Note:</span> This advice is generated using AI and your expense data. For personalized financial planning, consider consulting a financial advisor. All suggestions are based on standard budgeting principles adapted for Indian financial contexts.
      </p>
    </div>
  );
}
