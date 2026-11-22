import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, ShieldOff, Info } from 'lucide-react';
import type { RiskAlert } from '@/lib/guide';
import { DifficultSituationsDialog } from '../difficult-situations-dialog';
import { AiFieldExplainer } from '@/components/ai/AiFieldExplainer';

export function AlertsTab({
  alerts,
  shielded,
}: {
  alerts: RiskAlert[];
  shielded: boolean;
  isBackendVerified?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. SEKCJA: CZERWONE FLAGI I WERYFIKACJA RYZYK */}
      <section aria-labelledby="red-flags-heading" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <div>
            <h2 id="red-flags-heading" style={{ fontSize: '1.18rem', fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
              Czerwone Flagi i Ryzyka Kontrolne ZUS
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#6B7280', margin: '2px 0 0 0' }}>
              Automatyczna analiza ciągłości ubezpieczenia, pozorności umów oraz okresów karencji.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <AiFieldExplainer topicId="ryzyko-pozornosc-umowy" label="Pozorność zatrudnienia" buttonText="Kontrola ZUS" />
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: alerts.length === 0 ? '#E6F4EC' : '#FEE2E2',
                color: alerts.length === 0 ? '#007834' : '#DC2626',
                border: `1px solid ${alerts.length === 0 ? '#99D2AF' : '#FCA5A5'}`,
              }}
            >
              {alerts.length === 0 ? 'STATUS: BEZPIECZNY' : `WYKRYTE RYZYKA: ${alerts.length}`}
            </span>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderLeft: '5px solid #007834',
              borderRadius: '8px',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#E6F4EC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 className="size-5 text-[#007834]" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#00441c', margin: 0 }}>
                Nie wykryliśmy ryzyk w Twojej sytuacji
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#4A4A4A', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                Podane parametry (forma zatrudnienia, staż i opłacanie składek) spełniają ustawowe kryteria. ZUS nie ma formalnych podstaw do kwestionowania prawa do zasiłku macierzyńskiego ani weryfikacji okresu wyczekiwania.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  borderLeft: '5px solid #DC2626',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                    {alert.title}
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: '#7F1D1D', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                    {alert.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. SEKCJA: TARCZA OCHRONNA (KODEKS PRACY VS SAMOZATRUDNIENIE) */}
      <section aria-labelledby="shield-heading" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h2 id="shield-heading" style={{ fontSize: '1.18rem', fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
          Ochrona Prawna Trwałości Zatrudnienia
        </h2>

        {shielded ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderLeft: '5px solid #003B6F',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#E8F1F8',
                  color: '#003B6F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.04rem', fontWeight: 800, color: '#003B6F', margin: 0 }}>
                  Twoja Tarcza Ochronna – Kodeks Pracy (Umowa o Pracę)
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#007834', fontWeight: 700 }}>
                  Gwarancja trwałości stosunku pracy i ochrona przed wypowiedzeniem
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#1A1A1A' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CheckCircle2 className="size-4 text-[#007834] shrink-0" style={{ marginTop: '3px' }} />
                <div>
                  <strong>Zakaz wypowiedzenia i rozwiązania umowy:</strong> Pracodawca nie może wypowiedzieć ani rozwiązać umowy o pracę w okresie ciąży oraz w czasie korzystania z urlopu macierzyńskiego i rodzicielskiego (chyba że zachodzą przyczyny uzasadniające rozwiązanie bez wypowiedzenia z winy pracownicy lub ogłoszono upadłość pracodawcy).
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CheckCircle2 className="size-4 text-[#007834] shrink-0" style={{ marginTop: '3px' }} />
                <div>
                  <strong>Automatyczne przedłużenie umowy na czas określony:</strong> Umowa o pracę zawarta na czas określony, która uległaby rozwiązaniu po upływie 3. miesiąca ciąży, ulega z mocy prawa przedłużeniu do dnia porodu.
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', fontSize: '0.78rem', color: '#6B7280' }}>
              Podstawa prawna: <em>Art. 177 § 1 oraz § 3 Kodeksu pracy (Dz.U. z 2026 r.)</em>
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderLeft: '5px solid #D97706',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldOff className="size-5" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.04rem', fontWeight: 800, color: '#92400E', margin: 0 }}>
                  Ochrona etatowa nie ma zastosowania (Zlecenie / Samozatrudnienie)
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: 600 }}>
                  Brak ochrony przed rozwiązaniem umowy na mocy Kodeksu pracy
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#4A4A4A', margin: '0 0 10px 0', lineHeight: 1.55 }}>
              Przepisy art. 177 Kodeksu pracy chroniące przed zwolnieniem dotyczą wyłącznie osób zatrudnionych na umowę o pracę. Przy działalności gospodarczej (JDG) lub umowie cywilnoprawnej kontrahent ma prawo rozwiązać umowę zgodnie z jej postanowieniami.
            </p>

            <div
              style={{
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '6px',
                padding: '10px 14px',
                fontSize: '0.84rem',
                color: '#92400E',
              }}
            >
              <strong>Zalecenie ZUS:</strong> Twoje prawo do zasiłku macierzyńskiego jest chronione, pod warunkiem że w dniu porodu podlegasz dobrowolnemu ubezpieczeniu chorobowemu. Zadbaj o terminowe opłacanie składek ZUS.
            </div>
          </div>
        )}
      </section>

      {/* 3. SEKCJA: WSPARCIE W TRUDNYCH SYTUACJACH */}
      <section
        aria-labelledby="difficult-situations-section"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderTop: '3px solid #003B6F',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ maxWidth: '620px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="zus-badge info" style={{ fontSize: '0.74rem' }}>Procedury Specjalne</span>
            <span style={{ fontSize: '0.82rem', color: '#003B6F', fontWeight: 700 }}>Kodeks Pracy & Ustawa „Za życiem”</span>
          </div>
          <h3 id="difficult-situations-section" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
            Wsparcie w Trudnych Sytuacjach Okołoporodowych
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#4A4A4A', margin: '4px 0 0 0', lineHeight: 1.5 }}>
            Wcześniejsze narodziny (do 15 tyg. uzupełniającego urlopu), hospitalizacja matki lub noworodka, a także prawo do 8 tygodni zasiłku w razie martwego urodzenia.
          </p>
        </div>

        <div>
          <DifficultSituationsDialog />
        </div>
      </section>
    </div>
  );
}
