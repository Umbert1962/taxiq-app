import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { X } from "lucide-react";
import heroBg from "@assets/Czarna_taksówka_na_mokrej_ulicy_1772699076414.png";
import googlePlayBadge from "@assets/google-play-badge.svg";
import appStoreBadge from "@assets/app-store-badge.svg";

interface HomeContent {
  heroVideoUrl: string;
  heroHeadline: string;
}

export function HeroSection() {
  const { data } = useQuery<HomeContent>({
    queryKey: ["/api/home-content"],
  });
  const [mediaExpanded, setMediaExpanded] = useState(false);

  const headline = data?.heroHeadline || "Taksówka bez pośredników. Bez prowizji.";

  return (
    <>
      <div
        className="w-full h-full relative flex flex-col"
        data-testid="hero-section"
      >
        <div
          className="flex-1 relative overflow-hidden"
          data-testid="hero-video-container"
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${heroBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              filter: "brightness(1) contrast(1)",
            }}
            data-testid="hero-bg-image"
          />

          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(160deg, rgba(8,12,28,0.15) 0%, rgba(6,28,18,0.15) 60%, rgba(4,8,16,0.20) 100%)",
            }}
          />

          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(6,10,24,0.1) 0%, transparent 40%, transparent 70%, rgba(4,8,16,0.3) 100%)",
            }}
          />

          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
            style={{ pointerEvents: "none" }}
            data-testid="hero-svg-animation"
          >
            <path d="M0,120 Q200,100 400,140 Q600,180 800,130" fill="none" stroke="rgba(230,255,63,0.12)" strokeWidth="0.6" />
            <path d="M0,280 Q180,240 380,300 Q580,350 800,270" fill="none" stroke="rgba(230,255,63,0.10)" strokeWidth="0.6" />
            <path d="M0,440 Q220,400 460,450 Q640,480 800,430" fill="none" stroke="rgba(230,255,63,0.12)" strokeWidth="0.6" />

            <path d="M120,0 Q130,200 110,400 Q90,500 130,600" fill="none" stroke="rgba(230,255,63,0.07)" strokeWidth="0.5" />
            <path d="M420,0 Q400,180 430,360 Q450,480 410,600" fill="none" stroke="rgba(230,255,63,0.07)" strokeWidth="0.5" />
            <path d="M680,0 Q690,200 670,400 Q660,500 690,600" fill="none" stroke="rgba(230,255,63,0.07)" strokeWidth="0.5" />

            <g className="hero-car hero-car-1">
              <circle cx="0" cy="0" r="8" fill="none" stroke="rgba(230,255,63,0.35)" strokeWidth="0.8">
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;1.08;1"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </circle>
              <rect x="-5" y="-3.5" width="10" height="7" rx="2" fill="#E6FF3F" opacity="0.7" />
              <rect x="-3" y="-2" width="6" height="3" rx="1" fill="rgba(10,20,10,0.6)" />
              <circle cx="-3" cy="3.5" r="1.2" fill="#E6FF3F" opacity="0.5" />
              <circle cx="3" cy="3.5" r="1.2" fill="#E6FF3F" opacity="0.5" />
              <animateMotion
                dur="30s"
                repeatCount="indefinite"
                path="M0,120 Q200,100 400,140 Q600,180 800,130"
              />
            </g>

            <g className="hero-car hero-car-2">
              <circle cx="0" cy="0" r="8" fill="none" stroke="rgba(230,255,63,0.35)" strokeWidth="0.8">
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;1.08;1"
                  dur="8s"
                  repeatCount="indefinite"
                  begin="3s"
                />
              </circle>
              <rect x="-5" y="-3.5" width="10" height="7" rx="2" fill="#E6FF3F" opacity="0.7" />
              <rect x="-3" y="-2" width="6" height="3" rx="1" fill="rgba(10,20,10,0.6)" />
              <circle cx="-3" cy="3.5" r="1.2" fill="#E6FF3F" opacity="0.5" />
              <circle cx="3" cy="3.5" r="1.2" fill="#E6FF3F" opacity="0.5" />
              <animateMotion
                dur="35s"
                repeatCount="indefinite"
                path="M0,280 Q180,240 380,300 Q580,350 800,270"
                begin="5s"
              />
            </g>

            <g className="hero-car hero-car-3">
              <circle cx="0" cy="0" r="8" fill="none" stroke="rgba(230,255,63,0.35)" strokeWidth="0.8">
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;1.08;1"
                  dur="8s"
                  repeatCount="indefinite"
                  begin="6s"
                />
              </circle>
              <rect x="-5" y="-3.5" width="10" height="7" rx="2" fill="#E6FF3F" opacity="0.7" />
              <rect x="-3" y="-2" width="6" height="3" rx="1" fill="rgba(10,20,10,0.6)" />
              <circle cx="-3" cy="3.5" r="1.2" fill="#E6FF3F" opacity="0.5" />
              <circle cx="3" cy="3.5" r="1.2" fill="#E6FF3F" opacity="0.5" />
              <animateMotion
                dur="28s"
                repeatCount="indefinite"
                path="M0,440 Q220,400 460,450 Q640,480 800,430"
                begin="8s"
              />
            </g>
          </svg>

          <div
            className="absolute inset-0 flex flex-col items-center justify-end pb-4 md:pb-5"
            style={{
              background: "linear-gradient(transparent 50%, rgba(0,0,0,0.65) 100%)",
              pointerEvents: "none",
            }}
          >
            <div
              className="flex flex-col items-center gap-2"
              style={{ pointerEvents: "auto" }}
            >
              <div className="flex flex-wrap items-center gap-2 justify-center">
                <Link
                  href="/passenger"
                  className="px-4 py-1.5 rounded-md font-medium text-xs transition-opacity hover:opacity-90"
                  style={{
                    background: "#E6FF3F",
                    color: "#000",
                    textDecoration: "none",
                  }}
                  data-testid="cta-passenger"
                >
                  Zamów taksówkę
                </Link>
                <Link
                  href="/driver"
                  className="px-4 py-1.5 rounded-md font-medium text-xs transition-opacity hover:opacity-90"
                  style={{
                    background: "transparent",
                    color: "#E6FF3F",
                    border: "1px solid #E6FF3F",
                    textDecoration: "none",
                  }}
                  data-testid="cta-driver"
                >
                  Zostań kierowcą
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-3 justify-center">
                <div className="flex flex-col items-center gap-1">
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "9px", letterSpacing: "0.05em" }}>PASAŻER</span>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://play.google.com/store/apps/details?id=pl.taxiq.passenger"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="cta-passenger-play"
                    >
                      <img src={googlePlayBadge} alt="Google Play - Pasażer" style={{ height: "36px" }} />
                    </a>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      style={{ opacity: 0.4, cursor: "default" }}
                      title="Wkrótce"
                      data-testid="cta-passenger-appstore"
                    >
                      <img src={appStoreBadge} alt="App Store - Pasażer" style={{ height: "36px" }} />
                    </a>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "9px", letterSpacing: "0.05em" }}>KIEROWCA</span>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://play.google.com/store/apps/details?id=pl.taxiq.driver"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="cta-driver-play"
                    >
                      <img src={googlePlayBadge} alt="Google Play - Kierowca" style={{ height: "36px" }} />
                    </a>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      style={{ opacity: 0.4, cursor: "default" }}
                      title="Wkrótce"
                      data-testid="cta-driver-appstore"
                    >
                      <img src={appStoreBadge} alt="App Store - Kierowca" style={{ height: "36px" }} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .hero-car-3 {
            display: none;
          }
          [data-testid="hero-svg-animation"] {
            opacity: 0.6;
          }
          [data-testid="hero-video-container"]::after {
            content: '';
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.10);
            pointer-events: none;
            z-index: 1;
          }
        }
      `}</style>

      {mediaExpanded && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)", zIndex: 100 }}
          onClick={() => setMediaExpanded(false)}
          data-testid="hero-media-modal"
        >
          <button
            className="absolute top-4 right-4 flex items-center justify-center rounded-full"
            style={{
              width: "40px",
              height: "40px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(230, 255, 63, 0.3)",
            }}
            onClick={() => setMediaExpanded(false)}
            data-testid="hero-media-close"
          >
            <X style={{ color: "#E6FF3F", width: "20px", height: "20px" }} />
          </button>

          <div
            className="w-full max-w-4xl mx-4"
            style={{ aspectRatio: "16/9" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full h-full flex items-center justify-center rounded-md"
              style={{ background: "#111" }}
            >
              <span style={{ color: "#555" }}>Wideo promocyjne</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
