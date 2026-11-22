import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Pencil, CheckCircle2, Wallet, CalendarDays, FileText, ShieldAlert } from 'lucide-react';
import {
  buildAlerts,
  buildDocuments,
  buildKnowledge,
  buildMilestones,
  calculate,
  defaultResultOptions,
  employmentLabels,
  hasLegalShield,
  qualify,
  roleLabels,
  type GuideInput,
} from '@/lib/guide';
import { formatPLN } from '@/lib/format';
import { calculateIntegratedParental } from '@/lib/api-client';
import type { IntegratedCalculatorInput, IntegratedCalculatorResult } from '@/types/calculator';
import { QualificationBanner } from './qualification-banner';
import { KnowledgePanel } from './knowledge-panel';
import { SummaryTab } from './tabs/summary-tab';
import { TimelineTab } from './tabs/timeline-tab';
import { DocumentsTab } from './tabs/documents-tab';
import { AlertsTab } from './tabs/alerts-tab';

type TabId = 'summary' | 'timeline' | 'documents' | 'alerts';

export function ResultsView({
  input,
  onEdit,
  onLoadSample,
}: {
  input: GuideInput;
  onEdit: () => void;
  onLoadSample: (input: GuideInput) => void;
}) {
  const [options, setOptions] = useState(defaultResultOptions);
  const [tab, setTab] = useState<TabId>('summary');
  const [backendResult, setBackendResult] = useState<IntegratedCalculatorResult | null>(null);
  const [loadingBackend, setLoadingBackend] = useState(false);

  const qualification = useMemo(() => qualify(input), [input]);
  const calc = useMemo(() => calculate(input, options), [input, options]);
  const milestones = useMemo(() => buildMilestones(input, calc), [input, calc]);
  const documents = useMemo(() => buildDocuments(input), [input]);
  const alerts = useMemo(() => {
    if (backendResult?.risk_alerts && backendResult.risk_alerts.length > 0) {
      return backendResult.risk_alerts;
    }
    return buildAlerts(input);
  }, [backendResult, input]);
  const knowledge = useMemo(() => buildKnowledge(input), [input]);

  // Połączenie z backendem FastAPI (POST /api/calculator/parental)
  useEffect(() => {
    let isMounted = true;
    setLoadingBackend(true);

    const empType =
      input.employment === 'uop'
        ? 'EMPLOYMENT_CONTRACT'
        : input.employment === 'zlecenie'
        ? 'MANDATE_CONTRACT'
        : 'B2B';

    const payload: IntegratedCalculatorInput = {
      child_birth_date: input.dueDate || '2026-06-01',
      mother_gross_monthly_income: input.role === 'mother' ? input.grossSalary : 7500,
      father_gross_monthly_income: input.role === 'father' ? input.grossSalary : 8500,
      mother_employment_type: empType,
      father_employment_type: 'EMPLOYMENT_CONTRACT',
      is_mother_insured: input.employment === 'uop' || input.sicknessInsurance,
      is_father_insured: true,
      insurance_duration_days: input.insuredDays,
      insured_days: input.insuredDays,
      sickness_insurance: input.employment === 'uop' || input.sicknessInsurance,
      children_count: 1,
      chosen_variant: options.variant === 'single' ? 'UNIFIED_81_5' : 'VARIABLE_100_70',
      applied_within_21_days: options.variant === 'single',
      include_paternity_leave: true,
      paternity_start_offset_days: 14,
      include_pregnancy_sick_leave: input.role === 'mother',
      pregnancy_sick_leave_days: 30,
      special_case_type: input.zaZyciem
        ? 'ZA_ZYCIEM'
        : input.premature
        ? 'PREMATURE'
        : input.role === 'guardian'
        ? 'ADOPTION'
        : null,
      has_za_zyciem_certificate: input.zaZyciem,
      premature_birth_week: input.premature ? 27 : null,
      is_adoption: input.role === 'guardian',
      work_combination: {
        enabled: options.partTime,
        parent_working: 'mother',
        work_fraction: 0.5,
        weeks_to_combine: 32,
        work_during_extended_period: true,
      },
      parental_sharing: {
        enabled: false,
        mode: 'SEQUENTIAL',
        mother_weeks: 32,
        father_weeks: 9,
      },
    };

    calculateIntegratedParental(payload)
      .then((res) => {
        if (isMounted) {
          setBackendResult(res);
          setLoadingBackend(false);
        }
      })
      .catch((err) => {
        console.warn('API parent error, using fallback', err);
        if (isMounted) setLoadingBackend(false);
      });

    return () => {
      isMounted = false;
    };
  }, [input, options]);

  return (
    <div style={{ width: '100%', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Pasek statusu u góry z informacją o profilu i przyciskami akcji */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div style={{ fontSize: '0.94rem', color: '#4A4A4A' }}>
          Profil obliczeń:{' '}
          <strong style={{ color: '#00441c' }}>{roleLabels[input.role]}</strong> ·{' '}
          <span>{employmentLabels[input.employment]}</span> ·{' '}
          <strong style={{ color: '#007834' }}>{formatPLN(input.grossSalary, true)} brutto</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #CBD5E0',
              borderRadius: '6px',
              fontSize: '0.86rem',
              fontWeight: 600,
              color: '#1A1A1A',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#007834';
              e.currentTarget.style.color = '#007834';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E0';
              e.currentTarget.style.color = '#1A1A1A';
            }}
          >
            <Pencil className="size-3.5 text-[#007834]" />
            <span>Zmień dane (Krok 1)</span>
          </button>
        </div>
      </div>

      {/* Główny baner kwalifikacji ZUS */}
      <QualificationBanner qualification={qualification} />

      {/* Układ w czystej, prostej linii (bez bocznych kolumn) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
        <div style={{ width: '100%' }}>
          {/* Zakładki szczegółowe wyników (Sticky Full-Width) */}
          <div className="zus-results-tabs-wrapper">
            <div className="zus-results-tabs-inner">
              <button
                type="button"
                className={`zus-tab-btn ${tab === 'summary' ? 'active' : ''}`}
                onClick={() => setTab('summary')}
              >
                <Wallet className="zus-tab-icon" size={18} />
                <span className="zus-tab-text-desktop">Podsumowanie i Kwota</span>
                <span className="zus-tab-text-mobile">Kwota</span>
              </button>

              <button
                type="button"
                className={`zus-tab-btn ${tab === 'timeline' ? 'active' : ''}`}
                onClick={() => setTab('timeline')}
              >
                <CalendarDays className="zus-tab-icon" size={18} />
                <span className="zus-tab-text-desktop">Oś Czasu i Terminy</span>
                <span className="zus-tab-text-mobile">Terminy</span>
              </button>

              <button
                type="button"
                className={`zus-tab-btn ${tab === 'documents' ? 'active' : ''}`}
                onClick={() => setTab('documents')}
              >
                <FileText className="zus-tab-icon" size={18} />
                <span className="zus-tab-text-desktop">Dokumenty i Wnioski</span>
                <span className="zus-tab-text-mobile">Wnioski</span>
              </button>

              <button
                type="button"
                className={`zus-tab-btn ${tab === 'alerts' ? 'active' : ''}`}
                onClick={() => setTab('alerts')}
              >
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <ShieldAlert className="zus-tab-icon" size={18} />
                  {alerts.length > 0 && (
                    <span className="zus-tab-badge-mobile">
                      {alerts.length}
                    </span>
                  )}
                </div>
                <span className="zus-tab-text-desktop">Alerty i Ochrona</span>
                <span className="zus-tab-text-mobile">Alerty</span>
                {alerts.length > 0 && (
                  <span className="zus-tab-badge-desktop">
                    {alerts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Zawartość wybranej zakładki */}
          {tab === 'summary' && (
            <SummaryTab
              qualification={qualification}
              calc={calc}
              options={options}
              onOptionsChange={setOptions}
              onShowAlerts={() => setTab('alerts')}
              backendResult={backendResult}
            />
          )}

          {tab === 'timeline' && (
            <TimelineTab milestones={milestones} backendResult={backendResult} />
          )}

          {tab === 'documents' && (
            <DocumentsTab key={`${input.role}-${input.employment}`} documents={documents} />
          )}

          {tab === 'alerts' && (
            <AlertsTab
              alerts={alerts}
              shielded={hasLegalShield(input)}
            />
          )}
        </div>

        {/* Sekcja dolna: Przewodnik sytuacji i dodatkowe wyjaśnienia ZUS w prostej linii */}
        <section style={{ width: '100%', borderTop: '1px solid #E2E8F0', paddingTop: '28px' }}>
          <KnowledgePanel cards={knowledge} />
        </section>
      </div>
    </div>
  );
}
