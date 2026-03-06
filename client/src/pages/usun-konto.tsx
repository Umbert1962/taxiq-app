import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";

const deleteAccountSchema = z.object({
  accountType: z.enum(["passenger", "driver", "company"], {
    required_error: "Wybierz typ konta",
  }),
  username: z.string().min(1, "Podaj email lub numer telefonu"),
  password: z.string().min(1, "Podaj hasło"),
  confirmDelete: z.boolean().refine((val) => val === true, {
    message: "Musisz potwierdzić chęć usunięcia konta",
  }),
});

type DeleteAccountForm = z.infer<typeof deleteAccountSchema>;

export default function UsunKonto() {
  const { toast } = useToast();
  const [isDeleted, setIsDeleted] = useState(false);

  const form = useForm<DeleteAccountForm>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: {
      accountType: undefined,
      username: "",
      password: "",
      confirmDelete: false,
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (data: DeleteAccountForm) => {
      const response = await apiRequest("DELETE", "/api/account/delete", {
        accountType: data.accountType,
        username: data.username,
        password: data.password,
      });
      return response.json();
    },
    onSuccess: () => {
      setIsDeleted(true);
      toast({
        title: "Konto usunięte",
        description: "Twoje konto i wszystkie powiązane dane zostały usunięte.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się usunąć konta. Sprawdź dane logowania.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DeleteAccountForm) => {
    deleteMutation.mutate(data);
  };

  if (isDeleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Konto usunięte</CardTitle>
            <CardDescription>
              Twoje konto i wszystkie powiązane dane zostały trwale usunięte z naszego systemu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Wróć do strony głównej
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Usuń konto TaxiQ</CardTitle>
          <CardDescription>
            Ta operacja jest nieodwracalna. Wszystkie Twoje dane zostaną trwale usunięte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive mb-1">Uwaga!</p>
                <p className="text-muted-foreground">
                  Po usunięciu konta zostaną skasowane:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>Dane osobowe (imię, email, telefon)</li>
                  <li>Historia przejazdów</li>
                  <li>Historia wiadomości</li>
                  <li>Oceny i komentarze</li>
                </ul>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ konta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-account-type">
                          <SelectValue placeholder="Wybierz typ konta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="passenger">Pasażer</SelectItem>
                        <SelectItem value="driver">Kierowca</SelectItem>
                        <SelectItem value="company">Firma / Hotel</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email lub numer telefonu</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="jan@example.com"
                        {...field}
                        data-testid="input-username"
                      />
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
                    <FormLabel>Hasło</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Twoje hasło"
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmDelete"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-confirm"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Rozumiem, że ta operacja jest nieodwracalna i chcę trwale usunąć swoje konto
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Link href="/" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    data-testid="button-cancel"
                  >
                    Anuluj
                  </Button>
                </Link>
                <Button
                  type="submit"
                  variant="destructive"
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-account"
                >
                  {deleteMutation.isPending ? "Usuwanie..." : "Usuń konto"}
                </Button>
              </div>
            </form>
          </Form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Jeśli masz pytania dotyczące usuwania danych, skontaktuj się z nami:{" "}
            <a href="mailto:kontakt@taxiq.com.pl" className="text-primary hover:underline">
              kontakt@taxiq.com.pl
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
