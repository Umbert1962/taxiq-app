import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "pl.taxiq.app",
  appName: "TaxiQ",
  webDir: "dist/public",
  server: {
    url: "https://taxiq.com.pl",
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#000000",
  },
  ios: {
    backgroundColor: "#000000",
    contentInset: "automatic",
    scheme: "TaxiQ",
    preferredContentMode: "mobile",
  },
};

export default config;
