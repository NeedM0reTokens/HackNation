import React, { useEffect, useState } from 'react';
import { getMobywatelIdentities, type MobywatelIdentity } from '@/lib/api-client';

interface MobywatelMockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIdentity: (pesel: string, identity?: MobywatelIdentity) => Promise<void>;
  isLoggingIn?: boolean;
}

interface PersonaDetails {
  scenarioTitle: string;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  avatarBg: string;
  employmentLabel: string;
  benefitStatus: string;
  specialCase: string;
  description: string;
}

const PERSONA_METADATA: Record<string, PersonaDetails> = {
  '92011501234': {
    scenarioTitle: 'Przyszła Matka — Etat (UoP) + Ciąża',
    badgeText: 'UoP • CIĄŻA • 100%',
    badgeBg: '#064e3b',
    badgeColor: '#34d399',
    avatarBg: '#059669',
    employmentLabel: 'Umowa o pracę (TechPol Sp. z o.o.)',
    benefitStatus: '100% podstawy (kod B - ciąża)',
    specialCase: 'Aktywne e-ZLA (30 dni), karencja spełniona',
    description:
      'Główny scenariusz rodzicielski: pracownica etatowa w ciąży ze zwolnieniem lekarskim kod B (100% zasiłku), pełne prawo do urlopu macierzyńskiego i rodzicielskiego.',
  },
  '89032005678': {
    scenarioTitle: 'Przyszły Ojciec — Urlop Ojcowski',
    badgeText: 'UoP • OJCOWSKI • 14 DNI',
    badgeBg: '#1e3a8a',
    badgeColor: '#60a5fa',
    avatarBg: '#2563eb',
    employmentLabel: 'Umowa o pracę (Logistics Pro S.A.)',
    benefitStatus: '100% zasiłku ojcowskiego (14 dni)',
    specialCase: '9 tygodni nieprzenoszalnego urlopu dla ojca',
    description:
      'Scenariusz praw ojca: pełny wymiar 14 dni urlopu ojcowskiego (100%), możliwość przejęcia części urlopu macierzyńskiego po 14 tyg. matki oraz 9 tyg. urlopu rodzicielskiego.',
  },
  '95081012345': {
    scenarioTitle: 'Zleceniobiorca — Ubezpieczenie Dobrowolne',
    badgeText: 'ZLECENIE • KARENCJA 90 DNI',
    badgeBg: '#581c87',
    badgeColor: '#c084fc',
    avatarBg: '#7c3aed',
    employmentLabel: 'Umowa zlecenie (Creative Media Sp. z o.o.)',
    benefitStatus: 'Dobrowolne chorobowe zgłoszone',
    specialCase: 'Karencja 90 dni spełniona (staż: 180 dni)',
    description:
      'Scenariusz umowy cywilnoprawnej: dobrowolne ubezpieczenie chorobowe, 90-dniowy okres wyczekiwania, prawo do zasiłku macierzyńskiego na takich samych zasadach jak pracownik.',
  },
  '85040398765': {
    scenarioTitle: 'Przedsiębiorca (JDG) — Zadłużenie w ZUS',
    badgeText: '⚠️ JDG • BLOKADA ART. 2A',
    badgeBg: '#7f1d1d',
    badgeColor: '#f87171',
    avatarBg: '#dc2626',
    employmentLabel: 'Działalność gospodarcza (JDG B2B)',
    benefitStatus: 'WSTRZYMANIE WYPŁATY ŚWIADCZEŃ',
    specialCase: 'Dług 1 250,00 zł > limit 48,06 zł (art. 2a)',
    description:
      'Scenariusz weryfikacji zadłużenia: zaległość składkowa przekraczająca 1% minimalnego wynagrodzenia blokuje wypłatę zasiłków w myśl art. 2a ustawy zasiłkowej (6 m-cy na spłatę).',
  },
  '99010155555': {
    scenarioTitle: 'Obywatelka bez Ubezpieczenia',
    badgeText: 'BRAK UBEZP. • KOSINIAKOWE',
    badgeBg: '#334155',
    badgeColor: '#94a3b8',
    avatarBg: '#475569',
    employmentLabel: 'Brak aktywnego tytułu do ubezpieczeń',
    benefitStatus: 'Brak prawa do zasiłku z FUS/ZUS',
    specialCase: 'Alternatywa: Świadczenie rodzicielskie (1000 zł)',
    description:
      'Scenariusz negatywny: osoba nieubezpieczona — system diagnozuje brak prawa do zasiłków ze składek ZUS i automatycznie rekomenduje świadczenie rodzicielskie z MOPS/GOPS (Kosiniakowe).',
  },
  '80051209876': {
    scenarioTitle: 'Inspektor ZUS — Administrator Systemu',
    badgeText: 'ADMIN • PANEL ZARZĄDCZY',
    badgeBg: '#134e4a',
    badgeColor: '#2dd4bf',
    avatarBg: '#0d9488',
    employmentLabel: 'Centrala ZUS / Departament Zasiłków',
    benefitStatus: 'Rola administratora (uprawnienia RBAC)',
    specialCase: 'Dostęp do konfiguracji wskaźników prawnych',
    description:
      'Konto inspektora ZUS z uprawnieniami administracyjnymi: dostęp do panelu edycji stawek ustawowych (100/70/81.5%, płaca minimalna, limity zadłużenia) w locie bez restartu.',
  },
};

