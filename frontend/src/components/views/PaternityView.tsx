import React, { useState } from 'react';
import { calculatePaternityLeave, calculateParentalSharing } from '@/lib/api-client';

export const PaternityView: React.FC = () => {
  const [income, setIncome] = useState(7500);
  const [childMonths, setChildMonths] = useState(3);
  const [motherWeeks, setMotherWeeks] = useState(32);
  const [fatherWeeks, setFatherWeeks] = useState(9);
  const [paternityResult, setPaternityResult] = useState<any>(null);
  const [sharingResult, setSharingResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCalcPaternity = async () => {
    setLoading(true);
    try {
      const pRes = await calculatePaternityLeave({
        gross_monthly_income: income,
        child_age_months: childMonths,
        is_insured: true,
      });
      setPaternityResult(pRes);

      const sRes = await calculateParentalSharing({
        mother_weeks: motherWeeks,
        father_weeks: fatherWeeks,
        total_pool: 41,
      });
      setSharingResult(sRes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zus-view-container">
      <div className="zus-view-header">
        <div className="zus-official-pill">Prawa Ojca & Dyrektywa Work-Life Balance</div>
        <h1 className="zus-view-title">Kalkulator Urlopu Ojcowskiego i Dzielenia Opieki</h1>
        <p className="zus-view-desc">
          Ojciec dziecka posiada wyłączne i samodzielne prawa do świadczeń: <strong>14 dni urlopu ojcowskiego</strong> (100% podstawy) oraz <strong>9 tygodni nieprzenoszalnego urlopu rodzicielskiego</strong> (70% podstawy), którego matka nie może przejąć.
        </p>
      </div>

      <div className="zus-view-grid">
        <div className="zus-card">
          <h2 className="zus-card-header-title">Dane ojca dziecka</h2>
          <div className="zus-form">
            <div className="zus-form-group">
              <label className="zus-label">Miesięczne zarobki brutto ojca (PLN)</label>
              <input
                type="number"
                min="0"
                step="100"
                className="zus-input"
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
              />
            </div>

            <div className="zus-form-group">
              <label className="zus-label">Wiek dziecka w miesiącach (limit: do 12 m.ż.)</label>
              <input
                type="number"
                min="0"
                max="24"
                className="zus-input"
                value={childMonths}
                onChange={(e) => setChildMonths(Number(e.target.value))}
              />
            </div>

            <div className="zus-form-row">
              <div className="zus-form-group">
                <label className="zus-label">Tygodnie rodzicielskiego – Matka</label>
                <input
                  type="number"
                  min="0"
                  max="41"
                  className="zus-input"
                  value={motherWeeks}
                  onChange={(e) => setMotherWeeks(Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Tygodnie rodzicielskiego – Ojciec</label>
                <input
                  type="number"
                  min="0"
                  max="41"
                  className="zus-input"
                  value={fatherWeeks}
                  onChange={(e) => setFatherWeeks(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              type="button"
              className="zus-btn-primary"
              onClick={handleCalcPaternity}
              disabled={loading}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {loading ? 'Przeliczanie...' : 'Oblicz urlop ojcowski i podział >'}
            </button>
          </div>
        </div>

        <div className="zus-card">
          <h2 className="zus-card-header-title">Uprawnienia i wyliczone kwoty</h2>
          {paternityResult ? (
            <div className="zus-results-box">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <span className="zus-badge success">14 DNI URLOPU OJCOWSKIEGO (100%)</span>
                <span className="zus-badge info">9 TYGODNI DLA OJCA (70%)</span>
              </div>

              <div className="zus-stat-grid">
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Stawka dzienna brutto</div>
                  <div className="zus-stat-value">{paternityResult.daily_gross} zł</div>
                </div>
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Urlop ojcowski brutto (14 dni)</div>
                  <div className="zus-stat-value" style={{ color: '#007834' }}>{paternityResult.total_gross} zł</div>
                </div>
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Urlop ojcowski netto</div>
                  <div className="zus-stat-value" style={{ color: '#007834' }}>{paternityResult.total_net} zł</div>
                </div>
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Podział rodzicielskiego</div>
                  <div className="zus-stat-value">{motherWeeks} tyg. M / {fatherWeeks} tyg. O</div>
                </div>
              </div>

              <div className="zus-notice-box" style={{ marginTop: '16px' }}>
                <div style={{ fontWeight: 700, color: '#00441c' }}>
                  {childMonths <= 12 ? 'Ojciec spełnia warunek wieku dziecka (< 12 m.ż.)' : 'Uwaga: minął 12. miesiąc życia dziecka!'}
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  Urlop ojcowski można podzielić na maksymalnie 2 części (min. 7 dni każda).
                </div>
                {sharingResult && (
                  <div style={{ fontSize: '0.82rem', color: '#1A1A1A', marginTop: '4px' }}>
                    {sharingResult.message}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="zus-empty-placeholder">
              <p>Wprowadź dochód ojca i kliknij przycisk, aby wyliczyć wysokość zasiłku za urlop ojcowski i sprawdzić podział rodzicielskiego.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
