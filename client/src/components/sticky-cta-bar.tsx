import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function StickyCtaBar() {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={sentinelRef}
        data-testid="sticky-cta-sentinel"
        style={{ height: "1px", width: "100%", position: "absolute", top: "0" }}
      />

      <div
        className="fixed bottom-0 left-0 right-0 md:hidden flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(0, 0, 0, 0.92)",
          borderTop: "1px solid rgba(230, 255, 63, 0.15)",
          zIndex: 50,
          transform: visible ? "translateY(0)" : "translateY(100%)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.3s ease, opacity 0.3s ease",
          pointerEvents: visible ? "auto" : "none",
        }}
        data-testid="sticky-cta-bar"
      >
        <Button
          className="flex-1"
          onClick={() => navigate("/passenger")}
          data-testid="sticky-cta-register"
        >
          Zarejestruj się
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          onClick={() => navigate("/driver")}
          style={{
            borderColor: "#E6FF3F",
            color: "#E6FF3F",
          }}
          data-testid="sticky-cta-driver"
        >
          Zostań kierowcą
        </Button>
      </div>
    </>
  );
}
