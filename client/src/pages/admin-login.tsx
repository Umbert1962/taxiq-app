import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Settings, LogIn, Loader2, ArrowLeft, Phone, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/logo/logo-taxiq-neon.jpg";

type Step = "phone" | "otp" | "set-pin" | "pin";

const phoneSchema = z.object({
  phone: z.string().min(9, "Podaj numer telefonu"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Kod musi mieć 6 cyfr"),
});

const pinSchema = z.object({
  pin: z.string().length(6, "PIN musi mieć 6 cyfr").regex(/^\d{6}$/, "PIN może zawierać tylko cyfry"),
});

const setPinSchema = z.object({
  pin: z.string().length(6, "PIN musi mieć 6 cyfr").regex(/^\d{6}$/, "PIN może zawierać tylko cyfry"),
  pinConfirm: z.string().length(6, "Potwierdź PIN"),
}).refine((data) => data.pin === data.pinConfirm, {
  message: "PIN-y muszą być identyczne",
  path: ["pinConfirm"],
});

export default function AdminLogin() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(() => {
    const savedPhone = sessionStorage.getItem("admin_login_phone");
    return savedPhone ? "pin" : "phone";
  });
  const [phone, setPhone] = useState(() => sessionStorage.getItem("admin_login_phone") || "");
  const [sessionConflict, setSessionConflict] = useState(false);

  const { data: sessionData } = useQuery({
    queryKey: ["/api/admin/session"],
    queryFn: async () => {
      const res = await fetch("/api/admin/session", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (sessionData?.id) {
      window.location.href = "/admin/dashboard";
    }
  }, [sessionData]);

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const pinForm = useForm<z.infer<typeof pinSchema>>({
    resolver: zodResolver(pinSchema),
    defaultValues: { pin: "" },
  });

  const setPinForm = useForm<z.infer<typeof setPinSchema>>({
    resolver: zodResolver(setPinSchema),
    defaultValues: { pin: "", pinConfirm: "" },
  });

  const requestAccessMutation = useMutation({
    mutationFn: async (data: { phone: string }) => {
      const res = await fetch("/auth/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, role: "admin" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Błąd");
      return body;
    },
    onSuccess: (data) => {
      const phoneVal = phoneForm.getValues("phone");
      setPhone(phoneVal);
      sessionStorage.setItem("admin_login_phone", phoneVal);
      if (data.status === "PIN_REQUIRED") {
        setStep("pin");
      } else if (data.status === "OTP_SENT") {
        setStep("otp");
        toast({ title: "Kod wysłany", description: "Sprawdź SMS na swoim telefonie." });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { phone: string; otp: string }) => {
      const res = await fetch("/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, role: "admin" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Błąd");
      return body;
    },
    onSuccess: (data) => {
      if (data.status === "SET_PIN_REQUIRED") {
        setStep("set-pin");
      }
    },
    onError: (error: Error) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const setPinMutation = useMutation({
    mutationFn: async (data: { phone: string; pin: string }) => {
      const res = await fetch("/auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, role: "admin" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Błąd");
      return body;
    },
    onSuccess: () => {
      sessionStorage.removeItem("admin_login_phone");
      toast({ title: "PIN ustawiony", description: "Zalogowano pomyślnie." });
      window.location.href = "/admin/dashboard";
    },
    onError: (error: Error) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const loginPinMutation = useMutation({
    mutationFn: async (data: { phone: string; pin: string; forceLogin?: boolean }) => {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, role: "admin" }),
      });
      const body = await res.json();
      if (res.status === 409 && body.error === "session_conflict") {
        throw { isConflict: true };
      }
      if (!res.ok) throw new Error(body.error || "Błąd");
      return body;
    },
    onSuccess: () => {
      setSessionConflict(false);
      sessionStorage.removeItem("admin_login_phone");
      window.location.href = "/admin/dashboard";
    },
    onError: (error: any) => {
      if (error?.isConflict) {
        setSessionConflict(true);
        return;
      }
      toast({ title: "Błąd logowania", description: error.message, variant: "destructive" });
    },
  });

  const forgotPinMutation = useMutation({
    mutationFn: async (data: { phone: string }) => {
      const res = await fetch("/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, role: "admin" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Błąd");
      return body;
    },
    onSuccess: () => {
      setStep("otp");
      toast({ title: "Kod wysłany", description: "Nowy kod OTP został wysłany na Twój telefon." });
    },
    onError: (error: Error) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const getStepDescription = () => {
    switch (step) {
      case "phone": return "Podaj numer telefonu administratora";
      case "otp": return "Wpisz kod SMS wysłany na Twój telefon";
      case "set-pin": return "Ustaw 6-cyfrowy PIN do logowania";
      case "pin": return "Wpisz swój 6-cyfrowy PIN";
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case "phone": return <Phone className="w-5 h-5 text-primary" />;
      case "otp": return <ShieldCheck className="w-5 h-5 text-primary" />;
      case "set-pin": return <KeyRound className="w-5 h-5 text-primary" />;
      case "pin": return <LogIn className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 pt-4">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          data-testid="link-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Strona główna
        </a>
      </div>
      <header className="relative overflow-hidden py-8">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="relative container mx-auto px-4 flex flex-col items-center">
          <img
            src={logoImage}
            alt="TaxiQ Logo"
            className="w-auto"
            style={{
              height: "80px",
              filter: "drop-shadow(0 0 10px rgba(230, 255, 63, 0.4)) drop-shadow(0 0 25px rgba(230, 255, 63, 0.15))",
            }}
            data-testid="img-logo"
          />
          <h1 className="text-xl font-bold mt-4">Panel Administratora</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Card className="max-w-md mx-auto glow-border">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {getStepIcon()}
              TaxiQ Admin
            </CardTitle>
            <CardDescription>{getStepDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            {step === "phone" && (
              <Form {...phoneForm}>
                <form
                  onSubmit={phoneForm.handleSubmit((d) => requestAccessMutation.mutate(d))}
                  className="space-y-4"
                >
                  <FormField
                    control={phoneForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numer telefonu</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            inputMode="tel"
                            placeholder="+48 xxx xxx xxx"
                            autoComplete="off"
                            data-testid="input-admin-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={requestAccessMutation.isPending}
                    data-testid="button-request-access"
                  >
                    {requestAccessMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Phone className="w-4 h-4 mr-2" />
                    )}
                    Dalej
                  </Button>
                </form>
              </Form>
            )}

            {step === "otp" && (
              <Form {...otpForm}>
                <form
                  onSubmit={otpForm.handleSubmit((d) => verifyOtpMutation.mutate({ phone, otp: d.otp }))}
                  className="space-y-4"
                >
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kod SMS</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            autoComplete="one-time-code"
                            data-testid="input-admin-otp"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={verifyOtpMutation.isPending}
                    data-testid="button-verify-otp"
                  >
                    {verifyOtpMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 mr-2" />
                    )}
                    Zweryfikuj kod
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => { setStep("phone"); otpForm.reset(); sessionStorage.removeItem("admin_login_phone"); }}
                    data-testid="button-back-to-phone"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Zmień numer
                  </Button>
                </form>
              </Form>
            )}

            {step === "set-pin" && (
              <Form {...setPinForm}>
                <form
                  onSubmit={setPinForm.handleSubmit((d) => setPinMutation.mutate({ phone, pin: d.pin }))}
                  className="space-y-4"
                >
                  <FormField
                    control={setPinForm.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nowy PIN (6 cyfr)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="------"
                            autoComplete="new-password"
                            data-testid="input-admin-new-pin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={setPinForm.control}
                    name="pinConfirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potwierdź PIN</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="------"
                            autoComplete="new-password"
                            data-testid="input-admin-confirm-pin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={setPinMutation.isPending}
                    data-testid="button-set-pin"
                  >
                    {setPinMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <KeyRound className="w-4 h-4 mr-2" />
                    )}
                    Ustaw PIN i zaloguj
                  </Button>
                </form>
              </Form>
            )}

            {step === "pin" && (
              <Form {...pinForm}>
                <form
                  onSubmit={pinForm.handleSubmit((d) => loginPinMutation.mutate({ phone, pin: d.pin }))}
                  className="space-y-4"
                >
                  <FormField
                    control={pinForm.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIN</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="------"
                            autoComplete="off"
                            data-testid="input-admin-pin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {sessionConflict ? (
                    <div className="space-y-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                      <p className="text-sm text-center font-medium">Jesteś zalogowany na innym urządzeniu. Czy chcesz się wylogować z tamtego urządzenia i zalogować tutaj?</p>
                      <div className="flex gap-2">
                        <Button className="flex-1" variant="outline" onClick={() => setSessionConflict(false)} data-testid="button-session-cancel">
                          Nie
                        </Button>
                        <Button className="flex-1" type="button" onClick={() => loginPinMutation.mutate({ phone, pin: pinForm.getValues("pin"), forceLogin: true })} disabled={loginPinMutation.isPending} data-testid="button-session-force">
                          {loginPinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Tak, zaloguj tutaj
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginPinMutation.isPending}
                      data-testid="button-login-pin"
                    >
                      {loginPinMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <LogIn className="w-4 h-4 mr-2" />
                      )}
                      Zaloguj się
                    </Button>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      disabled={forgotPinMutation.isPending}
                      onClick={() => forgotPinMutation.mutate({ phone })}
                      data-testid="button-forgot-pin"
                    >
                      {forgotPinMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Zapomniałem PIN
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => { setStep("phone"); pinForm.reset(); sessionStorage.removeItem("admin_login_phone"); }}
                      data-testid="button-change-phone"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Zmień numer
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/")}
            data-testid="link-home"
            className="text-primary underline-offset-4 hover:underline"
          >
            Powrót do strony głównej
          </Button>
        </div>
      </main>
    </div>
  );
}
