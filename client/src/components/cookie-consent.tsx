import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { Link } from "wouter";

const COOKIE_CONSENT_KEY = "taxiq_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-4 duration-500"
      data-testid="cookie-consent-banner"
    >
      <div className="max-w-3xl mx-auto rounded-md border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <Cookie className="w-6 h-6 text-[hsl(70,100%,50%)] shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <p className="text-sm leading-relaxed">
              Strona TaxiQ wykorzystuje pliki cookie w celu zapewnienia prawidłowego
              działania serwisu, utrzymania sesji logowania oraz poprawy jakości usług.
              Korzystając z serwisu, wyrażasz zgodę na używanie plików cookie zgodnie z naszą{" "}
              <Link
                href="/polityka-prywatnosci"
                className="text-[hsl(70,100%,50%)] underline underline-offset-2"
                data-testid="link-privacy-policy"
              >
                Polityką Prywatności
              </Link>
              .
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleAccept}
                className="bg-[hsl(70,100%,50%)] text-black border-[hsl(70,100%,40%)]"
                data-testid="button-accept-cookies"
              >
                Akceptuję
              </Button>
              <Button
                variant="outline"
                onClick={handleReject}
                data-testid="button-reject-cookies"
              >
                Tylko niezbędne
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
