import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Briefcase, Users, Car, Shield, FileText, Lock, Mail, X, Send, Phone, Heart, TrendingUp, Share2, MapPin, Zap, CalendarClock, Gift, UserPlus, Banknote, Handshake, RefreshCw, Wallet, Network } from "lucide-react";
import logoNeon from "@assets/logo/logo-taxiq-neon.jpg";
import { HeaderBanner } from "@/components/header-banner";
import { HeroSection } from "@/components/hero-section";
import { useToast } from "@/hooks/use-toast";

const sidebarNav = [
  { icon: Briefcase, label: "Biznes", href: "/business", testId: "nav-business" },
  { icon: Users, label: "Pasażer", href: "/passenger", testId: "nav-passenger" },
  { icon: Car, label: "Kierowca", href: "/driver", testId: "nav-driver" },
  { icon: Shield, label: "Admin", href: "/admin", testId: "nav-admin" },
];

const sidebarLegal = [
  { icon: FileText, label: "Regulamin", href: "/regulamin", testId: "nav-regulamin" },
  { icon: Lock, label: "Prywatność", href: "/polityka-prywatnosci", testId: "nav-privacy" },
  { icon: Mail, label: "Kontakt", href: "#contact", testId: "nav-contact" },
];

const DESKTOP_COLLAPSED = 72;
const DESKTOP_EXPANDED = 220;
const MOBILE_COLLAPSED = 60;
const MOBILE_EXPANDED = 220;
const MD_BREAKPOINT = 768;

