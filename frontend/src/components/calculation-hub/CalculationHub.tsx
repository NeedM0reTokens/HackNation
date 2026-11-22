import { useState } from 'react';
import { Calculator, Thermometer, Users } from 'lucide-react';
import { ViewHeader } from '../common/ViewHeader';
import { GuideFlow } from '../guide/guide-flow';
import { PregnancyView } from '../views/PregnancyView';
import { PaternityView } from '../views/PaternityView';

export type HubTab = 'guide' | 'sickness' | 'leaves';

const hubTabs: { id: HubTab; label: string; mobileLabel: string; icon: typeof Calculator; desc: string }[] = [
  {
    id: 'guide',
    label: 'Przewodnik Rodzicielski',
    mobileLabel: 'Przewodnik',
    icon: Calculator,
    desc: 'Kwoty zasiłków, warianty 81,5% vs 100/70%, oś czasu, dokumenty',
  },
  {
    id: 'sickness',
    label: 'Zasiłek Chorobowy',
    mobileLabel: 'Chorobowy',
    icon: Thermometer,
    desc: 'L4 w ciąży, zasiłek do 270 dni, świadczenie rehabilitacyjne',
  },
  {
    id: 'leaves',
    label: 'Urlopy i Podział',
    mobileLabel: 'Urlopy',
    icon: Users,
    desc: 'Ojcowski, przejęcie macierzyńskiego, podział rodzicielskiego, adopcja',
  },
];

export function CalculationHub({ initialTab }: { initialTab?: HubTab }) {
  const [activeTab, setActiveTab] = useState<HubTab>(initialTab ?? 'guide');

  return (
    <div className="zus-view-container">
      <ViewHeader
        title="Centrum Kalkulacji"
        description="Oblicz kwoty zasiłków, sprawdź uprawnienia i zaplanuj urlopy rodzicielskie — wszystko w jednym miejscu."
      />

      {/* Hub tabs – segmented switcher */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          backgroundColor: '#F1F5F9',
          borderRadius: 'var(--zus-radius-lg, 10px)',
          padding: '4px',
          marginBottom: '24px',
          border: '1px solid var(--zus-border, #CBD5E1)',
          boxShadow: 'var(--zus-shadow)',
          overflowX: 'auto',
        }}
        role="tablist"
        aria-label="Moduły kalkulacyjne"
      >
        {hubTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              title={tab.desc}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#FFFFFF' : '#475569',
                backgroundColor: isActive ? '#007834' : 'transparent',
                boxShadow: isActive ? '0 2px 6px rgba(0, 120, 52, 0.25)' : 'none',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              <Icon
                className="size-4"
                style={{ flexShrink: 0 }}
              />
              {/* Desktop: full label, Mobile: short label */}
              <span className="zus-hub-label-desktop" style={{ display: 'inline' }}>
                {tab.label}
              </span>
              <span className="zus-hub-label-mobile" style={{ display: 'none' }}>
                {tab.mobileLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Aktywny moduł kalkulacyjny */}
      {activeTab === 'guide' && <GuideFlow />}
      {activeTab === 'sickness' && <PregnancyView />}
      {activeTab === 'leaves' && <PaternityView />}
    </div>
  );
}
