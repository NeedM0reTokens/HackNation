import React, { useState, useEffect } from 'react';
import { getAdminConfig, updateAdminConfig } from '@/lib/api-client';

export const AdminView: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getAdminConfig();
      setConfig(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAdminConfig(config);
      setMessage('Zaktualizowano parametry ustawowe w locie (BE-03). Zmiany obowiązują natychmiast.');
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleRateChange = (field: string, val: number) => {
    setConfig((prev: any) => ({
      ...prev,
      benefit_rates: {
        ...prev.benefit_rates,
        [field]: val,
      },
    }));
  };

  const handleDurationChange = (field: string, val: number) => {
    setConfig((prev: any) => ({
      ...prev,
      leave_durations: {
        ...prev.leave_durations,
        [field]: val,
      },
    }));
  };

  if (loading) {
    return (
      <div className="zus-view-container">
        <div className="zus-empty-placeholder">
          <p>Ładowanie konfiguracji parametrów prawnych ZUS...</p>
        </div>
      </div>
    );
  }

  return (
    
    <div className="zus-view-container">
      <div className="zus-view-header">
      
        <div
            style={{
              backgroundColor: '#FFFBEB',
              border: '2px solid #F59E0B',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.1)',
            }}
          >
            <div
            >
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    backgroundColor: '#B45309',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  Disclaimer HackNation 2026
                </span>
                <strong style={{ fontSize: '0.98rem', color: '#92400E', fontWeight: 800 }}>
                  ŚRODOWISKO DEMONSTRACYJNE WYŁĄCZNIE NA POTRZEBY KONKURSU HACKNATION
                </strong>
              </div>
            </div>
          </div>
          <br />
        <h1 className="zus-view-title">Zarządzanie Parametrami Ustawowymi w Locie</h1>
        <p className="zus-view-desc">
          Zgodnie z wymaganiami wyzwania ZUS, aplikacja umożliwia administratorom modyfikację stóp procentowych świadczeń i wymiarów urlopów bez restartu serwera (np. w przypadku zmian w Kodeksie pracy).
        </p>
      </div>

      {message && (
        <div className="zus-notice-box" style={{ marginBottom: '20px' }}>
          <strong>✓ {message}</strong>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="zus-view-grid">
          {/* Stopy procentowe */}
          <div className="zus-card">
            <h2 className="zus-card-header-title">1. Ustawowe Stopy Procentowe Świadczeń (%)</h2>
            <div className="zus-form">
              <div className="zus-form-group">
                <label className="zus-label">Wariant uśredniony macierzyński + rodzicielski w 21 dni (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="zus-input"
                  value={config?.benefit_rates?.unified_benefit_rate ?? 81.5}
                  onChange={(e) => handleRateChange('unified_benefit_rate', Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Podstawowy urlop macierzyński (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="zus-input"
                  value={config?.benefit_rates?.full_maternity_rate ?? 100}
                  onChange={(e) => handleRateChange('full_maternity_rate', Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Urlop rodzicielski standardowy (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="zus-input"
                  value={config?.benefit_rates?.standard_parental_rate ?? 70}
                  onChange={(e) => handleRateChange('standard_parental_rate', Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Zasiłek chorobowy w ciąży (Kod B, %)</label>
                <input
                  type="number"
                  step="0.1"
                  className="zus-input"
                  value={config?.benefit_rates?.pregnancy_sick_leave_rate ?? 100}
                  onChange={(e) => handleRateChange('pregnancy_sick_leave_rate', Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Urlop ojcowski (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="zus-input"
                  value={config?.benefit_rates?.paternity_benefit_rate ?? 100}
                  onChange={(e) => handleRateChange('paternity_benefit_rate', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Wymiary urlopów */}
          <div className="zus-card">
            <h2 className="zus-card-header-title">2. Ustawowe Wymiary Urlopów (Tygodnie / Dni)</h2>
            <div className="zus-form">
              <div className="zus-form-group">
                <label className="zus-label">Macierzyński: 1 dziecko (tygodnie)</label>
                <input
                  type="number"
                  className="zus-input"
                  value={config?.leave_durations?.maternity_weeks_single_child ?? 20}
                  onChange={(e) => handleDurationChange('maternity_weeks_single_child', Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Macierzyński: bliźnięta (tygodnie)</label>
                <input
                  type="number"
                  className="zus-input"
                  value={config?.leave_durations?.maternity_weeks_twins ?? 31}
                  onChange={(e) => handleDurationChange('maternity_weeks_twins', Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Urlop rodzicielski (pula łączna, tygodnie)</label>
                <input
                  type="number"
                  className="zus-input"
                  value={config?.leave_durations?.parental_weeks_standard ?? 41}
                  onChange={(e) => handleDurationChange('parental_weeks_standard', Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Nieprzenoszalna część dla drugiego rodzica (tygodnie)</label>
                <input
                  type="number"
                  className="zus-input"
                  value={config?.leave_durations?.non_transferable_parental_weeks ?? 9}
                  onChange={(e) => handleDurationChange('non_transferable_parental_weeks', Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Urlop ojcowski (dni kalendarzowe)</label>
                <input
                  type="number"
                  className="zus-input"
                  value={config?.leave_durations?.paternity_leave_days ?? 14}
                  onChange={(e) => handleDurationChange('paternity_leave_days', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="zus-btn-secondary" onClick={loadConfig}>
            Przywróć domyślne
          </button>
          <button type="submit" className="zus-btn-primary" disabled={saving}>
            {saving ? 'Zapisywanie w API...' : 'Zapisz zmiany w bazie ZUS >'}
          </button>
        </div>
      </form>
    </div>
  );
};
