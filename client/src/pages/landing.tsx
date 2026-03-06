import { useState, useEffect } from "react";
import { Briefcase, Users, Car, Shield, Info, FileText, Lock, Mail, X, Send } from "lucide-react";
import logoNeon from "@assets/logo/logo-taxiq-neon.jpg";
import { useToast } from "@/hooks/use-toast";
import { HeaderBanner } from "@/components/header-banner";

type ViewState = "home" | "passenger" | "driver" | "business" | "admin" | "about";

const sidebarNav = [
  { icon: Briefcase, label: "Biznes", view: "business" as ViewState, testId: "side-business" },
  { icon: Users, label: "Pasażer", view: "passenger" as ViewState, testId: "side-passenger" },
  { icon: Car, label: "Kierowca", view: "driver" as ViewState, testId: "side-driver" },
  { icon: Shield, label: "Admin", view: "admin" as ViewState, testId: "side-admin" },
  { icon: Info, label: "O TaxiQ", view: "about" as ViewState, testId: "side-about" },
];

const sidebarLegal = [
  { icon: FileText, label: "Regulamin", href: "/regulamin", testId: "side-regulamin" },
  { icon: Lock, label: "Polityka prywatności", href: "/polityka-prywatnosci", testId: "side-privacy" },
];

export default function Landing() {
  const [activeView, setActiveView] = useState<ViewState>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: "#000000" }}
      data-testid="landing-page"
    >
      {/* ==================== TOP BAR ==================== */}
      <header
        className="shrink-0"
        style={{
          position: "relative",
          height: "120px",
          borderBottom: "1px solid rgba(230, 255, 63, 0.1)",
        }}
        data-testid="top-bar"
      >
        {/* LEFT — NEON LOGO (large, readable) — above banner */}
        <button
          onClick={() => setActiveView("home")}
          className="flex items-center cursor-pointer shrink-0"
          data-testid="button-logo-home"
          style={{
            background: "none",
            border: "none",
            position: "absolute",
            left: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          <img
            src={logoNeon}
            alt="TaxiQ"
            className="select-none pointer-events-none"
            draggable={false}
            style={{
              height: "100px",
              width: "auto",
              filter: "drop-shadow(0 0 15px rgba(230, 255, 63, 0.6)) drop-shadow(0 0 35px rgba(230, 255, 63, 0.3)) drop-shadow(0 0 60px rgba(230, 255, 63, 0.1))",
            }}
            data-testid="img-logo-q"
          />
        </button>

        {/* SCROLLING ADMIN MESSAGE BANNER — positioned at mid-logo height, behind logo */}
        <div style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "60%",
          transform: "translateY(-50%)",
          zIndex: 1,
        }}>
          <HeaderBanner />
        </div>
      </header>

      {/* ==================== MAIN LAYOUT ==================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ==================== LEFT SIDE PANEL ==================== */}
        <aside
          className="hidden md:flex flex-col shrink-0 transition-all duration-300 overflow-hidden"
          style={{
            width: sidebarOpen ? "220px" : "72px",
            borderRight: "1px solid rgba(230, 255, 63, 0.08)",
          }}
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => setSidebarOpen(false)}
          data-testid="side-panel"
        >
          <div className="flex flex-col py-4 h-full justify-between">
            <div className="flex flex-col gap-1 px-2">
              {sidebarNav.map((item) => {
                const isActive = activeView === item.view;
                const IconComp = item.icon;
                return (
                  <button
                    key={item.testId}
                    onClick={() => setActiveView(item.view)}
                    className="flex items-center gap-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer"
                    style={{
                      background: isActive ? "rgba(230, 255, 63, 0.1)" : "none",
                      border: "none",
                      color: isActive ? "#E6FF3F" : "rgba(255, 255, 255, 0.45)",
                      paddingLeft: "16px",
                      paddingRight: "12px",
                    }}
                    data-testid={item.testId}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "#E6FF3F";
                        e.currentTarget.style.backgroundColor = "rgba(230, 255, 63, 0.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.45)";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <IconComp className="w-7 h-7 shrink-0" />
                    <span
                      className="text-sm tracking-wide whitespace-nowrap transition-opacity duration-200"
                      style={{ opacity: sidebarOpen ? 1 : 0 }}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}

              {/* Divider */}
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
                    className="flex items-center gap-3 py-2.5 rounded-md transition-all duration-200"
                    style={{
                      color: "rgba(255, 255, 255, 0.35)",
                      paddingLeft: "16px",
                      paddingRight: "12px",
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
                      className="text-sm tracking-wide whitespace-nowrap transition-opacity duration-200"
                      style={{ opacity: sidebarOpen ? 1 : 0 }}
                    >
                      {item.label}
                    </span>
                  </a>
                );
              })}

              {/* CONTACT — last sidebar item */}
              <button
                onClick={() => setContactOpen(true)}
                className="flex items-center gap-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mt-1"
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.35)",
                  paddingLeft: "16px",
                  paddingRight: "12px",
                }}
                data-testid="side-contact"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.35)";
                }}
              >
                <Mail className="w-7 h-7 shrink-0" />
                <span
                  className="text-sm tracking-wide whitespace-nowrap transition-opacity duration-200"
                  style={{ opacity: sidebarOpen ? 1 : 0 }}
                >
                  Kontakt
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* ==================== MAIN INTERACTIVE AREA ==================== */}
        <main className="flex-1 flex items-center justify-center overflow-hidden relative" data-testid="main-area">
          <div
            key={activeView}
            className="flex flex-col items-center justify-center w-full h-full px-6"
            style={{ animation: "fadeIn 0.3s ease-out" }}
          >
            {activeView === "home" && <HomeView />}
            {activeView === "passenger" && <PassengerView />}
            {activeView === "driver" && <DriverView />}
            {activeView === "business" && <BusinessView />}
            {activeView === "admin" && <AdminView />}
            {activeView === "about" && <AboutView />}
          </div>
        </main>
      </div>

      {/* ==================== MOBILE BOTTOM NAV ==================== */}
      <nav
        className="flex md:hidden items-center justify-around shrink-0"
        style={{
          height: "56px",
          borderTop: "1px solid rgba(230, 255, 63, 0.1)",
        }}
        data-testid="nav-mobile"
      >
        {[
          { label: "Start", view: "home" as ViewState, icon: Info, testId: "mob-home" },
          { label: "Biznes", view: "business" as ViewState, icon: Briefcase, testId: "mob-business" },
          { label: "Pasażer", view: "passenger" as ViewState, icon: Users, testId: "mob-passenger" },
          { label: "Kierowca", view: "driver" as ViewState, icon: Car, testId: "mob-driver" },
          { label: "Admin", view: "admin" as ViewState, icon: Shield, testId: "mob-admin" },
        ].map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.testId}
              onClick={() => setActiveView(item.view)}
              className="flex flex-col items-center gap-0.5 py-1 px-2 cursor-pointer"
              style={{
                background: "none",
                border: "none",
                color: activeView === item.view ? "#E6FF3F" : "rgba(255, 255, 255, 0.4)",
              }}
              data-testid={item.testId}
            >
              <IconComp className="w-5 h-5" />
              <span className="text-[10px] tracking-wide uppercase">{item.label}</span>
            </button>
          );
        })}
        {/* Mobile contact button */}
        <button
          onClick={() => setContactOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2 cursor-pointer"
          style={{
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.4)",
          }}
          data-testid="mob-contact"
        >
          <Mail className="w-5 h-5" />
          <span className="text-[10px] tracking-wide uppercase">Kontakt</span>
        </button>
      </nav>

      {/* ==================== CONTACT MODAL ==================== */}
      {contactOpen && (
        <ContactModal onClose={() => setContactOpen(false)} />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function HomeView() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full" data-testid="view-home">
      {/* Empty presentation space — reserved for future promotional materials */}
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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
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

function PassengerView() {
  return (
    <div className="flex flex-col items-center gap-6 max-w-lg w-full" data-testid="view-passenger">
      <h2
        className="text-lg sm:text-xl font-semibold tracking-wide uppercase"
        style={{ color: "#E6FF3F" }}
        data-testid="heading-passenger"
      >
        Dla Pasażerów
      </h2>
      <p
        className="text-sm text-center leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.7)" }}
      >
        Zamów taxi szybko i wygodnie. Bez pośredników, bezpośrednio do kierowcy.
      </p>
      <a
        href="/passenger"
        className="inline-block py-3 px-10 rounded-md font-semibold text-sm tracking-widest uppercase transition-all duration-300 mt-4"
        style={{
          backgroundColor: "#E6FF3F",
          color: "#000000",
          boxShadow: "0 0 20px rgba(230, 255, 63, 0.3), 0 0 60px rgba(183, 255, 0, 0.1)",
        }}
        data-testid="button-passenger-app"
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 0 30px rgba(230, 255, 63, 0.5), 0 0 80px rgba(183, 255, 0, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 0 20px rgba(230, 255, 63, 0.3), 0 0 60px rgba(183, 255, 0, 0.1)";
        }}
      >
        Otwórz aplikację
      </a>
    </div>
  );
}

