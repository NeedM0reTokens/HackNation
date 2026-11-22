import React, { useMemo } from 'react';
import { CalendarPlus, Clock, ShieldAlert, CheckCircle2, FileText, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { Milestone } from '@/lib/guide';
import { downloadIcs } from '@/lib/ics';
import type { IntegratedCalculatorResult } from '@/types/calculator';

interface VerticalTimelineEvent {
  id: string;
  stepNumber: number;
  date: string;
  title: string;
  categoryLabel: string;
  isCritical?: boolean;
  isFather?: boolean;
  isMother?: boolean;
  rate?: string;
  actionRequired: string;
  legalBasis: string;
  warningNotice?: string;
  details?: string;
}

export function TimelineTab({
  milestones,
  backendResult,
}: {
  milestones: Milestone[];
  backendResult?: IntegratedCalculatorResult | null;
}) {
  // Budowa uporządkowanej chronologicznie pionowej osi czasu (bez emotek, proste napisy)
  const verticalEvents: VerticalTimelineEvent[] = useMemo(() => {
    if (backendResult && backendResult.timeline_periods && backendResult.timeline_periods.length > 0) {
      const birthDate = backendResult.child_birth_date || '2026-06-01';
      const events: Omit<VerticalTimelineEvent, 'stepNumber'>[] = [
        {
          id: 'birth',
          date: birthDate,
          title: 'Narodziny dziecka – rozpoczęcie urlopu macierzyńskiego',
          categoryLabel: 'CZĘŚĆ DLA MATKI (START)',
          isMother: true,
          rate: '100% lub 81,5% podstawy',
          actionRequired: 'Zgłoszenie urodzenia do Urzędu Stanu Cywilnego oraz pracodawcy lub ZUS.',
          legalBasis: 'Art. 180 § 1 Kodeksu pracy',
          details: 'Od dnia porodu przysługuje obowiązkowa część urlopu macierzyńskiego matki.',
        },
      ];

      // Terminy prawne i kamienie milowe z backendu
      if (backendResult.milestones) {
        backendResult.milestones.forEach((m, idx) => {
          const isCrit = m.importance === 'CRITICAL';
          const isMom = m.title.toLowerCase().includes('matk') || m.title.toLowerCase().includes('macierzyń');
          events.push({
            id: `milestone-${idx}`,
            date: m.milestone_date,
            title: m.title,
            categoryLabel: isCrit ? 'TERMIN KRYTYCZNY (21 DNI)' : (isMom ? 'CZĘŚĆ DLA MATKI' : 'TERMIN PROCEDURALNY'),
            isCritical: isCrit,
            isMother: isMom && !isCrit,
            actionRequired: m.action_required,
            legalBasis: m.legal_basis,
            warningNotice: isCrit
              ? 'Niezłożenie wniosku w terminie 21 dni pozbawia prawa do równej stawki 81,5% i wymusza wariant zmienny (100% / 70%).'
              : undefined,
            details: m.action_required,
          });
        });
      }

      // Okresy zakończenia poszczególnych urlopów
      backendResult.timeline_periods.forEach((p) => {
        if (!events.some((e) => e.date === p.end_date)) {
          const isDad = p.person === 'father';
          const isMom = p.person === 'mother';
          events.push({
            id: `period-end-${p.id}`,
            date: p.end_date,
            title: `Zakończenie etapu: ${p.name}`,
            categoryLabel: isDad ? 'CZĘŚĆ DLA OJCA' : 'CZĘŚĆ DLA MATKI',
            isFather: isDad,
            isMother: isMom,
            rate: `${p.rate_percentage}% podstawy wymiaru`,
            actionRequired: `Rozliczenie etapu lub przejście do kolejnej części urlopu rodzicielskiego.`,
            legalBasis: 'Ustawa zasiłkowa / Kodeks pracy',
            details: `Wymiar etapu: ${p.weeks} tygodni (${p.days} dni). Świadczenie miesięczne netto: ${p.monthly_benefit_net} zł.`,
          });
        }
      });

      // Sortowanie od najwcześniejszej do najpóźniejszej daty
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Przypisanie kolejnych numerów kroków
      return events.map((ev, index) => ({
        ...ev,
        stepNumber: index + 1,
      }));
    }

    // Ścieżka rezerwowa gdy brak odpowiedzi z backendu
    return milestones.map((m, idx) => {
      const isCrit = m.kind === 'deadline';
      const isMom = m.title.toLowerCase().includes('matk') || m.title.toLowerCase().includes('macierzyń');
      return {
        id: m.id,
        stepNumber: idx + 1,
        date: m.date,
        title: m.title,
        categoryLabel: isCrit ? 'TERMIN KRYTYCZNY' : (isMom ? 'CZĘŚĆ DLA MATKI' : 'TERMIN PRAWNY'),
        isCritical: isCrit,
        isMother: isMom && !isCrit,
        actionRequired: m.description,
        legalBasis: 'Ustawa o świadczeniach pieniężnych z ubezpieczenia społecznego (Dz.U. z 2026 r. poz. 854)',
        details: m.description,
      };
    });
  }, [backendResult, milestones]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* GŁÓWNY KONTENER PIONOWEJ OSI CZASU */}
      <div className="zus-vertical-timeline-container">
        {/* Nagłówek osi czasu */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="zus-official-pill">Harmonogram ZUS</span>
              <span style={{ fontSize: '0.82rem', color: '#007834', fontWeight: 700 }}>
                Kolejność chronologiczna (od góry do dołu)
              </span>
            </div>
            <h2 style={{ fontSize: '1.28rem', fontWeight: 800, color: '#1A1A1A', marginTop: '6px', margin: 0 }}>
              Pionowa Oś Czasu Urlopów i Obowiązków Prawnych
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#4A4A4A', margin: '4px 0 0 0' }}>
              Przejrzysty harmonogram krok po kroku. Każdy punkt zawiera termin kalendarzowy, wymagany wniosek oraz podstawę prawną.
            </p>
          </div>

          <button
            type="button"
            onClick={() => downloadIcs(milestones)}
            className="zus-btn-outline-pue"
            style={{ height: '38px', fontSize: '0.85rem' }}
          >
            <CalendarPlus className="size-4" />
            <span>Pobierz terminy do kalendarza (.ics)</span>
          </button>
        </div>

        {/* PIONOWA OŚ CZASU OD GÓRY DO DOŁU */}
        <div className="zus-vertical-timeline">
          {/* Ciągła linia pionowa */}
          <div className="zus-vertical-timeline-line" />

          {verticalEvents.map((item) => (
            <div key={item.id} className="zus-vtimeline-item">
              {/* Węzeł z numerem kroku (bez emotek!) */}
              <div
                className={`zus-vtimeline-node ${item.isCritical ? 'critical' : ''} ${item.isFather ? 'father' : ''} ${item.isMother ? 'mother' : ''}`}
                title={`Krok ${item.stepNumber}`}
              >
                {item.stepNumber}
              </div>

              {/* Karta szczegółów danego etapu */}
              <div className={`zus-vtimeline-card ${item.isCritical ? 'critical' : ''} ${item.isFather ? 'father' : ''} ${item.isMother ? 'mother' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: item.isCritical
                          ? '#DC2626'
                          : item.isFather
                          ? '#E8F1F8'
                          : item.isMother
                          ? '#FCE7EC'
                          : '#E6F4EC',
                        color: item.isCritical
                          ? '#FFFFFF'
                          : item.isFather
                          ? '#003B6F'
                          : item.isMother
                          ? '#831843'
                          : '#00441c',
                        border: `1px solid ${
                          item.isCritical
                            ? '#B91C1C'
                            : item.isFather
                            ? '#B8D5E5'
                            : item.isMother
                            ? '#F5B8CB'
                            : '#99D2AF'
                        }`,
                      }}
                    >
                      {item.categoryLabel}
                    </span>
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: item.isCritical
                          ? '#DC2626'
                          : item.isFather
                          ? '#003B6F'
                          : item.isMother
                          ? '#942754'
                          : '#007834',
                      }}
                    >
                      Termin: {formatDate(item.date)}
                    </span>
                  </div>

                  {item.rate && (
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: item.isMother ? '#831843' : '#00441c',
                        backgroundColor: item.isMother ? '#FDF2F5' : '#F0F9F4',
                        border: item.isMother ? '1px solid #F5B8CB' : 'none',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      Wysokość zasiłku: {item.rate}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: item.isCritical ? '#B91C1C' : (item.isMother ? '#831843' : '#1A1A1A'), margin: '0 0 6px 0', lineHeight: 1.3 }}>
                  {item.title}
                </h3>

                <p style={{ fontSize: '0.86rem', color: item.isCritical ? '#7F1D1D' : '#374151', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                  <strong>Wymagane działanie:</strong> {item.actionRequired}
                </p>

                {item.warningNotice && (
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#FEE2E2',
                      border: '1.5px solid #DC2626',
                      borderRadius: '6px',
                      fontSize: '0.84rem',
                      color: '#7F1D1D',
                      fontWeight: 700,
                      marginBottom: '8px',
                      lineHeight: 1.45,
                      boxShadow: '0 1px 3px rgba(220, 38, 38, 0.15)',
                    }}
                  >
                    UWAGA: {item.warningNotice}
                  </div>
                )}

                {item.details && item.details !== item.actionRequired && (
                  <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: '6px' }}>
                    {item.details}
                  </div>
                )}

                <div style={{ fontSize: '0.76rem', color: '#6B7280', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                  Podstawa prawna: <em>{item.legalBasis}</em>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KALENDARZOWE ZESTAWIENIE OKRESÓW ZASIŁKOWYCH (BEZ EMOTEK) */}
      {backendResult && backendResult.timeline_periods && backendResult.timeline_periods.length > 0 && (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#00441c', marginBottom: '4px', margin: 0 }}>
            Zestawienie Kalendarzowe Okresów Zasiłkowych
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 16px 0' }}>
            Daty graniczne od dnia urodzenia dziecka ({backendResult.child_birth_date}) do zakończenia świadczeń ({backendResult.timeline_end_date}).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {backendResult.timeline_periods.map((period) => {
              const isDad = period.person === 'father';
              const isMom = period.person === 'mother';

              return (
                <div
                  key={period.id}
                  style={{
                    border: isMom ? '1.5px solid #F8CBDC' : '1px solid #E2E8F0',
                    borderLeft: `4px solid ${isDad ? '#003B6F' : (isMom ? '#D47094' : '#007834')}`,
                    borderRadius: '6px',
                    padding: '12px 16px',
                    backgroundColor: isMom ? '#FFF7FA' : '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: isDad ? '#E8F1F8' : (isMom ? '#FCE7EC' : '#E6F4EC'),
                        color: isDad ? '#003B6F' : (isMom ? '#831843' : '#00441c'),
                        border: `1px solid ${isDad ? '#B8D5E5' : (isMom ? '#F5B8CB' : '#99D2AF')}`,
                        marginBottom: '4px',
                      }}>
                        {isDad ? 'BENEFICJENT: OJCIEC' : 'BENEFICJENT: MATKA'} · {period.weeks} TYGODNI ({period.days} DNI)
                      </span>
                      <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#1A1A1A' }}>
                        {period.name}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isDad ? '#003B6F' : (isMom ? '#942754' : '#007834') }}>
                        {period.rate_percentage}% podstawy
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                        Wypłata przez: {period.payer}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '0.82rem',
                    marginTop: '8px',
                    color: '#4A4A4A',
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <strong>Okres:</strong> od {period.start_date} do {period.end_date}
                    </div>
                    <div>
                      <strong>Wypłata netto:</strong> {period.monthly_benefit_net} zł / miesiąc ({period.total_benefit_net} zł łącznie)
                    </div>
                    {period.work_fraction > 0 && (
                      <div>
                        <strong>Praca na części etatu:</strong> {period.work_fraction * 100}% etatu (+{period.monthly_salary_gross} zł brutto pensji)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
