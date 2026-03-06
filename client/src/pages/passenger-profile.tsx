import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  CheckCircle2, FileText, ArrowLeft, Loader2, Calendar, User, Pencil, Phone, Mail, MapPin, Heart
} from "lucide-react";
import logoImage from "@assets/logo/logo-taxiq-neon.jpg";
import { AddressInput } from "@/components/address-input";

const editProfileSchema = z.object({
  firstName: z.string().min(2, "Imię musi mieć min. 2 znaki"),
  lastName: z.string().min(2, "Nazwisko musi mieć min. 2 znaki"),
  email: z.string().email("Nieprawidłowy email").optional().or(z.literal("")),
  phone: z.string().min(9, "Numer telefonu musi mieć min. 9 cyfr").optional().or(z.literal("")),
  homeAddress: z.string().optional().or(z.literal("")),
  homeLat: z.string().optional(),
  homeLng: z.string().optional(),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

export default function PassengerProfile() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [licenseInput, setLicenseInput] = useState("");
  const [addingFavorite, setAddingFavorite] = useState(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ["/api/passengers/session"],
    queryFn: async () => {
      const res = await fetch("/api/passengers/session", { credentials: "include" });
      if (!res.ok) throw new Error("Not logged in");
      return res.json();
    },
  });

  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      homeAddress: "",
      homeLat: "",
      homeLng: "",
    },
  });

  useEffect(() => {
    if (session && (!session.firstName || !session.lastName || !session.termsAcceptedAt)) {
      navigate("/uzupelnij-profil");
    }
  }, [session, navigate]);

  useEffect(() => {
    if (session) {
      form.reset({
        firstName: session.firstName || "",
        lastName: session.lastName || "",
        email: session.email || "",
        phone: session.phone || "",
        homeAddress: session.homeAddress || "",
        homeLat: session.homeLat || "",
        homeLng: session.homeLng || "",
      });
    }
  }, [session, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: EditProfileForm) => {
      const res = await apiRequest("PATCH", "/api/passengers/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/passengers/session"] });
      toast({ title: "Sukces", description: "Dane zostały zaktualizowane" });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zaktualizować danych", variant: "destructive" });
    },
  });

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/passengers/accept-terms");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/passengers/session"] });
      toast({ title: "Sukces", description: "Regulamin został zaakceptowany" });
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zaakceptować regulaminu", variant: "destructive" });
    },
  });

  const handleAcceptTerms = () => {
    if (termsAccepted) {
      acceptTermsMutation.mutate();
    }
  };

  const onSubmit = (data: EditProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    navigate("/passenger");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/passenger")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <a href="/" data-testid="link-back-home">
            <img 
              src={logoImage} 
              alt="TaxiQ - Strona główna" 
              className="w-auto"
              style={{
                height: "40px",
                filter: "drop-shadow(0 0 8px rgba(230, 255, 63, 0.4)) drop-shadow(0 0 20px rgba(230, 255, 63, 0.15))",
              }}
            />
          </a>
          <h1 className="text-lg font-semibold">Mój Profil</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        <Card className="glow-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Dane pasażera
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditDialogOpen(true)}
                data-testid="button-edit-profile"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edytuj
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" /> Imię i nazwisko:
              </span>
              <span className="font-medium">{session.firstName} {session.lastName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email:
              </span>
              <span className="font-medium">{session.email || "-"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" /> Telefon:
              </span>
              <span className="font-medium">{session.phone || "-"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Adres domowy:
              </span>
              <span className="font-medium text-right max-w-[60%]">{session.homeAddress || "-"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" /> W sieci od:
              </span>
              <span className="font-medium">
                {session.createdAt ? new Date(session.createdAt).toLocaleDateString('pl-PL') : "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Dodaj ulubionego kierowcę
            </CardTitle>
            <CardDescription>
              Wpisz numer ID kierowcy, aby dodać go jako ulubionego
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Numer ID kierowcy"
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
                data-testid="input-favorite-license"
                className="flex-1"
              />
              <Button
                onClick={async () => {
                  if (!licenseInput.trim()) {
                    toast({ title: "Błąd", description: "Wpisz numer identyfikatora taxi", variant: "destructive" });
                    return;
                  }
                  setAddingFavorite(true);
                  try {
                    const res = await fetch("/api/passenger/add-favorite-by-license", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ licenseNumber: licenseInput.trim() }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      toast({ title: "Dodano!", description: `Kierowca ${data.driverName || ""} został dodany jako ulubiony` });
                      setLicenseInput("");
                    } else {
                      toast({ title: "Błąd", description: data.error || "Nie udało się dodać kierowcy", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Błąd", description: "Nie udało się dodać kierowcy", variant: "destructive" });
                  } finally {
                    setAddingFavorite(false);
                  }
                }}
                disabled={addingFavorite || !licenseInput.trim()}
                data-testid="button-add-favorite-license"
              >
                {addingFavorite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
                <span className="ml-2">Dodaj</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Regulamin współpracy
            </CardTitle>
            <CardDescription>
              Przeczytaj i zaakceptuj regulamin korzystania z usług TaxiQ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session.termsAcceptedAt ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span>Regulamin zaakceptowany {new Date(session.termsAcceptedAt).toLocaleDateString('pl-PL')}</span>
              </div>
            ) : (
              <>
                <ScrollArea className="h-64 border rounded-lg p-4 bg-muted/30">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <h3>Regulamin korzystania z platformy TaxiQ</h3>
                    
                    <h4>1. Postanowienia ogólne</h4>
                    <p>
                      Niniejszy regulamin określa zasady korzystania z platformy TaxiQ, 
                      która umożliwia zamawianie usług transportowych od niezależnych kierowców 
                      taksówek współpracujących z platformą.
                    </p>
                    
                    <h4>2. Definicje</h4>
                    <p>
                      <strong>Pasażer</strong> - osoba korzystająca z platformy w celu zamówienia przejazdu.<br />
                      <strong>Kierowca</strong> - niezależny przedsiębiorca świadczący usługi transportowe.<br />
                      <strong>Platforma</strong> - aplikacja mobilna i serwis internetowy TaxiQ.
                    </p>
                    
                    <h4>3. Zasady korzystania</h4>
                    <p>
                      Pasażer zobowiązuje się do:
                    </p>
                    <ul>
                      <li>Podania prawdziwych danych kontaktowych</li>
                      <li>Oczekiwania w umówionym miejscu odbioru</li>
                      <li>Traktowania kierowcy z szacunkiem</li>
                      <li>Regulowania należności zgodnie z cennikiem</li>
                    </ul>
                    
                    <h4>4. Płatności</h4>
                    <p>
                      TaxiQ nie pobiera prowizji od przejazdów. 100% opłaty za przejazd 
                      trafia bezpośrednio do kierowcy. Rozliczenie następuje gotówką 
                      lub kartą bezpośrednio z kierowcą.
                    </p>
                    
                    <h4>5. Bezpieczeństwo</h4>
                    <p>
                      Wszyscy kierowcy współpracujący z TaxiQ posiadają ważny identyfikator 
                      taxi oraz ubezpieczenie OC. Platforma weryfikuje tożsamość 
                      kierowców na podstawie dokumentów i zdjęcia.
                    </p>
                    
                    <h4>6. Anulowanie przejazdu</h4>
                    <p>
                      Pasażer może anulować zamówienie bezpłatnie do momentu zaakceptowania 
                      przejazdu przez kierowcę. Po zaakceptowaniu, anulowanie może wiązać 
                      się z opłatą ustaloną przez kierowcę.
                    </p>
                    
                    <h4>7. Reklamacje</h4>
                    <p>
                      Reklamacje dotyczące usług można zgłaszać poprzez aplikację lub 
                      mailowo na adres support@taxiq.com.pl. Reklamacje rozpatrywane są 
                      w ciągu 14 dni roboczych.
                    </p>
                    
                    <h4>8. Ochrona danych</h4>
                    <p>
                      Dane osobowe pasażerów przetwarzane są zgodnie z RODO. 
                      Szczegóły znajdują się w Polityce Prywatności dostępnej na stronie.
                    </p>
                    
                    <h4>9. Postanowienia końcowe</h4>
                    <p>
                      Niniejszy regulamin wchodzi w życie z dniem akceptacji przez Pasażera. 
                      TaxiQ zastrzega sobie prawo do zmiany regulaminu z 14-dniowym 
                      wyprzedzeniem.
                    </p>
                  </div>
                </ScrollArea>
                
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    data-testid="checkbox-accept-terms"
                  />
                  <label htmlFor="terms" className="text-sm cursor-pointer">
                    Oświadczam, że zapoznałem/am się z Regulaminem współpracy i akceptuję jego warunki
                  </label>
                </div>
                
                <Button 
                  onClick={handleAcceptTerms}
                  disabled={!termsAccepted || acceptTermsMutation.isPending}
                  className="w-full"
                  data-testid="button-accept-terms"
                >
                  {acceptTermsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Akceptuję regulamin
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {session.termsAcceptedAt && (
          <div className="text-center">
            <Badge variant="default" className="text-sm px-4 py-2">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Profil kompletny
            </Badge>
          </div>
        )}
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edytuj dane profilu</DialogTitle>
            <DialogDescription>
              Zmień swoje dane kontaktowe. Zmiany zostaną zapisane po kliknięciu "Zapisz".
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imię</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Imię" data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwisko</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nazwisko" data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@example.com" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="+48 123 456 789" data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <Label>Adres domowy</Label>
                <AddressInput
                  value={form.watch("homeAddress") || ""}
                  onChange={(address: string) => {
                    form.setValue("homeAddress", address);
                  }}
                  onPlaceSelect={(place: any) => {
                    if (place?.geometry?.location) {
                      form.setValue("homeLat", place.geometry.location.lat().toString());
                      form.setValue("homeLng", place.geometry.location.lng().toString());
                    }
                    if (place?.formatted_address) {
                      form.setValue("homeAddress", place.formatted_address);
                    }
                  }}
                  placeholder="Wpisz adres domowy"
                  data-testid="input-home-address"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                  {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Zapisz
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
