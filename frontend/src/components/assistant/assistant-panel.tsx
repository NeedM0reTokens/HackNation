import React, { useEffect, useRef, useState } from 'react';
import { Loader2, SendHorizontal, Sparkles } from 'lucide-react';
import { useAppState } from '@/components/app-state';

interface TabContextInfo {
  label: string;
  badge: string;
  questions: string[];
}

const TAB_CONTEXTS: Record<string, TabContextInfo> = {
  start: {
    label: 'Katalog świadczeń ZUS',
    badge: 'Strona główna',
    questions: [
      'Jakie świadczenia przysługują po narodzinach dziecka?',
      'Wariant 81,5% stałe czy 100% i 70%?',
      'Ile tygodni urlopu przysługuje tacie?',
      'Kiedy złożyć pierwszy wniosek po porodzie?',
    ],
  },
  kalkulator: {
    label: 'Zintegrowany Kalkulator Zasiłkowy',
    badge: 'Kalkulator',
    questions: [
      'Czym jest podstawa wymiaru zasiłku?',
      'Wariant 81,5% czy 100% + 70% – co się bardziej opłaca?',
      'Jak wyliczyć podstawę przy stażu krótszym niż 12 miesięcy?',
      'Czy premie i nadgodziny wliczają się do podstawy?',
    ],
  },
  chorobowy: {
    label: 'Zasiłek chorobowy w ciąży (kod B i e-ZLA)',
    badge: 'Chorobowe / Ciąża',
    questions: [
      'Co oznacza kod „B” na zwolnieniu lekarskim?',
      'Kto wypłaca zasiłek – pracodawca czy ZUS?',
      'Ile wynosi okres wyczekiwania (karencja) w ciąży?',
      'Czy zasiłek w ciąży wynosi zawsze 100% podstawy?',
    ],
  },
  macierzynski: {
    label: 'Urlopy dla ojca i rodzicielskie (Kodeks pracy)',
    badge: 'Dla Ojca / Urlopy',
    questions: [
      'Kiedy i jak wykorzystać 14 dni urlopu ojcowskiego?',
      'Jak działa 9 tygodni nieprzenoszalnego urlopu dla taty?',
      'Kiedy ojciec może przejąć urlop po matce (po 14 tyg.)?',
      'Jak łączyć urlop rodzicielski z pracą na max 1/2 etatu?',
    ],
  },
  wnioski: {
    label: 'Wnioski, dokumentacja i terminy ZUS',
    badge: 'Dokumenty',
    questions: [
      'Jaki jest nieprzekraczalny termin na wniosek o zasiłek 81,5% (21 dni)?',
      'Jakie dokumenty i formularze (np. Z-3) składa pracodawca?',
      'Jak złożyć wniosek o urlop ojcowski do pracodawcy?',
      'Gdzie w PUE/eZUS sprawdzić status wypłaty zasiłku?',
    ],
  },
  'trudne-sytuacje': {
    label: 'Przypadki szczególne i pomoc ZUS',
    badge: 'Trudne sytuacje',
    questions: [
      'Jak działa uzupełniający urlop macierzyński na wcześniaka?',
      'Jakie uprawnienia daje zaświadczenie z ustawy „Za życiem”?',
      'Prawa rodziców po martwym urodzeniu lub stracie dziecka',
      'Urlop na warunkach macierzyńskiego przy adopcji dziecka',
    ],
  },
  'strefa-pdf': {
    label: 'Strefa Testowa PDF (Analiza pism i decyzji)',
    badge: 'Strefa PDF',
    questions: [
      'Jak załadować decyzję lub zaświadczenie ZUS do analizy?',
      'Jakie formularze ZUS (Z-3, Z-15, e-ZLA) są obsługiwane?',
      'Gdzie sprawdzić poprawność wyliczenia podstawy w PDF?',
    ],
  },
  admin: {
    label: 'Panel Administratora ZUS',
    badge: 'Parametry ZUS',
    questions: [
      'Jaka jest minimalna płaca brutto i podstawa wymiaru w 2026 roku?',
      'Jakie są aktualne stopy procentowe zasiłków w systemie?',
    ],
  },
};

