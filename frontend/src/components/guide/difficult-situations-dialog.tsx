import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HeartHandshake, X, Phone, ShieldCheck, AlertCircle } from 'lucide-react';

const situations = [
  {
    title: 'Wcześniak lub dziecko wymagające hospitalizacji',
    badge: 'DODATKOWY URLOP DO 15 TYGODNI',
    badgeColor: '#003B6F',
    badgeBg: '#E8F1F8',
    body: 'Przysługuje uzupełniający urlop macierzyński: do 8 tygodni (wcześniak urodzony w 28–36. tyg. ciąży) lub do 15 tygodni (urodzenie przed 28. tyg. ciąży lub waga poniżej 1000g). Świadczenie płatne jest w wysokości 100% podstawy.',
    legal: 'Art. 180 § 5–17 Kodeksu pracy',
  },
  {
    title: 'Hospitalizacja matki po porodzie',
    badge: 'PRZEKAZANIE OPIEKI OJCU',
    badgeColor: '#007834',
    badgeBg: '#E6F4EC',
    body: 'Po wykorzystaniu pierwszych 8 tygodni urlopu macierzyńskiego matka przebywająca w szpitalu może przerwać urlop, a niewykorzystaną część zasiłku i urlopu przejmuje ojciec dziecka lub inny uprawniony członek najbliższej rodziny.',
    legal: 'Art. 180 § 6–8 Kodeksu pracy',
  },
  {
    title: 'Utrata dziecka / martwe urodzenie',
    badge: 'GWARANTOWANE 8 TYGODNI ZASIŁKU',
    badgeColor: '#991B1B',
    badgeBg: '#FEE2E2',
    body: 'W przypadku martwego porodu matce przysługuje urlop macierzyński w wymiarze 8 tygodni (56 dni) z prawem do 100% zasiłku macierzyńskiego. Nie ma wymogu rejestracji ani załatwiania formalności natychmiast.',
    legal: 'Art. 180¹ § 1 Kodeksu pracy',
  },
];

const foundations = [
  {
    name: 'Rzecznik Praw Pacjenta',
    phone: '800 190 590',
    desc: 'Ogólnopolska bezpłatna infolinia (pn–pt 8:00–18:00) – prawa pacjentek i wsparcie proceduralne.',
  },
  {
    name: 'Fundacja „Wcześniak Rodzice – Rodzicom"',
    phone: 'wczesniak.pl',
    desc: 'Bezpłatne konsultacje, wypożyczalnia sprzętu i wsparcie dla rodziców hospitalizowanych noworodków.',
  },
  {
    name: 'Fundacja Rodzić po Ludzku',
    phone: 'rodzicpoludzku.pl',
    desc: 'Monitoring standardów opieki okołoporodowej, prawa pacjentki i pomoc prawna.',
  },
  {
    name: 'Fundacja Dlaczego',
    phone: 'dlaczego.org.pl',
    desc: 'Grupy wsparcia i bezpłatna pomoc psychologiczna dla rodziców po stracie dziecka.',
  },
];

export function DifficultSituationsDialog() {
  const [isOpen, setIsOpen] = useState(false);

  // Blokada przewijania tła i obsługa klawisza Escape
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const modalContent = isOpen ? (
    <div
      className="zus-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        className="zus-modal"
        style={{
          backgroundColor: '#FFFFFF',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '10px',
          borderTop: '5px solid #003B6F',
          boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          animation: 'zusFadeIn 0.2s ease-out',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="difficult-situations-title"
      >
        {/* Nagłówek modala */}
        <div
          style={{
            padding: '16px 22px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#E8F1F8',
                color: '#003B6F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HeartHandshake className="size-5" />
            </div>
            <div>
              <h2
                id="difficult-situations-title"
                style={{ fontSize: '1.12rem', fontWeight: 800, color: '#1A1A1A', margin: 0 }}
              >
                Trudne Sytuacje Losowe i Ochrona Zasiłkowa
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                Procedury ZUS, urlopy uzupełniające oraz kontakty pomocowe
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Zamknij okno"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Zawartość przewijana */}
        <div
          style={{
            padding: '22px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              fontSize: '0.86rem',
              color: '#1E3A8A',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <ShieldCheck className="size-5 text-[#2563EB] shrink-0" style={{ marginTop: '2px' }} />
            <div>
              <strong>Spokojnie – prawo do świadczeń i ochrony nie przepada.</strong> W polskim systemie prawnym rodzice w sytuacji komplikacji okołoporodowych są objęci szczególnymi gwarancjami finansowymi i urlopowymi.
            </div>
          </div>

          {/* 3 główne karty sytuacji */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {situations.map((item) => (
              <div
                key={item.title}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
                    {item.title}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: item.badgeBg,
                      color: item.badgeColor,
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: '0 0 6px 0', lineHeight: 1.5 }}>
                  {item.body}
                </p>
                <div style={{ fontSize: '0.76rem', color: '#6B7280' }}>
                  Podstawa prawna: <em>{item.legal}</em>
                </div>
              </div>
            ))}
          </div>

          {/* Organizacje wsparcia */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Phone className="size-4 text-[#003B6F]" />
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#003B6F', margin: 0 }}>
                Zweryfikowane Organizacje i Infolinie Wsparcia
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              {foundations.map((foundation) => (
                <div
                  key={foundation.name}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E0',
                    borderRadius: '6px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1A1A1A' }}>
                      {foundation.name}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#007834' }}>
                      {foundation.phone}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '3px' }}>
                    {foundation.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stopka z przyciskiem zamykającym */}
        <div
          style={{
            padding: '14px 22px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="zus-btn-primary"
            style={{
              height: '38px',
              padding: '0 20px',
              fontSize: '0.88rem',
              fontWeight: 700,
            }}
          >
            Rozumiem i zamykam
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="zus-btn-outline-pue"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          height: '42px',
          padding: '0 16px',
          fontSize: '0.88rem',
          fontWeight: 600,
          cursor: 'pointer',
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #003B6F',
          color: '#003B6F',
          borderRadius: '6px',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
        title="Kliknij, aby otworzyć procedury dla trudnych sytuacji"
      >
        <HeartHandshake className="size-4 text-[#003B6F]" />
        <span>Trudne sytuacje (wcześniak, hospitalizacja, utrata dziecka)</span>
      </button>

      {typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
}
