import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RegulaminKierowca() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-primary">Regulamin Kierowcy</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Regulamin dla kierowców platformy TaxiQ</h2>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">1. Warunki dołączenia</h3>
            <p className="text-muted-foreground mb-4">
              Kierowca musi posiadać aktualną licencję taxi, ważne prawo jazdy kategorii B
              oraz ubezpieczenie OC i NNW pojazdu przeznaczonego do przewozu osób.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">2. Rejestracja i weryfikacja</h3>
            <p className="text-muted-foreground mb-4">
              Rejestracja kierowcy wymaga podania danych osobowych, przesłania zdjęcia profilowego,
              skanu licencji taxi oraz dowodu rejestracyjnego pojazdu. Profil podlega weryfikacji
              przez administratora platformy.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">3. Subskrypcja</h3>
            <p className="text-muted-foreground mb-4">
              Kierowca wybiera plan subskrypcyjny przydzielony przez administratora.
              TaxiQ nie pobiera prowizji od poszczególnych kursów - jedynym kosztem
              jest opłata subskrypcyjna.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">4. Przyjmowanie zleceń</h3>
            <p className="text-muted-foreground mb-4">
              Kierowca samodzielnie decyduje o przyjęciu lub odrzuceniu zlecenia.
              Platforma nie narzuca tras ani nie wymusza przyjmowania kursów.
              Kierowca może korzystać z giełdy zamówień telefonicznych.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">5. Obowiązki kierowcy</h3>
            <ul className="text-muted-foreground space-y-2 list-disc pl-6">
              <li>Utrzymanie pojazdu w stanie technicznym zapewniającym bezpieczeństwo</li>
              <li>Kulturalna i profesjonalna obsługa pasażerów</li>
              <li>Przestrzeganie przepisów ruchu drogowego</li>
              <li>Aktualizacja statusu przejazdu w aplikacji</li>
              <li>Terminowe opłacanie subskrypcji</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">6. Rozliczenia</h3>
            <p className="text-muted-foreground mb-4">
              Płatność za przejazd odbywa się bezpośrednio między pasażerem a kierowcą.
              Kierowca zachowuje 100% kwoty za kurs. Platforma nie jest stroną transakcji
              płatniczej za przejazd.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">7. Zawieszenie i usunięcie konta</h3>
            <p className="text-muted-foreground mb-4">
              Administrator może zawiesić konto kierowcy w przypadku naruszenia regulaminu,
              otrzymania powtarzających się negatywnych ocen lub braku opłacenia subskrypcji.
              Kierowca może w każdej chwili usunąć swoje konto.
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
