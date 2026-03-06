import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";

const MOCK_REFERRAL_CODE = "TAXIQ2026";

export function ReferralSection() {
  const [showCode, setShowCode] = useState(false);

  return (
    <div
      className="h-full flex flex-col justify-center"
      style={{ background: "#0a0a0a", paddingLeft: "24px", paddingRight: "24px", paddingTop: "8px", paddingBottom: "8px" }}
      data-testid="referral-section"
    >
      <div className="flex items-center gap-2" style={{ marginBottom: "6px" }}>
        <Gift
          className="shrink-0"
          style={{ color: "#E6FF3F", width: "16px", height: "16px" }}
        />
        <h2
          className="text-sm"
          style={{ color: "#E6FF3F", fontWeight: 600, lineHeight: 1.35 }}
          data-testid="referral-headline"
        >
          Polecaj i jedź taniej
        </h2>
      </div>

      <p
        className="text-xs"
        style={{ color: "#888", lineHeight: 1.45, fontWeight: 400, marginBottom: "12px" }}
        data-testid="referral-compact-text"
      >
        Poleć aplikację znajomemu — oboje jedziecie taniej
      </p>

      {showCode ? (
        <Card
          className="border-none"
          style={{ background: "rgba(230, 255, 63, 0.06)" }}
          data-testid="referral-code-card"
        >
          <CardContent className="flex items-center justify-between gap-2 p-2">
            <span className="text-xs" style={{ color: "#888" }}>
              Twój kod:
            </span>
            <span
              className="text-sm tracking-widest select-all"
              style={{ color: "#E6FF3F", fontWeight: 600 }}
              data-testid="referral-code"
            >
              {MOCK_REFERRAL_CODE}
            </span>
          </CardContent>
        </Card>
      ) : (
        <Button
          size="sm"
          className="w-full"
          onClick={() => setShowCode(true)}
          data-testid="referral-show-code-button"
        >
          Pokaż mój kod
        </Button>
      )}
    </div>
  );
}