export default function HomeNew() {
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const { data: driverSession } = useQuery({
    queryKey: ["/api/drivers/session"],
    queryFn: async () => {
      const res = await fetch("/api/drivers/session", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 60000,
  });

  const isDriverLoggedIn = !!driverSession;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MD_BREAKPOINT);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isMobile, sidebarOpen]);

  const collapsedWidth = isMobile ? MOBILE_COLLAPSED : DESKTOP_COLLAPSED;
  const expandedWidth = isMobile ? MOBILE_EXPANDED : DESKTOP_EXPANDED;
  const currentWidth = sidebarOpen ? expandedWidth : collapsedWidth;

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href === "#contact") {
      e.preventDefault();
      setContactOpen(true);
      setSidebarOpen(false);
    }
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleSidebarInteraction = () => {
    if (isMobile) {
      setSidebarOpen((prev) => !prev);
    }
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden"
      style={{ backgroundColor: "#000000" }}
      data-testid="home-new"
    >
      <aside
        ref={sidebarRef}
        className="flex flex-col shrink-0 overflow-hidden"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          width: `${currentWidth}px`,
          background: "#000000",
          borderRight: "1px solid rgba(230, 255, 63, 0.08)",
          transition: "width 0.2s ease",
          zIndex: 40,
        }}
        onMouseEnter={() => { if (!isMobile) setSidebarOpen(true); }}
        onMouseLeave={() => { if (!isMobile) setSidebarOpen(false); }}
        data-testid="home-new-sidebar"
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            height: "120px",
            borderBottom: "1px solid rgba(230, 255, 63, 0.1)",
            cursor: isMobile ? "pointer" : "default",
          }}
          onClick={handleSidebarInteraction}
          data-testid="sidebar-logo-area"
        >
          <a href="/" data-testid="button-logo-home" className="flex items-center justify-center">
            <img
              src={logoNeon}
              alt="TaxiQ"
              className="select-none pointer-events-none"
              draggable={false}
              style={{
                height: sidebarOpen ? "80px" : "42px",
                width: "auto",
                transition: "height 0.2s ease",
                filter: "drop-shadow(0 0 12px rgba(230, 255, 63, 0.5)) drop-shadow(0 0 30px rgba(230, 255, 63, 0.2))",
              }}
              data-testid="img-logo-q"
            />
          </a>
        </div>

        <div className="flex flex-col py-4 flex-1 justify-between overflow-hidden">
          <div className="flex flex-col gap-1 px-2">
            {sidebarNav.map((item) => {
              const IconComp = item.icon;
              return (
                <a
                  key={item.testId}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.href, e)}
                  className="flex items-center gap-3 py-2.5 rounded-md transition-colors duration-200"
                  style={{
                    color: "rgba(255, 255, 255, 0.45)",
                    paddingLeft: isMobile ? "12px" : "16px",
                    paddingRight: "12px",
                    textDecoration: "none",
                    minHeight: "44px",
                  }}
                  data-testid={item.testId}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#E6FF3F";
                    e.currentTarget.style.backgroundColor = "rgba(230, 255, 63, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.45)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <IconComp className="w-7 h-7 shrink-0" />
                  <span
                    className="text-sm tracking-wide whitespace-nowrap"
                    style={{
                      opacity: sidebarOpen ? 1 : 0,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {item.label}
                  </span>
                </a>
              );
            })}

            <div
              className="my-3 mx-3"
              style={{ borderBottom: "1px solid rgba(230, 255, 63, 0.1)" }}
            />

            {sidebarLegal.map((item) => {
              const IconComp = item.icon;
              return (
                <a
                  key={item.testId}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.href, e)}
                  className="flex items-center gap-3 py-2.5 rounded-md transition-colors duration-200"
                  style={{
                    color: "rgba(255, 255, 255, 0.35)",
                    paddingLeft: isMobile ? "12px" : "16px",
                    paddingRight: "12px",
                    textDecoration: "none",
                    minHeight: "44px",
                  }}
                  data-testid={item.testId}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.35)";
                  }}
                >
                  <IconComp className="w-7 h-7 shrink-0" />
                  <span
                    className="text-sm tracking-wide whitespace-nowrap"
                    style={{
                      opacity: sidebarOpen ? 1 : 0,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {item.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </aside>

      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{
          marginLeft: `${currentWidth}px`,
          transition: "margin-left 0.2s ease",
        }}
      >
        <header
          className="shrink-0 flex flex-col md:flex-row"
          style={{
            height: "120px",
            borderBottom: "1px solid rgba(230, 255, 63, 0.1)",
          }}
          data-testid="home-new-header"
        >
          <div className="hidden md:flex items-center flex-1 overflow-hidden">
            <HeaderBanner />
          </div>

          <div className="flex md:hidden items-center h-[60px] overflow-hidden">
            <HeaderBanner className="mobile-banner" />
          </div>

          <div
            className="hidden md:flex items-center justify-center flex-1"
            data-testid="phone-cta-desktop"
          >
            <div className="flex flex-col items-center gap-1.5">
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.2em" }}
              >
                Zamów taksówkę jednym telefonem
              </span>
              <a
                href="tel:+48732125585"
                className="phone-cta-link flex items-center gap-3 no-underline transition-all duration-300"
                data-testid="link-phone-desktop"
              >
                <Phone className="w-5 h-5" style={{ color: "#E6FF3F" }} />
                <span
                  className="font-semibold tracking-wider"
                  style={{
                    color: "#E6FF3F",
                    fontSize: "28px",
                    textShadow: "0 0 12px rgba(230, 255, 63, 0.3)",
                    letterSpacing: "0.08em",
                  }}
                >
                  +48 732 125 585
                </span>
              </a>
              <span
                className="text-xs"
                style={{ color: "rgba(255, 255, 255, 0.25)", letterSpacing: "0.1em" }}
              >
                Bez pośredników. Bez prowizji.
              </span>
            </div>
          </div>

          <a
            href="tel:+48732125585"
            className="flex md:hidden items-center justify-center gap-2 h-[60px] no-underline"
            style={{
              background: "rgba(230, 255, 63, 0.04)",
            }}
            data-testid="link-phone-mobile"
          >
            <Phone className="w-4 h-4" style={{ color: "#E6FF3F" }} />
            <span
              className="font-semibold tracking-wider"
              style={{
                color: "#E6FF3F",
                fontSize: "18px",
                textShadow: "0 0 8px rgba(230, 255, 63, 0.3)",
                letterSpacing: "0.06em",
              }}
            >
              +48 732 125 585
            </span>
            <span
              className="text-xs ml-2"
              style={{ color: "rgba(255, 255, 255, 0.35)" }}
            >
              Zadzwoń teraz
            </span>
          </a>

          <style>{`
            .phone-cta-link {
              text-decoration: none;
            }
            .phone-cta-link:hover {
              filter: drop-shadow(0 0 16px rgba(230, 255, 63, 0.6));
              transform: scale(1.03);
            }
          `}</style>
        </header>

        <main
          className="flex-1 overflow-auto md:overflow-hidden flex flex-col"
          data-testid="home-new-content"
        >
          <div className="md:flex-1 overflow-visible md:overflow-hidden grid grid-cols-1 md:grid-cols-2 md:grid-rows-1 gap-px" style={{ background: "rgba(230, 255, 63, 0.06)" }}>
            <div className="h-[65vh] md:h-full overflow-hidden relative" style={{ background: "#000" }}>
              <HeroSection />
            </div>

            <div className="hidden md:flex flex-col overflow-auto h-full" style={{ background: "#000", padding: "16px", gap: "12px" }}>
              <HowItWorksSection />
              <ReferralSection />
              <DriverReferralSection />
              <FranchiseSection />
            </div>

            <div className="md:hidden flex flex-col overflow-auto" style={{ background: "#000", padding: "20px 16px", gap: "24px" }}>
              <HowItWorksSection />
              <ReferralSection />
              <DriverReferralSection />
              <FranchiseSection />
            </div>
          </div>
        </main>
      </div>

      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 35 }}
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* DISABLED: Benefits modal for referral discount system — kept for future reactivation
      {benefitsOpen && (
        <BenefitsModal onClose={() => setBenefitsOpen(false)} />
      )}
      */}

      {contactOpen && (
        <ContactModal onClose={() => setContactOpen(false)} />
      )}
    </div>
  );
}