function DriverView() {
  return (
    <div className="flex flex-col items-center gap-6 max-w-lg w-full" data-testid="view-driver">
      <h2
        className="text-lg sm:text-xl font-semibold tracking-wide uppercase"
        style={{ color: "#E6FF3F" }}
        data-testid="heading-driver"
      >
        Dla Kierowców
      </h2>
      <p
        className="text-sm text-center leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.7)" }}
      >
        Dołącz do TaxiQ i pracuj na swoich zasadach. Bez korporacji, bez prowizji.
      </p>
      <a
        href="/driver"
        className="inline-block py-3 px-10 rounded-md font-semibold text-sm tracking-widest uppercase transition-all duration-300 border mt-4"
        style={{
          backgroundColor: "transparent",
          color: "#E6FF3F",
          borderColor: "rgba(230, 255, 63, 0.4)",
          boxShadow: "0 0 15px rgba(230, 255, 63, 0.1), inset 0 0 15px rgba(230, 255, 63, 0.05)",
        }}
        data-testid="button-driver-app"
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 0 25px rgba(230, 255, 63, 0.3), inset 0 0 25px rgba(230, 255, 63, 0.1)";
          e.currentTarget.style.borderColor = "rgba(230, 255, 63, 0.7)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 0 15px rgba(230, 255, 63, 0.1), inset 0 0 15px rgba(230, 255, 63, 0.05)";
          e.currentTarget.style.borderColor = "rgba(230, 255, 63, 0.4)";
        }}
      >
        Otwórz aplikację
      </a>
    </div>
  );
}

