import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Smartphone,
  X,
  ArrowRight,
  Loader2,
  User,
  AlertTriangle,
  Building2,
  FileText,
} from 'lucide-react';
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
  employmentLabel: string;
  benefitStatus: string;
  specialCase: string;
  description: string;
}

// Ujednolicony styl kart użytkowników zgodny z portalem ZUS
const UNIFIED_STYLE = {
  avatarBg: '#003B6F', // Granat instytucjonalny ZUS
  avatarColor: '#FFFFFF',
  badgeBg: '#E8F1F8',
  badgeColor: '#003B6F',
  badgeBorder: '#BAD7F0',
  benefitColor: '#007834',
};

const PERSONA_METADATA: Record<string, PersonaDetails> = {
  '92011501234': {
    scenarioTitle: 'Przyszła Matka — Etat (UoP) + Ciąża',
    badgeText: 'UoP • CIĄŻA • 100%',
    employmentLabel: 'Umowa o pracę (TechPol Sp. z o.o.)',
    benefitStatus: '100% podstawy (kod B - ciąża)',
    specialCase: 'Aktywne e-ZLA (30 dni), karencja spełniona',
    description:
      'Główny scenariusz rodzicielski: pracownica etatowa w ciąży ze zwolnieniem lekarskim kod B (100% zasiłku), pełne prawo do urlopu macierzyńskiego i rodzicielskiego.',
  },
  '89032005678': {
    scenarioTitle: 'Przyszły Ojciec — Urlop Ojcowski',
    badgeText: 'UoP • OJCOWSKI • 14 DNI',
    employmentLabel: 'Umowa o pracę (Logistics Pro S.A.)',
    benefitStatus: '100% zasiłku ojcowskiego (14 dni)',
    specialCase: '9 tygodni nieprzenoszalnego urlopu dla ojca',
    description:
      'Scenariusz praw ojca: pełny wymiar 14 dni urlopu ojcowskiego (100%), możliwość przejęcia części urlopu macierzyńskiego po 14 tyg. matki oraz 9 tyg. urlopu rodzicielskiego.',
  },
  '95081012345': {
    scenarioTitle: 'Zleceniobiorca — Ubezpieczenie Dobrowolne',
    badgeText: 'ZLECENIE • KARENCJA 90 DNI',
    employmentLabel: 'Umowa zlecenie (Creative Media Sp. z o.o.)',
    benefitStatus: 'Dobrowolne chorobowe zgłoszone',
    specialCase: 'Karencja 90 dni spełniona (staż: 180 dni)',
    description:
      'Scenariusz umowy cywilnoprawnej: dobrowolne ubezpieczenie chorobowe, 90-dniowy okres wyczekiwania, prawo do zasiłku macierzyńskiego na takich samych zasadach jak pracownik.',
  },
  '85040398765': {
    scenarioTitle: 'Przedsiębiorca (JDG) — Zadłużenie w ZUS',
    badgeText: 'JDG • BLOKADA ART. 2A',
    employmentLabel: 'Działalność gospodarcza (JDG B2B)',
    benefitStatus: 'Wstrzymanie wypłaty świadczeń (dług > limit)',
    specialCase: 'Dług 1 250,00 zł > limit 48,06 zł (art. 2a)',
    description:
      'Scenariusz weryfikacji zadłużenia: zaległość składkowa przekraczająca 1% minimalnego wynagrodzenia blokuje wypłatę zasiłków w myśl art. 2a ustawy zasiłkowej (6 m-cy na spłatę).',
  },
  '99010155555': {
    scenarioTitle: 'Obywatelka bez Ubezpieczenia',
    badgeText: 'BRAK UBEZP. • KOSINIAKOWE',
    employmentLabel: 'Brak aktywnego tytułu do ubezpieczeń',
    benefitStatus: 'Brak prawa do zasiłku z FUS/ZUS',
    specialCase: 'Alternatywa: Świadczenie rodzicielskie (1000 zł)',
    description:
      'Scenariusz negatywny: osoba nieubezpieczona — system diagnozuje brak prawa do zasiłków ze składek ZUS i automatycznie rekomenduje świadczenie rodzicielskie z MOPS/GOPS (Kosiniakowe).',
  },
  '80051209876': {
    scenarioTitle: 'Inspektor ZUS — Administrator Systemu',
    badgeText: 'ADMIN • PANEL ZARZĄDCZY',
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
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoggingIn) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1120px',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          borderTop: '5px solid #007834',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          color: '#1A1A1A',
          fontFamily: "'Segoe UI', Roboto, 'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* NAGŁÓWEK W STYLU PORTALU ZUS & mOBYWATEL */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              
            
            </div>

            <h2
              id="mock-modal-title"
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                color: '#1A1A1A',
                margin: '4px 0 2px 0',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Wybierz tożsamość obywatela do logowania
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#4A4A4A', margin: 0 }}>
              Wybierz profil demonstracyjny, aby zasymulować logowanie mObywatel i załadować profil ZUS.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingIn}
            title="Zamknij okno"
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#4A4A4A',
              borderRadius: '6px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.color = '#1A1A1A';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#4A4A4A';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ZAWARTOŚĆ Z PRZEWIJANIEM */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* DUŻY, WYRAŹNY DISCLAIMER HACKNATION */}
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

          {/* GRID OSÓB — WSZYSCY W IDENTYCZNYCH, SPÓJNYCH KOLORACH */}
          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 8px', color: '#007834' }} />
              <div>Ładowanie profili obywateli...</div>
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
                      backgroundColor: isSelected ? '#E6F4EC' : '#FFFFFF',
                      border: isSelected ? '2px solid #007834' : '1.5px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: isLoggingIn ? 'wait' : 'pointer',
                      transition: 'all 0.18s ease-in-out',
                      position: 'relative',
                      boxShadow: isSelected
                        ? '0 4px 12px rgba(0, 120, 52, 0.15)'
                        : '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoggingIn && !isSelected) {
                        e.currentTarget.style.borderColor = '#007834';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 120, 52, 0.12)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoggingIn && !isSelected) {
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <div>
                      {/* GÓRNY PASEK KARTY: IDENTYCZNY AWATAR (ZUS NAVY) + IMIĘ I NAZWISKO + IDENTYCZNY BADGE */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            backgroundColor: UNIFIED_STYLE.avatarBg,
                            color: UNIFIED_STYLE.avatarColor,
                            fontWeight: 800,
                            fontSize: '0.98rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3
                            style={{
                              fontSize: '1.05rem',
                              fontWeight: 700,
                              color: '#1A1A1A',
                              margin: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.first_name} {item.last_name}
                          </h3>
                          <span
                            style={{
                              backgroundColor: UNIFIED_STYLE.badgeBg,
                              color: UNIFIED_STYLE.badgeColor,
                              border: `1px solid ${UNIFIED_STYLE.badgeBorder}`,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              marginTop: '3px',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {meta.badgeText}
                          </span>
                        </div>
                      </div>

                      {/* PESEL + DANE PODSTAWOWE */}
                      <div
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '7px 10px',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem',
                        }}
                      >
                        <span style={{ color: '#64748B', fontWeight: 600 }}>PESEL:</span>
                        <code
                          style={{
                            color: '#0F172A',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: '0.88rem',
                            backgroundColor: '#FFFFFF',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          {item.pesel}
                        </code>
                      </div>

                      {/* SZCZEGÓŁY SCENARIUSZA */}
                      <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: '8px', lineHeight: 1.45 }}>
                        <div
                          style={{
                            color: '#64748B',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            marginBottom: '2px',
                          }}
                        >
                          Scenariusz testowy:
                        </div>
                        <div style={{ fontWeight: 700, color: '#1A1A1A' }}>{meta.scenarioTitle}</div>
                        <p style={{ margin: '4px 0 0 0', color: '#4A4A4A', fontSize: '0.78rem' }}>
                          {meta.description}
                        </p>
                      </div>

                      {/* STATUSY / CECHY */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '5px',
                          fontSize: '0.78rem',
                          borderTop: '1px solid #F1F5F9',
                          paddingTop: '9px',
                          marginTop: '9px',
                          color: '#4A4A4A',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Building2 size={13} color="#64748B" />
                          <strong style={{ color: '#1A1A1A' }}>Forma:</strong> {meta.employmentLabel}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FileText size={13} color="#64748B" />
                          <strong style={{ color: '#1A1A1A' }}>Zasiłek:</strong>{' '}
                          <span style={{ color: '#1A1A1A', fontWeight: 600 }}>
                            {meta.benefitStatus}
                          </span>
                        </div>
                        <div style={{ color: '#334155', fontWeight: 500, fontSize: '0.76rem', paddingLeft: '2px' }}>
                          • {meta.specialCase}
                        </div>
                      </div>
                    </div>

                    {/* PRZYCISK ZALOGUJ W STYLU ZUS */}
                    <button
                      type="button"
                      disabled={isLoggingIn}
                      style={{
                        marginTop: '14px',
                        width: '100%',
                        backgroundColor: isSelected ? '#005C27' : '#007834',
                        border: 'none',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        cursor: isLoggingIn ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoggingIn) {
                          e.currentTarget.style.backgroundColor = '#005C27';
                          e.currentTarget.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.15)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoggingIn) {
                          e.currentTarget.style.backgroundColor = isSelected ? '#005C27' : '#007834';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                        }
                      }}
                    >
                      {isSelected ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Logowanie do profilu...</span>
                        </>
                      ) : (
                        <>
                          <span>Zaloguj jako {item.first_name}</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          
        </div>

        {/* STOPKA MODALU W STYLU ZUS */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: '#64748B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>HackNation 2026</span>
            <span>•</span>
            <span>Zakład Ubezpieczeń Społecznych & Węzeł Krajowy Login.gov.pl</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingIn}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #CBD5E0',
              borderRadius: '4px',
              color: '#334155',
              fontWeight: 600,
              padding: '7px 16px',
              fontSize: '0.84rem',
              cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isLoggingIn) {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
                e.currentTarget.style.borderColor = '#94A3B8';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoggingIn) {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#CBD5E0';
              }
            }}
          >
            Anuluj i zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