export const AssistantPanel: React.FC = () => {
  const { assistantOpen, setAssistantOpen, messages, assistantPending, sendMessage, activeTab } =
    useAppState();
  const [draft, setDraft] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const lastActiveTabRef = useRef(activeTab);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentContext = TAB_CONTEXTS[activeTab] || TAB_CONTEXTS.start;

  // Gdy użytkownik zmienia zakładkę, nowe pytania sugerowane wyświetlają się na dole czatu
  useEffect(() => {
    if (activeTab !== lastActiveTabRef.current) {
      lastActiveTabRef.current = activeTab;
      setShowSuggestions(true);
      if (assistantOpen) {
        setTimeout(() => {
          endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [activeTab, assistantOpen]);

  // Auto-focus input on open
  useEffect(() => {
    if (assistantOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [assistantOpen]);

  // Scroll to bottom on new messages, pending state or when suggestions appear
  useEffect(() => {
    if (assistantOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, assistantPending, assistantOpen, showSuggestions]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && assistantOpen) {
        setAssistantOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assistantOpen, setAssistantOpen]);

  if (!assistantOpen) return null;

  const handleSubmit = async () => {
    const text = draft.trim();
    if (!text || assistantPending) return;
    setDraft('');
    setShowSuggestions(false);
    await sendMessage(text);
  };

  const handleSuggestionClick = async (question: string) => {
    if (assistantPending) return;
    setShowSuggestions(false);
    await sendMessage(question);
  };

  return (
    <aside
      className="zus-assistant-drawer"
      role="dialog"
      aria-modal="false"
      aria-labelledby="zus-assistant-title"
    >
      {/* NAGŁÓWEK W STYLU ZUS (BEZ INFORMACJI O GEMINI I BEZ ZŁOTEGO KOLORU) */}
      <div className="zus-assistant-header">
        <div className="zus-assistant-header-info">
          <div className="zus-assistant-header-icon" aria-hidden="true">
            <Sparkles size={18} color="#FFFFFF" />
          </div>
          <div className="zus-assistant-header-titles">
            <h2 id="zus-assistant-title">Asystent AI ZUS</h2>
            <p>Inteligentny Doradca Obywatela</p>
          </div>
        </div>
        <div className="zus-assistant-header-actions">
          <button
            type="button"
            className="zus-assistant-close-btn"
            onClick={() => setAssistantOpen(false)}
            aria-label="Zamknij czat z asystentem"
          >
            &times;
          </button>
        </div>
      </div>

      {/* PASEK KONTEKSTU BIEŻĄCEJ SPRAWY */}
      <div className="zus-assistant-context-bar">
        <div className="zus-assistant-context-left">
          <span className="zus-assistant-context-label">Sprawa:</span>
          <span className="zus-assistant-context-badge" title={currentContext.label}>
            {currentContext.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowSuggestions((prev) => !prev);
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#005c27',
            fontSize: '0.74rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
          title="Kliknij, aby pokazać/ukryć sugerowane pytania dla tej sprawy"
        >
          {currentContext.badge}
        </button>
      </div>

      {/* OBSZAR WIADOMOŚCI */}
      <div className="zus-assistant-body" aria-live="polite">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div key={message.id} className={`zus-assistant-msg-row ${isUser ? 'user' : 'assistant'}`}>
              {isUser ? (
                <div className="zus-assistant-bubble-user">
                  <p style={{ margin: 0 }}>{message.content}</p>
                </div>
              ) : (
                <div className="zus-assistant-bubble-bot">
                  <p style={{ margin: 0, fontWeight: 500 }}>{message.content}</p>
                  {message.details && message.details.length > 0 && (
                    <ul className="zus-assistant-details-list">
                      {message.details.map((detail, dIdx) => {
                        if (detail.startsWith('Podstawa prawna:')) {
                          return (
                            <li key={dIdx} style={{ listStyle: 'none', marginLeft: '-18px' }}>
                              <div className="zus-assistant-legal-chip">
                                <span>⚖️</span>
                                <span>{detail}</span>
                              </div>
                            </li>
                          );
                        }
                        return <li key={dIdx}>{detail}</li>;
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Sugerowane pytania wyświetlają się na dole scrollowanej historii czatu */}
        {showSuggestions && currentContext.questions && currentContext.questions.length > 0 && (
          <div className="zus-assistant-suggestions-section">
            <div className="zus-assistant-suggestions-title">
              <Sparkles size={13} color="#007834" />
              <span>Sugerowane pytania dla tej sprawy:</span>
            </div>
            <div className="zus-assistant-chips-wrap">
              {currentContext.questions.map((question, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="zus-assistant-chip-btn"
                  disabled={assistantPending}
                  onClick={() => handleSuggestionClick(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {assistantPending && (
          <div className="zus-assistant-pending">
            <Loader2 className="animate-spin" size={18} color="#007834" />
            <span>Asystent AI analizuje przepisy prawne 2026…</span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* FORMULARZ WPISYWANIA PYTANIA (BEZ WIDOCZNEJ ETYKIETY TEKSTOWEJ) */}
      <div className="zus-assistant-footer">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="zus-assistant-form"
        >
          <textarea
            id="zus-assistant-textarea"
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Zadaj pytanie dotyczące formalności…"
            rows={2}
            className="zus-assistant-textarea"
            disabled={assistantPending}
            aria-label="Wpisz treść pytania do asystenta AI"
          />
          <button
            type="submit"
            className="zus-assistant-send-btn"
            disabled={!draft.trim() || assistantPending}
            aria-label="Wyślij zapytanie"
            title="Wyślij (Enter)"
          >
            <SendHorizontal size={18} />
          </button>
        </form>
        <div className="zus-assistant-disclaimer">
          Odpowiedzi mają charakter informacyjny i nie zastępują oficjalnej decyzji ZUS.
        </div>
      </div>
    </aside>
  );
};

export default AssistantPanel;