function HowItWorksSection() {
  const features = [
    {
      icon: <MapPin style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "WIDZISZ KIEROWCÓW NA MAPIE → KRÓTKI DOJAZD",
      text: "W aplikacji widzisz kierowców w swojej okolicy. Możesz wybrać najbliższą, najszybszą lub najtańszą ofertę, co skraca czas dojazdu.",
      testId: "feature-map",
    },
    {
      icon: <Zap style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "CITO → SZYBKIE RATUNKOWE ZAMÓWIENIE",
      text: "Gdy się spieszysz, wysyłasz kurs do kierowców w pobliżu. Pierwszy kierowca który przyjmie zlecenie natychmiast jedzie.",
      testId: "feature-cito",
    },
    {
      icon: <CalendarClock style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "TERMIN → PLANOWANIE",
      text: "Możesz zaplanować przejazd z wyprzedzeniem. Zamówienie można ustawić nawet do 7 dni do przodu.",
      testId: "feature-schedule",
    },
  ];

  return (
    <div
      className="flex flex-col"
      style={{
        padding: "14px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(230,255,63,0.15)",
      }}
      data-testid="how-it-works-section"
    >
      {features.map((f, i) => (
        <div key={f.testId} data-testid={f.testId}>
          <div className="flex items-start gap-2.5 mb-1">
            <div className="shrink-0 mt-0.5">{f.icon}</div>
            <div>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#E6FF3F",
                  margin: 0,
                  lineHeight: 1.3,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.5,
                  margin: "3px 0 0 0",
                }}
              >
                {f.text}
              </p>
            </div>
          </div>
          {i < features.length - 1 && (
            <div
              style={{
                height: "1px",
                background: "rgba(230,255,63,0.12)",
                margin: "8px 0",
              }}
            />
          )}
        </div>
      ))}
      <div
        style={{
          height: "3px",
          background: "#E6FF3F",
          borderRadius: "2px",
          marginTop: "10px",
        }}
      />
    </div>
  );
}

