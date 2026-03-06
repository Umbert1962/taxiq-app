import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Car, Loader2, CheckCircle, XCircle, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Hasło musi mieć min. 6 znaków"),
  confirmPassword: z.string().min(6, "Potwierdź hasło"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być takie same",
  path: ["confirmPassword"],
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const params = new URLSearchParams(search);
  const token = params.get("token");

  const forgotForm = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const { data: tokenValid, isLoading: verifyingToken } = useQuery({
    queryKey: ["/api/passengers/verify-reset-token", token],
    queryFn: async () => {
      if (!token) return null;
      const res = await fetch(`/api/passengers/verify-reset-token?token=${token}`);
      return res.json();
    },
    enabled: !!token,
  });

  const forgotMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      const res = await apiRequest("POST", "/api/passengers/forgot-password", data);
      return res.json();
    },
    onSuccess: () => {
      setEmailSent(true);
      toast({ title: "Email wysłany", description: "Sprawdź swoją skrzynkę pocztową" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Błąd", 
        description: error.message || "Nie udało się wysłać emaila",
        variant: "destructive" 
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const res = await apiRequest("POST", "/api/passengers/reset-password", {
        token,
        password: data.password,
      });
      return res.json();
    },
    onSuccess: () => {
      setResetComplete(true);
      toast({ title: "Hasło zmienione", description: "Możesz się teraz zalogować" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Błąd", 
        description: error.message || "Nie udało się zmienić hasła",
        variant: "destructive" 
      });
    },
  });

  if (token) {
    if (verifyingToken) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Weryfikacja tokena...</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!tokenValid?.valid) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <CardTitle>Link wygasł lub jest nieprawidłowy</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">{tokenValid?.error || "Token jest nieprawidłowy"}</p>
              <Button onClick={() => setLocation("/reset-password")} data-testid="button-request-new-link">
                Poproś o nowy link
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (resetComplete) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Hasło zostało zmienione</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">Możesz teraz zalogować się nowym hasłem</p>
              <Button onClick={() => setLocation("/passenger")} data-testid="button-go-to-login">
                Przejdź do logowania
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Car className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary glow-text">TaxiQ</span>
            </div>
            <CardTitle>Ustaw nowe hasło</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit((data) => resetMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nowe hasło</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Min. 6 znaków" 
                            {...field} 
                            data-testid="input-new-password" 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potwierdź hasło</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="Wpisz ponownie" 
                            {...field} 
                            data-testid="input-confirm-password" 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            data-testid="button-toggle-confirm-password"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={resetMutation.isPending} data-testid="button-reset-password">
                  {resetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zmień hasło
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>Sprawdź swoją skrzynkę</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Jeśli podany email jest zarejestrowany, otrzymasz link do resetowania hasła.
            </p>
            <p className="text-sm text-muted-foreground">
              Nie widzisz emaila? Sprawdź folder SPAM.
            </p>
            <Button variant="outline" onClick={() => setLocation("/passenger")} data-testid="button-back-to-login">
              Wróć do logowania
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-4">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          data-testid="link-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Strona główna
        </a>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Car className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary glow-text">TaxiQ</span>
          </div>
          <CardTitle>Zapomniałeś hasła?</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            Podaj swój adres email, a wyślemy Ci link do resetowania hasła.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...forgotForm}>
            <form onSubmit={forgotForm.handleSubmit((data) => forgotMutation.mutate(data))} className="space-y-4">
              <FormField
                control={forgotForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="twoj@email.com" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={forgotMutation.isPending} data-testid="button-send-reset-link">
                {forgotMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Wyślij link do resetu
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setLocation("/passenger")} type="button" data-testid="button-cancel">
                Anuluj
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
