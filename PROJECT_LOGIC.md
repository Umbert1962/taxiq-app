# Konspekt logiki zamówień — TaxiQ (stan na 28.02.2026)

---

## 1. Punkt widzenia PASAŻERA

### Zamówienie natychmiastowe
1. Pasażer loguje się do aplikacji (telefon + OTP + PIN)
2. Wpisuje adres odbioru i cel podróży (Google Places autocomplete)
3. Opcjonalnie dodaje przystanki pośrednie
4. Widzi listę dostępnych kierowców w okolicy z cenami (stawki kierowcy × szacowana odległość)
5. Wybiera konkretnego kierowcę → klikając "Zamów"
6. Przejazd trafia **wyłącznie** do wybranego kierowcy (nikt inny go nie widzi)
7. Kierowca ma 90 sekund na akceptację — po tym czasie zlecenie wygasa
8. Po akceptacji pasażer widzi dane kierowcy, samochód, tablicę rejestracyjną
9. Śledzenie w czasie rzeczywistym: pozycja kierowcy na mapie
10. Chat z kierowcą (wiadomości tekstowe)
11. Po zakończeniu — widzi cenę końcową, może ocenić kierowcę
12. Historia przejazdów dostępna w aplikacji

### Zamówienie terminowe
1. Te same kroki 1–4 co wyżej
2. Pasażer zaznacza "Zamów na później" → wybiera datę i godzinę
3. Jeśli pasażer ma **ulubionych kierowców** → widzi ich listę i może wybrać jednego
   - Wybrany ulubiony kierowca dostaje zlecenie bezpośrednio (jak natychmiastowe)
   - Ma **10 minut** na akceptację
   - Po 10 minutach bez odpowiedzi LUB po odrzuceniu → zlecenie trafia na **giełdę**
4. Jeśli pasażer **nie ma ulubionych** lub **nie wybierze żadnego** → zlecenie od razu na **giełdę**
5. Na giełdzie: wszyscy kierowcy online widzą to zlecenie z oznaczeniem "Terminowe" + datą/godziną
6. Dowolny kierowca może je przyjąć — kto pierwszy ten lepszy
7. Po przyjęciu przez kierowcę — pasażer widzi kto jedzie (jak przy natychmiastowym)
8. W zakładce "Aktywne" pasażer widzi status: "Oczekiwanie na ulubionego kierowcę" lub "Zlecenie na giełdzie"
9. Lista pobliskich kierowców **NIE jest wyświetlana** — pasażer nie może wybrać kierowcy spoza ulubionych

### Zamówienie CITO (priorytetowe)
1. Pasażer zaznacza "CITO" → wpisuje cenę (minimum 20 PLN)
2. Cena jest wyższa niż standardowa — motywacja dla kierowców
3. Zlecenie trafia do kierowców w okolicy z wyróżnieniem CITO
4. Brak wyboru konkretnego kierowcy — trafia do wszystkich w promieniu

### Anulowanie
- Pasażer może anulować przejazd w dowolnym momencie przed zakończeniem
- Status zmienia się na "cancelled_by_passenger"

---

## 2. Punkt widzenia KIEROWCY

### Logowanie i gotowość
1. Kierowca loguje się (telefon + OTP + PIN)
2. Wymóg: `verificationStatus === 'approved'` (admin musi zatwierdzić profil)
3. Przełącza się na "Online" — od tego momentu widoczny dla pasażerów
4. System aktualizuje jego pozycję GPS w czasie rzeczywistym

### Zakładka "Zlecenia" — zlecenia bezpośrednie
- Widzi **tylko** przejazdy gdzie pasażer wybrał tego konkretnego kierowcę (`preferredDriverId === driverId`)
- Może zaakceptować lub odrzucić
- Po akceptacji: nawigacja Google Maps, aktualizacja statusu (przyjęty → w trasie → zakończony)

### Zakładka "Dostępne" — giełda zamówień
- Widzi dwa typy zleceń:
  - **Telefoniczne** (zielony badge) — zamówienia z IVR Twilio, bez powiązanego pasażera
  - **Terminowe** (niebieski badge) — zamówienia na konkretną datę/godzinę z aplikacji pasażerskiej
- Lista sortowana po odległości od **bieżącej pozycji GPS kierowcy** do punktu odbioru
- Każdy kierowca widzi te same zlecenia — kto pierwszy kliknie "Przyjmij", ten dostaje
- Zlecenia telefoniczne wygasają po 15 minutach bez odpowiedzi (system dzwoni do klienta z informacją)
- Zlecenia terminowe **nie wygasają** po 15 minutach
- Zlecenia terminowe z wybranym ulubionym kierowcą: widoczne tylko dla tego kierowcy (nie na giełdzie); po 10 min bez akceptacji lub po odrzuceniu → trafiają na giełdę

### Przyjęcie zlecenia z giełdy
- Kliknięcie "Przyjmij" → przejazd zostaje przypisany do kierowcy
- Dla telefonicznych: kierowca dzwoni do klienta (numer widoczny po przyjęciu), otwiera się nawigacja
- Dla terminowych: zlecenie trafia na zakładkę "Terminowe" — **NIE blokuje nawigacji**, kierowca może dalej pracować

