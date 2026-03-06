# TaxiQ Passenger - iOS

## Wymagania
- macOS z Xcode 15+
- Konto Apple Developer (opłacone)
- Ikona aplikacji 1024x1024 PNG (bez przezroczystości)

## Krok po kroku

### 1. Pobierz folder na Maca
Skopiuj cały folder `ios-passenger/` na Maca.

### 2. Dodaj ikonę aplikacji
Umieść plik ikony 1024x1024 PNG w:
`TaxiQPassenger/Assets.xcassets/AppIcon.appiconset/`
Nazwij go `AppIcon.png` i zaktualizuj `Contents.json`:
```json
{
  "images": [
    {
      "filename": "AppIcon.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
```

### 3. Otwórz projekt w Xcode
Otwórz `TaxiQPassenger.xcodeproj` w Xcode.

### 4. Skonfiguruj podpisywanie (Signing)
- Kliknij na projekt w nawigatorze (niebieski icon)
- Zakładka "Signing & Capabilities"
- Zaznacz "Automatically manage signing"
- Wybierz swój Team (konto Apple Developer)
- Bundle Identifier: `pl.taxiq.passenger`

### 5. Zbuduj i przetestuj
- Podłącz iPhone lub wybierz symulator
- Kliknij ▶ (Run) albo Cmd+R

### 6. Wyślij do App Store
- Product → Archive
- Po archiwizacji: Distribute App → App Store Connect
- Wypełnij informacje w App Store Connect
- Prześlij do recenzji

## Informacje o aplikacji
- **Bundle ID**: pl.taxiq.passenger
- **Nazwa**: TaxiQ
- **Wersja**: 1.0.0
- **Min iOS**: 15.0
- **Język**: polski
- **URL**: https://taxiq.com.pl/passenger

## Uprawnienia
- Lokalizacja (tylko podczas użytkowania) — do znajdowania kierowców
- Push Notifications — powiadomienia o statusie jazdy
- Aparat — zdjęcie profilowe
