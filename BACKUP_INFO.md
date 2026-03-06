# BACKUP — Stabilna wersja produkcyjna (przed natywną aplikacją)

## Data backupu
**5 marca 2026, godzina ~17:15**

## Commit ID
```
10352c4112319f8fd962cf9debfbb44a87ffbe80
```

## Co zawiera ta wersja
Pełna, działająca wersja produkcyjna TaxiQ obejmująca:

### Aplikacje
- Aplikacja pasażerska (TWA w Google Play + web)
- Aplikacja kierowcy (web)
- Panel administracyjny
- Portal biznesowy

### Ostatnie zmiany (od tej sesji)
1. Naprawa czarnego ekranu (cancelMutation w home.tsx)
2. Naprawa certyfikatu TWA (biały pasek przeglądarki)
3. System kalkulacji cen z dopłatami (kombi, dodatkowe osoby, przystanki)
4. Licznik czasu postoju (real-time ride meter) — prędkość < 15 km/h nalicza koszt
5. Usunięcie szacunkowych korków Google z kalkulacji ceny
6. Ulotka dla kierowców (/driver/guide)
7. Blokada przycisku "cofnij" na stronach pasażera i kierowcy
8. Sesja pasażera wydłużona do 365 dni

### Stabilność
- Opublikowana i działająca na produkcji (taxiq.com.pl)
- Wszystkie funkcje przetestowane
- Baza danych Neon zsynchronizowana

## Jak wrócić do tej wersji

### Opcja 1: Checkpoint Replit (najłatwiejsze)
1. W panelu Replit kliknij ikonę "Wersje" (Version History / Checkpoints)
2. Znajdź checkpoint z datą **5 marca 2026** o opisie:
   - "Published your App" (commit `10352c41`)
3. Kliknij "Przywróć" (Restore)

### Opcja 2: Przez agenta
Powiedz agentowi:
> "Przywróć projekt do commitu 10352c4112319f8fd962cf9debfbb44a87ffbe80"

Agent użyje systemu rollback Replit.

### Opcja 3: Git (zaawansowane)
```bash
git checkout 10352c4112319f8fd962cf9debfbb44a87ffbe80
```

## Pliki buildów Android (TWA)
Folder `builds/` zawiera aktualne pliki AAB i keystore:
- Passenger TWA: `builds/passenger/` — v1.0.14 (versionCode 15)
- Driver TWA: `builds/driver/` — v1.0.2 (versionCode 3)
- Dokumentacja: `builds/README.md`

## Ważne
- NIE usuwaj tego pliku
- Po powrocie do tej wersji trzeba ponownie opublikować (deploy) żeby produkcja się zaktualizowała
- Baza danych NIE cofa się automatycznie — nowe kolumny (meter_waiting_seconds, meter_waiting_cost) zostaną, ale nie będą przeszkadzać