function ReferralSection() {
  const features = [
    {
      icon: <Share2 style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "POLECASZ APLIKACJĘ",
      text: "Udostępniasz znajomemu swój kod polecający.",
      testId: "referral-share",
    },
    {
      icon: <UserPlus style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "ZNAJOMY ZAMAWIA PIERWSZY KURS",
      text: "Instaluje aplikację i korzysta z Twojego polecenia.",
      testId: "referral-first-ride",
    },
    {
      icon: <Banknote style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "OBOJE DOSTAJECIE BONUS",
      text: "Ty i Twój znajomy otrzymujecie 2 × 10 zł na przejazdy.",
      testId: "referral-bonus",
    },
  ];

  return (
    <div
      className="flex flex-col"
      style={{
        padding: "14px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(230,255,63,0.15)",
      }}
      data-testid="referral-section"
    >
      <h2
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#E6FF3F",
          margin: 0,
          lineHeight: 1.3,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        POLECAJ TAXIQ → OBOJE JEDZIECIE TANIEJ
      </h2>
      <p
        style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.6)",
          lineHeight: 1.5,
          margin: "3px 0 10px 0",
        }}
      >
        Poleć aplikację znajomym i korzystajcie z tańszych przejazdów.
      </p>
      {features.map((f, i) => (
        <div key={f.testId} data-testid={f.testId}>
          <div className="flex items-start gap-2.5 mb-1">
            <div className="shrink-0 mt-0.5">{f.icon}</div>
            <div>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#E6FF3F",
                  margin: 0,
                  lineHeight: 1.3,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.5,
                  margin: "3px 0 0 0",
                }}
              >
                {f.text}
              </p>
            </div>
          </div>
          {i < features.length - 1 && (
            <div
              style={{
                height: "1px",
                background: "rgba(230,255,63,0.12)",
                margin: "8px 0",
              }}
            />
          )}
        </div>
      ))}
      <div
        style={{
          height: "3px",
          background: "#E6FF3F",
          borderRadius: "2px",
          marginTop: "10px",
        }}
      />
    </div>
  );
}

function DriverReferralSection() {
  const features = [
    {
      icon: <Handshake style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "POLECASZ KIEROWCĘ",
      text: "Zapraszasz do TaxiQ znajomego kierowcę i pomagasz mu dołączyć do aplikacji.",
      testId: "driver-ref-invite",
    },
    {
      icon: <RefreshCw style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "ON PRACUJE W SYSTEMIE TAXIQ",
      text: "Kierowca korzysta z aplikacji i odnawia abonament jak inni użytkownicy.",
      testId: "driver-ref-works",
    },
    {
      icon: <Wallet style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "TY OTRZYMUJESZ UDZIAŁ",
      text: "Za poleconych kierowców otrzymujesz część abonamentu tak długo, jak korzystają z TaxiQ.",
      testId: "driver-ref-bonus",
    },
  ];

  return (
    <div
      className="flex flex-col"
      style={{
        padding: "14px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(230,255,63,0.15)",
      }}
      data-testid="driver-referral-section"
    >
      <h2
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#E6FF3F",
          margin: 0,
          lineHeight: 1.3,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        STAŁA RELACJA SIĘ OPŁACA
      </h2>
      <p
        style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.6)",
          lineHeight: 1.5,
          margin: "3px 0 10px 0",
        }}
      >
        TaxiQ rozwija się dzięki poleceniom. Jeśli zapraszasz nowych kierowców do aplikacji, możesz budować własny dochód pasywny.
      </p>
      {features.map((f, i) => (
        <div key={f.testId} data-testid={f.testId}>
          <div className="flex items-start gap-2.5 mb-1">
            <div className="shrink-0 mt-0.5">{f.icon}</div>
            <div>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#E6FF3F",
                  margin: 0,
                  lineHeight: 1.3,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.5,
                  margin: "3px 0 0 0",
                }}
              >
                {f.text}
              </p>
            </div>
          </div>
          {i < features.length - 1 && (
            <div
              style={{
                height: "1px",
                background: "rgba(230,255,63,0.12)",
                margin: "8px 0",
              }}
            />
          )}
        </div>
      ))}
      <p
        style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.5,
          margin: "10px 0 0 0",
          fontStyle: "italic",
        }}
      >
        W ten sposób możesz budować własną sieć kierowców i stabilny dochód w systemie TaxiQ.
      </p>
      <div
        style={{
          height: "3px",
          background: "#E6FF3F",
          borderRadius: "2px",
          marginTop: "10px",
        }}
      />
    </div>
  );
}

function FranchiseSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [city, setCity] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !city.trim()) {
      toast({ title: "Wypełnij wszystkie pola", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: contact.trim(),
          message: `[PARTNERSTWO] Miasto: ${city.trim()}\nKontakt: ${contact.trim()}\nImię: ${name.trim()}`,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Zgłoszenie wysłane! Skontaktujemy się wkrótce." });
      setModalOpen(false);
      setName("");
      setContact("");
      setCity("");
    } catch {
      toast({ title: "Błąd wysyłania zgłoszenia", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const features = [
    {
      icon: <UserPlus style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "ZAPRASZASZ KIEROWCÓW",
      text: "Polecasz kierowców do aplikacji TaxiQ i pomagasz im dołączyć do systemu.",
      testId: "franchise-invite",
    },
    {
      icon: <Network style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "TWORZYSZ WŁASNĄ SIEĆ",
      text: "Kierowcy, których zaprosiłeś, stają się częścią Twojej sieci TaxiQ.",
      testId: "franchise-network",
    },
    {
      icon: <Wallet style={{ width: 18, height: 18, color: "#E6FF3F" }} />,
      title: "DOCHÓD PASYWNY",
      text: "Otrzymujesz udział w abonamencie kierowców tak długo, jak pozostają częścią sieci TaxiQ.",
      testId: "franchise-earn",
    },
  ];

  return (
    <>
      <div
        className="flex flex-col"
        style={{
          padding: "14px",
          borderRadius: "12px",
          background: "rgba(230,255,63,0.06)",
          border: "1px solid rgba(230,255,63,0.25)",
        }}
        data-testid="franchise-section"
      >
        <div style={{ margin: 0 }}>
          <h2
            style={{
              fontSize: "17px",
              fontWeight: 900,
              color: "#E6FF3F",
              margin: 0,
              lineHeight: 1.2,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textShadow: "0 0 12px rgba(230,255,63,0.3)",
            }}
          >
            FRANCHISING TAXIQ
          </h2>
          <h3
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#E6FF3F",
              margin: "2px 0 0 0",
              lineHeight: 1.3,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            ZBUDUJ WŁASNĄ SIEĆ KIEROWCÓW
          </h3>
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.5,
            margin: "4px 0 10px 0",
          }}
        >
          TaxiQ rozwija się dzięki lokalnym partnerom. Jeśli mieszkasz w większym mieście, możesz rozwijać TaxiQ w swoim regionie i budować własną sieć kierowców.
        </p>
        {features.map((f, i) => (
          <div key={f.testId} data-testid={f.testId}>
            <div className="flex items-start gap-2.5 mb-1">
              <div className="shrink-0 mt-0.5">{f.icon}</div>
              <div>
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#E6FF3F",
                    margin: 0,
                    lineHeight: 1.3,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.6)",
                    lineHeight: 1.5,
                    margin: "3px 0 0 0",
                  }}
                >
                  {f.text}
                </p>
              </div>
            </div>
            {i < features.length - 1 && (
              <div
                style={{
                  height: "1px",
                  background: "rgba(230,255,63,0.12)",
                  margin: "8px 0",
                }}
              />
            )}
          </div>
        ))}
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center font-bold text-xs uppercase tracking-wider mt-3 cursor-pointer"
          style={{
            height: "38px",
            borderRadius: "10px",
            background: "#E6FF3F",
            color: "#000000",
            border: "none",
            letterSpacing: "0.05em",
            width: "100%",
          }}
          data-testid="button-franchise-apply"
        >
          ZGŁOŚ DOSTĘP DO FRANCZYZY
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
          data-testid="franchise-modal-overlay"
        >
          <div
            className="relative w-full max-w-sm mx-4 rounded-xl p-5"
            style={{
              backgroundColor: "#111111",
              border: "1px solid rgba(230, 255, 63, 0.2)",
              boxShadow: "0 0 40px rgba(230, 255, 63, 0.08)",
            }}
            data-testid="franchise-modal"
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 cursor-pointer"
              style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.5)" }}
              data-testid="button-franchise-close"
            >
              <X className="w-5 h-5" />
            </button>

            <h3
              className="text-sm font-bold tracking-wide uppercase mb-4"
              style={{ color: "#E6FF3F" }}
              data-testid="heading-franchise"
            >
              Zgłoś chęć partnerstwa
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Imię i nazwisko"
                className="w-full rounded-md px-3 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(230, 255, 63, 0.15)",
                  color: "#ffffff",
                }}
                data-testid="input-franchise-name"
              />
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Email lub telefon"
                className="w-full rounded-md px-3 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(230, 255, 63, 0.15)",
                  color: "#ffffff",
                }}
                data-testid="input-franchise-contact"
              />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Miasto"
                className="w-full rounded-md px-3 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(230, 255, 63, 0.15)",
                  color: "#ffffff",
                }}
                data-testid="input-franchise-city"
              />
              <button
                type="submit"
                disabled={sending}
                className="flex items-center justify-center font-bold text-xs uppercase tracking-wider cursor-pointer"
                style={{
                  height: "40px",
                  borderRadius: "10px",
                  background: "#E6FF3F",
                  color: "#000000",
                  border: "none",
                  letterSpacing: "0.05em",
                  opacity: sending ? 0.6 : 1,
                }}
                data-testid="button-franchise-submit"
              >
                {sending ? "Wysyłanie..." : "WYŚLIJ ZGŁOSZENIE"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function HeroCard({
  icon,
  title,
  description,
  buttonText,
  testId,
  onButtonClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  testId: string;
  onButtonClick?: () => void;
}) {
  return (
    <div
      className="flex flex-col justify-between"
      style={{
        flex: "1 1 0",
        minHeight: 0,
        padding: "28px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(230,255,63,0.2)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(230,255,63,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
      data-testid={testId}
    >
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          {icon}
          <h3
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#ffffff",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {title}
          </h3>
        </div>
        <p
          style={{
            fontSize: "14px",
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.6,
            margin: 0,
            whiteSpace: "pre-line",
          }}
        >
          {description}
        </p>
      </div>
      <button
        className="mt-4 font-semibold text-sm cursor-pointer"
        style={{
          height: "44px",
          borderRadius: "10px",
          background: "#E6FF3F",
          color: "#000000",
          border: "none",
          width: "100%",
          transition: "filter 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = "brightness(1.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = "brightness(1)";
        }}
        onClick={onButtonClick}
        data-testid={`${testId}-button`}
      >
        {buttonText}
      </button>
    </div>
  );
}

function MobileHeroCard({
  icon,
  title,
  description,
  buttonText,
  testId,
  primary = false,
  onButtonClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  testId: string;
  primary?: boolean;
  onButtonClick?: () => void;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        padding: "20px",
        borderRadius: "14px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(230,255,63,0.15)",
      }}
      data-testid={testId}
    >
      <div className="flex items-center gap-2 mb-2.5">
        {icon}
        <h3
          style={{
            fontSize: "17px",
            fontWeight: 600,
            color: "#ffffff",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {title}
        </h3>
      </div>
      <p
        style={{
          fontSize: "13px",
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.7,
          margin: 0,
          whiteSpace: "pre-line",
        }}
      >
        {description}
      </p>
      <button
        className="mt-3.5 font-semibold text-sm cursor-pointer"
        style={{
          height: "40px",
          borderRadius: "10px",
          background: primary ? "#E6FF3F" : "transparent",
          color: primary ? "#000000" : "#E6FF3F",
          border: primary ? "none" : "1px solid #E6FF3F",
          width: "100%",
        }}
        onClick={onButtonClick}
        data-testid={`${testId}-button`}
      >
        {buttonText}
      </button>
    </div>
  );
}

function BenefitsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", zIndex: 100 }}
      onClick={onClose}
      data-testid="benefits-modal"
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "#111", border: "1px solid rgba(230,255,63,0.15)", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(230,255,63,0.1)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", margin: 0 }}>
            System poleceń i rabatów
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full cursor-pointer"
            style={{ width: "32px", height: "32px", background: "rgba(255,255,255,0.08)", border: "none" }}
            data-testid="benefits-modal-close"
          >
            <X style={{ color: "#E6FF3F", width: "16px", height: "16px" }} />
          </button>
        </div>
        <div className="p-5 overflow-auto" style={{ maxHeight: "calc(90vh - 72px)" }}>
          <div className="mb-5">
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#E6FF3F", marginBottom: "8px" }}>
              Jak to działa?
            </h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
              Poleć TaxiQ znajomemu. Gdy polecona osoba wykona 2 zakończone kursy (każdy za min. 50 zł), otrzymasz prawo do rabatu 20 zł.
            </p>
          </div>
          <div className="mb-5">
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#E6FF3F", marginBottom: "8px" }}>
              Kiedy mogę użyć rabatu?
            </h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
              Rabat możesz wykorzystać przy kursie za min. 50 zł, z kierowcą, z którym masz już min. 2 wspólne zakończone kursy. Rabat działa najwcześniej przy 3. kursie z danym kierowcą.
            </p>
          </div>
          <div className="mb-5">
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#E6FF3F", marginBottom: "8px" }}>
              Ważne zasady
            </h3>
            <ul style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.8, paddingLeft: "16px", margin: 0 }}>
              <li>1 polecenie = 1 rabat (brak kumulacji)</li>
              <li>Rabat ważny przez 60 dni od aktywacji</li>
              <li>Rabat zależy od budżetu lojalnościowego kierowcy</li>
              <li>Nie można polecić samego siebie</li>
              <li>Brak wypłaty gotówki za rabat</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#E6FF3F", marginBottom: "8px" }}>
              Co widzi kierowca?
            </h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
              Kierowca widzi liczbę wspólnych kursów z Tobą i informację, kiedy rabat może zostać użyty. System buduje prawdziwą relację między pasażerem a kierowcą.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "Wypełnij wszystkie pola", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Wiadomość wysłana!" });
      onClose();
    } catch {
      toast({ title: "Błąd wysyłania wiadomości", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)", zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="contact-modal-overlay"
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-md p-6"
        style={{
          backgroundColor: "#111111",
          border: "1px solid rgba(230, 255, 63, 0.15)",
          boxShadow: "0 0 40px rgba(230, 255, 63, 0.05)",
        }}
        data-testid="contact-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer"
          style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.5)" }}
          data-testid="button-contact-close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3
          className="text-lg font-semibold tracking-wide uppercase mb-6"
          style={{ color: "#E6FF3F" }}
          data-testid="heading-contact"
        >
          Kontakt
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs tracking-wide uppercase mb-1 block" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
              Imię
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md px-3 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(230, 255, 63, 0.15)",
                color: "#ffffff",
              }}
              data-testid="input-contact-name"
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(230, 255, 63, 0.4)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(230, 255, 63, 0.15)"; }}
            />
          </div>
          <div>
            <label className="text-xs tracking-wide uppercase mb-1 block" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md px-3 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(230, 255, 63, 0.15)",
                color: "#ffffff",
              }}
              data-testid="input-contact-email"
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(230, 255, 63, 0.4)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(230, 255, 63, 0.15)"; }}
            />
          </div>
          <div>
            <label className="text-xs tracking-wide uppercase mb-1 block" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
              Wiadomość
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-md px-3 py-2.5 text-sm outline-none transition-all resize-none"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(230, 255, 63, 0.15)",
                color: "#ffffff",
              }}
              data-testid="input-contact-message"
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(230, 255, 63, 0.4)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(230, 255, 63, 0.15)"; }}
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center justify-center gap-2 py-3 px-6 rounded-md font-semibold text-sm tracking-widest uppercase transition-all duration-300 cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: "#E6FF3F",
              color: "#000000",
              boxShadow: "0 0 20px rgba(230, 255, 63, 0.3), 0 0 60px rgba(183, 255, 0, 0.1)",
              border: "none",
            }}
            data-testid="button-contact-send"
          >
            <Send className="w-4 h-4" />
            {sending ? "Wysyłanie..." : "Wyślij"}
          </button>
        </form>
      </div>
    </div>
  );
}
