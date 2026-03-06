import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RegulaminPasazer() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" data-testid="button-back" onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-primary">Regulamin Pasażera</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Regulamin dla pasażerów platformy TaxiQ</h2>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">1. Rejestracja</h3>
            <p className="text-muted-foreground mb-4">
              Pasażer rejestruje się podając imię, nazwisko, numer telefonu i adres e-mail.
              Konto jest aktywne natychmiast po rejestracji.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">2. Zamawianie przejazdu</h3>
            <p className="text-muted-foreground mb-4">
              Pasażer podaje adres odbioru i adres docelowy. Może dodać dodatkowe przystanki.
              Po złożeniu zamówienia kierowcy w okolicy otrzymują powiadomienie
              i mogą zaakceptować kurs.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">3. Zamówienie telefoniczne</h3>
            <p className="text-muted-foreground mb-4">
              Pasażer może również zamówić taxi dzwoniąc pod numer TaxiQ.
              System automatycznie tworzy zamówienie, które trafia na giełdę kierowców.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">4. Płatności</h3>
            <p className="text-muted-foreground mb-4">
              Płatność za przejazd odbywa się bezpośrednio u kierowcy - gotówką lub
              w inny sposób uzgodniony z kierowcą. TaxiQ nie pośredniczy w płatnościach
              za przejazdy.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">5. Anulowanie</h3>
            <p className="text-muted-foreground mb-4">
              Pasażer może anulować zamówienie przed przyjazdem kierowcy bez żadnych opłat.
              Częste anulowanie po przyjęciu kursu przez kierowcę może skutkować
              ograniczeniem konta.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">6. Obowiązki pasażera</h3>
            <ul className="text-muted-foreground space-y-2 list-disc pl-6">
              <li>Podanie prawidłowego adresu odbioru</li>
              <li>Gotowość do wejścia do pojazdu po przyjeździe kierowcy</li>
              <li>Kulturalne zachowanie podczas przejazdu</li>
              <li>Terminowa płatność za przejazd</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">7. Ocenianie</h3>
            <p className="text-muted-foreground mb-4">
              Po zakończeniu przejazdu pasażer może ocenić kierowcę. Oceny pomagają
              utrzymać wysoki standard usług na platformie.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8 pt-4 border-t border-border">
            Ostatnia aktualizacja: Luty 2026
          </p>
        </div>
      </main>
    </div>
  );
}
