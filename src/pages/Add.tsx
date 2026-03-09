import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function Add() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="flex items-center gap-3 border-b bg-card/50 px-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Add Expense</h1>
      </header>

      <main className="mx-auto max-w-md p-4">
        <Card>
          <CardHeader>
            <CardTitle>Manual Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <AddExpenseForm onSuccess={() => navigate("/")} />
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
