import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Loader2, BookOpen, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { getExplanation } from '@/lib/api-client';
import { useAppState } from '@/components/app-state';
import type { Explanation } from '@/lib/types';

export interface AiFieldExplainerProps {
  topicId: string;
  label?: string;
  buttonText?: string;
  variant?: 'pill' | 'badge' | 'compact' | 'icon';
  className?: string;
  style?: React.CSSProperties;
}

export const AiFieldExplainer: React.FC<AiFieldExplainerProps> = ({
  topicId,
  label,
  buttonText,
  variant = 'pill',
  className = '',
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<Explanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { explainTopic } = useAppState();

  // Natychmiastowe wysłanie zapytania do API po kliknięciu
  const fetchExplanation = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getExplanation(topicId);
      setData(result);
    } catch (err) {
      console.warn('[AiFieldExplainer] Błąd pobierania wyjaśnienia:', err);
    } finally {
      setIsLoading(false);
    }
  }, [topicId]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
    // Od razu wysyłamy request do API ZUS
    fetchExplanation();
  };

  // Obsługa klawisza Escape i blokada przewijania tła gdy modal jest otwarty
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

  const handleAskInChat = () => {
    setIsOpen(false);
    const fieldTitle = data?.title || label || 'to zagadnienie';
    explainTopic(topicId, fieldTitle, {
      summary: data?.summary,
      details: data?.details,
      legalBasis: data?.legalBasis,
    });
  };

  // Renderowanie przycisku aktywującego z zachowaniem znaczka AI
  const renderTrigger = () => {
    if (variant === 'icon' || variant === 'compact' || !buttonText) {
      return (
        <button
          type="button"
          onClick={handleTriggerClick}
          aria-label={`Wyjaśnij z AI: ${label || topicId}`}
          title="Wyjaśnienie AI i podstawa prawna ZUS"
          className={className}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            height: '20px',
            padding: '0 6px',
            borderRadius: '10px',
            color: '#007834',
            backgroundColor: '#E6F4EC',
            border: '1.2px solid #99D2AF',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0, 120, 52, 0.08)',
            verticalAlign: 'middle',
            flexShrink: 0,
            lineHeight: 1,
            ...style,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#D1EBD9';
            e.currentTarget.style.borderColor = '#007834';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#E6F4EC';
            e.currentTarget.style.borderColor = '#99D2AF';
          }}
        >
          <Sparkles style={{ width: '11px', height: '11px', color: '#007834', flexShrink: 0 }} />
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 900,
              color: '#007834',
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}
          >
            AI
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-label={`Wyjaśnij z AI: ${label || topicId}`}
        title="Wyjaśnienie AI i podstawa prawna ZUS"
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          height: '22px',
          padding: '0 8px',
          fontSize: '0.74rem',
          fontWeight: 700,
          color: '#005c27',
          backgroundColor: '#E6F4EC',
          border: '1.2px solid #99D2AF',
          borderRadius: '11px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          verticalAlign: 'middle',
          flexShrink: 0,
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#D1EBD9';
          e.currentTarget.style.borderColor = '#007834';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#E6F4EC';
          e.currentTarget.style.borderColor = '#99D2AF';
          e.currentTarget.style.transform = 'none';
        }}
      >
        <Sparkles style={{ width: '12px', height: '12px', color: '#007834', flexShrink: 0 }} />
        <span
          style={{
            fontSize: '0.60rem',
            fontWeight: 900,
            backgroundColor: '#007834',
            color: '#FFFFFF',
            padding: '1px 3.5px',
            borderRadius: '2px',
            lineHeight: 1,
            letterSpacing: '0.02em',
          }}
        >
          AI
        </span>
        <span style={{ color: '#00441c' }}>{buttonText}</span>
      </button>
    );
  };

  // Modal portalu renderowany na poziomie document.body (niezależny od Tailwind i overflow)
  const modalPortal = isOpen
    ? createPortal(
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
            animation: 'zusFadeIn 0.15s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`zus-explainer-title-${topicId}`}
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '520px',
              borderRadius: '12px',
              borderTop: '5px solid #007834',
              boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '88vh',
              animation: 'zusFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Belka nagłówkowa modala z motywem AI */}
            <div
              style={{
                padding: '14px 18px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#E6F4EC',
                    color: '#007834',
                  }}
                >
                  <Sparkles style={{ width: '14px', height: '14px', color: '#007834' }} />
                </span>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 900,
                    backgroundColor: '#007834',
                    color: '#FFFFFF',
                    padding: '1.5px 5px',
                    borderRadius: '3px',
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                  }}
                >
                  AI
                </span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#00441c',
                  }}
                >
                  Asystent Prawny ZUS • Przepisy 2026
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Zamknij okno wyjaśnienia"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E2E8F0';
                  e.currentTarget.style.color = '#0F172A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748B';
                }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* 2. Ciało modala z treścią wyjaśnienia */}
            <div
              style={{
                padding: '20px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {isLoading && !data ? (
                <div
                  style={{
                    padding: '36px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    color: '#475569',
                    fontSize: '0.9rem',
                  }}
                >
                  <Loader2
                    style={{
                      width: '28px',
                      height: '28px',
                      color: '#007834',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <span>Pobieram oficjalne wyjaśnienie z serwera ZUS…</span>
                </div>
              ) : data ? (
                <>
                  {/* Tytuł zagadnienia */}
                  <h3
                    id={`zus-explainer-title-${topicId}`}
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: 0,
                      lineHeight: '1.35',
                    }}
                  >
                    {data.title}
                  </h3>

                  {/* Karta z praktycznym wyjaśnieniem */}
                  <div
                    style={{
                      backgroundColor: '#F0FDF4',
                      border: '1.5px solid #BBF7D0',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      fontSize: '0.88rem',
                      lineHeight: '1.55',
                      color: '#164E2F',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 800,
                        color: '#007834',
                        marginBottom: '6px',
                        fontSize: '0.74rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <BookOpen style={{ width: '14px', height: '14px' }} />
                      <span>Praktyczna interpretacja przepisów</span>
                    </div>
                    <p style={{ margin: 0, fontWeight: 500 }}>{data.summary}</p>
                  </div>

                  {/* Kluczowe punkty i zasady */}
                  {data.details && data.details.length > 0 && (
                    <div style={{ marginTop: '2px' }}>
                      <div
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: '#64748B',
                          marginBottom: '8px',
                        }}
                      >
                        Kluczowe warunki formalne i terminy:
                      </div>
                      <ul
                        style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {data.details.map((item, idx) => (
                          <li
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              fontSize: '0.84rem',
                              lineHeight: '1.45',
                              color: '#334155',
                            }}
                          >
                            <span
                              style={{
                                color: '#007834',
                                fontWeight: 800,
                                fontSize: '1rem',
                                lineHeight: '1',
                                flexShrink: 0,
                                userSelect: 'none',
                              }}
                            >
                              •
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Podstawa prawna */}
                  {data.legalBasis && (
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.8rem',
                        color: '#475569',
                      }}
                    >
                      <ShieldCheck
                        style={{ width: '16px', height: '16px', color: '#007834', flexShrink: 0 }}
                      />
                      <span>
                        <strong style={{ color: '#1E293B' }}>Podstawa prawna:</strong>{' '}
                        {data.legalBasis}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#64748B',
                    fontSize: '0.86rem',
                  }}
                >
                  Brak dodatkowych informacji dla tego zagadnienia.
                </div>
              )}
            </div>

            {/* 3. Dolny pasek akcji z przyciskiem asystenta */}
            <div
              style={{
                padding: '14px 20px',
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.84rem',
                  color: '#64748B',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '6px',
                }}
              >
                Zamknij
              </button>
              <button
                type="button"
                onClick={handleAskInChat}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#007834',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#005c27')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#007834')}
              >
                <Sparkles style={{ width: '13px', height: '13px', color: '#FFFFFF' }} />
                <span>Dopytaj Asystenta AI</span>
                <ArrowRight style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {renderTrigger()}
      {modalPortal}
    </>
  );
};

export default AiFieldExplainer;
