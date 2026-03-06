#!/bin/bash
# ============================================================
# TaxiQ - Automatyczny skrypt budowania aplikacji iOS
# ============================================================
# Wystarczy uruchomic - zrobi wszystko sam.
#   chmod +x setup-ios.sh
#   ./setup-ios.sh
# ============================================================

set -e

LOGFILE="setup-ios.log"
echo "TaxiQ iOS Setup - $(date)" > "$LOGFILE"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}          TaxiQ - Budowanie aplikacji iOS              ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo ""

# --- Krok 1: Sprawdz wymagania ---
echo -e "${BLUE}[1/6] Sprawdzam wymagania systemowe...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}[BLAD] Node.js nie jest zainstalowany!${NC}"
    echo -e "${YELLOW}Zainstaluj: brew install node${NC}"
    exit 1
fi
echo -e "${GREEN}  [OK] Node.js $(node -v)${NC}"

if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}[BLAD] Xcode nie jest zainstalowany!${NC}"
    echo -e "${YELLOW}Zainstaluj Xcode z App Store${NC}"
    exit 1
fi
echo -e "${GREEN}  [OK] $(xcodebuild -version 2>/dev/null | head -1)${NC}"

if ! command -v pod &> /dev/null; then
    echo -e "${YELLOW}[INFO] Instaluje CocoaPods...${NC}"
    sudo gem install cocoapods 2>>"$LOGFILE" || brew install cocoapods 2>>"$LOGFILE" || {
        echo -e "${RED}[BLAD] Nie udalo sie zainstalowac CocoaPods${NC}"
        exit 1
    }
fi
echo -e "${GREEN}  [OK] CocoaPods $(pod --version 2>/dev/null)${NC}"

# --- Krok 2: npm install ---
echo ""
echo -e "${BLUE}[2/6] Instaluje zaleznosci (npm install)...${NC}"
echo -e "${YELLOW}  To moze potrwac kilka minut...${NC}"
if npm install --legacy-peer-deps >> "$LOGFILE" 2>&1; then
    echo -e "${GREEN}  [OK] Zaleznosci zainstalowane${NC}"
else
    echo -e "${RED}[BLAD] npm install nie powiodl sie!${NC}"
    echo -e "${YELLOW}Szczegoly: cat $LOGFILE${NC}"
    exit 1
fi

# --- Krok 3: Przygotuj pliki dla Capacitor ---
echo ""
echo -e "${BLUE}[3/6] Przygotowuje pliki...${NC}"

mkdir -p dist/public
cat > dist/public/index.html << 'INDEXHTML'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaxiQ</title>
    <style>
        body { background: #0a0a0a; color: #c8ff00; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: -apple-system, sans-serif; }
        .loader { text-align: center; }
        h1 { font-size: 2em; margin-bottom: 10px; }
        p { color: #888; }
    </style>
</head>
<body>
    <div class="loader">
        <h1>TaxiQ</h1>
        <p>Ladowanie...</p>
    </div>
</body>
</html>
INDEXHTML
echo -e "${GREEN}  [OK] Pliki przygotowane${NC}"

# --- Krok 4: Konfiguruj iOS ---
echo ""
echo -e "${BLUE}[4/6] Konfiguruje platforme iOS...${NC}"
if [ -d "ios" ]; then
    echo -e "${YELLOW}  Platforma iOS juz istnieje. Synchronizuje...${NC}"
    npx cap sync ios >> "$LOGFILE" 2>&1
else
    echo -e "${YELLOW}  Dodaje platforme iOS...${NC}"
    npx cap add ios >> "$LOGFILE" 2>&1 || {
        echo -e "${RED}[BLAD] Dodawanie iOS nie powiodlo sie!${NC}"
        echo -e "${YELLOW}Szczegoly: cat $LOGFILE${NC}"
        exit 1
    }
    npx cap sync ios >> "$LOGFILE" 2>&1
fi
echo -e "${GREEN}  [OK] iOS skonfigurowany${NC}"

# --- Krok 5: Push notifications + lokalizacja ---
echo ""
echo -e "${BLUE}[5/6] Konfiguruje uprawnienia aplikacji...${NC}"

ENTITLEMENTS_FILE="ios/App/App/App.entitlements"
if [ ! -f "$ENTITLEMENTS_FILE" ]; then
    cat > "$ENTITLEMENTS_FILE" << 'ENTITLEMENTS'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>aps-environment</key>
    <string>development</string>
</dict>
</plist>
ENTITLEMENTS
    echo -e "${GREEN}  [OK] Push notifications skonfigurowane${NC}"
fi

PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"
if [ -f "$PBXPROJ" ]; then
    if ! grep -q "CODE_SIGN_ENTITLEMENTS" "$PBXPROJ"; then
        sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = pl.taxiq.app;/PRODUCT_BUNDLE_IDENTIFIER = pl.taxiq.app;\
                                CODE_SIGN_ENTITLEMENTS = App\/App.entitlements;/g' "$PBXPROJ" 2>/dev/null || true
    fi
fi

INFO_PLIST="ios/App/App/Info.plist"
if [ -f "$INFO_PLIST" ]; then
    if ! grep -q "NSLocationWhenInUseUsageDescription" "$INFO_PLIST"; then
        /usr/libexec/PlistBuddy -c "Add :NSLocationWhenInUseUsageDescription string 'TaxiQ potrzebuje dostepu do lokalizacji, aby znalezc taksowki w Twojej okolicy.'" "$INFO_PLIST" 2>/dev/null || true
        /usr/libexec/PlistBuddy -c "Add :NSLocationAlwaysAndWhenInUseUsageDescription string 'TaxiQ potrzebuje stalego dostepu do lokalizacji, aby sledzic przejazdy i nawigowac.'" "$INFO_PLIST" 2>/dev/null || true
        /usr/libexec/PlistBuddy -c "Add :NSLocationAlwaysUsageDescription string 'TaxiQ potrzebuje stalego dostepu do lokalizacji dla kierowcow.'" "$INFO_PLIST" 2>/dev/null || true
    fi
fi
echo -e "${GREEN}  [OK] Uprawnienia skonfigurowane${NC}"

# --- Krok 6: Otworz Xcode ---
echo ""
echo -e "${BLUE}[6/6] Otwieram Xcode...${NC}"

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}       GOTOWE! SUKCES!                                 ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo ""
echo -e "${YELLOW}--- CO TERAZ W XCODE ---${NC}"
echo ""
echo "  1. Xcode sie otworzy za chwile"
echo "  2. Kliknij 'App' po lewej"
echo "  3. Signing & Capabilities:"
echo "     - Zaznacz 'Automatically manage signing'"
echo "     - Wybierz Team (Apple Developer Account)"
echo "     - Dodaj 'Push Notifications' przez '+ Capability'"
echo "  4. Podlacz iPhone kablem USB"
echo "  5. Wybierz telefon u gory -> przycisk Play"
echo ""
echo -e "${YELLOW}--- APP STORE ---${NC}"
echo ""
echo "  Product -> Archive -> Distribute App -> App Store Connect"
echo ""

open ios/App/App.xcworkspace 2>/dev/null || {
    echo -e "${YELLOW}Otworz recznie: ios/App/App.xcworkspace${NC}"
}
