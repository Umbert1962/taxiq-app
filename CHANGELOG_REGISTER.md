# TaxiQ — Rejestr Zmian

Format: `#NNNN | data | commit | opis zmiany`

Wpisy oznaczone `[STABILNY]` to potwierdzone punkty do których można bezpiecznie wrócić.

---

## Historia zmian

### Etap: Natywne aplikacje Android + iOS

#0010 | 2026-03-06 | ec85bcc1 | Stworzenie projektów iOS (Xcode) dla pasażera i kierowcy — gotowe do zbudowania na Macu
#0009 | 2026-03-06 | f2ef8680 | Zmiana applicationId pasażera z pl.taxiq.app na pl.taxiq.passenger (wymóg Google Play)
#0008 | 2026-03-06 | 92831643 | Natywna apka pasażera v1.1.0 (versionCode 16, targetSdk 35, EdgeToEdge) — AAB gotowy
#0007 | 2026-03-05 | 6cbade74 | Natywna apka kierowcy v1.1.2 (versionCode 6, targetSdk 35, EdgeToEdge) — wysłana do Google Play

### Etap: Media i demonstracja lokalizacji

#0006 | 2026-03-05 | 4ecbafe2 | Film demonstracyjny lokalizacji GPS (driver-location-demo.mp4) do Google Play
#0005 | 2026-03-05 | 097ef34d | Strona /media — biblioteka filmów z Object Storage

### Etap: Budowanie natywnych aplikacji Android

#0004 | 2026-03-05 | 09c88666 | Apka kierowcy targetSdk 35 — wymóg Google Play od sierpnia 2025
#0003 | 2026-03-04 | ec24cb30 | Natywna apka pasażera — WebView + FCM push notifications
#0002 | 2026-03-04 | 58410195 | Natywna apka kierowcy — WebView + GPS w tle (foreground service) + FCM

### Etap: Stabilna wersja produkcyjna

#0001 | 2026-03-05 | 10352c41 | [STABILNY] Pełna wersja produkcyjna przed natywną aplikacją — system zamówień, ban, kontakt 24h, dopłaty, licznik jazdy, weryfikacja kierowców, faktury, IVR Twilio, push VAPID+FCM, wszystko działa

---

## Jak używać

**Powrót do stanu**: Powiedz np. "wróć do momentu przed zmianami iOS" lub "cofnij do #0008" — agent znajdzie właściwy commit i przywróci stan.

**Oznaczenia**:
- `[STABILNY]` — przetestowany, pewny punkt powrotu
- Bez oznaczenia — zmiana w trakcie rozwoju, powrót możliwy ale może wymagać dodatkowych kroków
