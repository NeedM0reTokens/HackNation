import { ViewHeader } from "../common/ViewHeader";
import React, { useState } from 'react';
import { calculatePregnancyBenefit, PregnancyBenefitPayload } from '@/lib/api-client';

export const PregnancyView: React.FC = () => {
  const [employmentType, setEmploymentType] = useState<PregnancyBenefitPayload['employment_type']>('EMPLOYMENT_CONTRACT');
  const [grossSalary, setGrossSalary] = useState(7000);
  const [insuranceDays, setInsuranceDays] = useState(365);
  const [sickDays, setSickDays] = useState(30);
  const [pregnancyWeek, setPregnancyWeek] = useState(16);
  const [payerSize, setPayerSize] = useState<'ABOVE_20' | 'UP_TO_20'>('ABOVE_20');
  const [companyStatus, setCompanyStatus] = useState<'NORMAL' | 'BANKRUPTCY_OR_LIQUIDATION' | 'UNLAWFUL_TERMINATION'>('NORMAL');
  const [isRehab, setIsRehab] = useState(false);
  const [zusDebt, setZusDebt] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await calculatePregnancyBenefit({
        employment_type: employmentType,
        gross_monthly_income: grossSalary,
        insurance_duration_days: insuranceDays,
        sick_leave_duration_days: sickDays,
        pregnancy_week: pregnancyWeek,
        payer_size: payerSize,
        company_status: companyStatus,
        is_rehabilitation_benefit: isRehab,
        rehabilitation_benefit_months: isRehab ? 3 : 0,
        zus_debt_amount: zusDebt,
      });
      setResult(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="zus-view-container">
      <ViewHeader
        title="Kwalifikator i Kalkulator Zasiłku Chorobowego (Kod B)"
        description={<>Zwolnienie lekarskie z kodem literowym <strong>„B”</strong> przysługuje kobiecie w okresie ciąży i jest płatne w wysokości <strong>100% podstawy wymiaru</strong>. Okres zasiłkowy wynosi aż <strong>270 dni</strong> (zamiast standardowych 182 dni).</>}
      />

      <div className="zus-view-grid">
        {/* Formularz kalkulacji */}
        <div className="zus-card">
          <h2 className="zus-card-header-title">Dane do kwalifikacji e-ZLA</h2>
          <form onSubmit={handleCalculate} className="zus-form">
            <div className="zus-form-group">
              <label className="zus-label">Tytuł ubezpieczenia (Forma zatrudnienia)</label>
              <select
                className="zus-input"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as any)}
              >
                <option value="EMPLOYMENT_CONTRACT">Umowa o pracę (obowiązkowe ubezpieczenie, karencja 30 dni)</option>
                <option value="MANDATE_CONTRACT">Umowa zlecenie (dobrowolne ubezpieczenie, karencja 90 dni)</option>
                <option value="B2B">Działalność gospodarcza (JDG - dobrowolne chorobowe, karencja 90 dni)</option>
              </select>
            </div>

            <div className="zus-form-group">
              <label className="zus-label">Miesięczne wynagrodzenie brutto (PLN)</label>
              <input
                type="number"
                min="0"
                step="50"
                className="zus-input"
                value={grossSalary}
                onChange={(e) => setGrossSalary(Number(e.target.value))}
                required
              />
            </div>

            <div className="zus-form-row">
              <div className="zus-form-group">
                <label className="zus-label">Dni ubezpieczenia (okres karencji)</label>
                <input
                  type="number"
                  min="0"
                  className="zus-input"
                  value={insuranceDays}
                  onChange={(e) => setInsuranceDays(Number(e.target.value))}
                />
                <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                  Wymóg: min. {employmentType === 'EMPLOYMENT_CONTRACT' ? 30 : 90} dni
                </span>
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Dni zwolnienia lekarskiego</label>
                <input
                  type="number"
                  min="1"
                  max="270"
                  className="zus-input"
                  value={sickDays}
                  onChange={(e) => setSickDays(Number(e.target.value))}
                />
                <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                  Limit okresu zasiłkowego: 270 dni
                </span>
              </div>
            </div>

            <div className="zus-form-row">
              <div className="zus-form-group">
                <label className="zus-label">Tydzień ciąży</label>
                <input
                  type="number"
                  min="1"
                  max="42"
                  className="zus-input"
                  value={pregnancyWeek}
                  onChange={(e) => setPregnancyWeek(Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Liczba ubezpieczonych u pracodawcy</label>
                <select
                  className="zus-input"
                  value={payerSize}
                  onChange={(e) => setPayerSize(e.target.value as any)}
                >
                  <option value="ABOVE_20">Powyżej 20 osób (wypłaca pracodawca)</option>
                  <option value="UP_TO_20">Do 20 osób (wypłaca bezpośrednio ZUS)</option>
                </select>
              </div>
            </div>

            <div className="zus-form-group">
              <label className="zus-label">Status pracodawcy / ochrona zatrudnienia</label>
              <select
                className="zus-input"
                value={companyStatus}
                onChange={(e) => setCompanyStatus(e.target.value as any)}
              >
                <option value="NORMAL">Standardowy – ochrona stosunku pracy na mocy art. 177 KP</option>
                <option value="BANKRUPTCY_OR_LIQUIDATION">Upadłość lub likwidacja pracodawcy (zasiłek w wys. macierzyńskiego)</option>
                <option value="UNLAWFUL_TERMINATION">Naruszenie prawa / bezprawne zwolnienie w ciąży</option>
              </select>
            </div>

            {employmentType === 'B2B' && (
              <div className="zus-form-group">
                <label className="zus-label">Stan zadłużenia z tytułu składek ZUS (PLN)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  className="zus-input"
                  value={zusDebt}
                  onChange={(e) => setZusDebt(Number(e.target.value))}
                />
                <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                  Zadłużenie powyżej 100 zł blokuje wypłatę zasiłku do momentu uregulowania.
                </span>
              </div>
            )}

            <div className="zus-form-group">
              <label className="zus-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isRehab}
                  onChange={(e) => setIsRehab(e.target.checked)}
                />
                <span>Wnioskuję o świadczenie rehabilitacyjne (po wyczerpaniu 270 dni zasiłku chorobowego – 100% w ciąży)</span>
              </label>
            </div>

            <button type="submit" className="zus-btn-primary" disabled={isLoading} style={{ width: '100%', marginTop: '10px' }}>
              {isLoading ? 'Obliczanie z API ZUS...' : 'Sprawdź uprawnienia i oblicz zasiłek >'}
            </button>
          </form>
        </div>

        {/* Wyniki kalkulacji */}
        <div className="zus-card">
          <h2 className="zus-card-header-title">Wynik weryfikacji i kalkulacji ZUS</h2>
          {result ? (
            <div className="zus-results-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span className={`zus-badge ${result.is_eligible ? 'success' : 'danger'}`}>
                  {result.is_eligible ? 'KWALIFIKACJA POZYTYWNA (100%)' : 'BRAK PRAWA DO ZASIŁKU'}
                </span>
                <span className="zus-badge info">Kod e-ZLA: B</span>
                {isRehab && <span className="zus-badge warning">Świadczenie rehabilitacyjne</span>}
              </div>

              <div className="zus-stat-grid">
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Stawka świadczenia</div>
                  <div className="zus-stat-value" style={{ color: '#007834' }}>{result.benefit_rate_percent}%</div>
                </div>
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Stawka dzienna brutto</div>
                  <div className="zus-stat-value">{result.daily_gross_benefit} zł</div>
                </div>
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Łączny zasiłek brutto</div>
                  <div className="zus-stat-value">{result.total_gross_benefit} zł</div>
                </div>
                <div className="zus-stat-item">
                  <div className="zus-stat-label">Szacowana kwota na rękę (netto)</div>
                  <div className="zus-stat-value" style={{ color: '#007834' }}>{result.total_net_benefit} zł</div>
                </div>
              </div>

              {/* Podział na pracodawcę i ZUS */}
              {result.employer_days !== undefined && result.employer_days > 0 && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A1A1A', marginBottom: '6px' }}>
                    Podział finansowania świadczenia:
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                    <div>
                      <strong>Pracodawca ({result.employer_days} dni):</strong> {result.employer_amount} zł (wynagrodzenie chorobowe)
                    </div>
                    {result.zus_days > 0 && (
                      <div>
                        <strong>ZUS ({result.zus_days} dni):</strong> {result.zus_amount} zł (zasiłek chorobowy z FUS)
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="zus-notice-box" style={{ marginTop: '16px' }}>
                <div style={{ fontWeight: 700, color: '#00441c' }}>Kto wypłaca: {result.payer}</div>
                <div style={{ fontSize: '0.88rem', marginTop: '4px' }}>{result.protection_status}</div>
                <div style={{ fontSize: '0.85rem', color: '#4A4A4A', marginTop: '4px' }}>
                  Maksymalny okres zasiłkowy w ciąży: <strong>{result.max_benefit_days} dni</strong>.
                </div>
              </div>

              {result.refusal_reasons && result.refusal_reasons.length > 0 && (
                <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px' }}>
                  <strong style={{ color: '#991B1B' }}>Przyczyny odmowy prawa do zasiłku:</strong>
                  <ul style={{ margin: '4px 0 0 16px', fontSize: '0.85rem', color: '#991B1B' }}>
                    {result.refusal_reasons.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="zus-empty-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E0" strokeWidth="1.5">
                <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                <line x1="8" y1="6" x2="16" y2="6"></line>
                <line x1="16" y1="14" x2="16" y2="18"></line>
              </svg>
              <p>Wypełnij formularz po lewej stronie i kliknij „Sprawdź uprawnienia”, aby wywołać REST API ZUS.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
