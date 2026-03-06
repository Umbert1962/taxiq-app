import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RegulaminBiznes() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-primary">Regulamin Biznes</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Regulamin dla klientów biznesowych platformy TaxiQ</h2>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">1. Konto biznesowe</h3>
            <p className="text-muted-foreground mb-4">
              Konto biznesowe jest przeznaczone dla hoteli, firm i organizacji,
              które zamawiają przejazdy taxi dla swoich gości, pracowników lub klientów.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">2. Rejestracja firmy</h3>
            <p className="text-muted-foreground mb-4">
              Rejestracja wymaga podania nazwy firmy, NIP, adresu siedziby, danych kontaktowych
              oraz danych osoby upoważnionej do korzystania z konta.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">3. Zamawianie przejazdów</h3>
            <p className="text-muted-foreground mb-4">
              Klient biznesowy może zamawiać przejazdy dla dowolnej osoby, podając
              jej imię i adres odbioru. Przejazdy biznesowe są oznaczone w systemie
              i objęte osobnymi statystykami.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">4. Zarządzanie pracownikami</h3>
            <p className="text-muted-foreground mb-4">
              Klient biznesowy może dodawać pracowników do konta, przydzielać im uprawnienia
              do zamawiania przejazdów oraz monitorować historię zamówień.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">5. Fakturowanie</h3>
            <p className="text-muted-foreground mb-4">
              Platforma generuje faktury za przejazdy biznesowe. Faktury zawierają
              szczegółowe zestawienie wszystkich przejazdów w danym okresie rozliczeniowym.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">6. Płatności</h3>
            <p className="text-muted-foreground mb-4">
              Klient biznesowy rozlicza się na podstawie wystawionych faktur.
              Termin płatności i warunki rozliczeniowe ustalane są indywidualnie.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold text-primary mb-3">7. Odpowiedzialność</h3>
            <p className="text-muted-foreground mb-4">
              Klient biznesowy ponosi odpowiedzialność za prawidłowość danych podanych
              przy zamawianiu przejazdu oraz za terminowe regulowanie płatności.
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
