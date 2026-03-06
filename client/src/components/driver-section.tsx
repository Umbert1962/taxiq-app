import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Car } from "lucide-react";

export function DriverSection() {
  const [, navigate] = useLocation();

  return (
    <div
      className="h-full flex flex-col justify-center"
      style={{ background: "#050505", paddingLeft: "24px", paddingRight: "24px", paddingTop: "8px", paddingBottom: "8px" }}
      data-testid="driver-section"
    >
      <div className="flex items-center gap-2" style={{ marginBottom: "6px" }}>
        <Car
          className="shrink-0"
          style={{ color: "#E6FF3F", width: "16px", height: "16px" }}
        />
        <h2
          className="text-sm"
          style={{ color: "#E6FF3F", fontWeight: 600, lineHeight: 1.35 }}
          data-testid="driver-headline"
        >
          Zarabiaj bez korporacji
        </h2>
      </div>

      <p
        className="text-xs"
        style={{ color: "#888", lineHeight: 1.45, fontWeight: 400, marginBottom: "12px" }}
        data-testid="driver-compact-text"
      >
        Niższa prowizja, więcej kursów, praca kiedy chcesz
      </p>

      <Button
        size="sm"
        className="w-full"
        onClick={() => navigate("/driver")}
        data-testid="driver-cta-button"
      >
        Zostań kierowcą
      </Button>
    </div>
  );
}
