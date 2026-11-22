import React, { useEffect, useRef, useState } from 'react';
import { Loader2, SendHorizontal, Sparkles } from 'lucide-react';
import { useAppState } from '@/components/app-state';



export const AssistantPanel: React.FC = () => {
  const { assistantOpen, setAssistantOpen, messages, assistantPending, sendMessage } =
    useAppState();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (assistantOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [assistantOpen]);

  // Scroll to bottom on new messages or pending state
  useEffect(() => {
    if (assistantOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, assistantPending, assistantOpen]);

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
    await sendMessage(text);
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
