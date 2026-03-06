import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PolitykaPrywatnosci() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Powrót
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Polityka Prywatności TaxiQ</CardTitle>
            <p className="text-muted-foreground">Ostatnia aktualizacja: 28 stycznia 2026</p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Administrator danych</h2>
              <p className="text-muted-foreground">
                Administratorem Twoich danych osobowych jest TAXIQ z siedzibą w Polsce. 
                Kontakt: kontakt@taxiq.com.pl
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Jakie dane zbieramy</h2>
              <p className="text-muted-foreground mb-2">W ramach korzystania z aplikacji TaxiQ zbieramy następujące dane:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>Dane osobowe:</strong> imię, nazwisko, adres e-mail, numer telefonu</li>
                <li><strong>Dane lokalizacyjne:</strong> dokładna lokalizacja GPS (współrzędne geograficzne)</li>
                <li><strong>Dane adresowe:</strong> adres domowy, adresy odbioru i docelowe</li>
                <li><strong>Historia przejazdów:</strong> trasy, daty, ceny przejazdów</li>
                <li><strong>Komunikacja:</strong> wiadomości czatu między pasażerem a kierowcą</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Cel przetwarzania danych</h2>
              <p className="text-muted-foreground mb-2">Twoje dane przetwarzamy w następujących celach:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Realizacja usługi zamawiania i świadczenia przejazdów taxi</li>
                <li>Umożliwienie kierowcy dotarcia do miejsca odbioru</li>
                <li>Komunikacja między pasażerem a kierowcą</li>
                <li>Rozliczenia i fakturowanie</li>
                <li>Obsługa konta użytkownika</li>
                <li>Poprawa jakości usług</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Udostępnianie danych</h2>
              <p className="text-muted-foreground mb-2">Twoje dane mogą być udostępniane:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>Kierowcom:</strong> lokalizacja odbioru, numer telefonu, imię (w celu realizacji przejazdu)</li>
                <li><strong>Pasażerom:</strong> lokalizacja kierowcy, dane pojazdu, numer telefonu (w celu realizacji przejazdu)</li>
                <li><strong>Firmom/Hotelom:</strong> dane przejazdów zamawianych przez te podmioty (w przypadku przejazdów służbowych)</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Nie sprzedajemy Twoich danych firmom trzecim w celach marketingowych.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Dane lokalizacyjne</h2>
              <p className="text-muted-foreground">
                Aplikacja wymaga dostępu do dokładnej lokalizacji GPS, aby umożliwić:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>Automatyczne określenie miejsca odbioru</li>
                <li>Śledzenie pozycji kierowcy w czasie rzeczywistym</li>
                <li>Nawigację do pasażera</li>
                <li>Obliczanie tras i szacowanie cen</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Lokalizacja jest zbierana tylko podczas aktywnego korzystania z aplikacji i podczas trwania przejazdu.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Okres przechowywania danych</h2>
              <p className="text-muted-foreground">
                Dane osobowe przechowujemy przez okres niezbędny do realizacji usług oraz przez okres wymagany 
                przepisami prawa (np. dane rozliczeniowe przez 5 lat). Historia przejazdów jest przechowywana 
                przez czas posiadania konta w aplikacji.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Twoje prawa</h2>
              <p className="text-muted-foreground mb-2">Masz prawo do:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Dostępu do swoich danych osobowych</li>
                <li>Sprostowania nieprawidłowych danych</li>
                <li>Usunięcia danych (prawo do bycia zapomnianym)</li>
                <li>Ograniczenia przetwarzania</li>
                <li>Przenoszenia danych</li>
                <li>Sprzeciwu wobec przetwarzania</li>
                <li>Wycofania zgody w dowolnym momencie</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Usunięcie konta i danych</h2>
              <p className="text-muted-foreground">
                Możesz w każdej chwili usunąć swoje konto i wszystkie powiązane dane poprzez stronę{" "}
                <Link href="/usun-konto" className="text-primary hover:underline">
                  usuwania konta
                </Link>
                . Po usunięciu konta wszystkie Twoje dane osobowe, historia przejazdów i wiadomości 
                zostaną trwale usunięte z naszych systemów.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Bezpieczeństwo danych</h2>
              <p className="text-muted-foreground">
                Stosujemy odpowiednie środki techniczne i organizacyjne w celu ochrony Twoich danych osobowych 
                przed nieuprawnionym dostępem, utratą lub zniszczeniem. Hasła są szyfrowane przy użyciu 
                algorytmu bcrypt. Połączenia są szyfrowane przy użyciu protokołu HTTPS.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Pliki cookies</h2>
              <p className="text-muted-foreground">
                Aplikacja wykorzystuje pliki cookies i podobne technologie w celu zapewnienia prawidłowego 
                działania, utrzymania sesji użytkownika oraz zbierania statystyk. Możesz zarządzać 
                ustawieniami cookies w swojej przeglądarce.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Zmiany w polityce prywatności</h2>
              <p className="text-muted-foreground">
                Możemy aktualizować niniejszą politykę prywatności. O istotnych zmianach poinformujemy 
                Cię poprzez powiadomienie w aplikacji lub e-mail. Zalecamy regularne sprawdzanie tej strony.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Kontakt</h2>
              <p className="text-muted-foreground">
                W sprawach związanych z ochroną danych osobowych możesz skontaktować się z nami:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>E-mail: kontakt@taxiq.com.pl</li>
                <li>Strona: <Link href="/usun-konto" className="text-primary hover:underline">Usunięcie konta</Link></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Organ nadzorczy</h2>
              <p className="text-muted-foreground">
                Jeśli uważasz, że przetwarzanie Twoich danych osobowych narusza przepisy RODO, 
                masz prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (PUODO).
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
