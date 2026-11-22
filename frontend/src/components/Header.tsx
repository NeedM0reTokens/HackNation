import React from "react";
import { useAppState } from "./app-state";

interface HeaderProps {
  isLoggedIn: boolean;
  onLoginToggle: () => void;
  onOpenPueModal: () => void;
  onToggleContrast?: () => void;
  onToggleFontSize?: () => void;
  isHighContrast?: boolean;
  isLargeFont?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isLoggedIn,
  onLoginToggle,
  onOpenPueModal,
}) => {
  const { user } = useAppState();

  const userName = user
    ? `${user.firstName} ${user.lastName}`
    : "Anna Kowalska";
  const roleLabel = user?.role === "admin" ? " [ADMIN]" : "";

  return (
    <header className="zus-topbar">
      <div className="zus-container zus-topbar-inner">
        {/* Lewa strona: Logo ZUS + Tytuł */}
        <a
          href="#start"
          className="zus-brand"
          title="ZUS - Strona główna przewodnika"
        >
          {/* Oficjalne logo ZUS */}
          <img src="/logo_zus.svg" alt="Logo ZUS" className="zus-logo-svg" />

          <div className="zus-brand-divider" aria-hidden="true"></div>

          <div className="zus-brand-titles">
            <span className="zus-brand-app-name">
              Zasiłkowy Przewodnik Przyszłego Rodzica
            </span>
            <span className="zus-brand-institution">
              Zakład Ubezpieczeń Społecznych
            </span>
          </div>
        </a>

        {/* Prawa strona: PUE + mObywatel */}
        <div className="zus-topbar-actions">
          {/* Przycisk symulacji połączenia z PUE/eZUS */}
          <button
            type="button"
            className="zus-btn-outline-pue"
            onClick={onOpenPueModal}
            title="Połącz konto z platformą eZUS / PUE ZUS"
          >
            <span>Połącz z PUE/eZUS</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          {/* Przycisk CTA: Zaloguj przez mObywatel / Panel użytkownika */}
          {isLoggedIn ? (
            <div className="zus-user-logged-group">
              <div
                className="zus-user-badge-top"
                title="Sesja mObywatel aktywna"
              >
                <span className="zus-user-badge-dot"></span>
                <span>
                  {userName}
                  {roleLabel} (mObywatel)
                </span>
              </div>
              <button
                type="button"
                className="zus-btn-outline-pue"
                style={{
                  padding: "0 10px",
                  height: "36px",
                  fontSize: "0.8rem",
                  color: "#DC2626",
                  borderColor: "#FCA5A5",
                  whiteSpace: "nowrap",
                }}
                onClick={onLoginToggle}
                title="Wyloguj z profilu"
              >
                Wyloguj
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="zus-btn-cta-mobywatel"
              onClick={onLoginToggle}
              title="Zaloguj się bezpiecznie profilem mObywatel (Wybierz tożsamość)"
            >
              <span className="mobywatel-icon-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
                  <path d="M12 18h.01" />
                  <path d="m9 10 2 2 4-4" />
                </svg>
              </span>
              <span className="mobywatel-btn-text">
                Zaloguj przez <strong>mObywatel</strong>
              </span>
              <svg className="mobywatel-btn-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
