import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Car, LogIn, UserPlus, Loader2, ArrowLeft, Eye, EyeOff, Phone, KeyRound, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logoImage from "@assets/logo/logo-taxiq-neon.jpg";

type LoginStep = "phone" | "pin" | "otp" | "set-pin";

const registerSchema = z.object({
  firstName: z.string().min(2, "Podaj imię"),
  lastName: z.string().min(2, "Podaj nazwisko"),
  phoneNumber: z.string().min(9, "Podaj numer telefonu"),
});

type RegisterData = z.infer<typeof registerSchema>;
type RegStep = "form" | "otp" | "set-pin";

export default function DriverLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get("ref") || "";
  const tabFromUrl = urlParams.get("tab");

  const savedRegStep = sessionStorage.getItem("driver_reg_step");
  const hasActiveReg = (savedRegStep === "otp" || savedRegStep === "set-pin") && sessionStorage.getItem("driver_reg_phone");
  const [tab, setTab] = useState(tabFromUrl === "register" || hasActiveReg ? "register" : "login");
  const [referralCodeValue, setReferralCodeValue] = useState(refFromUrl);
  const [regStep, setRegStep] = useState<RegStep>(() => {
    const savedStep = sessionStorage.getItem("driver_reg_step");
    const savedPhone = sessionStorage.getItem("driver_reg_phone");
    if ((savedStep === "otp" || savedStep === "set-pin") && savedPhone) {
      return savedStep;
    }
    sessionStorage.removeItem("driver_reg_step");
    sessionStorage.removeItem("driver_reg_phone");
    return "form";
  });
  const [regPhone, setRegPhone] = useState(() => sessionStorage.getItem("driver_reg_phone") || "");
  const [regOtpValue, setRegOtpValue] = useState("");
  const [regNewPin, setRegNewPin] = useState("");
  const [regConfirmPin, setRegConfirmPin] = useState("");

  const [loginStep, setLoginStep] = useState<LoginStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState(() => sessionStorage.getItem("driver_login_phone") || "");
  const [pinValue, setPinValue] = useState("");
  const [sessionConflict, setSessionConflict] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [newPinValue, setNewPinValue] = useState("");
  const [confirmPinValue, setConfirmPinValue] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: sessionData } = useQuery({
    queryKey: ["/api/drivers/session"],
    queryFn: async () => {
      const res = await fetch("/api/drivers/session", { credentials: 'include' });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (sessionData?.id) navigate("/driver/dashboard");
  }, [sessionData, navigate]);

  useEffect(() => {
    if (phoneNumber) sessionStorage.setItem("driver_login_phone", phoneNumber);
  }, [phoneNumber]);

  async function getGpsCoords(): Promise<{ lat: number; lng: number } | null> {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, timeout: 5000, maximumAge: 300000,
        });
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return null;
    }
  }

  function clearRegSession() {
    sessionStorage.removeItem("driver_reg_step");
    sessionStorage.removeItem("driver_reg_phone");
    setRegStep("form");
    setRegPhone("");
    setRegOtpValue("");
    setRegNewPin("");
    setRegConfirmPin("");
  }

  async function handleRequestAccess() {
    if (!phoneNumber.trim()) {
      toast({ title: "Podaj numer telefonu", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/auth/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phoneNumber.trim(), role: "driver" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd");

      if (data.status === "PIN_REQUIRED") {
        setLoginStep("pin");
      } else if (data.status === "OTP_SENT") {
        setLoginStep("otp");
        toast({ title: "Kod SMS wysłany", description: "Sprawdź wiadomości na telefonie" });
      }
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePinLogin(forceLogin = false) {
    if (pinValue.length !== 6) {
      toast({ title: "PIN musi mieć 6 cyfr", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setSessionConflict(false);
    try {
      const gps = await getGpsCoords();
      const body: any = { phone: phoneNumber.trim(), pin: pinValue, role: "driver", forceLogin };
      if (gps) { body.lat = gps.lat; body.lng = gps.lng; }

      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === "session_conflict") {
        setSessionConflict(true);
        setIsLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Błąd logowania");

      sessionStorage.removeItem("driver_login_phone");
      clearRegSession();
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/session"] });
      navigate("/driver/dashboard");
    } catch (err: any) {
      toast({ title: "Błąd logowania", description: err.message, variant: "destructive" });
      setPinValue("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpValue.length !== 6) {
      toast({ title: "Kod musi mieć 6 cyfr", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phoneNumber.trim(), otp: otpValue, role: "driver" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nieprawidłowy kod");

      setLoginStep("set-pin");
      toast({ title: "Kod zweryfikowany", description: "Ustaw swój 6-cyfrowy PIN" });
    } catch (err: any) {
      toast({ title: "Błąd weryfikacji", description: err.message, variant: "destructive" });
      setOtpValue("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetPin() {
    if (newPinValue.length !== 6) {
      toast({ title: "PIN musi mieć 6 cyfr", variant: "destructive" });
      return;
    }
    if (newPinValue !== confirmPinValue) {
      toast({ title: "PINy nie pasują", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phoneNumber.trim(), pin: newPinValue, role: "driver" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd ustawiania PIN");

      sessionStorage.removeItem("driver_login_phone");
      clearRegSession();
      toast({ title: "PIN ustawiony!", description: "Zalogowano pomyślnie" });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/session"] });
      navigate("/driver/dashboard");
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPin() {
    setIsLoading(true);
    try {
      const res = await fetch("/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phoneNumber.trim(), role: "driver" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd");

      setLoginStep("otp");
      setPinValue("");
      toast({ title: "Nowy kod SMS wysłany", description: "Sprawdź wiadomości na telefonie" });
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  function resetLogin() {
    setLoginStep("phone");
    setPinValue("");
    setOtpValue("");
    setNewPinValue("");
    setConfirmPinValue("");
  }

  async function handleRegVerifyOtp() {
    if (isLoading || regOtpValue.length !== 6) return;
    setIsLoading(true);
    try {
      const res = await fetch("/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: regPhone, otp: regOtpValue, role: "driver" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nieprawidłowy kod");
      setRegStep("set-pin");
      sessionStorage.setItem("driver_reg_step", "set-pin");
      toast({ title: "Kod zweryfikowany", description: "Ustaw swój 6-cyfrowy PIN" });
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
      setRegOtpValue("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegSetPin() {
    if (isLoading || regNewPin.length !== 6 || regConfirmPin.length !== 6) return;
    if (regNewPin !== regConfirmPin) {
      toast({ title: "PINy nie pasują", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: regPhone, pin: regNewPin, role: "driver" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd ustawiania PIN");
      clearRegSession();
      sessionStorage.removeItem("driver_login_phone");
      toast({ title: "Rejestracja zakończona!", description: "Uzupełnij profil aby rozpocząć pracę" });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/session"] });
      navigate("/driver/complete-profile");
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phoneNumber,
        referralCode: referralCodeValue || undefined,
      };
      const res = await apiRequest("POST", "/api/drivers/register", payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.message || "Nie udało się zarejestrować");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      const phone = registerForm.getValues("phoneNumber");
      setRegPhone(phone);
      sessionStorage.setItem("driver_reg_phone", phone);
      if (data.status === "OTP_SENT") {
        setRegStep("otp");
        sessionStorage.setItem("driver_reg_step", "otp");
        toast({ title: "Kod wysłany!", description: "Wpisz kod SMS aby potwierdzić numer telefonu" });
      } else {
        setRegStep("set-pin");
        sessionStorage.setItem("driver_reg_step", "set-pin");
        toast({ title: "Numer zweryfikowany!", description: "Ustaw PIN do logowania" });
      }
    },
    onError: (error: Error) => {
      let description = "Nie udało się utworzyć konta";
      if (error.message.includes("już konto") || error.message.includes("już zarejestrowany") || error.message.includes("already exists")) {
        description = error.message;
      } else if (error.message) {
        description = error.message;
      }
      toast({
        title: "Błąd rejestracji",
        description,
        variant: "destructive",
      });
    },
  });

  function renderLoginContent() {
    switch (loginStep) {
      case "phone":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Numer telefonu</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="np. 500600700"
                  type="tel"
                  className="pl-10"
                  data-testid="input-driver-phone"
                  onKeyDown={(e) => e.key === "Enter" && handleRequestAccess()}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleRequestAccess}
              disabled={isLoading}
              data-testid="button-driver-request-access"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
              Dalej
            </Button>
          </div>
        );

      case "pin":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Zaloguj się do konta kierowcy
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">PIN (6 cyfr)</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="------"
                  type={showPin ? "text" : "password"}
                  className="pl-10 pr-10 text-center tracking-[0.5em] font-mono"
                  maxLength={6}
                  inputMode="numeric"
                  data-testid="input-driver-pin"
                  onKeyDown={(e) => e.key === "Enter" && pinValue.length === 6 && handlePinLogin()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPin(!showPin)}
                  tabIndex={-1}
                  data-testid="button-toggle-driver-pin"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {sessionConflict ? (
              <div className="space-y-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                <p className="text-sm text-center font-medium">Jesteś zalogowany na innym urządzeniu. Czy chcesz się wylogować z tamtego urządzenia i zalogować tutaj?</p>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" onClick={() => setSessionConflict(false)} data-testid="button-session-cancel">
                    Nie
                  </Button>
                  <Button className="flex-1" onClick={() => handlePinLogin(true)} disabled={isLoading} data-testid="button-session-force">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Tak, zaloguj tutaj
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={() => handlePinLogin()}
                disabled={isLoading || pinValue.length !== 6}
                data-testid="button-driver-pin-login"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                Zaloguj się
              </Button>
            )}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={resetLogin} data-testid="button-driver-back-phone">
                <ArrowLeft className="w-4 h-4 mr-1" /> Zmień numer
              </Button>
              <Button variant="ghost" size="sm" onClick={handleForgotPin} disabled={isLoading} data-testid="button-driver-forgot-pin">
                <RefreshCw className="w-4 h-4 mr-1" /> Zapomniałem PIN
              </Button>
            </div>
          </div>
        );

      case "otp":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Wpisz 6-cyfrowy kod z SMS
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kod SMS</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="------"
                  type="text"
                  className="pl-10 text-center tracking-[0.5em] font-mono"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  data-testid="input-driver-otp"
                  onKeyDown={(e) => e.key === "Enter" && otpValue.length === 6 && handleVerifyOtp()}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleVerifyOtp}
              disabled={isLoading || otpValue.length !== 6}
              data-testid="button-driver-verify-otp"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Zweryfikuj kod
            </Button>
            <Button variant="ghost" size="sm" onClick={resetLogin} className="w-full" data-testid="button-driver-back-otp">
              <ArrowLeft className="w-4 h-4 mr-1" /> Wróć
            </Button>
          </div>
        );

      case "set-pin":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Ustaw 6-cyfrowy PIN do logowania
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nowy PIN</label>
              <Input
                value={newPinValue}
                onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="------"
                type="password"
                className="text-center tracking-[0.5em] font-mono"
                maxLength={6}
                inputMode="numeric"
                data-testid="input-driver-new-pin"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Powtórz PIN</label>
              <Input
                value={confirmPinValue}
                onChange={(e) => setConfirmPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="------"
                type="password"
                className="text-center tracking-[0.5em] font-mono"
                maxLength={6}
                inputMode="numeric"
                data-testid="input-driver-confirm-pin"
                onKeyDown={(e) => e.key === "Enter" && newPinValue.length === 6 && confirmPinValue.length === 6 && handleSetPin()}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSetPin}
              disabled={isLoading || newPinValue.length !== 6 || confirmPinValue.length !== 6}
              data-testid="button-driver-set-pin"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Ustaw PIN i zaloguj
            </Button>
          </div>
        );
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-background flex flex-col safe-area-inset">
      <Helmet>
        <title>Logowanie Kierowcy - TaxiQ</title>
      </Helmet>
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
          <h1 className="text-xl font-bold mt-4">Aplikacja Kierowcy</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Card className="max-w-md mx-auto glow-border">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              TaxiQ Kierowca
            </CardTitle>
            <CardDescription>
              Zaloguj się lub utwórz konto kierowcy
              <span className="block text-[10px] mt-1 opacity-50">v3.0.0</span>
            </CardDescription>
            {refFromUrl && (
              <div className="mt-2 p-2 rounded-md bg-primary/10 border border-primary/20 text-sm text-center" data-testid="text-referral-banner">
                Kod polecający <span className="font-mono font-bold text-primary">{refFromUrl}</span> zostanie zastosowany po rejestracji
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => { setTab(v); resetLogin(); if (v === "login") clearRegSession(); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Logowanie</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Rejestracja</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                {renderLoginContent()}
              </TabsContent>

              <TabsContent value="register" className="mt-4">
                {regStep === "form" && (
                  <Form {...registerForm}>
                    <form onSubmit={(e) => { e.preventDefault(); registerForm.handleSubmit((d) => registerMutation.mutate(d))(e); }} action="#" method="POST" className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Imię</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Jan" data-testid="input-reg-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nazwisko</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Kowalski" data-testid="input-reg-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numer telefonu (będzie Twoim loginem)</FormLabel>
                            <FormControl>
                              <Input {...field} type="tel" placeholder="np. 500600700" data-testid="input-reg-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div>
                        <label className="text-sm font-medium">Kod polecający (opcjonalnie)</label>
                        <Input
                          value={referralCodeValue}
                          onChange={(e) => setReferralCodeValue(e.target.value.toUpperCase())}
                          placeholder="Nr identyfikatora taxi/gmina"
                          data-testid="input-reg-referral-code"
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Jeśli dostałeś kod od innego kierowcy, wpisz go tutaj
                        </p>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <UserPlus className="w-4 h-4 mr-2" />
                        )}
                        Zarejestruj się
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Po rejestracji zweryfikujesz numer SMS i ustawisz PIN
                      </p>
                    </form>
                  </Form>
                )}
                {regStep === "otp" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Wpisz 6-cyfrowy kod SMS wysłany na {regPhone}
                    </p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Kod SMS</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={regOtpValue}
                          onChange={(e) => setRegOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="------"
                          type="text"
                          className="pl-10 text-center tracking-[0.5em] font-mono"
                          maxLength={6}
                          inputMode="numeric"
                          autoFocus
                          data-testid="input-reg-otp"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && regOtpValue.length === 6) handleRegVerifyOtp();
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      disabled={isLoading || regOtpValue.length !== 6}
                      data-testid="button-reg-verify-otp"
                      onClick={handleRegVerifyOtp}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                      Zweryfikuj kod
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={clearRegSession}
                        data-testid="button-reg-back"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Wróć
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1"
                        disabled={isLoading}
                        data-testid="button-reg-resend-otp"
                        onClick={async () => {
                          setIsLoading(true);
                          try {
                            const res = await fetch("/auth/request-access", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ phone: regPhone, role: "driver" }),
                              credentials: "include",
                            });
                            if (res.ok) {
                              toast({ title: "Nowy kod SMS wysłany" });
                              setRegOtpValue("");
                            } else {
                              const data = await res.json();
                              toast({ title: data.error || "Błąd wysyłki SMS", variant: "destructive" });
                            }
                          } catch {
                            toast({ title: "Błąd połączenia", variant: "destructive" });
                          }
                          setIsLoading(false);
                        }}
                      >
                        Wyślij ponownie
                      </Button>
                    </div>
                  </div>
                )}
                {regStep === "set-pin" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Ustaw 6-cyfrowy PIN do logowania
                    </p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nowy PIN</label>
                      <Input
                        value={regNewPin}
                        onChange={(e) => setRegNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="------"
                        type="password"
                        className="text-center tracking-[0.5em] font-mono"
                        maxLength={6}
                        inputMode="numeric"
                        data-testid="input-reg-new-pin"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Powtórz PIN</label>
                      <Input
                        value={regConfirmPin}
                        onChange={(e) => setRegConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="------"
                        type="password"
                        className="text-center tracking-[0.5em] font-mono"
                        maxLength={6}
                        inputMode="numeric"
                        data-testid="input-reg-confirm-pin"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && regNewPin.length === 6 && regConfirmPin.length === 6) handleRegSetPin();
                        }}
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={isLoading || regNewPin.length !== 6 || regConfirmPin.length !== 6}
                      data-testid="button-reg-set-pin"
                      onClick={handleRegSetPin}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                      Ustaw PIN i zaloguj
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
