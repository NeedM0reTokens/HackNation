import React, { useState, useEffect } from 'react';
import {
  Home,
  Calculator,
  Menu,
  X,
  FileText,
  AlertCircle,
  ShieldCheck,
  FileDown,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useAppState } from './app-state';

interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenPdfModal?: () => void;
  onOpenPueModal?: () => void;
  onLoginToggle?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenPdfModal,
  onOpenPueModal,
  onLoginToggle,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const { user, setAssistantOpen } = useAppState();

  useEffect(() => {
    if (isMoreMenuOpen) {
      setAssistantOpen(false);
      document.body.classList.add('zus-mobile-menu-open');
    } else {
      document.body.classList.remove('zus-mobile-menu-open');
    }
    return () => {
      document.body.classList.remove('zus-mobile-menu-open');
    };
  }, [isMoreMenuOpen, setAssistantOpen]);

  const isMoreActive = ['wnioski', 'trudne-sytuacje', 'admin', 'strefa-pdf'].includes(activeTab);
  const isCalcActive = ['kalkulator', 'chorobowy', 'macierzynski'].includes(activeTab);

  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    setIsMoreMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* DRAWER / MENU "WIĘCEJ" NA MOBILE */}
      {isMoreMenuOpen && (
        <div
          className="zus-mobile-drawer-backdrop"
          onClick={() => setIsMoreMenuOpen(false)}
          aria-hidden="true"
        >
          <div
            className="zus-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Wszystkie opcje nawigacji"
          >
            <div className="zus-mobile-drawer-header">
              <div className="zus-mobile-drawer-handle" />
              <div className="zus-mobile-drawer-title-row">
                <span className="zus-mobile-drawer-title">Więcej zakładek i narzędzi</span>
                <button
                  type="button"
                  className="zus-mobile-drawer-close"
                  onClick={() => setIsMoreMenuOpen(false)}
                  aria-label="Zamknij menu"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="zus-mobile-drawer-body">
              {/* Główne podstrony */}
              <div className="zus-mobile-drawer-section">
                <span className="zus-mobile-drawer-section-title">DZIAŁY PRZEWODNIKA</span>
                <div className="zus-mobile-drawer-grid">
                  <button
                    type="button"
                    className={`zus-mobile-drawer-item ${activeTab === 'wnioski' ? 'active' : ''}`}
                    onClick={() => handleTabClick('wnioski')}
                  >
                    <div className="zus-mobile-drawer-icon-box">
                      <FileText size={18} />
                    </div>
                    <div className="zus-mobile-drawer-item-text">
                      <span className="zus-mobile-drawer-item-label">Wnioski i Prawa</span>
                      <span className="zus-mobile-drawer-item-desc">Dokumenty, ochrona zatrudnienia</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`zus-mobile-drawer-item ${activeTab === 'trudne-sytuacje' ? 'active' : ''}`}
                    onClick={() => handleTabClick('trudne-sytuacje')}
                  >
                    <div className="zus-mobile-drawer-icon-box">
                      <AlertCircle size={18} />
                    </div>
                    <div className="zus-mobile-drawer-item-text">
                      <span className="zus-mobile-drawer-item-label">Trudne sytuacje</span>
                      <span className="zus-mobile-drawer-item-desc">Utrata ciąży, wcześniaki, pomoc</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`zus-mobile-drawer-item ${activeTab === 'admin' ? 'active' : ''}`}
                    onClick={() => handleTabClick('admin')}
                  >
                    <div className="zus-mobile-drawer-icon-box">
                      <ShieldCheck size={18} />
                    </div>
                    <div className="zus-mobile-drawer-item-text">
                      <span className="zus-mobile-drawer-item-label">Panel Administratora</span>
                      <span className="zus-mobile-drawer-item-desc">Wskaźniki prawne, stawki ZUS</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Szybkie narzędzia */}
              <div className="zus-mobile-drawer-section">
                <span className="zus-mobile-drawer-section-title">INTEGRACJE I NARZĘDZIA</span>
                <div className="zus-mobile-drawer-actions">
                  {onOpenPueModal && (
                    <button
                      type="button"
                      className="zus-mobile-drawer-action-btn"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenPueModal();
                      }}
                    >
                      <ExternalLink size={16} />
                      <span>Połącz z PUE/eZUS</span>
                    </button>
                  )}

                  {onLoginToggle && (
                    <button
                      type="button"
                      className="zus-mobile-drawer-action-btn zus-btn-mobywatel-action"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onLoginToggle();
                      }}
                    >
                      <Smartphone size={16} />
                      <span>{user ? 'Wyloguj z mObywatel' : 'Zaloguj przez mObywatel'}</span>
                    </button>
                  )}

                  {onOpenPdfModal && (
                    <button
                      type="button"
                      className="zus-mobile-drawer-action-btn"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenPdfModal();
                      }}
                    >
                      <FileDown size={16} />
                      <span>Pobierz poradniki PDF</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PASEK NAWIGACJI PRZYKLEJONY DO DOŁU EKRANU (STICKY BOTTOM BAR) */}
      <nav className="zus-mobile-bottom-nav" aria-label="Nawigacja mobilna">
        <div className="zus-mobile-bottom-nav-inner">
          {/* 1. START */}
          <button
            type="button"
            className={`zus-mobile-nav-btn ${activeTab === 'start' ? 'active' : ''}`}
            onClick={() => handleTabClick('start')}
          >
            <div className="zus-mobile-nav-icon">
              <Home size={20} />
            </div>
            <span className="zus-mobile-nav-label">Start</span>
          </button>

          {/* 2. CENTRUM KALKULACJI */}
          <button
            type="button"
            className={`zus-mobile-nav-btn ${isCalcActive ? 'active' : ''}`}
            onClick={() => handleTabClick('kalkulator')}
          >
            <div className="zus-mobile-nav-icon">
              <Calculator size={20} />
            </div>
            <span className="zus-mobile-nav-label">Centrum</span>
          </button>

          {/* 3. WIĘCEJ (MENU) */}
          <button
            type="button"
            className={`zus-mobile-nav-btn ${isMoreActive || isMoreMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            aria-expanded={isMoreMenuOpen}
          >
            <div className="zus-mobile-nav-icon">
              <Menu size={20} />
              {isMoreActive && <span className="zus-mobile-nav-badge-dot" />}
            </div>
            <span className="zus-mobile-nav-label">Więcej</span>
          </button>
        </div>
      </nav>
    </>
  );
};
