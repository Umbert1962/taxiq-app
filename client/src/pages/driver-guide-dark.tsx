import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, UserCheck, Shield, Car, Calculator, Phone, 
  Clock, MapPin, Users, ChevronRight, Printer, ArrowLeft,
  DollarSign, Timer, Gauge, Star
} from "lucide-react";
import { useLocation } from "wouter";

export default function DriverGuide() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-6 print:py-2 print:px-2 print:max-w-none">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="text-muted-foreground"
            data-testid="button-back-guide"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Powrót
          </Button>
          <Button 
            onClick={() => window.print()}
            className="bg-primary text-black font-bold"
            data-testid="button-print-guide"
          >
            <Printer className="w-4 h-4 mr-2" />
            Drukuj / PDF
          </Button>
        </div>

        <div className="text-center mb-8 print:mb-4">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Car className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-primary print:text-2xl">TaxiQ</h1>
          </div>
          <h2 className="text-xl font-bold mb-1 print:text-lg">Przewodnik dla Kierowcy</h2>
          <p className="text-muted-foreground text-sm">Wszystko co musisz wiedzieć, aby zacząć zarabiać z TaxiQ</p>
        </div>

        <Section 
          icon={<Smartphone className="w-5 h-5" />}
          title="1. Rejestracja — krok po kroku"
          color="primary"
        >
          <Step number={1} title="Wejdź na stronę kierowcy">
            Otwórz <strong>taxiq.com.pl/driver</strong> w przeglądarce na telefonie.
          </Step>
          <Step number={2} title="Podaj dane">
            Wpisz swoje <strong>imię, nazwisko</strong> i <strong>numer telefonu</strong>. Kliknij „Zarejestruj się".
          </Step>
          <Step number={3} title="Wpisz kod SMS">
            Na Twój telefon przyjdzie <strong>6-cyfrowy kod SMS</strong>. Wpisz go w aplikacji.
          </Step>
          <Step number={4} title="Ustaw PIN">
            Wymyśl <strong>6-cyfrowy PIN</strong> — będziesz go używać do logowania zamiast hasła.
          </Step>
          <Step number={5} title="Uzupełnij profil">
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Dodaj <strong>zdjęcie profilowe</strong></li>
              <li>Wpisz <strong>numer identyfikatora taxi</strong> i urząd wydający</li>
              <li>Zaznacz <strong>języki</strong> którymi się posługujesz</li>
              <li>Zaakceptuj <strong>regulamin</strong></li>
            </ul>
          </Step>
          <Step number={6} title="Czekaj na weryfikację">
            Administrator sprawdzi Twoje dane i zdjęcia. Otrzymasz powiadomienie gdy konto zostanie <strong>zatwierdzone</strong>.
          </Step>
          <Step number={7} title="Dodaj pojazd">
            Po zatwierdzeniu dodaj swój pojazd (marka, model, kolor, tablice). Dopiero wtedy możesz przejść <strong>online</strong>.
          </Step>
        </Section>

        <Section 
          icon={<Shield className="w-5 h-5" />}
          title="2. Logowanie"
          color="primary"
        >
          <div className="space-y-2 text-sm">
            <p>Wejdź na <strong>taxiq.com.pl/driver</strong>, wpisz <strong>numer telefonu</strong> i <strong>6-cyfrowy PIN</strong>.</p>
            <p>Jeśli jesteś zalogowany na innym urządzeniu, system zapyta czy chcesz <strong>wymusić logowanie</strong> — poprzednia sesja zostanie zakończona.</p>
            <p className="text-yellow-400">Zapomniałeś PIN? Kliknij „Zapomniałem PIN" — dostaniesz nowy kod SMS do resetu.</p>
          </div>
        </Section>

        <div className="print:break-before-page" />

        <Section 
          icon={<Calculator className="w-5 h-5" />}
          title="3. Jak jest kalkulowana cena kursu"
          color="primary"
        >
          <SubSection title="A) Kurs z aplikacji (pasażer zamawia przez app)">
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mb-3">
              <p className="font-bold text-primary text-sm mb-2">Wzór na cenę:</p>
              <div className="font-mono text-xs space-y-1">
                <p>Cena = <span className="text-primary">Opłata startowa</span></p>
                <p className="pl-6">+ <span className="text-primary">Dystans (km)</span> × <span className="text-primary">Stawka za km</span></p>
                <p className="pl-6">+ <span className="text-yellow-400">Dopłaty</span></p>
              </div>
            </div>

            <p className="text-sm mb-2">Pasażer widzi cenę <strong>przed jazdą</strong> — wyliczoną z Twojego cennika. Nie zawiera korków ani postoju, bo te są naliczane na żywo.</p>

            <div className="grid grid-cols-1 gap-2 mb-3">
              <InfoBox icon={<Gauge className="w-4 h-4" />} title="Licznik czasu postoju" color="yellow">
                W trakcie jazdy system mierzy Twoją prędkość GPS co 3 sekundy. 
                Gdy jedziesz <strong>poniżej 15 km/h</strong> (korki, światła, czekanie) — naliczany jest czas postoju 
                wg Twojej stawki za minutę oczekiwania.
              </InfoBox>
              <InfoBox icon={<DollarSign className="w-4 h-4" />} title="Cena końcowa" color="primary">
                <strong>Cena końcowa = Cena z cennika + Koszt postoju/korków</strong>
                <br />
                Pasażer widzi to na żywo na swoim ekranie.
              </InfoBox>
            </div>

            <div className="text-sm space-y-1">
              <p className="font-bold text-sm mb-1">Dopłaty (doliczane automatycznie):</p>
              <div className="grid grid-cols-1 gap-1">
                <div className="flex justify-between text-xs bg-card/50 rounded px-2 py-1">
                  <span>Dodatkowy pasażer (powyżej 4 osób)</span>
                  <span className="text-primary font-bold">+10 zł / os.</span>
                </div>
                <div className="flex justify-between text-xs bg-card/50 rounded px-2 py-1">
                  <span>Kombi (duży bagażnik)</span>
                  <span className="text-primary font-bold">+10 zł</span>
                </div>
                <div className="flex justify-between text-xs bg-card/50 rounded px-2 py-1">
                  <span>Każdy przystanek po drodze</span>
                  <span className="text-primary font-bold">+10 zł / szt.</span>
                </div>
                <div className="flex justify-between text-xs bg-card/50 rounded px-2 py-1">
                  <span>Dojazd powyżej 5 km do pasażera</span>
                  <span className="text-primary font-bold">wg stawki oczekiwania</span>
                </div>
              </div>
            </div>
          </SubSection>

          <SubSection title="B) Kurs terminowy (zaplanowany z góry)">
            <div className="space-y-2 text-sm">
              <p>Pasażer planuje kurs na konkretną datę i godzinę. Może wybrać <strong>ulubionego kierowcę</strong>.</p>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                <p className="text-yellow-400 font-bold text-xs">Ważne: Opłata startowa jest podwójna!</p>
                <p className="text-xs mt-1">Np. jeśli Twoja opłata startowa to 9 zł, dla kursu terminowego wyniesie 18 zł.</p>
              </div>
              <p><strong>Jak to działa:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Jeśli pasażer wybrał Ciebie — kurs pojawia się tylko u Ciebie</li>
                <li>Masz <strong>10 minut</strong> na przyjęcie — potem kurs trafia do ogólnej puli</li>
                <li>Na <strong>20 minut</strong> przed kursem musisz potwierdzić gotowość</li>
                <li>Brak potwierdzenia = automatyczne cofnięcie kursu</li>
              </ul>
            </div>
          </SubSection>

          <SubSection title="C) Kurs telefoniczny (zamówienie przez telefon)">
            <div className="space-y-2 text-sm">
              <p>Klient dzwoni na centralę, operator tworzy zamówienie. Kurs pojawia się w zakładce <strong>„Dostępne"</strong>.</p>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2">
                <p className="text-orange-400 font-bold text-xs">Cena z taksometru!</p>
                <p className="text-xs mt-1">Przy zamówieniu telefonicznym <strong>Ty wpisujesz cenę z taksometru</strong> na końcu kursu. System nie kalkuluje ceny automatycznie — liczy się Twój taksometr.</p>
              </div>
            </div>
          </SubSection>
        </Section>

        <div className="print:break-before-page" />

        <Section 
          icon={<DollarSign className="w-5 h-5" />}
          title="4. Twój cennik — co możesz ustawić"
          color="primary"
        >
          <div className="text-sm mb-3">
            <p>W zakładce <strong>„Konto"</strong> → <strong>„Cennik"</strong> ustawiasz swoje stawki. Domyślne wartości:</p>
          </div>

          <div className="space-y-1 mb-3">
            <PricingRow label="Opłata startowa" value="9,00 zł" range="5,00 - 20,00 zł" />
            <div className="text-xs font-bold text-muted-foreground mt-2 mb-1 pl-1">Stawki dzienne (6:00 - 22:00):</div>
            <PricingRow label="Stawka miejska" value="3,50 zł/km" range="1,00 - 20,00 zł" />
            <PricingRow label="Stawka pozamiejska" value="4,50 zł/km" range="1,00 - 20,00 zł" />
            <div className="text-xs font-bold text-muted-foreground mt-2 mb-1 pl-1">Stawki nocne (22:00 - 6:00):</div>
            <PricingRow label="Stawka miejska" value="4,50 zł/km" range="1,00 - 20,00 zł" />
            <PricingRow label="Stawka pozamiejska" value="5,50 zł/km" range="1,00 - 20,00 zł" />
            <div className="text-xs font-bold text-muted-foreground mt-2 mb-1 pl-1">Stawki świąteczne (niedziele i święta):</div>
            <PricingRow label="Stawka miejska" value="4,50 zł/km" range="1,00 - 20,00 zł" />
            <PricingRow label="Stawka pozamiejska" value="5,50 zł/km" range="1,00 - 20,00 zł" />
            <div className="text-xs font-bold text-muted-foreground mt-2 mb-1 pl-1">Pozostałe:</div>
            <PricingRow label="Oczekiwanie / postój" value="1,00 zł/min" range="0,50 - 5,00 zł" />
            <PricingRow label="Promień pozamiejski" value="15 km" range="5 - 50 km" />
            <PricingRow label="Rabat dla pasażerów" value="0%" range="0 - 50%" />
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-lg p-2 text-xs">
            <p><strong>Stawka miejska vs pozamiejska:</strong> Jeśli dystans trasy jest mniejszy niż Twój „promień pozamiejski" (domyślnie 15 km), stosowana jest stawka miejska. Powyżej — pozamiejska.</p>
          </div>
        </Section>

        <Section 
          icon={<Timer className="w-5 h-5" />}
          title="5. Przykład kalkulacji"
          color="primary"
        >
          <div className="bg-card border border-border rounded-lg p-3 text-sm space-y-2">
            <p className="font-bold">Kurs: 12 km, dzień, w mieście, 6 pasażerów, kombi, 1 przystanek</p>
            <div className="border-t border-border pt-2 space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span>Opłata startowa</span>
                <span className="text-primary">9,00 zł</span>
              </div>
              <div className="flex justify-between">
                <span>12 km × 3,50 zł/km</span>
                <span className="text-primary">42,00 zł</span>
              </div>
              <div className="flex justify-between text-yellow-400">
                <span>Dopłata: 2 dodatkowe osoby (powyżej 4)</span>
                <span>+20,00 zł</span>
              </div>
              <div className="flex justify-between text-yellow-400">
                <span>Dopłata: kombi</span>
                <span>+10,00 zł</span>
              </div>
              <div className="flex justify-between text-yellow-400">
                <span>Dopłata: 1 przystanek</span>
                <span>+10,00 zł</span>
              </div>
              <div className="border-t border-primary/20 pt-1 flex justify-between font-bold text-primary">
                <span>Cena z cennika:</span>
                <span>91,00 zł</span>
              </div>
            </div>
            <div className="border-t border-border pt-2 space-y-1 font-mono text-xs">
              <p className="text-muted-foreground">W trakcie jazdy kierowca stał 8 minut w korkach:</p>
              <div className="flex justify-between text-yellow-400">
                <span>Postój/korki: 8 min × 1,00 zł/min</span>
                <span>+8,00 zł</span>
              </div>
              <div className="border-t border-primary/20 pt-1 flex justify-between font-bold text-lg text-primary">
                <span>CENA KOŃCOWA:</span>
                <span>99,00 zł</span>
              </div>
            </div>
          </div>
        </Section>

        <Section 
          icon={<Users className="w-5 h-5" />}
          title="6. Franczyza TaxiQ — dochód pasywny"
          color="primary"
        >
          <div className="space-y-3 text-sm">
            <p>Jako kierowca TaxiQ możesz budować <strong>własną sieć kierowców</strong> i zarabiać pasywnie.</p>

            <div className="grid grid-cols-1 gap-2">
              <InfoBox icon={<Star className="w-4 h-4" />} title="Zapraszasz kierowców" color="primary">
                Wysyłasz link polecający do znajomych kierowców. Gdy się zarejestrują przez Twój link — są w Twojej sieci.
              </InfoBox>
              <InfoBox icon={<Users className="w-4 h-4" />} title="Tworzysz własną sieć" color="primary">
                Każdy kierowca w Twojej sieci generuje dla Ciebie dochód. Im więcej kierowców — tym więcej zarabiasz.
              </InfoBox>
              <InfoBox icon={<DollarSign className="w-4 h-4" />} title="Dochód pasywny" color="yellow">
                Otrzymujesz <strong>część abonamentu</strong> od każdego kierowcy, którego poleciłeś — tak długo jak jest aktywny w systemie.
              </InfoBox>
            </div>

            <p className="text-xs text-muted-foreground">Możesz też zapraszać pasażerów — za pierwszą ukończoną jazdę poleconego pasażera dostajesz <strong>50 punktów</strong> bonusowych.</p>

            <div className="bg-primary/5 border border-primary/10 rounded-lg p-2 text-xs">
              <p><strong>Wymagania:</strong> Aktywna subskrypcja i podany numer konta bankowego (IBAN) w ustawieniach konta.</p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-xs">
              <p className="text-yellow-400 font-bold">Chcesz zostać partnerem franczyzowym?</p>
              <p className="mt-1">Wypełnij formularz na stronie głównej <strong>taxiq.com.pl</strong> w sekcji „Franchising TaxiQ" lub skontaktuj się z nami.</p>
            </div>
          </div>
        </Section>

        <Section 
          icon={<Phone className="w-5 h-5" />}
          title="7. Ważne informacje"
          color="primary"
        >
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p><strong>Minimalna cena kursu:</strong> 20 zł (system nie pozwoli na niższą)</p>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p><strong>Kontakt 24h:</strong> Po zakończeniu kursu masz 24h na kontakt z pasażerem przez zamaskowany numer</p>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p><strong>System BAN:</strong> Możesz zablokować problematycznego pasażera na 7 dni, 14 dni lub 3 miesiące</p>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p><strong>CITO:</strong> Kursy priorytetowe — pasażer sam podaje cenę (min. 20 zł), widzisz je w ofercie z oznaczeniem CITO</p>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p><strong>Jedno logowanie:</strong> Możesz być zalogowany tylko na jednym urządzeniu</p>
            </div>
          </div>
        </Section>

        <div className="text-center py-6 text-muted-foreground text-xs print:py-3">
          <p>TaxiQ — Twoje taxi, bez pośredników</p>
          <p className="mt-1">taxiq.com.pl</p>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, color, children }: { 
  icon: React.ReactNode; title: string; color: string; children: React.ReactNode 
}) {
  return (
    <Card className="mb-4 bg-card/50 border-border print:mb-2 print:break-inside-avoid">
      <CardContent className="p-4 print:p-3">
        <div className="flex items-center gap-2 mb-3 print:mb-2">
          <div className={`w-8 h-8 rounded-lg bg-${color}/10 flex items-center justify-center border border-${color}/20 text-${color}`}>
            {icon}
          </div>
          <h3 className="text-lg font-bold print:text-base">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-3 print:mb-2">
      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-primary/30">
        {number}
      </div>
      <div className="text-sm">
        <p className="font-bold">{title}</p>
        <div className="text-muted-foreground mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 print:mb-2">
      <h4 className="font-bold text-sm mb-2 text-primary/90 border-b border-primary/10 pb-1">{title}</h4>
      {children}
    </div>
  );
}

function InfoBox({ icon, title, color, children }: { 
  icon: React.ReactNode; title: string; color: string; children: React.ReactNode 
}) {
  return (
    <div className={`bg-${color}-500/5 border border-${color}-500/10 rounded-lg p-2`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`text-${color}-400`}>{icon}</span>
        <span className={`font-bold text-xs text-${color}-400`}>{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  );
}

function PricingRow({ label, value, range }: { label: string; value: string; range: string }) {
  return (
    <div className="flex items-center justify-between text-xs bg-card/50 rounded px-2 py-1.5 border border-border/50">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-bold text-primary">{value}</span>
        <span className="text-muted-foreground text-[10px]">({range})</span>
      </div>
    </div>
  );
}