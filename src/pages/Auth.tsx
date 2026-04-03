import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Chrome, Loader2 } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthData = z.infer<typeof authSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, sendPasswordResetEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<AuthData>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: AuthData) => {
    setIsLoading(true);
    try {
      if (tab === "signin") {
        const { error } = await signIn(data.email, data.password);
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        const { error } = await signUp(data.email, data.password);
        if (error) throw error;
        toast.success("Account created! Please check your email to verify.");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Google sign-in failed");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = form.getValues("email");
    if (!email) {
      toast.error("Enter your email first");
      return;
    }

    setIsResetLoading(true);
    try {
      const { error } = await sendPasswordResetEmail(email);
      if (error) throw error;
      toast.success("Password reset email sent. Check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">TrackSpend</h1>
        <p className="mt-1 text-muted-foreground">Simple expense tracking for India</p>
      </div>

      <Card className="w-full max-w-sm">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="••••••"
                            type={showPassword ? "text" : "password"}
                            className="pr-10"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {tab === "signin" && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Use your email or Google account.</span>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={handlePasswordReset}
                      disabled={isResetLoading}
                    >
                      {isResetLoading ? "Sending..." : "Forgot password?"}
                    </Button>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Loading..." : tab === "signin" ? "Sign In" : "Create Account"}
                </Button>
                <div className="relative py-2">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    or
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Chrome className="h-4 w-4" />
                  )}
                  Continue with Google
                </Button>
              </form>
            </Form>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
