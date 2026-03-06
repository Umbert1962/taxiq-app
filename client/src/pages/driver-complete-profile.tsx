import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Camera, FileText, Loader2, CheckCircle2, 
  Upload, AlertTriangle, Shield, LogOut, ArrowLeft, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { POLISH_MUNICIPALITIES } from "@/lib/polish-municipalities";
import logoImage from "@assets/logo/logo-taxiq-neon.jpg";

const LANGUAGES = [
  { code: "PL", label: "Polski" },
  { code: "EN", label: "Angielski" },
  { code: "DE", label: "Niemiecki" },
  { code: "UK", label: "Ukraiński" },
  { code: "RU", label: "Rosyjski" },
  { code: "FR", label: "Francuski" },
  { code: "ES", label: "Hiszpański" },
];

const profileSchema = z.object({
  languages: z.array(z.string()).optional(),
  taxiLicenseNumber: z.string().min(3, "Podaj numer ID z identyfikatora taxi"),
  licenseIssuingAuthority: z.string().min(2, "Wybierz gminę wydania identyfikatora"),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "Musisz zaakceptować regulamin",
  }),
});

type ProfileData = z.infer<typeof profileSchema>;

export default function DriverCompleteProfile() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: sessionData, isLoading: sessionLoading, isFetching: sessionFetching } = useQuery({
    queryKey: ["/api/drivers/session"],
    queryFn: async () => {
      const res = await fetch("/api/drivers/session", { credentials: 'include' });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: 1,
    retryDelay: 500,
  });

  const driverId = sessionData?.id;

  const handleLogout = async () => {
    try {
      await fetch("/api/drivers/logout", { method: "POST", credentials: "include" });
      queryClient.clear();
      window.location.href = "/driver";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      languages: ["PL"],
      taxiLicenseNumber: sessionData?.taxiLicenseNumber || "",
      licenseIssuingAuthority: sessionData?.licenseIssuingAuthority || "",
      termsAccepted: false,
    },
  });

  // Auto-fill form when session data is available
  useEffect(() => {
    if (sessionData) {
      form.reset({
        languages: sessionData.languages || ["PL"],
        taxiLicenseNumber: sessionData.taxiLicenseNumber || "",
        licenseIssuingAuthority: sessionData.licenseIssuingAuthority || "",
        termsAccepted: form.getValues("termsAccepted"),
      });
    }
  }, [sessionData, form]);

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      if (!driverId) {
        throw new Error("Sesja wygasła. Zaloguj się ponownie.");
      }
      const res = await apiRequest("PATCH", `/api/drivers/${driverId}/complete-profile`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: async () => {
      if (photoFile && driverId) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        try {
          await fetch(`/api/drivers/${driverId}/photo`, {
            method: "POST",
            credentials: 'include',
            body: formData,
          });
        } catch (e) {
          console.error("Photo upload failed:", e);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId] });
      toast({
        title: "Profil uzupełniony!",
        description: "Twoje dane zostały zapisane.",
      });
      navigate("/driver/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (sessionLoading || sessionFetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driverId) {
    navigate("/driver");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="relative overflow-hidden py-6">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="relative container mx-auto px-4">
          <div className="flex justify-between mb-2">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              data-testid="link-back-home"
            >
              <ArrowLeft className="w-4 h-4" />
              Strona główna
            </a>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Wyloguj
            </Button>
          </div>
          <div className="flex flex-col items-center">
            <img 
              src={logoImage} 
              alt="TaxiQ Logo" 
              className="w-auto"
              style={{
                height: "64px",
                filter: "drop-shadow(0 0 10px rgba(230, 255, 63, 0.4)) drop-shadow(0 0 25px rgba(230, 255, 63, 0.15))",
              }}
            />
            <h1 className="text-xl font-bold mt-3">Uzupełnij profil</h1>
            <p className="text-sm text-muted-foreground">Krok 2 z 2</p>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 max-w-md">
        <Card className="glow-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              Dane kierowcy
            </CardTitle>
            <CardDescription>
              Uzupełnij dane wymagane do pracy jako kierowca TaxiQ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit((d) => profileMutation.mutate(d))(e); }} action="#" method="POST" className="space-y-4">
                
                <div className="flex flex-col items-center mb-4">
                  <div className="relative">
                    {photoPreview ? (
                      <img 
                        src={photoPreview} 
                        alt="Podgląd zdjęcia"
                        className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground">
                        <Camera className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 bg-primary rounded-full p-2 cursor-pointer hover:bg-primary/90">
                      <Upload className="w-4 h-4 text-primary-foreground" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handlePhotoChange}
                        data-testid="input-photo"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Zdjęcie profilowe (wymagane do weryfikacji)
                  </p>
                  {!photoFile && (
                    <p className="text-xs text-yellow-500 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      Dodaj zdjęcie aby móc przyjmować zlecenia
                    </p>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="taxiLicenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Numer ID z identyfikatora taxi
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="np. 09039" data-testid="input-license" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="licenseIssuingAuthority"
                  render={({ field }) => {
                    const [searchQuery, setSearchQuery] = useState("");
                    const [showDropdown, setShowDropdown] = useState(false);
                    const dropdownRef = useRef<HTMLDivElement>(null);
                    const filtered = searchQuery.length >= 2
                      ? POLISH_MUNICIPALITIES.filter(m => m.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10)
                      : [];

                    useEffect(() => {
                      const handleClickOutside = (e: MouseEvent) => {
                        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                          setShowDropdown(false);
                        }
                      };
                      document.addEventListener("mousedown", handleClickOutside);
                      return () => document.removeEventListener("mousedown", handleClickOutside);
                    }, []);

                    return (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Gmina wydania identyfikatora taxi
                        </FormLabel>
                        <div className="relative" ref={dropdownRef}>
                          <FormControl>
                            <Input
                              value={field.value || searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                field.onChange(e.target.value);
                                setShowDropdown(true);
                              }}
                              onFocus={() => { if (searchQuery.length >= 2 || (field.value && field.value.length >= 2)) setShowDropdown(true); }}
                              placeholder="Wpisz nazwę gminy, np. Poznań"
                              data-testid="input-license-authority"
                            />
                          </FormControl>
                          {showDropdown && filtered.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {filtered.map((municipality) => (
                                <button
                                  key={municipality}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors"
                                  data-testid={`option-municipality-${municipality}`}
                                  onClick={() => {
                                    field.onChange(municipality);
                                    setSearchQuery(municipality);
                                    setShowDropdown(false);
                                  }}
                                >
                                  {municipality}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="languages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Języki</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGES.map(({ code, label }) => (
                          <button
                            key={code}
                            type="button"
                            data-testid={`toggle-lang-${code}`}
                            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                              (field.value || []).includes(code)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:border-primary/50"
                            }`}
                            onClick={() => {
                              const langs = (field.value || []).includes(code)
                                ? (field.value || []).filter((l: string) => l !== code)
                                : [...(field.value || []), code];
                              field.onChange(langs);
                            }}
                          >
                            {code} - {label}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-terms"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            Akceptuję{" "}
                            <a href="/regulamin-kierowcy" className="text-primary underline" target="_blank">
                              Regulamin Kierowcy TaxiQ
                            </a>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full mt-4" 
                  disabled={profileMutation.isPending}
                  onClick={(e) => {
                    if (e.detail === 0) return;
                    const form = e.currentTarget.closest('form');
                    if (form) form.requestSubmit();
                  }}
                  data-testid="button-complete"
                >
                  {profileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Zapisz i kontynuuj
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
