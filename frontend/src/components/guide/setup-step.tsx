import React, { useState, useMemo, useRef } from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, User, Calendar, CreditCard, Info, FileUp } from 'lucide-react';
import {
  waitingPeriodDays,
  qualify,
  sampleCases,
  type GuideInput,
} from '@/lib/guide';
import { SampleCasesMenu } from './sample-cases-menu';
import { parsePdfDocument } from '@/lib/api-client';

export function SetupStep({
  initialInput,
  onSubmit,
}: {
  initialInput: GuideInput;
  onSubmit: (input: GuideInput) => void;
}) {
  const [input, setInput] = useState<GuideInput>(initialInput);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfStatusMessage, setPdfStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof GuideInput>(key: K, value: GuideInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));

  const isEmployee = input.employment === 'uop';
  const canSubmit = Boolean(input.dueDate) && input.grossSalary > 0;

  // Wstępna kwalifikacja na żywo
  const qualification = useMemo(() => qualify(input), [input]);

  // Szacunki na żywo
  const baseNet = Math.round(input.grossSalary * (1 - 0.1371) * 100) / 100;
  const estimatedMonthlyUnified = Math.round(baseNet * 0.815 * 100) / 100;
  const estimatedMonthly100 = Math.round(baseNet * 1.0 * 100) / 100;

  const handleSelectSample = (sampleInput: GuideInput) => {
    setInput(sampleInput);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingPdf(true);
    setPdfStatusMessage(null);

    try {
      const data = await parsePdfDocument(file);
      if (data) {
        const extracted = data.extracted_data || {};
        const docType = data.document_type || 'Z-3';

        setInput((prev) => {
          let emp: GuideInput['employment'] = prev.employment;
          if (docType === 'Z-3') emp = 'uop';
          else if (docType === 'Z-3a') emp = 'zlecenie';

          return {
            ...prev,
            grossSalary: extracted.gross_salary && extracted.gross_salary > 0 ? extracted.gross_salary : prev.grossSalary,
            employment: emp,
            sicknessInsurance: extracted.has_active_ezla_code_b !== false,
            role: 'mother',
          };
        });

        const salaryText = extracted.gross_salary ? `${extracted.gross_salary} zł brutto` : '';
        setPdfStatusMessage(`Wczytano z pliku ${file.name}: dokument ${docType} (${salaryText || 'uzupełniono parametry formularza'}).`);
      }
    } catch (err) {
      console.warn('PDF parsing error', err);
      setPdfStatusMessage('Nie udało się przetworzyć pliku PDF. Wprowadź dane ręcznie.');
    } finally {
      setIsParsingPdf(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="zus-calc-grid">
      {/* 1. LEWA KOLUMNA: Formularz danych w stylu ZUS */}
      <div className="zus-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span className="zus-official-pill" style={{ marginBottom: '6px' }}>Krok 1 z 2</span>
            <h2 className="zus-card-header-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              Dane do kalkulacji uprawnień
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Załaduj przykładową sprawę ZUS - identycznie jak w Kroku 2 */}
            <SampleCasesMenu onSelect={handleSelectSample} />

            {/* Opcja wgrania PDF */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="zus-btn-outline-pue"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '38px',
                padding: '0 12px',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              disabled={isParsingPdf}
              title="Wgraj zaświadczenie płatnika lub wniosek ZUS w formacie PDF (np. Z-3, Z-3a, ZAM, e-ZLA)"
            >
              <FileUp className="size-4 text-[#003B6F]" />
              <span>{isParsingPdf ? 'Parsowanie PDF...' : 'Wgraj PDF'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handlePdfUpload}
            />
          </div>
        </div>

        {/* Powiadomienie o załadowaniu z PDF */}
        {pdfStatusMessage && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#E6F4EC',
            border: '1px solid #99D2AF',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '0.84rem',
            color: '#00441c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 className="size-4 text-[#007834] shrink-0" />
              <span>{pdfStatusMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfStatusMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007834', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        <form
          className="zus-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit(input);
          }}
        >
          {/* 1. Rola: Kto wnioskuje o świadczenie */}
          <div className="zus-form-group">
            <label className="zus-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User className="size-4 text-[#007834]" />
              <span>Kto wnioskuje o świadczenie? (Rola wnioskodawcy)</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              <button
                type="button"
                onClick={() => update('role', 'mother')}
                style={{
                  padding: '12px 8px',
                  borderRadius: '6px',
                  border: input.role === 'mother' ? '2px solid #007834' : '1.5px solid #CBD5E0',
                  backgroundColor: input.role === 'mother' ? '#E6F4EC' : '#FFFFFF',
                  color: input.role === 'mother' ? '#00441c' : '#1A1A1A',
                  fontWeight: input.role === 'mother' ? 700 : 500,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: input.role === 'mother' ? '0 1px 3px rgba(0, 120, 52, 0.2)' : 'none',
                }}
              >
                <div style={{ fontSize: '0.94rem', fontWeight: 700 }}>Matka</div>
                <div style={{ fontSize: '0.73rem', color: input.role === 'mother' ? '#005c27' : '#6B7280', marginTop: '2px' }}>
                  Ciąża i macierzyński
                </div>
              </button>

              <button
                type="button"
                onClick={() => update('role', 'father')}
                style={{
                  padding: '12px 8px',
                  borderRadius: '6px',
                  border: input.role === 'father' ? '2px solid #007834' : '1.5px solid #CBD5E0',
                  backgroundColor: input.role === 'father' ? '#E6F4EC' : '#FFFFFF',
                  color: input.role === 'father' ? '#00441c' : '#1A1A1A',
                  fontWeight: input.role === 'father' ? 700 : 500,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: input.role === 'father' ? '0 1px 3px rgba(0, 120, 52, 0.2)' : 'none',
                }}
              >
                <div style={{ fontSize: '0.94rem', fontWeight: 700 }}>Ojciec</div>
                <div style={{ fontSize: '0.73rem', color: input.role === 'father' ? '#005c27' : '#6B7280', marginTop: '2px' }}>
                  Ojcowski i 9 tyg. taty
                </div>
              </button>

              <button
                type="button"
                onClick={() => update('role', 'guardian')}
                style={{
                  padding: '12px 8px',
                  borderRadius: '6px',
                  border: input.role === 'guardian' ? '2px solid #007834' : '1.5px solid #CBD5E0',
                  backgroundColor: input.role === 'guardian' ? '#E6F4EC' : '#FFFFFF',
                  color: input.role === 'guardian' ? '#00441c' : '#1A1A1A',
                  fontWeight: input.role === 'guardian' ? 700 : 500,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: input.role === 'guardian' ? '0 1px 3px rgba(0, 120, 52, 0.2)' : 'none',
                }}
              >
                <div style={{ fontSize: '0.94rem', fontWeight: 700 }}>Opiekun</div>
                <div style={{ fontSize: '0.73rem', color: input.role === 'guardian' ? '#005c27' : '#6B7280', marginTop: '2px' }}>
                  Adopcja i rodzina zastępcza
                </div>
              </button>
            </div>
          </div>

          {/* 2. Forma zatrudnienia (Tytuł ubezpieczenia) */}
          <div className="zus-form-group">
            <label className="zus-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard className="size-4 text-[#007834]" />
              <span>Forma zatrudnienia (Tytuł ubezpieczenia społecznego)</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              <button
                type="button"
                onClick={() => update('employment', 'uop')}
                style={{
                  padding: '12px 8px',
                  borderRadius: '6px',
                  border: input.employment === 'uop' ? '2px solid #007834' : '1.5px solid #CBD5E0',
                  backgroundColor: input.employment === 'uop' ? '#E6F4EC' : '#FFFFFF',
                  color: input.employment === 'uop' ? '#00441c' : '#1A1A1A',
                  fontWeight: input.employment === 'uop' ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontWeight: 700 }}>Umowa o pracę</span>
                <span style={{ fontSize: '0.73rem', color: input.employment === 'uop' ? '#005c27' : '#6B7280' }}>
                  Etat (UoP)
                </span>
              </button>

              <button
                type="button"
                onClick={() => update('employment', 'zlecenie')}
                style={{
                  padding: '12px 8px',
                  borderRadius: '6px',
                  border: input.employment === 'zlecenie' ? '2px solid #007834' : '1.5px solid #CBD5E0',
                  backgroundColor: input.employment === 'zlecenie' ? '#E6F4EC' : '#FFFFFF',
                  color: input.employment === 'zlecenie' ? '#00441c' : '#1A1A1A',
                  fontWeight: input.employment === 'zlecenie' ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontWeight: 700 }}>Umowa zlecenie</span>
                <span style={{ fontSize: '0.73rem', color: input.employment === 'zlecenie' ? '#005c27' : '#6B7280' }}>
                  Zleceniobiorca
                </span>
              </button>

              <button
                type="button"
                onClick={() => update('employment', 'jdg')}
                style={{
                  padding: '12px 8px',
                  borderRadius: '6px',
                  border: input.employment === 'jdg' ? '2px solid #007834' : '1.5px solid #CBD5E0',
                  backgroundColor: input.employment === 'jdg' ? '#E6F4EC' : '#FFFFFF',
                  color: input.employment === 'jdg' ? '#00441c' : '#1A1A1A',
                  fontWeight: input.employment === 'jdg' ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontWeight: 700 }}>Działalność (JDG)</span>
                <span style={{ fontSize: '0.73rem', color: input.employment === 'jdg' ? '#005c27' : '#6B7280' }}>
                  Samozatrudnienie
                </span>
              </button>
            </div>

            {/* Informacja o statusie ubezpieczenia chorobowego */}
            {isEmployee ? (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#E6F4EC',
                border: '1px solid #99D2AF',
                borderRadius: '6px',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.84rem',
                color: '#00441c',
              }}>
                <CheckCircle2 className="size-4 text-[#007834] shrink-0" />
                <span>
                  ✓ Na umowie o pracę (etat) ubezpieczenie chorobowe jest obowiązkowe od 1. dnia. Brak wymogu okresu wyczekiwania (karencji) przy macierzyńskim.
                </span>
              </div>
            ) : (
              <div style={{
                padding: '12px 14px',
                backgroundColor: input.sicknessInsurance ? '#F8FAFC' : '#FEF2F2',
                border: `1.5px solid ${input.sicknessInsurance ? '#CBD5E0' : '#EF4444'}`,
                borderRadius: '6px',
                marginTop: '8px',
                transition: 'all 0.2s ease',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: input.sicknessInsurance ? '#1A1A1A' : '#991B1B' }}>
                      Opłacam dobrowolne ubezpieczenie chorobowe (składka 2,45%)
                    </div>
                    <div style={{ fontSize: '0.78rem', color: input.sicknessInsurance ? '#6B7280' : '#B91C1C', marginTop: '2px' }}>
                      {input.sicknessInsurance
                        ? 'Zgłoszenie do ZUS (ZUA/ZZA) – warunek konieczny do otrzymania zasiłku macierzyńskiego.'
                        : 'UWAGA: Bez ubezpieczenia chorobowego ZUS wyda decyzję odmowną!'}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={input.sicknessInsurance}
                    onChange={(e) => update('sicknessInsurance', e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: '#007834', cursor: 'pointer', flexShrink: 0 }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* 3. Staż ubezpieczenia i data porodu w jednym rzędzie */}
          <div className="zus-form-row">
            <div className="zus-form-group">
              <label className="zus-label" htmlFor="insured-days" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar className="size-4 text-[#007834]" />
                <span>Staż ubezpieczenia w dniach</span>
              </label>
              <input
                id="insured-days"
                type="number"
                min="0"
                className="zus-input"
                value={input.insuredDays || ''}
                onChange={(e) => update('insuredDays', Math.max(0, Number(e.target.value) || 0))}
                placeholder="np. 365"
              />
              <span style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: '4px' }}>
                Karencja chorobowa: min. {waitingPeriodDays(input.employment)} dni ({input.employment === 'uop' ? 'przy UoP brak karencji na macierzyński' : 'wymagana ciągłość'})
              </span>
            </div>

            <div className="zus-form-group">
              <label className="zus-label" htmlFor="due-date" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar className="size-4 text-[#007834]" />
                <span>{input.role === 'guardian' ? 'Data przyjęcia dziecka' : 'Planowana data porodu'}</span>
              </label>
              <input
                id="due-date"
                type="date"
                required
                className="zus-input"
                value={input.dueDate}
                onChange={(e) => update('dueDate', e.target.value)}
              />
              <span style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: '4px' }}>
                Wyznacza początek okresów zasiłkowych oraz 21-dniowy termin na wniosek długi (81,5%).
              </span>
            </div>
          </div>

          {/* 4. Wynagrodzenie brutto / podstawa składek */}
          <div className="zus-form-group">
            <label className="zus-label" htmlFor="gross-salary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard className="size-4 text-[#007834]" />
              <span>
                {input.employment === 'jdg'
                  ? 'Zadeklarowana miesięczna podstawa wymiaru składek (PLN)'
                  : 'Średnie miesięczne wynagrodzenie brutto (PLN)'}
              </span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="gross-salary"
                type="number"
                min="0"
                step="50"
                required
                className="zus-input"
                value={input.grossSalary || ''}
                onChange={(e) => update('grossSalary', Math.max(0, Number(e.target.value) || 0))}
                placeholder="np. 7000"
                style={{ paddingRight: '45px' }}
              />
              <span style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontWeight: 600,
                color: '#6B7280',
                fontSize: '0.88rem',
                pointerEvents: 'none',
              }}>
                zł
              </span>
            </div>
            <span style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: '4px' }}>
              Średnia z ostatnich 12 miesięcy kalendarzowych poprzedzających miesiąc porodu (pomniejszana o 13,71% na składki ZUS).
            </span>
          </div>

          {/* 5. Sytuacje szczególne (opcjonalnie) */}
          <div style={{
            padding: '14px 16px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#00441c', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck className="size-4 text-[#007834]" />
              <span>Sytuacje szczególne i dodatkowe uprawnienia (opcjonalnie):</span>
            </div>

            {input.role === 'mother' && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.84rem' }}>
                <input
                  type="checkbox"
                  checked={input.premature}
                  onChange={(e) => update('premature', e.target.checked)}
                  style={{ marginTop: '2px', accentColor: '#007834', width: '16px', height: '16px' }}
                />
                <div>
                  <span style={{ fontWeight: 600, color: '#1A1A1A' }}>
                    Dziecko urodzi się / urodziło się jako wcześniak lub wymaga hospitalizacji
                  </span>
                  <div style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: '2px' }}>
                    Art. 180² KP – uprawnienie do uzupełniającego urlopu macierzyńskiego (do 8 lub 15 tygodni, płatne 100%).
                  </div>
                </div>
              </label>
            )}

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.84rem' }}>
              <input
                type="checkbox"
                checked={input.zaZyciem}
                onChange={(e) => update('zaZyciem', e.target.checked)}
                style={{ marginTop: '2px', accentColor: '#007834', width: '16px', height: '16px' }}
              />
              <div>
                <span style={{ fontWeight: 600, color: '#1A1A1A' }}>
                  Zaświadczenie z Ustawy „Za życiem” (ciężkie i nieodwracalne upośledzenie)
                </span>
                <div style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: '2px' }}>
                  Wydłużenie urlopu rodzicielskiego o dodatkowe 24 tygodnie (łącznie do 65 tyg.) oraz jednorazowe 4 000 zł.
                </div>
              </div>
            </label>
          </div>

          {/* Przycisk przejścia do Kroku 2 */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="zus-btn-primary"
            style={{
              width: '100%',
              padding: '14px 20px',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              opacity: canSubmit ? 1 : 0.6,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              borderRadius: '6px',
              boxShadow: canSubmit ? '0 2px 4px rgba(0, 120, 52, 0.25)' : 'none',
              marginTop: '8px',
            }}
          >
            <span>Oblicz uprawnienia i wysokość zasiłku (Przejdź do Kroku 2)</span>
            <ArrowRight className="size-4" />
          </button>
        </form>
      </div>

      {/* 2. PRAWA KOLUMNA: Wstępna kwalifikacja na żywo i wskazówki ZUS */}
      <div className="zus-card">
        <h2 className="zus-card-header-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Wstępna weryfikacja uprawnień ZUS</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#007834' }}>
            Przeliczanie na żywo
          </span>
        </h2>

        <div className="zus-results-box" style={{ padding: '0', background: 'transparent', border: 'none' }}>
          {/* Status Kwalifikacji */}
          <div style={{
            padding: '16px',
            backgroundColor: qualification.eligible ? '#E6F4EC' : '#FEE2E2',
            border: `1.5px solid ${qualification.eligible ? '#007834' : '#DC2626'}`,
            borderRadius: '8px',
            marginBottom: '18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <span className={`zus-badge ${qualification.eligible ? 'success' : 'danger'}`} style={{ fontSize: '0.86rem', padding: '6px 12px' }}>
                {qualification.eligible ? 'KWALIFIKACJA POZYTYWNA' : 'BRAK UPRAWNIEŃ DO ZASIŁKU'}
              </span>
              <span className="zus-badge info" style={{ fontSize: '0.8rem' }}>
                {input.employment === 'uop' ? 'ETAT (UOP)' : (input.employment === 'zlecenie' ? 'ZLECENIE' : 'SAMOZATRUDNIENIE (JDG)')}
              </span>
            </div>

            <p style={{
              fontSize: '0.9rem',
              color: qualification.eligible ? '#00441c' : '#991B1B',
              fontWeight: 600,
              lineHeight: 1.5,
              margin: 0,
            }}>
              {qualification.reason}
            </p>
          </div>

          {/* Statystyki wstępne na kafelkach (2x2) */}
          <div className="zus-stat-grid" style={{ marginBottom: '18px' }}>
            <div className="zus-stat-item">
              <div className="zus-stat-label">Podstawa wymiaru netto</div>
              <div className="zus-stat-value">{baseNet > 0 ? `${baseNet.toLocaleString('pl-PL')} zł` : '—'}</div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '4px' }}>
                Po potrąceniu 13,71% składek ZUS
              </div>
            </div>

            <div className="zus-stat-item">
              <div className="zus-stat-label">Wariant jednolity 81,5%</div>
              <div className="zus-stat-value" style={{ color: '#007834' }}>
                {estimatedMonthlyUnified > 0 ? `${estimatedMonthlyUnified.toLocaleString('pl-PL')} zł` : '—'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '4px' }}>
                Miesięcznie brutto (art. 30a)
              </div>
            </div>

            <div className="zus-stat-item">
              <div className="zus-stat-label">Wariant zmienny 100%</div>
              <div className="zus-stat-value">{estimatedMonthly100 > 0 ? `${estimatedMonthly100.toLocaleString('pl-PL')} zł` : '—'}</div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '4px' }}>
                Początkowa stawka (następnie 70%)
              </div>
            </div>

            <div className="zus-stat-item">
              <div className="zus-stat-label">Łączny wymiar urlopów</div>
              <div className="zus-stat-value" style={{ color: '#00441c' }}>
                {input.zaZyciem ? '85 tyg.' : (input.role === 'father' ? '9 tyg. + 14 dni' : '61 tyg.')}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '4px' }}>
                Płatnych ze środków FUS
              </div>
            </div>
          </div>

          {/* Ważna wskazówka: Zasada 21 dni */}
          <div className="zus-notice-box" style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, color: '#00441c', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck className="size-4 text-[#007834]" />
              <span>Gwarancja stawki 81,5% (Zasada 21 dni):</span>
            </div>
            <div style={{ fontSize: '0.84rem', marginTop: '6px', color: '#1A1A1A', lineHeight: 1.5 }}>
              Złożenie tzw. długiego wniosku (art. 30a Ustawy zasiłkowej) nie później niż <strong>21 dni po porodzie</strong> gwarantuje wypłatę równego świadczenia <strong>81,5% podstawy</strong> przez cały okres macierzyńskiego i rodzicielskiego.
            </div>
          </div>

          {/* Podstawa prawna */}
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#4A4A4A',
            lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 700, color: '#1A1A1A', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info className="size-3.5 text-[#007834]" />
              <span>Podstawa prawna wyliczeń:</span>
            </div>
            Ustawa z dn. 25.06.1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa (Dz.U. z 2026 r. poz. 854) oraz Kodeks pracy (Dz.U. z 2026 r. poz. 1245).
          </div>
        </div>
      </div>
    </div>
  );
}
