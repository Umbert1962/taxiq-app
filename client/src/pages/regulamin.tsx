import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Regulamin() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-primary">Regulamin TaxiQ</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Regulamin korzystania z platformy TaxiQ</h2>
          
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">1. Postanowienia ogólne</h3>
            <p className="text-muted-foreground mb-4">
              Niniejszy regulamin określa zasady korzystania z platformy TaxiQ, 
              świadczącej usługi pośrednictwa w zamawianiu przewozu osób.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">2. Definicje</h3>
            <ul className="text-muted-foreground space-y-2 list-disc pl-6">
              <li><strong>Platforma</strong> - aplikacja mobilna i strona internetowa TaxiQ</li>
              <li><strong>Pasażer</strong> - osoba zamawiająca przejazd</li>
              <li><strong>Kierowca</strong> - licencjonowany przewoźnik wykonujący przejazd</li>
              <li><strong>Klient biznesowy</strong> - firma lub hotel korzystający z usług dla swoich gości</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">3. Zasady korzystania</h3>
            <p className="text-muted-foreground mb-4">
              Użytkownik zobowiązuje się do podania prawdziwych danych osobowych 
              oraz korzystania z platformy zgodnie z jej przeznaczeniem.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">4. Płatności</h3>
            <p className="text-muted-foreground mb-4">
              Rozliczenia za przejazdy odbywają się bezpośrednio między pasażerem a kierowcą. 
              Platforma TaxiQ nie pobiera prowizji od przejazdów.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">5. Odpowiedzialność</h3>
            <p className="text-muted-foreground mb-4">
              TaxiQ jest platformą pośredniczącą i nie ponosi odpowiedzialności 
              za przebieg samego przejazdu. Kierowcy są niezależnymi przedsiębiorcami.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">6. Ochrona danych</h3>
            <p className="text-muted-foreground mb-4">
              Dane osobowe użytkowników są przetwarzane zgodnie z RODO. 
              Szczegóły w Polityce Prywatności.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">7. Postanowienia końcowe</h3>
            <p className="text-muted-foreground mb-4">
              Regulamin wchodzi w życie z dniem publikacji. TaxiQ zastrzega sobie 
              prawo do zmiany regulaminu z 14-dniowym wyprzedzeniem.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8 pt-4 border-t border-border">
            Ostatnia aktualizacja: Styczeń 2026
          </p>
        </div>
      </main>
    </div>
  );
}