### Zakładka "Terminowe" — przyjęte zlecenia terminowe
- Lista przyjętych zleceń terminowych z datą, godziną, adresami, odliczaniem do odjazdu
- Kierowca może w każdej chwili kliknąć "Rozpocznij teraz" żeby przejść do nawigacji
- **System przypomnień:**
  - **1 godzina przed** — cichy alert (pulsujący modal, trzeba kliknąć "Rozumiem, pamiętam", BEZ dźwięku)
  - **30 minut przed** — cichy alert (jak wyżej, BEZ dźwięku)
  - **20 minut przed** — ALARM Z DŹWIĘKIEM (pulsujący czerwony modal, dźwięk co 5s, musi potwierdzić w ciągu 1 minuty)
    - Opcje: "Rozpocznij nawigację" lub "Potwierdzam — jadę za chwilę"
    - **Jeśli nie kliknie w 1 minutę** → zlecenie automatycznie odebrane, wraca na giełdę, powiadomienia push do pobliskich kierowców
- **Backup server-side:** Scheduler co 30s sprawdza zlecenia accepted + scheduledAt ≤ 15min do odjazdu → automatyczny revoke na wypadek awarii frontendu (bufor 4 min po klienckiej minucie na potwierdzenie)

### Przebieg przejazdu
1. Status: `pending` → `accepted` → `in_progress` → `completed`
2. Kierowca aktualizuje status ręcznie (przyciskami)
3. Chat z pasażerem (jeśli pasażer ma konto)
4. Na koniec: wpisuje cenę końcową (`finalPrice`)
5. Zarobki sumowane w profilu

### Zlecenie może być też zwolnione
- Kierowca może zwolnić (oddać) zlecenie telefoniczne po przyjęciu — wraca na giełdę

---

## 3. Punkt widzenia ADMINISTRATORA

### Panel administracyjny
- Logowanie: telefon + PIN (nie email)
- Wymuszanie jednej sesji (single-device)

### Zarządzanie kierowcami
- Lista wszystkich kierowców z statusami
- Weryfikacja profilu: zdjęcie + identyfikator taxi → zatwierdzenie/odrzucenie
- Tylko kierowcy z `verificationStatus === 'approved'` mogą przejść online
- Każdy kierowca ma unikalny TaxiQ ID (TXQ-XXXXXX)
- Blokowanie/odblokowanie kont
- Soft delete (dezaktywacja z możliwością reaktywacji)

### Zarządzanie pasażerami
- Lista użytkowników
- Dezaktywacja/reaktywacja kont

### Zarządzanie abonamentami kierowców
- Tworzenie planów abonamentowych (cena, okres)
- Przypisywanie planów do kierowców
- Zatwierdzanie płatności (payment requests)
- Przyznawanie grace period

### Przegląd przejazdów
- Widok wszystkich przejazdów w systemie
- Statusy, trasy, ceny, źródło zamówienia

### System wiadomości
- Wysyłanie wiadomości systemowych do kierowców/pasażerów
- Typy: INFO, WARNING, CRITICAL, PROMO
- Targetowanie po roli

### Brak widoczności na tym etapie
- Administrator **nie widzi** giełdy zamówień
- Administrator **nie zarządza** zleceniami terminowymi (nie może ich anulować/przypisać)
- Administrator **nie zarządza** fakturami biznesowymi (to domena panelu B2B)

---

## 4. Punkt widzenia PANEL BIZNESOWY (B2B)

### Kto korzysta
- Firmy (hotele, korporacje) z kontem w systemie
- Logowanie: email + hasło
- Dwie role: `admin` (pełny dostęp) i `employee` (zamawianie + historia)

### Zamawianie przejazdu
1. Pracownik/admin firmy otwiera panel → "Zamów przejazd"
2. Wpisuje: adres odbioru, cel, dane gościa (imię, telefon), opcjonalnie numer pokoju (hotel) i centrum kosztów
3. Przejazd tworzony z `orderSource = 'business'`
4. Tworzony jest rekord w `business_rides` łączący przejazd z firmą
5. Obecnie: przejazd NIE trafia na giełdę — działa jak natychmiastowy (brak mechanizmu wyboru kierowcy z panelu biznesowego)

### Historia przejazdów
- Lista wszystkich przejazdów firmy
- Dane gościa, trasa, cena, status

### Zarządzanie pracownikami
- Dodawanie/usuwanie pracowników
- Przypisywanie ról (admin/employee)

### Faktury
- Generowanie ręczne lub automatyczne (1. dnia miesiąca za poprzedni miesiąc)
- Agregacja przejazdów z `business_rides` w danym okresie
- Integracja KSeF (Krajowy System e-Faktur) — XML FA(2), submit, podgląd
- Statusy: pending → paid / overdue

### Statystyki
- Łączna liczba przejazdów i wydatki (ogółem + bieżący miesiąc)
- Brak filtrów per pracownik/centrum kosztów (do uzupełnienia w przyszłości)

### Profil firmy
- Edycja: nazwa, adres, NIP, email, telefon

### Czego jeszcze nie ma (planowane)
- Limity wydatków per pracownik
- Filtry w historii (po pracowniku, dacie, centrum kosztów)
- Statystyki per pracownik
- Pole `billingType = 'corporate'` — przygotowane w bazie, ale jeszcze nieaktywne (wymaga flagi `ENABLE_CORPORATE_MODE`)
- Prepaid balance — pole `prepaidBalance` dodane do `companies`, ale logika nieaktywna
- Tabela `corporate_memberships` — łączy pasażerów z firmami, gotowa ale nieużywana
