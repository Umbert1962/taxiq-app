import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Users, Car, Heart, Zap } from "lucide-react";

export default function Konstytucja() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-primary">Konstytucja TaxiQ</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-primary glow-text mb-4">Konstytucja TaxiQ</h2>
          <p className="text-muted-foreground text-lg">
            Nasze wartości i zasady, którymi kierujemy się każdego dnia
          </p>
        </div>

        <div className="space-y-8">
          <article className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">1. Pasażer jest najważniejszy</h3>
            </div>
            <p className="text-muted-foreground">
              Każdy pasażer zasługuje na bezpieczny, komfortowy i punktualny przejazd. 
              Stawiamy potrzeby pasażerów na pierwszym miejscu w każdej naszej decyzji.
            </p>
          </article>

          <article className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">2. Szanujemy kierowców</h3>
            </div>
            <p className="text-muted-foreground">
              Kierowcy to serce TaxiQ. Zapewniamy uczciwe warunki współpracy, 
              przejrzyste zasady i wsparcie na każdym kroku. Zero ukrytych prowizji.
            </p>
          </article>

          <article className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">3. Bezpieczeństwo ponad wszystko</h3>
            </div>
            <p className="text-muted-foreground">
              Weryfikujemy każdego kierowcę, dbamy o bezpieczeństwo danych 
              i zapewniamy transparentność każdego przejazdu.
            </p>
          </article>

          <article className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">4. Prostota i szybkość</h3>
            </div>
            <p className="text-muted-foreground">
              Zamawianie taxi powinno być proste jak jedno kliknięcie. 
              Ciągle usprawniamy naszą platformę, by oszczędzać Twój czas.
            </p>
          </article>

          <article className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">5. Lokalna społeczność</h3>
            </div>
            <p className="text-muted-foreground">
              TaxiQ to polska platforma, stworzona dla polskich kierowców i pasażerów. 
              Wspieramy lokalne społeczności i dbamy o rozwój branży taxi w Polsce.
            </p>
          </article>
        </div>

        <div className="mt-12 text-center">
          <p className="text-primary font-semibold text-lg">
            TaxiQ - Szybko, bezpiecznie, lokalnie.
          </p>
        </div>
      </main>
    </div>
  );
}
