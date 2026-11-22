import React, { useState } from 'react';
import {
  calculatePaternityLeave,
  calculateMaternityTransfer,
  calculateParentalSharing,
  calculateParentalWorkCombination,
  calculateAdoptionLeave,
} from '@/lib/api-client';
import type { PaternityLeaveResult, MaternityTransferResult, ParentalSharingResult } from '@/types/paternity';
import type { ParentalWorkResult } from '@/types/parental_work';
import type { AdoptionLeaveResult, CaregiverType } from '@/types/adoption';

type SubTab = 'paternity' | 'transfer' | 'sharing' | 'work' | 'adoption';

export const PaternityView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('paternity');
  const [loading, setLoading] = useState(false);

  // 1. Urlop ojcowski (BE-16)
  const [patIncome, setPatIncome] = useState(8000);
  const [childMonths, setChildMonths] = useState(3);
  const [patPartsCount, setPatPartsCount] = useState<1 | 2>(1);
  const [paternityResult, setPaternityResult] = useState<PaternityLeaveResult | null>(null);

  // 2. Przejęcie macierzyńskiego (BE-17)
  const [transferIncome, setTransferIncome] = useState(9000);
  const [motherUsedWeeks, setMotherUsedWeeks] = useState(14);
  const [transferReason, setTransferReason] = useState<
    'STANDARD_AFTER_14_WEEKS' | 'MOTHER_HOSPITALIZATION' | 'MOTHER_DISABILITY' | 'MOTHER_DEATH'
  >('STANDARD_AFTER_14_WEEKS');
  const [transferChildrenCount, setTransferChildrenCount] = useState(1);
  const [transferResult, setTransferResult] = useState<MaternityTransferResult | null>(null);

  // 3. Podział rodzicielskiego (BE-18)
  const [shareMotherIncome, setShareMotherIncome] = useState(7000);
  const [shareFatherIncome, setShareFatherIncome] = useState(8500);
  const [shareMotherWeeks, setShareMotherWeeks] = useState(32);
  const [shareFatherWeeks, setShareFatherWeeks] = useState(9);
  const [shareVariant, setShareVariant] = useState<'UNIFIED_81_5' | 'VARIABLE_100_70'>('UNIFIED_81_5');
  const [sharingResult, setSharingResult] = useState<ParentalSharingResult | null>(null);

  // 4. Łączenie z pracą (BE-19)
  const [workIncome, setWorkIncome] = useState(8000);
  const [workFraction, setWorkFraction] = useState<0.25 | 0.33 | 0.5>(0.5);
  const [workWeeksToCombine, setWorkWeeksToCombine] = useState(32);
  const [workDuringExtended, setWorkDuringExtended] = useState(true);
  const [workRate, setWorkRate] = useState<70 | 81.5>(70);
  const [workResult, setWorkResult] = useState<ParentalWorkResult | null>(null);

  // 5. Adopcja i rodzina zastępcza (BE-20)
  const [adoptIncome, setAdoptIncome] = useState(7500);
  const [caregiverType, setCaregiverType] = useState<CaregiverType>('ADOPTION');
  const [adoptChildAgeYears, setAdoptChildAgeYears] = useState(3);
  const [adoptDeferredSchool, setAdoptDeferredSchool] = useState(false);
  const [adoptWithin21Days, setAdoptWithin21Days] = useState(true);
  const [adoptionResult, setAdoptionResult] = useState<AdoptionLeaveResult | null>(null);

  // Handlers
  const handleCalcPaternity = async () => {
    setLoading(true);
    try {
      const parts =
        patPartsCount === 1
          ? [{ part_number: 1, days: 14 }]
          : [
              { part_number: 1, days: 7 },
              { part_number: 2, days: 7 },
            ];
      const res = await calculatePaternityLeave({
        gross_monthly_income: patIncome,
        child_age_months: childMonths,
        parts,
      });
      setPaternityResult(res);
    } finally {
      setLoading(false);
    }
  };

  const handleCalcTransfer = async () => {
    setLoading(true);
    try {
      const res = await calculateMaternityTransfer({
        father_gross_monthly_income: transferIncome,
        mother_used_weeks: motherUsedWeeks,
        transfer_reason: transferReason,
        children_born_count: transferChildrenCount,
        applied_within_21_days: true,
      });
      setTransferResult(res);
    } finally {
      setLoading(false);
    }
  };

  const handleCalcSharing = async () => {
    setLoading(true);
    try {
      const res = await calculateParentalSharing({
        mother_gross_income: shareMotherIncome,
        father_gross_income: shareFatherIncome,
        mother_parental_weeks: shareMotherWeeks,
        father_parental_weeks: shareFatherWeeks,
        children_born_count: 1,
        chosen_variant: shareVariant,
      });
      setSharingResult(res);
    } finally {
      setLoading(false);
    }
  };

  const handleCalcWork = async () => {
    setLoading(true);
    try {
      const res = await calculateParentalWorkCombination({
        gross_monthly_income: workIncome,
        work_fraction: workFraction,
        parental_weeks_to_combine: workWeeksToCombine,
        work_during_extended_period: workDuringExtended,
        benefit_rate_percentage: workRate,
      });
      setWorkResult(res);
    } finally {
      setLoading(false);
    }
  };

  const handleCalcAdoption = async () => {
    setLoading(true);
    try {
      const res = await calculateAdoptionLeave({
        gross_monthly_income: adoptIncome,
        caregiver_type: caregiverType,
        child_age_years: adoptChildAgeYears,
        has_deferred_school_obligation: adoptDeferredSchool,
        applied_within_21_days: adoptWithin21Days,
        chosen_variant: adoptWithin21Days ? 'UNIFIED_81_5' : 'VARIABLE_100_70',
      });
      setAdoptionResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zus-view-container">
      {/* NAGŁÓWEK WIDOKU */}
      <div className="zus-view-header">
        <h1 className="zus-view-title">Urlopy Rodzicielskie, Prawa Ojca i Opiekunów</h1>
        <p className="zus-view-desc">
          Zgodnie z unijną dyrektywą <strong>Work-Life Balance</strong> oraz przepisami ZUS, rodzice i opiekunowie dysponują elastycznymi narzędziami podziału opieki: <strong>14 dni urlopu ojcowskiego</strong> (100%), <strong>9 tygodni nieprzenoszalnego urlopu dla taty</strong> (70%), <strong>przejęcie macierzyńskiego</strong>, <strong>łączenie urlopu z pracą na 1/2 etatu</strong> oraz <strong>uprawnienia adopcyjne</strong>.
        </p>
      </div>

      {/* SUB-MENU PIGUŁKOWE (ZUS STYLE) */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '24px',
        borderBottom: '2px solid #E2E8F0',
        paddingBottom: '12px',
      }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('paternity')}
          className={`zus-btn-outline ${activeSubTab === 'paternity' ? 'active' : ''}`}
          style={{
            backgroundColor: activeSubTab === 'paternity' ? '#007834' : '#FFFFFF',
            color: activeSubTab === 'paternity' ? '#FFFFFF' : '#00441c',
            borderColor: '#007834',
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: '6px',
          }}
        >
          1. Urlop Ojcowski (14 dni, 100%)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('transfer')}
          className={`zus-btn-outline ${activeSubTab === 'transfer' ? 'active' : ''}`}
          style={{
            backgroundColor: activeSubTab === 'transfer' ? '#007834' : '#FFFFFF',
            color: activeSubTab === 'transfer' ? '#FFFFFF' : '#00441c',
            borderColor: '#007834',
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: '6px',
          }}
        >
          2. Przejęcie Macierzyńskiego przez Ojca
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sharing')}
          className={`zus-btn-outline ${activeSubTab === 'sharing' ? 'active' : ''}`}
          style={{
            backgroundColor: activeSubTab === 'sharing' ? '#007834' : '#FFFFFF',
            color: activeSubTab === 'sharing' ? '#FFFFFF' : '#00441c',
            borderColor: '#007834',
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: '6px',
          }}
        >
          3. Podział Rodzicielskiego (9 tyg. dla Taty)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('work')}
          className={`zus-btn-outline ${activeSubTab === 'work' ? 'active' : ''}`}
          style={{
            backgroundColor: activeSubTab === 'work' ? '#007834' : '#FFFFFF',
            color: activeSubTab === 'work' ? '#FFFFFF' : '#00441c',
            borderColor: '#007834',
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: '6px',
          }}
        >
          4. Łączenie Urlopu z Pracą (1/2 etatu)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('adoption')}
          className={`zus-btn-outline ${activeSubTab === 'adoption' ? 'active' : ''}`}
          style={{
            backgroundColor: activeSubTab === 'adoption' ? '#007834' : '#FFFFFF',
            color: activeSubTab === 'adoption' ? '#FFFFFF' : '#00441c',
            borderColor: '#007834',
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: '6px',
          }}
        >
          5. Adopcja i Rodzina Zastępcza
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. URLOP OJCOWSKI (BE-16) */}
      {/* ============================================================== */}
      {activeSubTab === 'paternity' && (
        <div className="zus-view-grid">
          <div className="zus-card">
            <h2 className="zus-card-header-title">Dane do urlopu ojcowskiego (art. 182(3) KP)</h2>
            <div className="zus-form">
              <div className="zus-form-group">
                <label className="zus-label">Miesięczne zarobki brutto ojca (PLN)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="zus-input"
                  value={patIncome}
                  onChange={(e) => setPatIncome(Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Wiek dziecka w miesiącach (limit kodeksowy: do 12 m.ż.)</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  className="zus-input"
                  value={childMonths}
                  onChange={(e) => setChildMonths(Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Wykorzystanie urlopu</label>
                <select
                  className="zus-input"
                  value={patPartsCount}
                  onChange={(e) => setPatPartsCount(Number(e.target.value) as 1 | 2)}
                >
                  <option value={1}>Jednorazowo (14 dni ciągiem)</option>
                  <option value={2}>W dwóch częściach po 7 dni każda</option>
                </select>
              </div>

              <button
                type="button"
                className="zus-btn-primary"
                onClick={handleCalcPaternity}
                disabled={loading}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {loading ? 'Obliczanie z API ZUS...' : 'Oblicz zasiłek ojcowski (100%) >'}
              </button>
            </div>
          </div>

          <div className="zus-card">
            <h2 className="zus-card-header-title">Wynik kwalifikacji i wyliczenie ZUS</h2>
            {paternityResult ? (
              <div className="zus-results-box">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <span className={`zus-badge ${paternityResult.is_eligible ? 'success' : 'danger'}`}>
                    {paternityResult.is_eligible ? 'PRAWO DO URLOPU OJCOWSKIEGO (100%)' : 'BRAK PRAWA DO URLOPU'}
                  </span>
                  <span className="zus-badge info">Wymiar: 14 dni kalendarzowych</span>
                </div>

                <div className="zus-stat-grid">
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Podstawa netto (po potrąceniu 13,71%)</div>
                    <div className="zus-stat-value">{paternityResult.calculation_base_net} zł</div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Stawka dzienna brutto</div>
                    <div className="zus-stat-value">{paternityResult.daily_rate} zł</div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Łączny zasiłek brutto (14 dni)</div>
                    <div className="zus-stat-value" style={{ color: '#007834' }}>
                      {paternityResult.total_benefit_amount} zł
                    </div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Szacowana kwota na rękę (netto)</div>
                    <div className="zus-stat-value" style={{ color: '#007834' }}>
                      {Math.round(paternityResult.total_benefit_amount * 0.88 * 100) / 100} zł
                    </div>
                  </div>
                </div>

                {paternityResult.parts_breakdown && (
                  <div style={{ marginTop: '16px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>
                      Rozbicie na części:
                    </h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {paternityResult.parts_breakdown.map((part) => (
                        <div
                          key={part.part_number}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#E6F4EC',
                            borderRadius: '6px',
                            border: '1px solid #99d2af',
                            fontSize: '0.85rem',
                          }}
                        >
                          <strong>Część {part.part_number}:</strong> {part.days} dni – {part.amount} zł
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="zus-notice-box" style={{ marginTop: '16px' }}>
                  <div style={{ fontWeight: 700, color: '#00441c' }}>
                    {childMonths <= 12
                      ? '✓ Spełniony warunek wieku dziecka (wniosek złóż min. 7 dni przed rozpoczęciem urlopu).'
                      : '⚠ Uwaga: dziecko ma powyżej 12 miesięcy! Urlop ojcowski przysługuje wyłącznie do 12. m.ż.'}
                  </div>
                  <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    Urlop ojcowski jest niezależny od urlopu macierzyńskiego matki i można z niego skorzystać w tym samym czasie, gdy matka pobiera zasiłek macierzyński!
                  </div>
                </div>
              </div>
            ) : (
              <div className="zus-empty-placeholder">
                <p>Wprowadź dochód ojca i kliknij przycisk, aby wyliczyć zasiłek ojcowski.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. PRZEJĘCIE MACIERZYŃSKIEGO PRZEZ OJCA (BE-17) */}
      {/* ============================================================== */}
      {activeSubTab === 'transfer' && (
        <div className="zus-view-grid">
          <div className="zus-card">
            <h2 className="zus-card-header-title">Warunki przejęcia urlopu macierzyńskiego (art. 180 KP)</h2>
            <div className="zus-form">
              <div className="zus-form-group">
                <label className="zus-label">Miesięczne zarobki brutto ojca (PLN)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="zus-input"
                  value={transferIncome}
                  onChange={(e) => setTransferIncome(Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Przyczyna przejęcia urlopu przez ojca</label>
                <select
                  className="zus-input"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value as any)}
                >
                  <option value="STANDARD_AFTER_14_WEEKS">Standardowo – powrót matki do pracy po min. 14 tygodniach</option>
                  <option value="MOTHER_HOSPITALIZATION">Pobyt matki w szpitalu (po min. 8 tygodniach od porodu)</option>
                  <option value="MOTHER_DISABILITY">Orzeczenie o niezdolności matki do samodzielnej egzystencji</option>
                  <option value="MOTHER_DEATH">Zgon matki lub porzucenie dziecka przez matkę</option>
                </select>
              </div>

              <div className="zus-form-row">
                <div className="zus-form-group">
                  <label className="zus-label">Tygodnie wykorzystane przez matkę</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    className="zus-input"
                    value={motherUsedWeeks}
                    onChange={(e) => setMotherUsedWeeks(Number(e.target.value))}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                    Standardowo min. 14 tyg., w sytuacjach szczególnych od 0 lub 8 tyg.
                  </span>
                </div>

                <div className="zus-form-group">
                  <label className="zus-label">Liczba urodzonych dzieci</label>
                  <select
                    className="zus-input"
                    value={transferChildrenCount}
                    onChange={(e) => setTransferChildrenCount(Number(e.target.value))}
                  >
                    <option value={1}>1 dziecko (pula 20 tygodni)</option>
                    <option value={2}>Bliźnięta (pula 31 tygodni)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="zus-btn-primary"
                onClick={handleCalcTransfer}
                disabled={loading}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {loading ? 'Przeliczanie...' : 'Oblicz urlop przejmowany przez ojca >'}
              </button>
            </div>
          </div>

          <div className="zus-card">
            <h2 className="zus-card-header-title">Uprawnienia ojca przejmującego urlop</h2>
            {transferResult ? (
              <div className="zus-results-box">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <span className="zus-badge success">
                    {transferResult.father_transferred_weeks} TYGODNI DLA OJCA
                  </span>
                  <span className="zus-badge info">Stawka: {transferResult.benefit_rate_percentage}% podstawy</span>
                </div>

                <div className="zus-stat-grid">
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Tygodnie wykorzystane przez matkę</div>
                    <div className="zus-stat-value">{transferResult.mother_weeks_used} tyg.</div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Pozostałe tygodnie dla ojca</div>
                    <div className="zus-stat-value" style={{ color: '#007834' }}>
                      {transferResult.father_transferred_weeks} tyg. ({transferResult.father_transferred_weeks * 7} dni)
                    </div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Stawka dzienna zasiłku ojca</div>
                    <div className="zus-stat-value">{transferResult.father_daily_rate} zł</div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Łączny zasiłek macierzyński ojca</div>
                    <div className="zus-stat-value" style={{ color: '#007834' }}>
                      {transferResult.father_total_benefit_amount} zł
                    </div>
                  </div>
                </div>

                <div className="zus-notice-box" style={{ marginTop: '16px' }}>
                  <div style={{ fontWeight: 700, color: '#00441c' }}>Procedura przekazania urlopu:</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    1. Matka składa wniosek o rezygnację z urlopu min. 14 dni przed planowanym powrotem do pracy.<br />
                    2. Ojciec składa u swojego pracodawcy wniosek o udzielenie pozostałej części urlopu macierzyńskiego z zaświadczeniem od pracodawcy matki.
                  </div>
                </div>
              </div>
            ) : (
              <div className="zus-empty-placeholder">
                <p>Wybierz powód przejęcia urlopu i kliknij przycisk, aby wyliczyć należne ojcu świadczenie.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. PODZIAŁ RODZICIELSKIEGO (BE-18) */}
      {/* ============================================================== */}
      {activeSubTab === 'sharing' && (
        <div className="zus-view-grid">
          <div className="zus-card">
            <h2 className="zus-card-header-title">Podział puli 41 tygodni urlopu rodzicielskiego</h2>
            <div className="zus-form">
              <div className="zus-form-row">
                <div className="zus-form-group">
                  <label className="zus-label">Zarobki matki brutto (PLN)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="zus-input"
                    value={shareMotherIncome}
                    onChange={(e) => setShareMotherIncome(Number(e.target.value))}
                  />
                </div>
                <div className="zus-form-group">
                  <label className="zus-label">Zarobki ojca brutto (PLN)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="zus-input"
                    value={shareFatherIncome}
                    onChange={(e) => setShareFatherIncome(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="zus-form-row">
                <div className="zus-form-group">
                  <label className="zus-label">Tygodnie dla matki (max 32 tyg.)</label>
                  <input
                    type="number"
                    min="0"
                    max="32"
                    className="zus-input"
                    value={shareMotherWeeks}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setShareMotherWeeks(val);
                      setShareFatherWeeks(41 - val);
                    }}
                  />
                </div>
                <div className="zus-form-group">
                  <label className="zus-label">Tygodnie dla ojca (min. 9 tyg.)</label>
                  <input
                    type="number"
                    min="9"
                    max="41"
                    className="zus-input"
                    value={shareFatherWeeks}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setShareFatherWeeks(val);
                      setShareMotherWeeks(41 - val);
                    }}
                  />
                </div>
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Wariant zasiłku</label>
                <select
                  className="zus-input"
                  value={shareVariant}
                  onChange={(e) => setShareVariant(e.target.value as any)}
                >
                  <option value="UNIFIED_81_5">Wariant uśredniony (81,5% za cały okres)</option>
                  <option value="VARIABLE_100_70">Wariant standardowy (70% za urlop rodzicielski)</option>
                </select>
              </div>

              <button
                type="button"
                className="zus-btn-primary"
                onClick={handleCalcSharing}
                disabled={loading}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {loading ? 'Przeliczanie...' : 'Symuluj budżet rodziny z podziałem >'}
              </button>
            </div>
          </div>

          <div className="zus-card">
            <h2 className="zus-card-header-title">Symulacja wypłat dla obojga rodziców</h2>
            {sharingResult ? (
              <div className="zus-results-box">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <span className={`zus-badge ${sharingResult.non_transferable_respected ? 'success' : 'warning'}`}>
                    {sharingResult.non_transferable_respected
                      ? '✓ ZACHOWANO 9 TYG. NIEPRZENOSZALNYCH'
                      : '⚠ NIE WYKORZYSTANO 9 TYG. OJCA'}
                  </span>
                  <span className="zus-badge info">Łączna pula: {sharingResult.total_pool_parental_weeks} tygodni</span>
                </div>

                <div className="zus-stat-grid">
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Zasiłek rodzicielski matki ({sharingResult.mother.parental_weeks} tyg.)</div>
                    <div className="zus-stat-value">{sharingResult.mother.total_benefit_amount} zł</div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Zasiłek rodzicielski ojca ({sharingResult.father.parental_weeks} tyg.)</div>
                    <div className="zus-stat-value">{sharingResult.father.total_benefit_amount} zł</div>
                  </div>
                  <div className="zus-stat-item" style={{ gridColumn: 'span 2' }}>
                    <div className="zus-stat-label">Łączny wpływ do budżetu rodziny z urlopu rodzicielskiego</div>
                    <div className="zus-stat-value" style={{ color: '#007834', fontSize: '1.4rem' }}>
                      {sharingResult.total_family_benefit_amount} zł
                    </div>
                  </div>
                </div>

                <div className="zus-notice-box" style={{ marginTop: '16px' }}>
                  <div style={{ fontWeight: 700, color: '#00441c' }}>
                    {sharingResult.validation_messages?.[0] || 'Podział zweryfikowany z Kodeksem Pracy.'}
                  </div>
                  <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    {sharingResult.financial_comparison_note || 'Rodzice mogą korzystać z urlopu rodzicielskiego w tym samym czasie lub naprzemiennie.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="zus-empty-placeholder">
                <p>Wprowadź zarobki obojga rodziców i suwakami ustal podział tygodni opieki.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. ŁĄCZENIE RODZICIELSKIEGO Z PRACĄ NA 1/2 ETATU (BE-19) */}
      {/* ============================================================== */}
      {activeSubTab === 'work' && (
        <div className="zus-view-grid">
          <div className="zus-card">
            <h2 className="zus-card-header-title">Łączenie urlopu rodzicielskiego z pracą (art. 182(1e)-182(1f) KP)</h2>
            <div className="zus-form">
              <div className="zus-form-group">
                <label className="zus-label">Miesięczne wynagrodzenie brutto przed urlopem (PLN)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="zus-input"
                  value={workIncome}
                  onChange={(e) => setWorkIncome(Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Wymiar etatu pracy (maksymalnie 1/2 etatu)</label>
                <select
                  className="zus-input"
                  value={workFraction}
                  onChange={(e) => setWorkFraction(Number(e.target.value) as any)}
                >
                  <option value={0.5}>1/2 etatu (maksymalny dopuszczalny wymiar kodeksowy)</option>
                  <option value={0.33}>1/3 etatu (0,33 etatu)</option>
                  <option value={0.25}>1/4 etatu (0,25 etatu)</option>
                </select>
              </div>

              <div className="zus-form-row">
                <div className="zus-form-group">
                  <label className="zus-label">Tygodnie rodzicielskiego łączone z pracą</label>
                  <input
                    type="number"
                    min="1"
                    max="41"
                    className="zus-input"
                    value={workWeeksToCombine}
                    onChange={(e) => setWorkWeeksToCombine(Number(e.target.value))}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>Standardowo 32 tygodnie matki</span>
                </div>

                <div className="zus-form-group">
                  <label className="zus-label">Stawka zasiłku</label>
                  <select
                    className="zus-input"
                    value={workRate}
                    onChange={(e) => setWorkRate(Number(e.target.value) as any)}
                  >
                    <option value={70}>70% podstawy (wariant standardowy)</option>
                    <option value={81.5}>81,5% podstawy (długi wniosek w 21 dni)</option>
                  </select>
                </div>
              </div>

              <div className="zus-form-group">
                <label className="zus-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={workDuringExtended}
                    onChange={(e) => setWorkDuringExtended(e.target.checked)}
                  />
                  <span>Kontynuacja pracy na część etatu również w okresie wydłużenia (wzór W = T / (1 - etat))</span>
                </label>
              </div>

              <button
                type="button"
                className="zus-btn-primary"
                onClick={handleCalcWork}
                disabled={loading}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {loading ? 'Przeliczanie...' : 'Oblicz wydłużenie urlopu i łączny dochód >'}
              </button>
            </div>
          </div>

          <div className="zus-card">
            <h2 className="zus-card-header-title">Efekt wydłużenia urlopu i łączny budżet</h2>
            {workResult ? (
              <div className="zus-results-box">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <span className="zus-badge success">
                    WYDŁUŻENIE URLOPU O +{workResult.extension_weeks} TYGODNI
                  </span>
                  <span className="zus-badge info">
                    Łącznie {workResult.total_parental_weeks_with_extension} tygodni opieki
                  </span>
                </div>

                <div className="zus-stat-grid">
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Pensja z pracy (za {workResult.work_fraction * 100}% etatu)</div>
                    <div className="zus-stat-value">{workResult.monthly_salary_from_work_gross} zł brutto/m-c</div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Pomniejszony zasiłek ZUS (50%)</div>
                    <div className="zus-stat-value">{workResult.reduced_monthly_benefit_with_work} zł/m-c</div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Miesięczny łączny dochód rodzica</div>
                    <div className="zus-stat-value" style={{ color: '#007834' }}>
                      {workResult.combined_monthly_income} zł/m-c
                    </div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Zysk finansowy względem czystego urlopu</div>
                    <div className="zus-stat-value" style={{ color: '#007834', fontWeight: 800 }}>
                      +{workResult.financial_gain_compared_to_pure_leave} zł
                    </div>
                  </div>
                </div>

                <div className="zus-notice-box" style={{ marginTop: '16px' }}>
                  <div style={{ fontWeight: 700, color: '#00441c' }}>Kluczowe korzyści z łączenia pracy z urlopem:</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    • Praca na 1/2 etatu przez 32 tygodnie wydłuża czas trwania urlopu aż do <strong>64 tygodni</strong>!<br />
                    • Rodzic nie traci prawa do urlopu, a łączna suma pensji i zasiłku jest o wiele wyższa niż sam zasiłek.
                  </div>
                </div>
              </div>
            ) : (
              <div className="zus-empty-placeholder">
                <p>Wprowadź pensję i wybierz wymiar etatu (max 1/2), aby sprawdzić jak wydłuży się Twój urlop.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. ADOPCJA I RODZINA ZASTĘPCZA (BE-20) */}
      {/* ============================================================== */}
      {activeSubTab === 'adoption' && (
        <div className="zus-view-grid">
          <div className="zus-card">
            <h2 className="zus-card-header-title">Adopcja i rodzina zastępcza niezawodowa (art. 183 KP)</h2>
            <div className="zus-form">
              <div className="zus-form-group">
                <label className="zus-label">Miesięczne wynagrodzenie brutto opiekuna (PLN)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="zus-input"
                  value={adoptIncome}
                  onChange={(e) => setAdoptIncome(Number(e.target.value))}
                />
              </div>

              <div className="zus-form-group">
                <label className="zus-label">Status prawny opieki nad dzieckiem</label>
                <select
                  className="zus-input"
                  value={caregiverType}
                  onChange={(e) => setCaregiverType(e.target.value as any)}
                >
                  <option value="ADOPTION">Przysposobienie dziecka (wniosek do sądu opiekuńczego)</option>
                  <option value="FOSTER_FAMILY_NON_PROFESSIONAL">Rodzina zastępcza niezawodowa</option>
                  <option value="FOSTER_FAMILY_PROFESSIONAL">Rodzina zastępcza zawodowa</option>
                </select>
              </div>

              <div className="zus-form-row">
                <div className="zus-form-group">
                  <label className="zus-label">Wiek dziecka w latach w chwili przyjęcia</label>
                  <input
                    type="number"
                    min="0"
                    max="17"
                    className="zus-input"
                    value={adoptChildAgeYears}
                    onChange={(e) => setAdoptChildAgeYears(Number(e.target.value))}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                    Limit: do 7 lat (rodzina zastępcza) lub do 14 lat (adopcja)
                  </span>
                </div>

                <div className="zus-form-group">
                  <label className="zus-label">Złożenie wniosku w 21 dni</label>
                  <select
                    className="zus-input"
                    value={adoptWithin21Days ? 'true' : 'false'}
                    onChange={(e) => setAdoptWithin21Days(e.target.value === 'true')}
                  >
                    <option value="true">Tak (stawka uśredniona 81,5%)</option>
                    <option value="false">Nie (100% macierzyński, 70% rodzicielski)</option>
                  </select>
                </div>
              </div>

              <div className="zus-form-group">
                <label className="zus-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={adoptDeferredSchool}
                    onChange={(e) => setAdoptDeferredSchool(e.target.checked)}
                  />
                  <span>Decyzja o odroczeniu obowiązku szkolnego (wydłuża limit wieku z 7 do 10 lat)</span>
                </label>
              </div>

              <button
                type="button"
                className="zus-btn-primary"
                onClick={handleCalcAdoption}
                disabled={loading}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {loading ? 'Przeliczanie...' : 'Oblicz urlop na warunkach macierzyńskiego >'}
              </button>
            </div>
          </div>

          <div className="zus-card">
            <h2 className="zus-card-header-title">Uprawnienia rodziców adopcyjnych i zastępczych</h2>
            {adoptionResult ? (
              <div className="zus-results-box">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <span className={`zus-badge ${adoptionResult.is_eligible ? 'success' : 'danger'}`}>
                    {adoptionResult.is_eligible ? 'KWALIFIKACJA POZYTYWNA ZUS' : 'BRAK UPRAWNIEŃ (PRZEKROCZONY WIEK)'}
                  </span>
                  <span className="zus-badge info">
                    Łącznie {adoptionResult.total_leave_weeks} tygodni urlopu
                  </span>
                </div>

                <div className="zus-stat-grid">
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Urlop na warunkach macierzyńskiego</div>
                    <div className="zus-stat-value">{adoptionResult.maternity_condition_weeks} tyg.</div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Dostępny urlop rodzicielski</div>
                    <div className="zus-stat-value">{adoptionResult.parental_weeks_available} tyg.</div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Stawka dzienna zasiłku</div>
                    <div className="zus-stat-value">{adoptionResult.daily_benefit_rate} zł</div>
                  </div>
                  <div className="zus-stat-item">
                    <div className="zus-stat-label">Łączny zasiłek macierzyński i rodzicielski</div>
                    <div className="zus-stat-value" style={{ color: '#007834' }}>
                      {adoptionResult.total_benefit_amount} zł
                    </div>
                  </div>
                </div>

                <div className="zus-notice-box" style={{ marginTop: '16px' }}>
                  <div style={{ fontWeight: 700, color: '#00441c' }}>Gwarantowane minimum kodeksowe:</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Jeżeli dziecko zostało przyjęte na wychowanie i do ukończenia granicy wieku pozostało mniej czasu, pracownikowi przysługuje <strong>gwarantowane ustawowo min. 9 tygodni</strong> urlopu na warunkach urlopu macierzyńskiego (art. 183 § 3 KP).
                  </div>
                </div>
              </div>
            ) : (
              <div className="zus-empty-placeholder">
                <p>Wprowadź dochód opiekuna i wiek dziecka, aby wyliczyć uprawnienia adopcyjne.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
