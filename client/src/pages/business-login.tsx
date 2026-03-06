import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Users, Phone, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy email"),
  password: z.string().min(4, "Hasło musi mieć min. 4 znaki"),
  isEmployee: z.boolean().default(false),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nazwa firmy jest wymagana"),
  email: z.string().email("Nieprawidłowy email"),
  password: z.string().min(4, "Hasło musi mieć min. 4 znaki"),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  type: z.enum(["hotel", "company"]),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function BusinessLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [sessionConflict, setSessionConflict] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<LoginForm | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("businessUser");
    if (savedUser) {
      setLocation("/business/dashboard");
    }
  }, [setLocation]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      isEmployee: false,
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      taxId: "",
      type: "hotel",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm & { forceLogin?: boolean }) => {
      const res = await fetch("/api/business/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.status === 409 && json.error === "session_conflict") {
        throw { isConflict: true };
      }
      if (!res.ok) throw new Error(json.error || "Błąd logowania");
      return json;
    },
    onSuccess: (data) => {
      setSessionConflict(false);
      setPendingLoginData(null);
      localStorage.setItem("businessToken", data.token);
      if (data.type === "company") {
        localStorage.setItem("businessUser", JSON.stringify({
          type: "company",
          id: data.id,
          companyId: data.id,
          name: data.name,
          email: data.email,
          companyType: data.companyType,
          companyAddress: data.address,
          phone: data.phone,
          address: data.address,
          taxId: data.taxId,
        }));
      } else {
        localStorage.setItem("businessUser", JSON.stringify({
          type: "employee",
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          companyId: data.companyId,
          companyName: data.companyName,
          companyAddress: data.companyAddress,
        }));
      }
      setLocation("/business/dashboard");
    },
    onError: (error: any) => {
      if (error?.isConflict) {
        setSessionConflict(true);
        setPendingLoginData(loginForm.getValues());
        return;
      }
      toast({ title: "Błąd logowania", description: "Nieprawidłowe dane logowania", variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const res = await apiRequest("POST", "/api/business/register", data);
      return res.json();
    },
    onSuccess: () => {
      setActiveTab("login");
      registerForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Błąd rejestracji", description: error.message, variant: "destructive" });
    },
  });

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
            <Building2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-bold">
              <span className="text-primary">Taxi</span>Q Business
            </CardTitle>
          </div>
          <CardDescription>
            Panel dla hoteli i firm
          </CardDescription>
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Zamów przez telefon:</span>
              <a 
                href="tel:+48732125585" 
                className="font-semibold text-primary hover:underline"
                data-testid="link-phone-order"
              >
                +48 732 125 585
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Automat telefoniczny 24/7
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-business-login">Logowanie</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-business-register">Rejestracja</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <Form {...loginForm}>
                <form onSubmit={(e) => { e.preventDefault(); loginForm.handleSubmit((data) => loginMutation.mutate(data))(e); }} action="#" method="POST" className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="firma@example.com" 
                            data-testid="input-business-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hasło</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            data-testid="input-business-password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="isEmployee"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-employee"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Logowanie jako pracownik
                        </FormLabel>
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
                        <Button className="flex-1" onClick={() => { if (pendingLoginData) loginMutation.mutate({ ...pendingLoginData, forceLogin: true }); }} disabled={loginMutation.isPending} data-testid="button-session-force">
                          {loginMutation.isPending ? "Logowanie..." : "Tak, zaloguj tutaj"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                      onClick={(e) => {
                        if (e.detail === 0) return;
                        const form = e.currentTarget.closest('form');
                        if (form) form.requestSubmit();
                      }}
                      data-testid="button-business-login"
                    >
                      {loginMutation.isPending ? "Logowanie..." : "Zaloguj się"}
                    </Button>
                  )}
                  
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <Form {...registerForm}>
                <form onSubmit={(e) => { e.preventDefault(); registerForm.handleSubmit((data) => registerMutation.mutate(data))(e); }} action="#" method="POST" className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Typ firmy</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-company-type">
                              <SelectValue placeholder="Wybierz typ" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hotel">Hotel</SelectItem>
                            <SelectItem value="company">Firma</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nazwa firmy</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Hotel Polonez" 
                            data-testid="input-company-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email firmowy</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="recepcja@hotel.pl" 
                            data-testid="input-register-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hasło</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            data-testid="input-register-password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon (opcjonalnie)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+48 22 123 45 67" 
                            data-testid="input-company-phone"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adres (opcjonalnie)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ul. Hotelowa 1, Warszawa" 
                            data-testid="input-company-address"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIP (opcjonalnie)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="1234567890" 
                            data-testid="input-company-nip"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                    onClick={(e) => {
                      if (e.detail === 0) return;
                      const form = e.currentTarget.closest('form');
                      if (form) form.requestSubmit();
                    }}
                    data-testid="button-business-register"
                  >
                    {registerMutation.isPending ? "Rejestracja..." : "Zarejestruj firmę"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => setLocation("/")} data-testid="link-passenger-app">
              Powrót do strony głównej
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
