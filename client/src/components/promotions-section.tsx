import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  featured: boolean | null;
}

const PREVIEW_PROMOS: Promotion[] = [
  {
    id: "preview-1",
    title: "10 zl taniej na pierwszy kurs",
    description: "Zarejestruj sie jako nowy pasazer i otrzymaj rabat na pierwsza podroz z TaxiQ.",
    imageUrl: null,
    buttonText: "Odbierz",
    buttonLink: "/passenger",
    featured: true,
  },
  {
    id: "preview-2",
    title: "Darmowy miesiac dla kierowcy",
    description: "Dolacz jako kierowca i przetestuj platforme — pierwszy miesiac bez oplat.",
    imageUrl: null,
    buttonText: "Dolacz",
    buttonLink: "/driver",
    featured: false,
  },
  {
    id: "preview-3",
    title: "Polecaj i zarabiaj",
    description: "Polec TaxiQ znajomemu i odbierz 5 zl znizki na kazdy polecony kurs.",
    imageUrl: null,
    buttonText: "Sprawdz",
    buttonLink: null,
    featured: false,
  },
];

export function PromotionsSection() {
  const { data: apiPromos = [] } = useQuery<Promotion[]>({
    queryKey: ["/api/promotions/active"],
  });

  const promos = apiPromos.length > 0 ? apiPromos : PREVIEW_PROMOS;
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const count = promos.length;
  const promo = promos[activeIndex] || promos[0];

  const goTo = (index: number) => {
    if (count === 0) return;
    setActiveIndex(((index % count) + count) % count);
  };

  if (count === 0) {
    return <div className="h-full" data-testid="promotions-section" />;
  }

  return (
    <>
      <div
        className="h-full flex flex-col justify-center"
        style={{ paddingLeft: "24px", paddingRight: "24px", paddingTop: "8px", paddingBottom: "8px" }}
        data-testid="promotions-section"
      >
        <div className="flex items-center gap-2" style={{ marginBottom: "6px" }}>
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: "rgba(230, 255, 63, 0.5)", fontWeight: 500, lineHeight: 1.35 }}
          >
            Promocje
          </span>
          {count > 1 && (
            <span className="text-xs" style={{ color: "#555", lineHeight: 1.35 }}>
              {activeIndex + 1}/{count}
            </span>
          )}
        </div>

        <div className="flex items-start gap-3" data-testid="promotions-carousel">
          {promo.imageUrl && (
            <div
              className="shrink-0 rounded-md overflow-hidden cursor-pointer relative group"
              style={{ width: "60px", height: "45px" }}
              onClick={() => setExpandedImage(promo.imageUrl)}
              data-testid={`promo-image-${promo.id}`}
            >
              <img
                src={promo.imageUrl}
                alt={promo.title}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.4)" }}
              >
                <Maximize2 style={{ color: "#E6FF3F", width: "12px", height: "12px" }} />
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm truncate"
                style={{ color: "#E6FF3F", fontWeight: 600, lineHeight: 1.35 }}
                data-testid={`promo-title-${promo.id}`}
              >
                {promo.title}
              </span>
              {promo.featured && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0"
                  style={{
                    background: "rgba(230, 255, 63, 0.15)",
                    color: "#E6FF3F",
                  }}
                  data-testid={`promo-featured-${promo.id}`}
                >
                  Wyróżniona
                </span>
              )}
            </div>
            {promo.description && (
              <p
                className="text-xs line-clamp-2"
                style={{ color: "#888", lineHeight: 1.45, fontWeight: 400, marginTop: "4px" }}
                data-testid={`promo-desc-${promo.id}`}
              >
                {promo.description}
              </p>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-1">
            {promo.buttonLink ? (
              <Button size="sm" asChild data-testid={`promo-button-${promo.id}`}>
                <a href={promo.buttonLink}>
                  {promo.buttonText || "Odbierz"}
                </a>
              </Button>
            ) : (
              <Button size="sm" data-testid={`promo-button-${promo.id}`}>
                {promo.buttonText || "Odbierz"}
              </Button>
            )}
          </div>
        </div>

        {count > 1 && (
          <div className="flex items-center gap-2" style={{ marginTop: "10px" }}>
            <button
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: "24px",
                height: "24px",
                background: "rgba(230, 255, 63, 0.08)",
                border: "none",
              }}
              onClick={() => goTo(activeIndex - 1)}
              data-testid="promo-prev"
            >
              <ChevronLeft style={{ color: "#E6FF3F", width: "14px", height: "14px" }} />
            </button>

            <div className="flex gap-1.5" data-testid="promo-dots">
              {promos.map((_, i) => (
                <button
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === activeIndex ? "16px" : "6px",
                    height: "6px",
                    background: i === activeIndex ? "#E6FF3F" : "rgba(230, 255, 63, 0.2)",
                    border: "none",
                  }}
                  onClick={() => goTo(i)}
                  data-testid={`promo-dot-${i}`}
                />
              ))}
            </div>

            <button
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: "24px",
                height: "24px",
                background: "rgba(230, 255, 63, 0.08)",
                border: "none",
              }}
              onClick={() => goTo(activeIndex + 1)}
              data-testid="promo-next"
            >
              <ChevronRight style={{ color: "#E6FF3F", width: "14px", height: "14px" }} />
            </button>
          </div>
        )}
      </div>

      {expandedImage && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)", zIndex: 100 }}
          onClick={() => setExpandedImage(null)}
          data-testid="promo-media-modal"
        >
          <button
            className="absolute top-4 right-4 flex items-center justify-center rounded-full"
            style={{
              width: "40px",
              height: "40px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(230, 255, 63, 0.3)",
            }}
            onClick={() => setExpandedImage(null)}
            data-testid="promo-media-close"
          >
            <X style={{ color: "#E6FF3F", width: "20px", height: "20px" }} />
          </button>
          <img
            src={expandedImage}
            alt="Promocja"
            className="max-w-[90vw] max-h-[80vh] object-contain"
            onClick={(e) => e.stopPropagation()}
            data-testid="promo-image-expanded"
          />
        </div>
      )}
    </>
  );
}
