# TaxiQ Project Architecture

**Ten plik to drogowskaz agenta.** Agent nie jest zewnętrznym pomocnikiem - jest pełnoprawnym członkiem zespołu TaxiQ. Zna projekt od podszewki, pamięta wszystkie decyzje i kontynuuje pracę dokładnie tam, gdzie skończył.

## Cardinal Rules (ALWAYS APPLY)
1. **Agent = jedyny deweloper** - User NIGDY nie modyfikuje kodu. Każda linijka w tym projekcie przeszła przez ręce agenta. Agent jest odpowiedzialny za cały kod, architekturę i dokumentację.
2. **Ten plik + replit.md = pamięć projektu** - Agent MUSI przeczytać oba pliki na początku każdej sesji. Nie ma "nowej sesji" - jest ciągłość pracy. Koniec z pamięcią złotej rybki.
3. **Dokumentuj na bieżąco** - Po każdej istotnej zmianie natychmiast aktualizuj ten plik i replit.md. Jeśli tego nie zrobisz, przyszła sesja straci kontekst.
4. **Zawsze proponuj deploy** po zmianach, żeby user widział efekty na żywo.
5. **Komunikacja po polsku** - User jest nietechniczny, wyjaśniaj prosto i konkretnie.
6. **Znaj stan projektu** - Przed każdą zmianą rozumiej co już istnieje, co działa, co jest w trakcie. Nie nadpisuj działających rzeczy.

## Core Principle
TaxiQ is a minimal, fast entry platform connecting passenger and driver applications.
The landing page is an interactive single-screen gateway, not a scrolling marketing website.
Domain: taxiq.com.pl. Zero commissions for drivers - platform emphasizes driver independence.

## UI Rules
- Background: pure black #000000 (permanent)
- Accent: neon yellow #E6FF3F (brand identity)
- Secondary glow: #B7FF00
- Text: #FFFFFF
- Style: dark, calm, technological - typography + light only
- No photos, no cars, no city imagery
- TAXI Q logo stays on landing page
- Passenger App and Driver App buttons remain primary navigation

## Landing Page Architecture (current)
- Single-screen, no vertical scrolling on desktop (h-screen w-screen overflow-hidden)
- LEFT SIDEBAR (fixed, always visible on desktop AND mobile):
  - Position: fixed, left: 0, top: 0, height: 100vh
  - Desktop: collapsed 72px, expands on hover to 220px
  - Mobile: collapsed 60px, expands on tap to 220px, closes on tap outside
  - Transition: width 0.2s ease, text labels fade in/out with opacity
  - Logo at top of sidebar (links to /)
  - Icons: 28px (w-7 h-7)
  - Nav order: Biznes, Pasażer, Kierowca, Admin, O TaxiQ, [divider], Regulamin, Prywatność, Kontakt
  - Kontakt opens contact modal overlay (form: name, email, message → POST /api/contact)
  - Legal items (Regulamin, Prywatność) link to separate scrollable pages
  - Mobile overlay backdrop when sidebar expanded
- HEADER: scrolling system message banner (admin-controlled)
  - System message: admin-controlled via systemSettings DB
  - Public API: GET /api/system-message (no auth)
- CONTENT AREA: margin-left matches sidebar collapsed width
  - LiveMessageBar + grid layout (hero left, sections right on desktop)
  - HeroSection, PromotionsSection, ReferralSection, DriverSection
- No bottom navigation bar on mobile (sidebar replaces it)
- No marketing sections (no FAQ, testimonials, "why us" etc.)
- File: client/src/pages/home-new.tsx

## Legal Pages (separate scrollable routes)
- /regulamin - ogólny regulamin platformy
- /regulamin-kierowca - regulamin dla kierowców
- /regulamin-pasazer - regulamin dla pasażerów
- /regulamin-biznes - regulamin dla klientów biznesowych
- /polityka-prywatnosci - polityka prywatności

## Structure
Landing page (/) -> interactive view switching (no page reload) -> CTA buttons lead to apps
Passenger App (/passenger), Driver App (/driver), Business Portal (/business), Admin Panel (/admin)

## Technical Decisions Log
- 2026-02-07: PWA/Service Worker removed (cache problems during development). Minimal push-sw.js kept for driver notifications. May re-add when UI stable.
- 2026-02-07: Landing page rebuilt from scrolling marketing page to single-screen interactive app
- Cache-Control no-cache headers configured in server/static.ts
- Restore point: Git commit "ded1ecf" (before PWA removal)

## Capacitor / Native App Build
- **App ID**: pl.taxiq.app
- **Architecture**: WebView wrapper loading from production server (https://taxiq.com.pl)
- **Packages installed**: @capacitor/core, @capacitor/cli, @capacitor/app, @capacitor/ios, @capacitor/haptics, @capacitor/push-notifications
- **capacitor.config.ts**: server.url = "https://taxiq.com.pl", webDir = "dist/public", preferredContentMode = "mobile"
- **Session cookies**: sameSite: 'none' for cross-origin native app compatibility
- **FCM for native push**: FIREBASE_SERVICE_ACCOUNT_JSON secret required, dual delivery (FCM + Web Push)
- **iOS Build Steps (on MacBook)**:
  1. Download project (ZIP from robcio/ or /download/TaxiQ-Platform.zip endpoint)
  2. `npm install`
  3. `npm run build` (produces dist/public)
  4. `npx cap add ios` (first time only)
  5. `npx cap sync`
  6. `npx cap open ios` (opens Xcode)
  7. In Xcode: set Team, Bundle ID = pl.taxiq.app, add Push Notifications capability
  8. Upload APNs key to Firebase Console for iOS push notifications
- **Requirements on MacBook**: Node.js 20+, Xcode, CocoaPods (`sudo gem install cocoapods`)
- **.gitignore**: ios/ and android/ excluded (generated locally)
- **Download endpoint**: GET /download/TaxiQ-Platform.zip (serves ZIP from client/public/download/)
- **ZIP location on Replit**: robcio/TaxiQ-Platform.zip

## iOS Build Status (2026-02-10)
- User downloaded ZIP to MacBook (~/Downloads/TaxiQ-Platform)
- npm install - DONE
- npm run build - DONE (fixed image import: location-required.tsx)
- npx cap sync - DONE (no platform added yet)
- **NEXT**: `npx cap add ios` → `npx cap sync` → `npx cap open ios`

## Key Fixes Applied
- `location-required.tsx`: Import changed from missing `@assets/image_1769160583012.png` to `@assets/logo/logo-taxiq-neon.jpg`
- Phone number normalization: E.164 format for all Polish numbers (+48...)
- Proximity-based notification filtering: 5km radius using Haversine formula (server/geo.ts)
- Build script (script/build.ts): firebase-admin and sharp added to esbuild allowlist

## Agent Rules
- Extend existing components instead of replacing them
- Do not rename folders or move core files
- Maintain visual consistency with existing design
- Do not redesign layout without explicit instruction
- When creating ZIP for download, always exclude: node_modules, dist, .git, uploads, uploads-verification, attached_assets (except logo/), .local
- Always include attached_assets/logo/ in ZIP (required for @assets/logo/* imports)
