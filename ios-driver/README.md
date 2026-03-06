# TaxiQ Driver - iOS

## Wymagania
- macOS z Xcode 15+
- Konto Apple Developer (opłacone)
- Ikona aplikacji 1024x1024 PNG (bez przezroczystości)

## Krok po kroku

### 1. Pobierz folder na Maca
Skopiuj cały folder `ios-driver/` na Maca.

### 2. Dodaj ikonę aplikacji
Umieść plik ikony 1024x1024 PNG w:
`TaxiQDriver/Assets.xcassets/AppIcon.appiconset/`
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
Otwórz `TaxiQDriver.xcodeproj` w Xcode.

### 4. Skonfiguruj podpisywanie (Signing)
- Kliknij na projekt w nawigatorze (niebieski icon)
- Zakładka "Signing & Capabilities"
- Zaznacz "Automatically manage signing"
- Wybierz swój Team (konto Apple Developer)
- Bundle Identifier: `pl.taxiq.driver`

### 5. Dodaj capability "Background Modes" (WAŻNE!)
- W "Signing & Capabilities" kliknij "+ Capability"
- Dodaj "Background Modes"
- Zaznacz: "Location updates" i "Remote notifications"

### 6. Zbuduj i przetestuj
- Podłącz iPhone lub wybierz symulator
- Kliknij ▶ (Run) albo Cmd+R

### 7. Wyślij do App Store
- Product → Archive
- Po archiwizacji: Distribute App → App Store Connect
- Wypełnij informacje w App Store Connect
- Prześlij do recenzji

## Informacje o aplikacji
- **Bundle ID**: pl.taxiq.driver
- **Nazwa**: TaxiQ Driver
- **Wersja**: 1.0.0
- **Min iOS**: 15.0
- **Język**: polski
- **URL**: https://taxiq.com.pl/driver

## Uprawnienia
- Lokalizacja (zawsze) — śledzenie pozycji taksówki w tle
- Push Notifications — powiadomienia o nowych zleceniach
- Aparat — zdjęcie profilowe i legitymacja taxi

## Uwaga: Lokalizacja w tle
Aplikacja kierowcy używa GPS w tle (background location) — Apple będzie pytać o uzasadnienie przy recenzji. Powód: kierowca musi być widoczny na mapie dla pasażerów w czasie jazdy, nawet gdy aplikacja jest zminimalizowana.