const DEFAULT_PERSONA: PersonaDetails = {
  scenarioTitle: 'Profil Obywatela (Symulacja dynamiczna)',
  badgeText: 'PROFIL MOCK • ZUS',
  badgeBg: '#1e293b',
  badgeColor: '#93c5fd',
  avatarBg: '#3b82f6',
  employmentLabel: 'Umowa o pracę (standard)',
  benefitStatus: 'Standardowe prawo do zasiłku',
  specialCase: 'Generowane dynamicznie na podstawie PESEL',
  description: 'Profil demonstracyjny wygenerowany na podstawie wskazanego numeru identyfikacyjnego PESEL.',
};

export const MobywatelMockModal: React.FC<MobywatelMockModalProps> = ({
  isOpen,
  onClose,
  onSelectIdentity,
  isLoggingIn = false,
}) => {
  const [identities, setIdentities] = useState<MobywatelIdentity[]>([]);
  const [customPesel, setCustomPesel] = useState('');
  const [selectedPesel, setSelectedPesel] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingList(true);
      getMobywatelIdentities()
        .then((data) => setIdentities(data))
        .finally(() => setLoadingList(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChoose = async (pesel: string, idItem?: MobywatelIdentity) => {
    setSelectedPesel(pesel);
    try {
      await onSelectIdentity(pesel, idItem);
    } finally {
      setSelectedPesel(null);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customPesel.trim();
    if (!clean) return;
    handleChoose(clean);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(5, 10, 20, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          backgroundColor: '#0b1120',
          border: '2px solid #38bdf8',
          borderRadius: '16px',
          boxShadow: '0 0 40px rgba(56, 189, 248, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* NAGŁÓWEK MOCKOWY (DEV / SANDBOX STYLE) */}
        <div
          style={{
            backgroundColor: '#030712',
            borderBottom: '2px solid #1e293b',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          {/* Ozdobny pasek "DEV TESTBED" */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #f59e0b, #38bdf8, #a855f7, #10b981)',
            }}
          />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>⚠️</span> SYMULATOR IDP (MOCK)
              </span>
              <span
                style={{
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid #334155',
                }}
              >
                LOGIN.GOV.PL / mOBYWATEL WĘZEŁ KRAJOWY
              </span>
            </div>
            <h2
              id="mock-modal-title"
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#ffffff',
                margin: '6px 0 2px 0',
                letterSpacing: '-0.02em',
              }}
            >
              Wybierz tożsamość testową obywatela
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0 }}>
              Środowisko symulujące zewnętrzną bramkę mObywatel. Kliknij osobę, aby wywołać autentykację i załadować profil ZUS.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingIn}
            title="Zamknij symulator i wróć do portalu"
            style={{
              background: '#1e293b',
              border: '1px solid #475569',
              color: '#cbd5e1',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              lineHeight: 1,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1e293b';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            &times;
          </button>
        </div>

        {/* ZAWARTOŚĆ Z PRZEWIJANIEM */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* BANER OSTRZEGAWCZY O MOCKU */}
          <div
            style={{
              backgroundColor: '#172554',
              border: '1px solid #2563eb',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '1.3rem', lineHeight: 1, marginTop: '2px' }}>ℹ️</div>
            <div style={{ fontSize: '0.82rem', color: '#bfdbfe', lineHeight: 1.45 }}>
              <strong style={{ color: '#ffffff' }}>Informacja dla Kapituły HackNation:</strong> Ten ekran celowo posiada odmienną stylistykę konsoli deweloperskiej, aby jednoznacznie odróżnić symulację zewnętrznego dostawcy tożsamości (Węzeł Krajowy Login.gov.pl / mObywatel) od właściwego interfejsu portalu ZUS. Wybór profilu wywoła endpoint <code>POST /api/auth/mobywatel/login</code> oraz zasili kalkulatory danymi ze składek i e-ZLA.
            </div>
          </div>

          {/* GRID OSÓB */}
          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Ładowanie listy profili obywateli...
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              {identities.map((item) => {
                const meta = PERSONA_METADATA[item.pesel] || DEFAULT_PERSONA;
                const initials = `${item.first_name[0] || 'O'}${item.last_name[0] || 'B'}`;
                const isSelected = selectedPesel === item.pesel || (isLoggingIn && selectedPesel === item.pesel);

                return (
                  <div
                    key={item.pesel}
                    role="button"
                    tabIndex={0}
                    onClick={() => !isLoggingIn && handleChoose(item.pesel, item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isLoggingIn) handleChoose(item.pesel, item);
                      }
                    }}
                    style={{
                      backgroundColor: '#111827',
                      border: isSelected ? '2px solid #38bdf8' : '1px solid #1f2937',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: isLoggingIn ? 'wait' : 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      boxShadow: isSelected
                        ? '0 0 20px rgba(56, 189, 248, 0.4)'
                        : '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoggingIn) {
                        e.currentTarget.style.borderColor = '#38bdf8';
                        e.currentTarget.style.backgroundColor = '#172033';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoggingIn) {
                        e.currentTarget.style.borderColor = isSelected ? '#38bdf8' : '#1f2937';
                        e.currentTarget.style.backgroundColor = '#111827';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <div>
                      {/* GÓRNY PASEK KARTY: AVATAR + IMIĘ I NAZWISKO + ROLA BADGE */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            backgroundColor: meta.avatarBg,
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <h3
                              style={{
                                fontSize: '1.05rem',
                                fontWeight: 800,
                                color: '#ffffff',
                                margin: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.first_name} {item.last_name}
                            </h3>
                          </div>
                          <span
                            style={{
                              backgroundColor: meta.badgeBg,
                              color: meta.badgeColor,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              marginTop: '3px',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {meta.badgeText}
                          </span>
                        </div>
                      </div>

                      {/* PESEL + DANE PODSTAWOWE */}
                      <div
                        style={{
                          backgroundColor: '#0a0f1d',
                          border: '1px solid #1e293b',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.78rem',
                        }}
                      >
                        <span style={{ color: '#64748b' }}>PESEL:</span>
                        <code
                          style={{
                            color: '#38bdf8',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: '0.86rem',
                          }}
                        >
                          {item.pesel}
                        </code>
                      </div>

                      {/* SZCZEGÓŁY SCENARIUSZA */}
                      <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '8px', lineHeight: 1.4 }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>
                          Scenariusz testowy:
                        </div>
                        <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{meta.scenarioTitle}</div>
                        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.75rem' }}>
                          {meta.description}
                        </p>
                      </div>

                      {/* STATUSY / BADGE CECHY */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          fontSize: '0.74rem',
                          borderTop: '1px solid #1f2937',
                          paddingTop: '8px',
                          marginTop: '8px',
                          color: '#94a3b8',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#e2e8f0' }}>Forma:</strong> {meta.employmentLabel}
                        </div>
                        <div>
                          <strong style={{ color: '#e2e8f0' }}>Zasiłek:</strong>{' '}
                          <span style={{ color: meta.badgeColor }}>{meta.benefitStatus}</span>
                        </div>
                        <div style={{ color: '#cbd5e1' }}>
                          • {meta.specialCase}
                        </div>
                      </div>
                    </div>

                    {/* PRZYCISK ZALOGUJ */}
                    <button
                      type="button"
                      disabled={isLoggingIn}
                      style={{
                        marginTop: '14px',
                        width: '100%',
                        backgroundColor: isSelected ? '#0284c7' : '#1e293b',
                        border: '1px solid #38bdf8',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        padding: '9px 14px',
                        borderRadius: '8px',
                        cursor: isLoggingIn ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoggingIn) {
                          e.currentTarget.style.backgroundColor = '#38bdf8';
                          e.currentTarget.style.color = '#000000';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoggingIn) {
                          e.currentTarget.style.backgroundColor = isSelected ? '#0284c7' : '#1e293b';
                          e.currentTarget.style.color = '#ffffff';
                        }
                      }}
                    >
                      {isSelected ? (
                        <>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '14px',
                              height: '14px',
                              border: '2px solid #ffffff',
                              borderTopColor: 'transparent',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                            }}
                          />
                          <span>Uwierzytelnianie w mObywatelu...</span>
                        </>
                      ) : (
                        <>
                          <span>Zaloguj jako {item.first_name}</span>
                          <span style={{ fontSize: '1rem', lineHeight: 1 }}>&rarr;</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* DOLNA SEKCJA: WPROWADZENIE WŁASNEGO NUMERU PESEL */}
          <div
            style={{
              backgroundColor: '#0a0f1d',
              border: '1px dashed #334155',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.85rem' }}>⚡ TESTOWANIE WŁASNEGO NUMERU PESEL:</span>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                System automatycznie wyznaczy datę urodzenia i płeć z sumy kontrolnej.
              </span>
            </div>

            <form
              onSubmit={handleCustomSubmit}
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                value={customPesel}
                onChange={(e) => setCustomPesel(e.target.value)}
                maxLength={11}
                placeholder="Wpisz 11 cyfr PESEL (np. 92051203456)"
                style={{
                  flex: '1 1 240px',
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontSize: '0.92rem',
                  padding: '9px 12px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isLoggingIn || customPesel.trim().length !== 11}
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  cursor: isLoggingIn || customPesel.trim().length !== 11 ? 'not-allowed' : 'pointer',
                  opacity: customPesel.trim().length === 11 ? 1 : 0.6,
                }}
              >
                Zaloguj wpisany PESEL
              </button>
            </form>
          </div>
        </div>

        {/* STOPKA MODALU */}
        <div
          style={{
            backgroundColor: '#030712',
            borderTop: '1px solid #1e293b',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#64748b',
          }}
        >
          <div>
            HackNation 2026 • Moduł Symulacji Integracji mObywatel / Rejestrów ZUS
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontWeight: 600,
              padding: '4px 8px',
            }}
          >
            Anuluj i zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
