import { ViewHeader } from "../common/ViewHeader";
import React, { useState } from 'react';
import { calculateSpecialCases } from '@/lib/api-client';
import type { SpecialCasesInput, SpecialCasesResult } from '@/types/special_cases';

export const SpecialCasesView: React.FC = () => {
  const [caseType, setCaseType] = useState<SpecialCasesInput['case_type']>('PREMATURE_HOSPITALIZATION');
  const [income, setIncome] = useState(7000);
  const [birthWeek, setBirthWeek] = useState(26);
  const [weight, setWeight] = useState(950);
  const [result, setResult] = useState<SpecialCasesResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const res = await calculateSpecialCases({
        case_type: caseType,
        gross_monthly_income: income,
        child_birth_week: caseType === 'PREMATURE_HOSPITALIZATION' ? birthWeek : undefined,
        birth_weight_grams: caseType === 'PREMATURE_HOSPITALIZATION' ? weight : undefined,
        has_za_zyciem_certificate: caseType === 'ZA_ZYCIEM',
        is_stillbirth: caseType === 'STILLBIRTH_OR_DEATH',
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zus-view-container">
      <ViewHeader
        title="Kalkulator Przypadków Szczególnych i Pomoc ZUS"
        description="ZUS zapewnia szczególne mechanizmy ochronne i wydłużone urlopy w przypadku narodzin wcześniaka, hospitalizacji noworodka, orzeczenia „Za życiem” oraz w najtrudniejszych chwilach straty dziecka."
      />

      <div className="zus-view-grid">
        <div className="zus-card">
          <h2 className="zus-card-header-title">Konfiguracja przypadku</h2>
          <div className="zus-form">
            <div className="zus-form-group">
              <label className="zus-label">Rodzaj sytuacji szczególnej</label>
              <select
                className="zus-input"
                value={caseType}
                onChange={(e) => setCaseType(e.target.value as any)}
              >
                <option value="PREMATURE_HOSPITALIZATION">Wcześniak / Hospitalizacja dziecka po porodzie (Uzupełniający urlop)</option>
                <option value="ZA_ZYCIEM">Dziecko z zaświadczeniem „Za życiem” (ciężkie upośledzenie/choroba)</option>
                <option value="STILLBIRTH_OR_DEATH">Urodzenie martwego dziecka lub zgon dziecka po porodzie</option>
              </select>
            </div>

            <div className="zus-form-group">
              <label className="zus-label">Miesięczne wynagrodzenie brutto (PLN)</label>
              <input
                type="number"
                min="0"
                step="100"
                className="zus-input"
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
              />
            </div>

            {caseType === 'PREMATURE_HOSPITALIZATION' && (
              <div className="zus-form-row">
                <div className="zus-form-group">
                  <label className="zus-label">Tydzień ciąży w chwili porodu</label>
                  <input
                    type="number"
                    min="20"
                    max="42"
                    className="zus-input"
                    value={birthWeek}
                    onChange={(e) => setBirthWeek(Number(e.target.value))}
                  />
                </div>
                <div className="zus-form-group">
                  <label className="zus-label">Masa urodzeniowa (gramy)</label>
                  <input
                    type="number"
                    min="300"
                    max="6000"
                    className="zus-input"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              className="zus-btn-primary"
              onClick={handleCalculate}
              disabled={loading}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {loading ? 'Przeliczanie...' : 'Oblicz przysługujące uprawnienia >'}
            </button>
          </div>
        </div>

        <div className="zus-card">
          <h2 className="zus-card-header-title">Przysługujące świadczenia i dokumentacja</h2>
          {result ? (
            <div className="zus-results-box">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span className="zus-badge success">
                  {result.case_type === 'PREMATURE_HOSPITALIZATION'
                    ? `UZUPEŁNIAJĄCY URLOP: +${result.supplementary_maternity_weeks} TYG.`
                    : (result.case_type === 'ZA_ZYCIEM' ? `ŁĄCZNIE: ${result.total_leave_weeks} TYG.` : '8 TYGODNI URLOPU (100%)')}
                </span>
                {result.one_time_grant_pln > 0 && (
                  <span className="zus-badge info">
                    {result.case_type === 'ZA_ZYCIEM'
                      ? `Jednorazowe wsparcie „Za życiem”: ${result.one_time_grant_pln} zł`
                      : `Zasiłek pogrzebowy: ${result.one_time_grant_pln} zł`}
                  </span>
                )}
              </div>

              <div className="zus-notice-box" style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: '#00441c' }}>{result.description}</div>
              </div>

              <div className="zus-stat-grid" style={{ marginBottom: '16px' }}>
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Podstawa netto (po 13,71%)</div>
                  <div className="zus-stat-value">{result.calculation_base_net} zł</div>
                </div>
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Stawka dzienna zasiłku</div>
                  <div className="zus-stat-value">{result.daily_rate} zł</div>
                </div>
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Wymiar urlopu macierzyńskiego</div>
                  <div className="zus-stat-value">{result.total_maternity_weeks} tyg.</div>
                </div>
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Łączny zasiłek macierzyński</div>
                  <div className="zus-stat-value" style={{ color: '#007834' }}>{result.total_benefit_amount} zł</div>
                </div>
              </div>

              {result.required_documents && result.required_documents.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '8px' }}>Wymagane dokumenty:</h3>
                  <ul className="zus-list">
                    {result.required_documents.map((doc: string, idx: number) => (
                      <li key={idx}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="zus-empty-placeholder">
              <p>Wybierz kategorię szczególnej sytuacji i kliknij „Oblicz przysługujące uprawnienia”, aby sprawdzić procedurę ZUS.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sekcja organizacji pomocowych i charytatywnych */}
      <div className="zus-card" style={{ marginTop: '24px' }}>
        <h2 className="zus-card-header-title">Organizacje pozarządowe i fundacje wspierające rodziców</h2>
        <div className="zus-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div className="zus-stat-item">
            <strong style={{ color: '#007834' }}>Fundacja Koalicja dla Wcześniaka</strong>
            <p style={{ fontSize: '0.85rem', color: '#4A4A4A', marginTop: '4px' }}>
              Wsparcie psychologiczne, medyczne oraz prawne dla rodziców hospitalizowanych noworodków i wcześniaków.
            </p>
          </div>
          <div className="zus-stat-item">
            <strong style={{ color: '#007834' }}>Fundacja „Nagle Sami” oraz „Tęczowy Kocyk”</strong>
            <p style={{ fontSize: '0.85rem', color: '#4A4A4A', marginTop: '4px' }}>
              Bezpieczna przestrzeń i pomoc psychologiczna dla rodziców po stracie dziecka i martwym urodzeniu.
            </p>
          </div>
          <div className="zus-stat-item">
            <strong style={{ color: '#007834' }}>Rzecznik Praw Pacjenta & PIP</strong>
            <p style={{ fontSize: '0.85rem', color: '#4A4A4A', marginTop: '4px' }}>
              Bezpłatna infolinia i wsparcie prawne w sporach z pracodawcą lub szpitalem: <strong>800 190 590</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
