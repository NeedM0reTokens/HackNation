import React from 'react';

interface HeaderProps {
  isLoggedIn: boolean;
  onLoginToggle: () => void;
  onOpenPueModal: () => void;
  onToggleContrast: () => void;
  onToggleFontSize: () => void;
  isHighContrast: boolean;
  isLargeFont: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isLoggedIn,
  onLoginToggle,
  onOpenPueModal,
  onToggleContrast,
  onToggleFontSize,
  isHighContrast,
  isLargeFont,
}) => {
  return (
    <header className="zus-topbar">
      <div className="zus-container zus-topbar-inner">
        {/* Lewa strona: Logo ZUS + Tytuł */}
        <a href="#start" className="zus-brand" title="ZUS - Strona główna przewodnika">
          {/* Oficjalne logo ZUS */}
          <img src="/logo_zus.svg" alt="Logo ZUS" className="zus-logo-svg" />

          <div className="zus-brand-divider" aria-hidden="true"></div>

          <div className="zus-brand-titles">
            <span className="zus-brand-app-name">Zasiłkowy Przewodnik Przyszłego Rodzica</span>
            <span className="zus-brand-institution">Zakład Ubezpieczeń Społecznych</span>
          </div>
        </a>

        {/* Prawa strona: Dostępność + PUE + mObywatel */}
        <div className="zus-topbar-actions">
          {/* Ikony dostępności */}
          <div className="zus-a11y-group" aria-label="Ułatwienia dostępu">
            <button
              type="button"
              className="zus-a11y-btn"
              onClick={onToggleFontSize}
              title={isLargeFont ? "Zmień rozmiar tekstu na standardowy" : "Powiększ tekst (A+)"}
              aria-label="Powiększenie tekstu"
            >
              {isLargeFont ? "A" : "A+"}
            </button>
            <button
              type="button"
              className="zus-a11y-btn"
              onClick={onToggleContrast}
              title={isHighContrast ? "Wyłącz wysoki kontrast" : "Włącz wysoki kontrast"}
              aria-label="Wysoki kontrast"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8v16z"/>
              </svg>
            </button>
            <button
              type="button"
              className="zus-a11y-btn"
              title="Lektor / Odsłuchaj stronę"
              aria-label="Odsłuchaj stronę"
              onClick={() => alert('Uruchomiono moduł lektora mowy ZUS (mObywatel Text-to-Speech).')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>
          </div>

          {/* Przycisk symulacji połączenia z PUE/eZUS */}
          <button
            type="button"
            className="zus-btn-outline-pue"
            onClick={onOpenPueModal}
            title="Połącz konto z platformą eZUS / PUE ZUS"
          >
            <span>Połącz z PUE/eZUS</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          {/* Przycisk CTA: Zaloguj przez mObywatel */}
          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="zus-user-badge-top" title="Sesja mObywatel aktywna">
                <span className="zus-user-badge-dot"></span>
                <span>Anna Kowalska (mObywatel)</span>
              </div>
              <button
                type="button"
                className="zus-btn-outline-pue"
                style={{ padding: '0 10px', height: '36px', fontSize: '0.8rem', color: '#DC2626', borderColor: '#FCA5A5' }}
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
              title="Zaloguj się bezpiecznie profilem mObywatel"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
              </svg>
              <span>Zaloguj przez mObywatel &gt;</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
