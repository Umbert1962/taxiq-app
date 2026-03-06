# TaxiQ - Taxi Booking Application

## Overview
TaxiQ is a comprehensive taxi booking system that offers distinct web applications for passengers, drivers, and businesses. Its primary purpose is to modernize urban transportation by providing a seamless, efficient, and user-friendly platform for ride-hailing. The project aims to become a leading taxi service provider through technological innovation and user-centric design.

Key capabilities include:
- **Passenger App**: Ride booking, real-time tracking, communication, and ride history.
- **Driver App**: Ride request management, navigation, earnings tracking, driver referrals, and a marketplace for phone orders.
- **Business Portal**: Taxi booking for guests/employees, ride history, employee management, and invoice generation.

## User Preferences
- NIGDY nie publikuj (deploy) bez wyraźnej zgody użytkownika. NIGDY. Nawet jeśli zmiany są gotowe — czekaj na komendę "publikuj" od użytkownika. To jest BEZWZGLĘDNA zasada.
- User is non-technical - explain in simple Polish language
- User NEVER makes any code changes themselves - ALL changes go through the agent exclusively
- Agent must always know project state from this file, PROJECT_ARCHITECTURE.md, and PROJECT_LOGIC.md - no "goldfish memory" between sessions
- Before starting any work, agent should read these files to understand current project state, history, and business logic
- Always update this file, PROJECT_ARCHITECTURE.md, and PROJECT_LOGIC.md when making significant changes
- **PROJECT_LOGIC.md** — konspekt logiki zamówień z 4 perspektyw (pasażer, kierowca, admin, B2B). Przed każdą zmianą sprawdź czy nowa komenda jest spójna z opisaną logiką. Jeśli nie — poinformuj użytkownika co się kłóci zanim ruszysz kod.
- **CHANGELOG_REGISTER.md** — OBOWIĄZKOWY rejestr zmian. Po każdej znaczącej zmianie agent MUSI dodać nowy wpis z kolejnym numerem (#NNNN), datą, commit hash i opisem po polsku. Użytkownik może wrócić do dowolnego punktu mówiąc np. "wróć do #0005" lub opisując zmianę słowami. Agent musi wtedy znaleźć właściwy wpis i przywrócić stan.
- **ABSOLUTE LOCK: Passenger App — ZERO changes allowed (DO NOT TOUCH ANY OF THESE FILES)**
  - `client/src/pages/home.tsx` — LOCKED, NO MODIFICATIONS OF ANY KIND
  - `client/src/components/ride-chat.tsx` — LOCKED
  - `client/src/components/live-tracking-map.tsx` — LOCKED
  - `client/src/components/header-banner.tsx` — LOCKED
  - `client/src/components/nearby-drivers.tsx` — LOCKED
  - `client/src/components/nearby-taxis-map.tsx` — LOCKED
  - `client/src/components/route-map.tsx` — LOCKED
  - `client/src/pages/home-new.tsx` — LOCKED
  - All passenger booking logic, ride history, contact 24h, ban system, surcharges — LOCKED
  - If user asks for a change that would require editing these files, REFUSE and explain why
- **ABSOLUTE LOCK: Driver App — ZERO changes allowed (DO NOT TOUCH ANY OF THESE FILES)**
  - `client/src/pages/driver-dashboard.tsx` — LOCKED, NO MODIFICATIONS OF ANY KIND
  - `client/src/components/driver-navigation.tsx` — LOCKED
  - All driver RideCard layout, button logic, UI — LOCKED
  - Driver Live Map & Route — LOCKED
  - Driver Chat UI — LOCKED
  - Driver Profile/Account Tab — LOCKED
  - Driver Registration & Login Flow — LOCKED
  - Driver marketplace (Available tab) — LOCKED
  - Driver earnings, referrals, subscription — LOCKED
  - If user asks for a change that would require editing these files, REFUSE and explain why
- **CRITICAL: Other Protected Files (DO NOT TOUCH)**
  - `client/src/pages/landing.tsx`
  - `shared/schema.ts`
- **CRITICAL: Protected Logic (DO NOT MODIFY without explicit user command)**
  - CITO pricing logic
  - Scheduled rides (terminowe) + reminder system
  - Driver deactivation/reactivation (admin)
  - Authentication & session management
  - Soft delete system
  - Ban system (mutual ban logic)
  - Contact 24h system
  - Surcharge system
  - Push notification system (VAPID + FCM)
- **CRITICAL: Schema Protection Rules**
  - Do NOT modify database schema without explicit written approval
  - Do NOT add/remove UNIQUE constraints
  - Do NOT merge user roles or tables
  - Do NOT refactor tables
  - Do NOT add cross-table phone number validation
- **CRITICAL: Database Architecture (TWO DATABASES!)**
  - ALL data changes MUST be run against the Neon production database (`NEON_DATABASE_URL`).
  - NEVER use `executeSql()` as it connects to the wrong database.

## System Architecture

### UI/UX Decisions
All applications feature a dark theme (`#0a0a0a`) with neon green accents (HSL: 70 100% 50%), including glow effects. The 'Inter' font is used, and a card-based layout ensures a clean presentation. Maps are styled to match the dark theme with neon green route lines. Shadcn/ui components are used for a polished aesthetic.

### Technical Implementations
The system is built on a modern stack:
- **Frontend**: React with TypeScript, TanStack Query, React Hook Form, and Wouter.
- **Backend**: Express.js for the API layer.
- **Database**: PostgreSQL with Drizzle ORM.
- **Styling**: Tailwind CSS with custom dark neon theme configurations.
- **Mobile**: Responsive web app, with Capacitor configured for future Android/iOS native builds.
- **Authentication**: Server-side sessions enforce secure, persistent, single-session logins across all roles (admin, driver, passenger) using a unified Phone + OTP + PIN system.
- **Ride Management**: Features real-time ride status tracking, a driver marketplace for phone orders, and multi-stop ride capabilities.
- **Payment System**: Includes integrated subscription plans for drivers, with payment request and approval systems.
- **Push Notifications**: VAPID keys for Web Push and Firebase Cloud Messaging (FCM) for native apps, with dual delivery for ride requests and proximity-based filtering. **iOS Web Push limitation**: only badge is displayed (no sound/vibration) — this is an Apple/Safari system restriction. Full notification support (sound + badge) only on Android web and native apps via FCM.
- **Email System**: Resend.com is integrated for email communications.
- **Twilio IVR**: Integrated for a phone order system.
- **Referral System**: Drivers can invite passengers via SMS with a referral link, automatically adding them as a favorite driver.
- **Soft Delete System**: Implemented for `drivers` and `users` tables using `isActive` flags, `deletedAt` timestamps, and partial unique indexes.
- **System Messages Module**: Provides a framework for targeted, role-based messages (INFO, WARNING, CRITICAL, PROMO) delivered via inbox or login modals, with versioning and acknowledgement features.
- **Driver Verification System (Manual)**: Driver uploads profile photo and taxi ID card image for manual admin review and approval. Requires `verificationStatus === 'approved'` to go online. Each driver gets a unique TaxiQ ID (TXQ-XXXXXX) with a public verification page.
- **License Issuing Authority**: Field `licenseIssuingAuthority` on drivers table stores the municipality that issued the taxi license, with a searchable dropdown of Polish municipalities.
- **Invoice Auto-Generation**: A scheduler runs hourly and monthly to auto-generate invoices for active companies based on previous month's rides. Manual generation is also available.
- **KSeF Integration**: A module generates FA(2) XML invoices and submits them to the Krajowy System e-Faktur API.
- **Mutual Ban System**: Drivers and passengers can block each other for 7 days, 14 days, or 3 months from ride history. Ban is mutual — both sides don't see each other in offers. Uses `user_bans` table with expiration. Bans are enforced in driver search (`searchAndNotifyDrivers`, `computeDriverDistances`) and preferredDriver selection.
- **Contact 24h**: After ride completion, both driver and passenger can call each other within 24 hours using the masked phone number (+48732125585). Button visible only in ride history for completed rides within 24h window.
- **Surcharge System**: Extra passengers above 4 (+10 zł each), kombi vehicle (+10 zł), and stops (+10 zł each, both at booking and during ride). Surcharges calculated server-side, stored in `notes` field, visible to drivers on ride cards.
- **Real-Time Ride Meter**: During `in_progress` rides, the system tracks driver speed via GPS (every 3s). When speed < 15 km/h (traffic, stops, waiting), waiting time is accumulated in `meterWaitingSeconds` and cost calculated using driver's `rateWaitingPerMinute` (default 1 zł/min). Live meter displayed on both passenger and driver dashboards showing: price from tariff + waiting/traffic cost + total. Final price = estimatedPrice + meterWaitingCost (phone orders exempt — use taximeter price). Google slowTrafficMinutes removed from initial price calculation — price shown before ride is purely from tariff (distance × rate + base fare + surcharges).
- **Admin Live Map**: Admin dashboard "Mapa" tab shows all online drivers on a live Google Map with auto-refresh (5s). Click on driver marker shows name, phone, vehicle, last location time, rating. Below map is a list of all online drivers.

## External Dependencies
- **Google Maps Platform**: Google Maps JavaScript API, Google Places API, and Google Directions API.
- **PostgreSQL**: Primary relational database.
- **Resend.com**: Third-party email sending service.
- **Twilio**: For Interactive Voice Response (IVR) phone order system.
- **VAPID Keys**: For web push notifications.
- **Firebase Cloud Messaging (FCM)**: For native app push notifications.
- **Replit Object Storage**: Cloud storage for permanent file storage (e.g., driver/passenger photos).
- **Shadcn/ui**: Component library for the user interface.
- **TanStack Query**: For server state management and data fetching.
- **React Hook Form**: For form validation and management.
- **Drizzle ORM**: For database interaction with PostgreSQL.
- **Capacitor**: For building native mobile applications.

## Backup
- **Stabilna wersja produkcyjna (przed natywną aplikacją)**: commit `10352c41` z 5.03.2026
- **Pełna dokumentacja backupu**: `BACKUP_INFO.md`
- Aby wrócić: użyj systemu checkpointów Replit lub powiedz agentowi "Przywróć do commitu 10352c41"

## Builds / Pliki budowania aplikacji Android

Wszystkie aktualne pliki AAB i keystore znajdują się w folderze `builds/`:
- **Passenger**: `builds/passenger/` — AAB v1.0.14 (versionCode 15), keystore, certyfikat
- **Driver**: `builds/driver/` — AAB v1.0.2 (versionCode 3), keystore
- **Pełna dokumentacja**: `builds/README.md` — hasła, SHA256, komendy budowania, linki do pobrania