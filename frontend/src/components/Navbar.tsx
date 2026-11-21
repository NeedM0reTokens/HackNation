import React, { useState } from 'react';

interface NavbarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenPdfModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenPdfModal,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'start', label: 'Start' },
    { id: 'kalkulator', label: 'Kalkulator Zasiłkowy' },
    { id: 'chorobowy', label: 'Zasiłek chorobowy' },
    { id: 'macierzynski', label: 'Macierzyński i Urlopy' },
    { id: 'wnioski', label: 'Wnioski i Prawa' },
    { id: 'trudne-sytuacje', label: 'Trudne sytuacje' },
    { id: 'strefa-pdf', label: 'Strefa Testowa (PDF)' },
    { id: 'admin', label: 'Panel Admina' },
  ];

  const handleItemClick = (item: typeof navItems[0]) => {
    onSelectTab(item.id);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="zus-navbar" aria-label="Główne menu portalu">
      <div className="zus-container zus-navbar-inner">
        {/* Poziome menu desktopowe */}
        <ul className="zus-nav-list" role="menubar">
          {navItems.map((item) => (
            <li key={item.id} className="zus-nav-item" role="none">
              <button
                type="button"
                role="menuitem"
                className={`zus-nav-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Hamburger na mobile */}
        <button
          type="button"
          className="zus-hamburger-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-label="Otwórz menu nawigacji"
        >
          <svg className="zus-hamburger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {isMobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </>
            )}
          </svg>
          <span>{isMobileMenuOpen ? 'Zamknij' : 'Menu'}</span>
        </button>
      </div>

      {/* Menu mobilne rozwijane */}
      <div className={`zus-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="zus-mobile-nav-list">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`zus-mobile-nav-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};
