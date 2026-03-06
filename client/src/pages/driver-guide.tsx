import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useLocation } from "wouter";

export default function DriverGuide() {
  const [, setLocation] = useLocation();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", color: "#000000" }}>
      <div style={{ maxWidth: "210mm", margin: "0 auto", padding: "24px 32px" }} className="print:px-[15mm] print:py-[10mm]">

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }} className="print:hidden">
          <button
            onClick={() => setLocation("/")}
            data-testid="button-back-guide"
            style={{ padding: "8px 16px", border: "1px solid #999", borderRadius: 6, background: "#fff", color: "#000", cursor: "pointer", fontSize: 14 }}
          >
            ← Powrót
          </button>
          <button
            onClick={() => window.print()}
            data-testid="button-print-guide"
            style={{ padding: "8px 16px", borderRadius: 6, background: "#000", color: "#fff", cursor: "pointer", fontSize: 14, border: "none" }}
          >
            🖨 Drukuj / Zapisz PDF
          </button>
        </div>

        <header style={{ textAlign: "center", marginBottom: 32, borderBottom: "2px solid #000", paddingBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>TaxiQ</h1>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>PRZEWODNIK DLA KIEROWCY</h2>
          <p style={{ fontSize: 14, color: "#666", marginTop: 4 }}>taxiq.com.pl/driver</p>
        </header>

        <section className="mb-6">
          <SectionTitle number="1" title="REJESTRACJA" />
          <table className="w-full text-sm border-collapse">
            <tbody>
              <StepRow step="1" title="Otwórz stronę" desc="taxiq.com.pl/driver w przeglądarce na telefonie" />
              <StepRow step="2" title="Podaj dane" desc="Imię, nazwisko, numer telefonu → kliknij Zarejestruj się" />
              <StepRow step="3" title="Kod SMS" desc="Wpisz 6-cyfrowy kod, który przyjdzie SMSem" />
              <StepRow step="4" title="Ustaw PIN" desc="Wymyśl 6-cyfrowy PIN — będziesz go używać do logowania" />
              <StepRow step="5" title="Uzupełnij profil" desc="Zdjęcie profilowe, numer identyfikatora taxi, urząd wydający, języki, regulamin" />
              <StepRow step="6" title="Weryfikacja" desc="Administrator sprawdzi Twoje dane — dostaniesz powiadomienie" />
              <StepRow step="7" title="Dodaj pojazd" desc="Marka, model, kolor, tablice rejestracyjne → możesz iść online" />
            </tbody>
          </table>
        </section>

        <section className="mb-6">
          <SectionTitle number="2" title="LOGOWANIE" />
          <div className="text-sm space-y-1 pl-1">
            <p>Wejdź na <b>taxiq.com.pl/driver</b>, wpisz <b>numer telefonu</b> i <b>6-cyfrowy PIN</b>.</p>
            <p>Zalogowany na innym urządzeniu? System pozwoli wymusić logowanie (poprzednia sesja się kończy).</p>
            <p>Zapomniałeś PIN? → <b>„Zapomniałem PIN"</b> → nowy kod SMS do resetu.</p>
          </div>
        </section>

        <section className="mb-6 print:break-before-page">
          <SectionTitle number="3" title="KALKULACJA CENY KURSU" />

          <SubTitle label="A" title="Kurs z aplikacji" />
          <div className="border border-black rounded p-3 mb-3 bg-gray-50">
            <p className="font-bold text-sm mb-1">WZÓR NA CENĘ:</p>
            <p className="font-mono text-sm">
              Cena = Opłata startowa + (Dystans km × Stawka/km) + Dopłaty
            </p>
          </div>
          <p className="text-sm mb-2">
            Pasażer widzi tę cenę <b>przed jazdą</b> (z Twojego cennika, bez korków — te są na żywo).
          </p>

          <div className="border border-gray-400 rounded p-3 mb-3">
            <p className="font-bold text-sm mb-1">⏱ LICZNIK POSTOJU (w trakcie jazdy):</p>
            <p className="text-sm">
              System mierzy prędkość GPS co 3 sekundy. Gdy jedziesz <b>poniżej 15 km/h</b>
              {" "}(korki, światła, czekanie) — naliczany jest czas postoju wg Twojej stawki za minutę.
            </p>
            <p className="text-sm font-bold mt-2">
              CENA KOŃCOWA = Cena z cennika + Koszt postoju/korków
            </p>
            <p className="text-xs text-gray-600 mt-1">Pasażer widzi to na żywo na swoim ekranie.</p>
          </div>

          <p className="font-bold text-sm mb-1">Dopłaty automatyczne:</p>
          <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="p-1.5 border-r border-gray-300">Dodatkowy pasażer (powyżej 4 osób)</td>
                <td className="p-1.5 font-bold text-right">+10 zł / os.</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-1.5 border-r border-gray-300">Kombi (duży bagażnik)</td>
                <td className="p-1.5 font-bold text-right">+10 zł</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-1.5 border-r border-gray-300">Każdy przystanek po drodze</td>
                <td className="p-1.5 font-bold text-right">+10 zł / szt.</td>
              </tr>
              <tr>
                <td className="p-1.5 border-r border-gray-300">Dojazd powyżej 5 km do pasażera</td>
                <td className="p-1.5 font-bold text-right">wg stawki oczekiwania</td>
              </tr>
            </tbody>
          </table>

          <SubTitle label="B" title="Kurs terminowy (zaplanowany)" />
          <div className="text-sm space-y-1 mb-3 pl-1">
            <p><b>Opłata startowa × 2</b> (np. 9 zł → 18 zł dla kursu terminowego)</p>
            <p>Pasażer może wybrać ulubionego kierowcę — kurs widoczny tylko dla Ciebie.</p>
            <p>Masz <b>10 minut</b> na przyjęcie, potem kurs trafia do ogólnej puli.</p>
            <p>Na <b>20 min</b> przed kursem musisz potwierdzić gotowość (brak = automatyczne cofnięcie).</p>
          </div>

          <SubTitle label="C" title="Kurs telefoniczny" />
          <div className="border-2 border-black rounded p-2 mb-3">
            <p className="text-sm">
              Klient dzwoni na centralę → kurs pojawia się w zakładce „Dostępne".
              <br />
              <b>Ty wpisujesz cenę z taksometru</b> na końcu kursu. System nie kalkuluje ceny.
            </p>
          </div>
        </section>

        <section className="mb-6 print:break-before-page">
          <SectionTitle number="4" title="TWÓJ CENNIK" />
          <p className="text-sm mb-2">Ustawiasz w zakładce <b>Konto → Cennik</b>. Wartości domyślne:</p>
          <table className="w-full text-sm border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-1.5 text-left border border-gray-400">Stawka</th>
                <th className="p-1.5 text-right border border-gray-400">Domyślnie</th>
                <th className="p-1.5 text-right border border-gray-400">Zakres</th>
              </tr>
            </thead>
            <tbody>
              <PriceRow label="Opłata startowa" value="9,00 zł" range="5 – 20 zł" />
              <tr><td colSpan={3} className="bg-gray-200 p-1 font-bold text-xs border border-gray-400">DZIENNE (6:00 – 22:00)</td></tr>
              <PriceRow label="Stawka miejska" value="3,50 zł/km" range="1 – 20 zł" />
              <PriceRow label="Stawka pozamiejska" value="4,50 zł/km" range="1 – 20 zł" />
              <tr><td colSpan={3} className="bg-gray-200 p-1 font-bold text-xs border border-gray-400">NOCNE (22:00 – 6:00)</td></tr>
              <PriceRow label="Stawka miejska" value="4,50 zł/km" range="1 – 20 zł" />
              <PriceRow label="Stawka pozamiejska" value="5,50 zł/km" range="1 – 20 zł" />
              <tr><td colSpan={3} className="bg-gray-200 p-1 font-bold text-xs border border-gray-400">ŚWIĄTECZNE (niedziele i święta)</td></tr>
              <PriceRow label="Stawka miejska" value="4,50 zł/km" range="1 – 20 zł" />
              <PriceRow label="Stawka pozamiejska" value="5,50 zł/km" range="1 – 20 zł" />
              <tr><td colSpan={3} className="bg-gray-200 p-1 font-bold text-xs border border-gray-400">POZOSTAŁE</td></tr>
              <PriceRow label="Oczekiwanie / postój" value="1,00 zł/min" range="0,50 – 5 zł" />
              <PriceRow label="Promień pozamiejski" value="15 km" range="5 – 50 km" />
              <PriceRow label="Rabat" value="0%" range="0 – 50%" />
            </tbody>
          </table>
          <p className="text-xs text-gray-600 mt-1 pl-1">
            Stawka miejska stosowana gdy dystans ≤ promienia pozamiejskiego. Powyżej — stawka pozamiejska.
          </p>
        </section>

        <section className="mb-6">
          <SectionTitle number="5" title="PRZYKŁAD KALKULACJI" />
          <div className="border border-gray-400 rounded p-3">
            <p className="font-bold text-sm mb-2">Kurs: 12 km, dzień, w mieście, 6 pasażerów, kombi, 1 przystanek</p>
            <table className="w-full text-sm">
              <tbody>
                <CalcRow label="Opłata startowa" value="9,00 zł" />
                <CalcRow label="12 km × 3,50 zł/km" value="42,00 zł" />
                <CalcRow label="Dopłata: 2 dodatkowe osoby (powyżej 4)" value="+20,00 zł" bold />
                <CalcRow label="Dopłata: kombi" value="+10,00 zł" bold />
                <CalcRow label="Dopłata: 1 przystanek" value="+10,00 zł" bold />
                <tr className="border-t-2 border-black">
                  <td className="pt-1 font-bold">CENA Z CENNIKA:</td>
                  <td className="pt-1 font-bold text-right">91,00 zł</td>
                </tr>
                <tr className="border-t border-gray-300">
                  <td className="pt-1 text-gray-600">W trakcie jazdy: 8 min postoju (korki)</td>
                  <td className="pt-1 text-right">+8,00 zł</td>
                </tr>
                <tr className="border-t-2 border-black bg-gray-100">
                  <td className="p-2 font-black text-base">CENA KOŃCOWA:</td>
                  <td className="p-2 font-black text-base text-right">99,00 zł</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6 print:break-before-page">
          <SectionTitle number="6" title="FRANCZYZA — DOCHÓD PASYWNY" />
          <div className="text-sm space-y-2 pl-1">
            <p><b>1. Zapraszaj kierowców</b> — wysyłasz link polecający. Gdy się zarejestrują, są w Twojej sieci.</p>
            <p><b>2. Buduj sieć</b> — każdy aktywny kierowca w Twojej sieci generuje dochód.</p>
            <p><b>3. Zarabiaj</b> — otrzymujesz <b>część abonamentu</b> od każdego poleconego kierowcy, tak długo jak jest aktywny.</p>
            <p>Możesz też zapraszać pasażerów — za pierwszą jazdę poleconego pasażera dostajesz <b>50 punktów</b>.</p>
          </div>
          <div className="border border-gray-400 rounded p-2 mt-2 text-sm">
            <p><b>Wymagania:</b> aktywna subskrypcja + numer konta bankowego (IBAN) w ustawieniach.</p>
            <p className="mt-1">Chcesz zostać partnerem? → formularz na <b>taxiq.com.pl</b> w sekcji „Franchising TaxiQ".</p>
          </div>
        </section>

        <section className="mb-6">
          <SectionTitle number="7" title="WAŻNE INFORMACJE" />
          <ul className="text-sm space-y-1 pl-1 list-none">
            <li>▸ <b>Minimalna cena kursu:</b> 20 zł</li>
            <li>▸ <b>Kontakt 24h:</b> po zakończeniu kursu masz 24h na kontakt z pasażerem (zamaskowany numer)</li>
            <li>▸ <b>System BAN:</b> możesz zablokować pasażera na 7 dni, 14 dni lub 3 miesiące</li>
            <li>▸ <b>CITO:</b> kursy priorytetowe — pasażer podaje cenę (min. 20 zł)</li>
            <li>▸ <b>Jedno logowanie:</b> możesz być zalogowany tylko na jednym urządzeniu</li>
            <li>▸ <b>Kurs terminowy:</b> opłata startowa × 2</li>
          </ul>
        </section>

        <footer className="text-center text-sm text-gray-500 border-t border-gray-300 pt-3 mt-6">
          <p className="font-bold text-black">TaxiQ — Twoje taxi, bez pośredników</p>
          <p>taxiq.com.pl</p>
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <h3 className="text-base font-black border-b-2 border-black pb-1 mb-3 uppercase">
      {number}. {title}
    </h3>
  );
}

function SubTitle({ label, title }: { label: string; title: string }) {
  return (
    <h4 className="font-bold text-sm mb-1 mt-3 border-l-4 border-black pl-2">
      {label}) {title}
    </h4>
  );
}

function StepRow({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <tr className="border-b border-gray-200">
      <td className="p-1.5 font-bold text-center w-8 align-top">{step}</td>
      <td className="p-1.5 align-top">
        <span className="font-bold">{title}</span>
        <br />
        <span className="text-gray-600 text-xs">{desc}</span>
      </td>
    </tr>
  );
}

function PriceRow({ label, value, range }: { label: string; value: string; range: string }) {
  return (
    <tr className="border-b border-gray-300">
      <td className="p-1.5 border-r border-gray-400">{label}</td>
      <td className="p-1.5 font-bold text-right border-r border-gray-400">{value}</td>
      <td className="p-1.5 text-right text-gray-600 text-xs">{range}</td>
    </tr>
  );
}

function CalcRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr>
      <td className={`py-0.5 ${bold ? 'text-gray-700' : ''}`}>{label}</td>
      <td className={`py-0.5 text-right ${bold ? 'font-bold' : ''}`}>{value}</td>
    </tr>
  );
}