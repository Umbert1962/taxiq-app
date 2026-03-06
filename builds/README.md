# TaxiQ - Magazyn plików budowania (Builds)

## Struktura folderów

```
builds/
├── passenger/                        # Aplikacja pasażera
│   ├── TaxiQ-Passenger-v1.0.14.aab   # Aktualny AAB (versionCode 15)
│   ├── passenger-signing.keystore     # Keystore do podpisu
│   └── upload_certificate.pem        # Certyfikat upload (Google Play)
│
└── driver/                           # Aplikacja kierowcy
    ├── TaxiQ-Driver-v1.0.2.aab       # Aktualny AAB (versionCode 3)
    └── upload-keystore.jks           # Keystore do podpisu
```

---

## Aplikacja Pasażera (pl.taxiq.passenger)

| Parametr | Wartość |
|---|---|
| **Package name** | `pl.taxiq.passenger` |
| **Aktualna wersja** | 1.0.14 (versionCode 15) |
| **Plik AAB** | `builds/passenger/TaxiQ-Passenger-v1.0.14.aab` |
| **Keystore** | `builds/passenger/passenger-signing.keystore` |
| **Keystore password** | `6lUjyAXANNQW` |
| **Key alias** | `my-key-alias` |
| **Key password** | `6lUjyAXANNQW` |
| **SHA256 (upload)** | `05:BA:DF:93:73:66:81:97:CD:8D:40:42:90:1B:D9:CF:F1:67:FF:D8:4C:5F:EC:01:B5:A8:72:B5:0C:C3:4C:FA` |
| **SHA256 (Google Play signing)** | `50:7B:BF:82:53:E2:D9:E8:17:14:01:7B:C3:B2:91:02:91:6D:6B:24:51:1A:33:27:69:5B:5B:61:E2:7F:65:A4` |
| **Domena TWA** | `https://taxiq.com.pl/passenger` |
| **Kod zrodlowy** | `twa-passenger/` |

---

## Aplikacja Kierowcy (pl.taxiq.driver)

| Parametr | Wartość |
|---|---|
| **Package name** | `pl.taxiq.driver` |
| **Aktualna wersja** | 1.0.2 (versionCode 3) |
| **Plik AAB** | `builds/driver/TaxiQ-Driver-v1.0.2.aab` |
| **Keystore** | `builds/driver/upload-keystore.jks` |
| **Keystore password** | `taxiqdriver2026` |
| **Key alias** | `upload` |
| **Key password** | `taxiqdriver2026` |
| **SHA1** | `D7:74:A4:67:24:45:C8:DE:75:5C:97:87:4A:B1:B2:7C:B4:EE:DA:96` |
| **Domena TWA** | `https://taxiq.com.pl/driver` |
| **Kod zrodlowy** | `twa-driver/` |

---

## Jak zbudowac nowy AAB

### Passenger:
```bash
cd twa-passenger
./gradlew bundleRelease
# Wynik: twa-passenger/app/build/outputs/bundle/release/app-release.aab
# Po zbudowaniu skopiuj do builds/passenger/
```

### Driver:
```bash
cd twa-driver
./gradlew bundleRelease
# Wynik: twa-driver/app/build/outputs/bundle/release/app-release.aab
# Po zbudowaniu skopiuj do builds/driver/
```

---

## Linki do pobrania (po publikacji serwera)

- Passenger AAB: `https://taxiq.com.pl/api/get-passenger-aab`
- Driver AAB: `https://taxiq.com.pl/api/download-driver-v102`

---

## assetlinks.json

Plik weryfikacji domen Android App Links:
`https://taxiq.com.pl/.well-known/assetlinks.json`

Zawiera wpisy dla: `pl.taxiq.passenger`, `pl.taxiq.driver`, `pl.com.taxiq.driver`, `pl.com.taxiq.twa`

---

## Historia wersji

### Passenger
| Wersja | versionCode | Data | Zmiany |
|---|---|---|---|
| 1.0.14 | 15 | 2026-03-05 | Poprawiona ikona (adaptive icon z duzym logo Q), splash screen fix |
| 1.0.13 | 14 | 2026-03-04 | Dodano SPLASH_SCREEN_BACKGROUND_COLOR, FALLBACK_STRATEGY, lepsze ProGuard |
| 1.0.12 | 13 | 2026-02-23 | Poprzednia wersja produkcyjna |

### Driver
| Wersja | versionCode | Data | Zmiany |
|---|---|---|---|
| 1.0.2 | 3 | 2026-03-04 | Aktualna wersja produkcyjna |
