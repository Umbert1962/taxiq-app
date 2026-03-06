import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Calculator, Clock, Route, AlertTriangle,
  CheckCircle, Car, Timer, TrendingUp
} from "lucide-react";
import { useLocation } from "wouter";

export default function PassengerInfo() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-muted-foreground"
            data-testid="button-back-info"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Powrót
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-[hsl(70,100%,50%)]">TaxiQ</h1>
          <h2 className="text-lg font-bold mt-1">INFORMACJA O CENACH</h2>
          <p className="text-sm text-gray-400 mt-1">Jak obliczamy cenę Twojego kursu</p>
        </div>

        <Card className="bg-[#111] border-[#222] mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[hsl(70,100%,50%)]/10 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-[hsl(70,100%,50%)]" />
              </div>
              <h3 className="text-lg font-bold">Cena wyświetlana przy zamówieniu</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Cena, którą widzisz w momencie zamawiania kursu, jest <strong className="text-white">szacunkowa</strong> i obliczana
              na podstawie:
            </p>
            <div className="space-y-3 ml-2">
              <div className="flex items-start gap-3">
                <Route className="w-5 h-5 text-[hsl(70,100%,50%)] mt-0.5 shrink-0" />
                <p className="text-sm text-gray-300"><strong className="text-white">Dystansu</strong> — odległość trasy od punktu A do punktu B</p>
              </div>
              <div className="flex items-start gap-3">
                <Car className="w-5 h-5 text-[hsl(70,100%,50%)] mt-0.5 shrink-0" />
                <p className="text-sm text-gray-300"><strong className="text-white">Cennika kierowcy</strong> — stawka za km, opłata początkowa</p>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-[hsl(70,100%,50%)] mt-0.5 shrink-0" />
                <p className="text-sm text-gray-300"><strong className="text-white">Dopłat</strong> — dodatkowe osoby powyżej 4 (+10 zł/os.), pojazd kombi (+10 zł), przystanki (+10 zł/przystanek)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-[#222] mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold">Co może zmienić cenę?</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Cena końcowa może się <strong className="text-amber-400">nieznacznie różnić</strong> od wyświetlanej szacunkowej.
              Wynika to wyłącznie z warunków na drodze podczas jazdy:
            </p>
            <div className="space-y-4 ml-2">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Korki i spowolniony ruch</p>
                  <p className="text-sm text-gray-400">Gdy samochód jedzie wolniej niż 15 km/h (korki, zatłoczone ulice), naliczany jest czas postoju wg stawki kierowcy (zwykle ok. 1 zł/min).</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Timer className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Oczekiwanie na pasażera</p>
                  <p className="text-sm text-gray-400">Jeśli kierowca czeka na Ciebie pod adresem odbioru, a samochód stoi — czas oczekiwania jest również naliczany.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Route className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Zmiana trasy lub objazdy</p>
                  <p className="text-sm text-gray-400">Jeśli kierowca musi jechać objazdem (np. zamknięta droga, wypadek), trasa może być dłuższa niż planowana.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-[#222] mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-lg font-bold">Co NIE zmienia ceny</h3>
            </div>
            <div className="space-y-3 ml-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-300">Pora dnia — cena <strong className="text-white">nie zmienia się</strong> w godzinach szczytu</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-300">Pogoda — nie ma dodatkowych opłat za deszcz, śnieg itp.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-300">Popyt — cena <strong className="text-white">nie rośnie</strong> gdy jest dużo zamówień</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-[#222] mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[hsl(70,100%,50%)]/10 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-[hsl(70,100%,50%)]" />
              </div>
              <h3 className="text-lg font-bold">Jak to wygląda w praktyce?</h3>
            </div>
            <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#222]">
              <p className="text-sm text-gray-400 mb-3">Przykład kursu 12 km:</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-[#222]">
                    <td className="py-2 text-gray-300">Cena z cennika (12 km × 3,50 zł + 8 zł start)</td>
                    <td className="py-2 text-right font-semibold">50,00 zł</td>
                  </tr>
                  <tr className="border-b border-[#222]">
                    <td className="py-2 text-gray-300">Czas postoju/korki (7 min × 1 zł/min)</td>
                    <td className="py-2 text-right font-semibold text-amber-400">+ 7,00 zł</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-white font-bold">Cena końcowa</td>
                    <td className="py-2 text-right font-bold text-[hsl(70,100%,50%)] text-lg">57,00 zł</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              W tym przypadku wyświetlana cena szacunkowa wynosiła 50 zł. Różnica 7 zł to koszt 7 minut postoju w korkach.
            </p>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-600 mt-8 mb-4">
          <p>TaxiQ — Twoje taxi, uczciwe ceny</p>
          <p className="mt-1">taxiq.com.pl</p>
        </div>
      </div>
    </div>
  );
}
