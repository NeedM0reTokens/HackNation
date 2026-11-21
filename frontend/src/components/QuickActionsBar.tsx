import React from 'react';

interface QuickActionItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

interface QuickActionsBarProps {
  onActionClick: (actionId: string) => void;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({ onActionClick }) => {
  const actions: QuickActionItem[] = [
    {
      id: 'calculator',
      title: 'Zintegrowany Kalkulator',
      desc: 'Oblicz wysokość zasiłku macierzyńskiego, rodzicielskiego (81,5% vs 100/70%) i chorobowego.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2"></rect>
          <line x1="8" y1="6" x2="16" y2="6"></line>
          <line x1="16" y1="14" x2="16" y2="18"></line>
          <path d="M16 10h.01"></path>
          <path d="M12 10h.01"></path>
          <path d="M8 10h.01"></path>
          <path d="M12 14h.01"></path>
          <path d="M8 14h.01"></path>
          <path d="M12 18h.01"></path>
          <path d="M8 18h.01"></path>
        </svg>
      ),
    },
    {
      id: 'ezla',
      title: 'Ciąża i e-ZLA (Kwalifikacja)',
      desc: 'Sprawdź okres wyczekiwania (30/90 dni), zasady kodu B oraz limit 270 dni zasiłku chorobowego.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
      ),
    },
    {
      id: 'documents',
      title: 'Co, gdzie i kiedy złożyć?',
      desc: 'Harmonogram wniosków (termin 21 dni), formularze ZAM, Z-3, rola pracodawcy i ZUS.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <path d="m9 16 2 2 4-4"></path>
        </svg>
      ),
    },
    {
      id: 'protection',
      title: 'Ostrzeżenia i Ochrona Pracy',
      desc: 'Ochrona przed wypowiedzeniem (art. 177 KP), ryzyko pozorności umowy oraz zasady kontroli ZUS.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      ),
    },
    {
      id: 'support',
      title: 'Wsparcie w kryzysie (Fundacje)',
      desc: 'Procedury w szpitalu, zaświadczenia „Za życiem”, wcześniaki oraz zaufane fundacje pomocowe.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      ),
    },
  ];

  return (
    <section className="zus-quick-actions-bar" aria-label="Szybkie akcje i narzędzia przewodnika">
      <div className="zus-container">
        <div className="zus-quick-actions-header">
          <h2 className="zus-quick-actions-title">
            <span className="zus-quick-actions-title-bar" aria-hidden="true"></span>
            <span>Szybki dostęp do modułów przewodnika</span>
          </h2>
        </div>

        <div className="zus-quick-grid">
          {actions.map((act) => (
            <div
              key={act.id}
              role="button"
              tabIndex={0}
              className="zus-quick-card"
              onClick={() => onActionClick(act.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onActionClick(act.id);
                }
              }}
            >
              <div className="zus-quick-icon-wrapper" aria-hidden="true">
                {act.icon}
              </div>
              <h3 className="zus-quick-card-title">{act.title}</h3>
              <p className="zus-quick-card-desc">{act.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
