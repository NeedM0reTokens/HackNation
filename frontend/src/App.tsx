import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Navbar } from "./components/Navbar";
import { HeroSection, RoleType } from "./components/HeroSection";
import { QuickActionsBar } from "./components/QuickActionsBar";
import { PueModal } from "./components/PueModal";
import { PdfModal } from "./components/PdfModal";
import { MobywatelMockModal } from "./components/MobywatelMockModal";
import { TooltipProvider } from "./components/ui/tooltip";
import { AppStateProvider, useAppState } from "./components/app-state";
import { AssistantFab } from "./components/assistant/assistant-fab";
import { AssistantPanel } from "./components/assistant/assistant-panel";
import { GuideFlow } from "./components/guide/guide-flow";
import { BenefitsCatalogSection } from "./components/benefits/BenefitsCatalogSection";

import { PregnancyView } from "./components/views/PregnancyView";
import { PaternityView } from "./components/views/PaternityView";
import { DocumentsView } from "./components/views/DocumentsView";
import { SpecialCasesView } from "./components/views/SpecialCasesView";
import { PdfZoneView } from "./components/views/PdfZoneView";
import { AdminView } from "./components/views/AdminView";

import { checkHealth, type MobywatelIdentity } from "./lib/api-client";
import "./App.css";

const AppContent: React.FC = () => {
  const {
    user,
    login,
    logout,
    isMockSelectorOpen,
    openMockSelector,
    closeMockSelector,
    isLoggingIn,
  } = useAppState();

  const [activeTab, setActiveTab] = useState<string>("start");
  const [isPueModalOpen, setIsPueModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string>(
    "Sprawdzanie połączenia...",
  );
  const [isApiOnline, setIsApiOnline] = useState<boolean>(false);

  // Weryfikacja połączenia z backendem Python FastAPI
  useEffect(() => {
    checkHealth().then((res) => {
      if (res.status === "ok") {
        setIsApiOnline(true);
        setApiStatus(`Połączono z API ZUS (${res.version ?? "1.0.0"})`);
      } else {
        setIsApiOnline(false);
        setApiStatus("API w trybie symulacji lokalnej");
      }
    });
  }, []);

  // Obsługa trybów dostępności (WCAG)
  useEffect(() => {
    document.body.classList.toggle("a11y-high-contrast", isHighContrast);
  }, [isHighContrast]);

  useEffect(() => {
    document.body.classList.toggle("a11y-large-font", isLargeFont);
  }, [isLargeFont]);

  const showNotice = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => {
      setBannerNotice(null);
    }, 6000);
  };

  const handleLoginToggle = () => {
    if (!user) {
      openMockSelector();
    } else {
      logout();
      showNotice("Wylogowano z profilu ubezpieczeniowego.");
    }
  };

  const handleSelectIdentity = async (
    pesel: string,
    identity?: MobywatelIdentity,
  ) => {
    try {
      await login(pesel);
      const name = identity
        ? `${identity.first_name} ${identity.last_name}`
        : `Obywatel (PESEL: ${pesel})`;
      const roleInfo = identity ? ` • ${identity.label}` : "";
      showNotice(
        `Zalogowano pomyślnie przez mObywatel! Profil: ${name}${roleInfo}.`,
      );
    } catch (err: any) {
      showNotice(
        `Błąd logowania mObywatel: ${err.message || "Nie udało się połączyć z backendem."}`,
      );
    }
  };

  const handlePueSuccess = () => {
    openMockSelector();
    showNotice(
      "Połączono z platformą PUE/eZUS! Wybierz tożsamość obywatela do synchronizacji danych.",
    );
  };

  const handleLoadPdfCase = (caseId: string) => {
    setActiveTab("strefa-pdf");
    showNotice(
      `Otwarto sprawę testową: ${caseId.toUpperCase()} w Strefie PDF.`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRoleAction = (role: RoleType) => {
    if (role === "father") {
      setActiveTab("macierzynski");
    } else if (role === "difficult") {
      setActiveTab("trudne-sytuacje");
    } else {
      setActiveTab("kalkulator");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case "calculator":
        setActiveTab("kalkulator");
        break;
      case "ezla":
        setActiveTab("chorobowy");
        break;
      case "documents":
        setActiveTab("wnioski");
        break;
      case "protection":
        setActiveTab("wnioski");
        break;
      case "support":
        setActiveTab("trudne-sytuacje");
        break;
      default:
        setActiveTab("start");
        break;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="zus-app-wrapper">
      {/* Pasek statusu API oraz powiadomień */}
      <div
        style={{
          backgroundColor: "#00441c",
          color: "#FFFFFF",
          padding: "6px 20px",
          fontSize: "0.8rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isApiOnline ? "#00FF66" : "#FFAA00",
              display: "inline-block",
            }}
          ></span>
          <span>
            Status API Backend: <strong>{apiStatus}</strong>
          </span>
          <span style={{ color: "#99d2af" }}>• Port: 8000</span>
        </div>
        <div style={{ color: "#E2E8F0", fontSize: "0.78rem" }}>
          HackNation 2026 | Zasiłkowy Przewodnik Przyszłego Rodzica
        </div>
      </div>

      {bannerNotice && (
        <div
          style={{
            backgroundColor: "#007834",
            color: "#FFFFFF",
            padding: "10px 20px",
            textAlign: "center",
            fontSize: "0.92rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            position: "sticky",
            top: 0,
            zIndex: 60,
          }}
        >
          <span>{bannerNotice}</span>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            style={{
              color: "#FFFFFF",
              fontWeight: 800,
              fontSize: "1.2rem",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. TOP BAR */}
      <Header
        isLoggedIn={Boolean(user)}
        onLoginToggle={handleLoginToggle}
        onOpenPueModal={() => setIsPueModalOpen(true)}
        onToggleContrast={() => setIsHighContrast(!isHighContrast)}
        onToggleFontSize={() => setIsLargeFont(!isLargeFont)}
        isHighContrast={isHighContrast}
        isLargeFont={isLargeFont}
      />

      {/* 2. GŁÓWNA NAWIGACJA */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          setActiveTab(tabId);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenPdfModal={() => setIsPdfModalOpen(true)}
      />

      {/* 3. GŁÓWNA ZAWARTOŚĆ - ROUTING WIDOKÓW */}
      <main>
        {activeTab === "start" && (
          <>
            <BenefitsCatalogSection
              isLoggedIn={Boolean(user)}
              onLoginToggle={handleLoginToggle}
              onOpenPdfModal={() => setIsPdfModalOpen(true)}
            />
          </>
        )}

        {activeTab === "kalkulator" && (
          <div className="zus-view-container">
            <div className="zus-view-header">
              <span className="zus-official-pill">Krok po kroku</span>
              <h1 className="zus-view-title">
                Zintegrowany Kalkulator Zasiłkowy
              </h1>
              <p className="zus-view-desc">
                Wprowadź swoje dane, wybierz rodzaj umowy i sprawdź kwoty
                zasiłku macierzyńskiego, rodzicielskiego oraz terminy składania
                wniosków.
              </p>
            </div>
            <GuideFlow />
          </div>
        )}

        {activeTab === "chorobowy" && <PregnancyView />}
        {activeTab === "macierzynski" && <PaternityView />}
        {activeTab === "wnioski" && <DocumentsView />}
        {activeTab === "trudne-sytuacje" && <SpecialCasesView />}
        {activeTab === "strefa-pdf" && (
          <PdfZoneView
            onNavigateToTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
        {activeTab === "admin" && <AdminView />}
      </main>

      {/* STOPKA OFICJALNA */}
      <footer className="zus-footer">
        <div className="zus-container zus-footer-inner">
          <div className="zus-footer-text">
            © 2026 Zakład Ubezpieczeń Społecznych. Wszystkie prawa zastrzeżone.
            Projekt przygotowany na HackNation 2026.
          </div>
          <ul className="zus-footer-links">
            <li>
              <a
                href="https://www.zus.pl"
                target="_blank"
                rel="noreferrer"
                className="zus-footer-link"
              >
                Portal ZUS.pl
              </a>
            </li>
            <li>
              <a
                href="https://www.gov.pl/web/rodzina/urlop-rodzicielski"
                target="_blank"
                rel="noreferrer"
                className="zus-footer-link"
              >
                Ministerstwo Rodziny
              </a>
            </li>
            <li>
              <a
                href="https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo"
                target="_blank"
                rel="noreferrer"
                className="zus-footer-link"
              >
                PIP – Porady prawne
              </a>
            </li>
            <li>
              <span className="zus-footer-link" style={{ color: "#007834" }}>
                Infolinia ZUS: 22 560 16 00
              </span>
            </li>
          </ul>
        </div>
      </footer>

      {/* MODALE */}
      <MobywatelMockModal
        isOpen={isMockSelectorOpen}
        onClose={closeMockSelector}
        onSelectIdentity={handleSelectIdentity}
        isLoggingIn={isLoggingIn}
      />

      <PueModal
        isOpen={isPueModalOpen}
        onClose={() => setIsPueModalOpen(false)}
        onConfirmSuccess={handlePueSuccess}
      />

      <PdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onLoadTestCase={handleLoadPdfCase}
      />

      {/* ASYSTENT AI */}
      <AssistantFab />
      <AssistantPanel />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppStateProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </AppStateProvider>
  );
};

export default App;