function BusinessView() {
  return (
    <div className="flex flex-col items-center gap-6 max-w-lg w-full" data-testid="view-business">
      <h2
        className="text-lg sm:text-xl font-semibold tracking-wide uppercase"
        style={{ color: "#E6FF3F" }}
        data-testid="heading-business"
      >
        Dla Biznesu
      </h2>
      <p
        className="text-sm text-center leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.7)" }}
      >
        Zamawiaj taxi dla gości hotelowych, pracowników i klientów. Zarządzaj przejazdami firmowymi w jednym miejscu.
      </p>
      <a
        href="/business"
        className="inline-block py-3 px-10 rounded-md font-semibold text-sm tracking-widest uppercase transition-all duration-300 mt-4"
        style={{
          backgroundColor: "#E6FF3F",
          color: "#000000",
          boxShadow: "0 0 20px rgba(230, 255, 63, 0.3), 0 0 60px rgba(183, 255, 0, 0.1)",
        }}
        data-testid="button-business-app"
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 0 30px rgba(230, 255, 63, 0.5), 0 0 80px rgba(183, 255, 0, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 0 20px rgba(230, 255, 63, 0.3), 0 0 60px rgba(183, 255, 0, 0.1)";
        }}
      >
        Panel biznesowy
      </a>
    </div>
  );
}

function AdminView() {
  return (
    <div className="flex flex-col items-center gap-6 max-w-lg w-full" data-testid="view-admin">
      <h2
        className="text-lg sm:text-xl font-semibold tracking-wide uppercase"
        style={{ color: "#E6FF3F" }}
        data-testid="heading-admin"
      >
        Panel Administracyjny
      </h2>
      <p
        className="text-sm text-center leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.7)" }}
      >
        Zarządzaj platformą TaxiQ. Weryfikacja kierowców, subskrypcje, płatności i statystyki.
      </p>
      <a
        href="/admin"
        className="inline-block py-3 px-10 rounded-md font-semibold text-sm tracking-widest uppercase transition-all duration-300 border mt-4"
        style={{
          backgroundColor: "transparent",
          color: "#E6FF3F",
          borderColor: "rgba(230, 255, 63, 0.4)",
          boxShadow: "0 0 15px rgba(230, 255, 63, 0.1), inset 0 0 15px rgba(230, 255, 63, 0.05)",
        }}
        data-testid="button-admin-app"
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 0 25px rgba(230, 255, 63, 0.3), inset 0 0 25px rgba(230, 255, 63, 0.1)";
          e.currentTarget.style.borderColor = "rgba(230, 255, 63, 0.7)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 0 15px rgba(230, 255, 63, 0.1), inset 0 0 15px rgba(230, 255, 63, 0.05)";
          e.currentTarget.style.borderColor = "rgba(230, 255, 63, 0.4)";
        }}
      >
        Panel admina
      </a>
    </div>
  );
}

function AboutView() {
  return (
    <div className="flex flex-col items-center gap-6 max-w-xl w-full" data-testid="view-about">
      <h2
        className="text-lg sm:text-xl font-semibold tracking-wide uppercase"
        style={{ color: "#E6FF3F" }}
        data-testid="heading-about"
      >
        O TaxiQ
      </h2>
      <p
        className="text-sm text-center leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.7)" }}
      >
        TaxiQ to niezależna platforma taxi. Brak korporacji, bezpośrednie połączenie kierowcy i pasażera.
      </p>
    </div>
  );
}
