import { Helmet } from "react-helmet";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Car, Loader2, ArrowLeft, Phone, ShieldCheck, KeyRound, Eye, EyeOff, RefreshCw } from "lucide-react";

type Step = "phone" | "pin" | "otp" | "set-pin";

async function linkFavoriteDriverByLicense() {
  const license = localStorage.getItem("pending_favorite_license");
  if (!license) return;
  try {
    const res = await fetch("/api/passenger/add-favorite-by-license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ licenseNumber: license }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`[FAVORITE_LINK] Added driver ${data.driverName} by license ${license}`);
    }
  } catch (err) {
    console.error("[FAVORITE_LINK] Error:", err);
  } finally {
    localStorage.removeItem("pending_favorite_license");
  }
}

export default function PassengerLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [newPinValue, setNewPinValue] = useState("");
  const [confirmPinValue, setConfirmPinValue] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [sessionConflict, setSessionConflict] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const license = params.get("license");
    if (license) {
      localStorage.setItem("pending_favorite_license", license);
    }
  }, []);

  const { data: sessionData } = useQuery({
    queryKey: ["/api/passengers/session"],
    queryFn: async () => {
      const res = await fetch("/api/passengers/session", { credentials: 'include' });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (sessionData?.id) {
      window.history.replaceState(null, "", "/passenger/home");
      setLocation("/passenger/home");
    }
  }, [sessionData, setLocation]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = phoneNumber.replace(/\s/g, "");
    if (cleaned.length < 9) {
      toast({ title: "Błąd", description: "Podaj prawidłowy numer telefonu", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/auth/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: cleaned, role: "passenger" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd");

      if (data.status === "PIN_REQUIRED") {
        setStep("pin");
      } else if (data.status === "OTP_SENT") {
        setStep("otp");
        setCountdown(60);
        setOtpDigits(["", "", "", "", "", ""]);
        toast({ title: "Kod wysłany", description: "Sprawdź SMS z kodem weryfikacyjnym" });
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
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
      const cleaned = phoneNumber.replace(/\s/g, "");
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: cleaned, pin: pinValue, role: "passenger", forceLogin }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === "session_conflict") {
        setSessionConflict(true);
        setIsLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Błąd logowania");

      await linkFavoriteDriverByLicense();
      queryClient.invalidateQueries({ queryKey: ["/api/passengers/session"] });
      setLocation("/passenger/home");
    } catch (err: any) {
      toast({ title: "Błąd logowania", description: err.message, variant: "destructive" });
      setPinValue("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPin() {
    setIsLoading(true);
    try {
      const cleaned = phoneNumber.replace(/\s/g, "");
      const res = await fetch("/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: cleaned, role: "passenger" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd");

      setStep("otp");
      setPinValue("");
      setCountdown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      toast({ title: "Nowy kod SMS wysłany", description: "Sprawdź wiadomości" });
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyOtpCode(code: string) {
    setIsLoading(true);
    try {
      const cleaned = phoneNumber.replace(/\s/g, "");
      const res = await fetch("/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: cleaned, otp: code, role: "passenger" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nieprawidłowy kod");

      if (data.status === "SET_PIN_REQUIRED") {
        setStep("set-pin");
        toast({ title: "Kod zweryfikowany", description: "Ustaw swój 6-cyfrowy PIN do logowania" });
      }
    } catch (err: any) {
      toast({ title: "Błąd weryfikacji", description: err.message, variant: "destructive" });
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
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
      const cleaned = phoneNumber.replace(/\s/g, "");
      const res = await fetch("/auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: cleaned, pin: newPinValue, role: "passenger" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd ustawiania PIN");

      await linkFavoriteDriverByLicense();
      toast({ title: "PIN ustawiony!", description: "Następnym razem zaloguj się PINem" });
      queryClient.invalidateQueries({ queryKey: ["/api/passengers/session"] });
      setLocation("/passenger/home");
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) newDigits[i] = pasted[i] || "";
      setOtpDigits(newDigits);
      const fullCode = newDigits.join("");
      if (fullCode.length === 6) verifyOtpCode(fullCode);
      else {
        const nextEmpty = newDigits.findIndex((d) => d === "");
        if (nextEmpty >= 0) otpRefs.current[nextEmpty]?.focus();
      }
      return;
    }
    newDigits[index] = value;
    setOtpDigits(newDigits);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    const fullCode = newDigits.join("");
    if (fullCode.length === 6) verifyOtpCode(fullCode);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits];
      newDigits[index - 1] = "";
      setOtpDigits(newDigits);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    const cleaned = phoneNumber.replace(/\s/g, "");
    setIsLoading(true);
    try {
      const res = await fetch("/auth/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: cleaned, role: "passenger" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się wysłać kodu");
      setCountdown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      toast({ title: "Kod wysłany ponownie" });
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  function resetToPhone() {
    setStep("phone");
    setOtpDigits(["", "", "", "", "", ""]);
    setPinValue("");
    setNewPinValue("");
    setConfirmPinValue("");
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-background flex flex-col px-[5vw] py-[4vh] justify-center">
      <Helmet>
        <title>Pasażer - TaxiQ</title>
      </Helmet>
      <div className="mb-4">
        {step !== "phone" ? (
          <button
            onClick={resetToPhone}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            data-testid="button-back-phone"
          >
            <ArrowLeft className="w-4 h-4" />
            Zmień numer
          </button>
        ) : (
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            data-testid="link-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Strona główna
          </a>
        )}
      </div>
      <Card className="w-full max-w-md mx-auto border-primary/20">
        <CardHeader className="text-center pb-3">
          <div className="flex justify-center mb-2">
            <Car className="w-10 h-10 text-primary" />
          </div>
          <CardTitle
            className="text-primary"
            style={{ fontSize: 'clamp(22px, 6vw, 32px)' }}
            data-testid="text-auth-title"
          >
            TaxiQ Pasażer
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === "phone" && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-muted-foreground" style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }}>
                  Podaj swój numer telefonu, aby się zalogować lub założyć konto
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }}>
                  Numer telefonu
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="+48 600 123 456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                    style={{ height: 'clamp(48px, 13vw, 60px)', fontSize: 'clamp(18px, 5vw, 24px)' }}
                    autoFocus
                    data-testid="input-phone"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full font-semibold"
                style={{ height: 'clamp(48px, 13vw, 60px)', fontSize: 'clamp(16px, 4.5vw, 22px)' }}
                disabled={isLoading}
                data-testid="button-request-otp"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Sprawdzanie...</>
                ) : (
                  <><Phone className="mr-2 h-5 w-5" /> Dalej</>
                )}
              </Button>
            </form>
          )}

          {step === "pin" && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <KeyRound className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground" style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }}>
                  Zaloguj się do konta
                </p>
                <p className="font-semibold text-foreground" style={{ fontSize: 'clamp(15px, 4vw, 18px)' }} data-testid="text-phone-display">
                  {phoneNumber}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">PIN (6 cyfr)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={pinValue}
                    onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="------"
                    type={showPin ? "text" : "password"}
                    className="pl-10 pr-10 text-center tracking-[0.5em] font-mono"
                    style={{ height: 'clamp(48px, 13vw, 60px)', fontSize: 'clamp(20px, 5vw, 28px)' }}
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus
                    data-testid="input-passenger-pin"
                    onKeyDown={(e) => e.key === "Enter" && pinValue.length === 6 && handlePinLogin()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPin(!showPin)}
                    tabIndex={-1}
                    data-testid="button-toggle-pin"
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
                  className="w-full font-semibold"
                  style={{ height: 'clamp(48px, 13vw, 60px)', fontSize: 'clamp(16px, 4.5vw, 22px)' }}
                  onClick={() => handlePinLogin()}
                  disabled={isLoading || pinValue.length !== 6}
                  data-testid="button-pin-login"
                >
                  {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : null}
                  Zaloguj się
                </Button>
              )}
              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={handleForgotPin} disabled={isLoading} data-testid="button-forgot-pin">
                  <RefreshCw className="w-4 h-4 mr-1" /> Zapomniałem PIN
                </Button>
              </div>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground" style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }}>
                  Wpisz 6-cyfrowy kod wysłany na
                </p>
                <p className="font-semibold text-foreground" style={{ fontSize: 'clamp(15px, 4vw, 18px)' }} data-testid="text-phone-display">
                  {phoneNumber}
                </p>
              </div>
              <div className="flex justify-center gap-2">
                {otpDigits.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="text-center font-bold"
                    style={{
                      width: 'clamp(40px, 12vw, 52px)',
                      height: 'clamp(48px, 14vw, 60px)',
                      fontSize: 'clamp(20px, 6vw, 28px)',
                    }}
                    data-testid={`input-otp-${i}`}
                  />
                ))}
              </div>
              {isLoading && (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <div className="text-center mt-4">
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground" data-testid="text-countdown">
                    Wyślij ponownie za {countdown}s
                  </p>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    data-testid="button-resend-otp"
                  >
                    Wyślij kod ponownie
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === "set-pin" && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <KeyRound className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground" style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }}>
                  Ustaw 6-cyfrowy PIN do szybkiego logowania
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nowy PIN</label>
                <Input
                  value={newPinValue}
                  onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="------"
                  type="password"
                  className="text-center tracking-[0.5em] font-mono"
                  style={{ height: 'clamp(48px, 13vw, 60px)', fontSize: 'clamp(20px, 5vw, 28px)' }}
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  data-testid="input-new-pin"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Powtórz PIN</label>
                <Input
                  value={confirmPinValue}
                  onChange={(e) => setConfirmPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="------"
                  type="password"
                  className="text-center tracking-[0.5em] font-mono"
                  style={{ height: 'clamp(48px, 13vw, 60px)', fontSize: 'clamp(20px, 5vw, 28px)' }}
                  maxLength={6}
                  inputMode="numeric"
                  data-testid="input-confirm-pin"
                  onKeyDown={(e) => e.key === "Enter" && newPinValue.length === 6 && confirmPinValue.length === 6 && handleSetPin()}
                />
              </div>
              <Button
                className="w-full font-semibold"
                style={{ height: 'clamp(48px, 13vw, 60px)', fontSize: 'clamp(16px, 4.5vw, 22px)' }}
                onClick={handleSetPin}
                disabled={isLoading || newPinValue.length !== 6 || confirmPinValue.length !== 6}
                data-testid="button-set-pin"
              >
                {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <KeyRound className="mr-2 h-5 w-5" />}
                Ustaw PIN i zaloguj
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
