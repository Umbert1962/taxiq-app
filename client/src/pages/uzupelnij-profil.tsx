import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import logoImage from "@assets/logo/logo-taxiq-neon.jpg";

const completeProfileSchema = z.object({
  firstName: z.string().min(2, "Imię musi mieć min. 2 znaki"),
  lastName: z.string().min(2, "Nazwisko musi mieć min. 2 znaki"),
  email: z.string().email("Nieprawidłowy email").optional().or(z.literal("")),
  driverLicenseNumber: z.string().optional().or(z.literal("")),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "Musisz zaakceptować regulamin" }) }),
});

type CompleteProfileForm = z.infer<typeof completeProfileSchema>;

export default function UzupelnijProfil() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [pendingLicense, setPendingLicense] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("pending_favorite_license");
    if (stored) setPendingLicense(stored);
  }, []);

  const { data: session, isLoading } = useQuery({
    queryKey: ["/api/passengers/session"],
    queryFn: async () => {
      const res = await fetch("/api/passengers/session", { credentials: "include" });
      if (!res.ok) throw new Error("Not logged in");
      return res.json();
    },
    retry: false,
  });

  const form = useForm<CompleteProfileForm>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      driverLicenseNumber: "",
      termsAccepted: undefined as unknown as true,
    },
  });

  useEffect(() => {
    if (pendingLicense) {
      form.setValue("driverLicenseNumber", pendingLicense);
    }
  }, [pendingLicense, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: CompleteProfileForm) => {
      await apiRequest("PATCH", "/api/passengers/profile", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: "1.0",
      });

      const licenseToLink = data.driverLicenseNumber?.trim();
      if (licenseToLink) {
        try {
          await fetch("/api/passenger/add-favorite-by-license", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ licenseNumber: licenseToLink }),
          });
          localStorage.removeItem("pending_favorite_license");
        } catch {}
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/passengers/session"] });
      await queryClient.refetchQueries({ queryKey: ["/api/passengers/session"] });
      toast({ title: "Profil uzupełniony", description: "Możesz teraz korzystać z aplikacji." });
      navigate("/passenger/home", { replace: true });
    },
    onError: (error: Error) => {
      const msg = error.message?.includes(":") ? error.message.split(":").slice(1).join(":").trim() : error.message;
      toast({ title: "Błąd", description: msg || "Nie udało się zapisać profilu.", variant: "destructive" });
    },
  });

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <img src={logoImage} alt="TaxiQ" className="w-20 h-20 rounded-full mx-auto object-cover" data-testid="img-logo" />
          <CardTitle className="text-xl" data-testid="text-page-title">Uzupełnij profil</CardTitle>
          <CardDescription>Aby korzystać z aplikacji, uzupełnij wymagane dane.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imię *</FormLabel>
                    <FormControl>
                      <Input placeholder="Twoje imię" {...field} data-testid="input-first-name" />
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
                    <FormLabel>Nazwisko *</FormLabel>
                    <FormControl>
                      <Input placeholder="Twoje nazwisko" {...field} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opcjonalnie)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="twoj@email.pl" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="driverLicenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numer licencji kierowcy (opcjonalnie)</FormLabel>
                    <FormControl>
                      <Input placeholder="Np. 12345" {...field} data-testid="input-driver-license" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Jeśli masz numer licencji od kierowcy TaxiQ, wpisz go tutaj — zostanie dodany jako Twój ulubiony kierowca.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                        data-testid="checkbox-terms"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Akceptuję{" "}
                        <span
                          className="text-primary underline cursor-pointer"
                          onClick={(e) => { e.preventDefault(); navigate("/regulamin-pasazer"); }}
                          data-testid="link-terms"
                        >
                          regulamin
                        </span>{" "}
                        *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={updateMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Zapisuję...
                  </>
                ) : (
                  "Zapisz"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
