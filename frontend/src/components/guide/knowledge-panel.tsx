import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { moreKnowledge, type KnowledgeCard } from '@/lib/guide';

export function KnowledgePanel({ cards }: { cards: KnowledgeCard[] }) {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenItem((prev) => (prev === id ? null : id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%' }}>
      {/* Karty przewodnika w estetycznym, poziomym rzędzie na dole */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: '#007834',
          }}
        >
          <Lightbulb className="size-4 text-[#007834]" aria-hidden="true" />
          <span>Przewodnik dla Twojej sytuacji</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: cards.length > 1 ? 'repeat(auto-fit, minmax(340px, 1fr))' : '1fr',
            gap: '16px',
          }}
        >
          {cards.map((card) => (
            <article
              key={card.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                borderTop: '3px solid #007834',
                backgroundColor: '#FFFFFF',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <h3
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  color: '#1A1A1A',
                  margin: 0,
                }}
              >
                <span>{card.title}</span>
              </h3>

              <p style={{ fontSize: '0.86rem', lineHeight: 1.5, color: '#4A4A4A', margin: 0 }}>
                {card.summary}
              </p>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 0, padding: 0, listStyle: 'none' }}>
                {card.points.map((point) => (
                  <li
                    key={point}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '0.84rem',
                      lineHeight: 1.45,
                      color: '#1A1A1A',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#007834',
                        marginTop: '6px',
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      {/* Sekcja: Dodatkowe informacje i wyjaśnienia ZUS rozwijane czysto pod guzikami */}
      <div
        data-legal
        style={{
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <BookOpen className="size-4 text-[#007834]" />
          <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#00441C', margin: 0 }}>
            Dodatkowe informacje i wyjaśnienia ZUS
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {moreKnowledge.map((item) => {
            const isOpen = openItem === item.id;
            return (
              <div
                key={item.id}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  backgroundColor: isOpen ? '#F8FAFC' : '#FFFFFF',
                  overflow: 'hidden',
                  transition: 'background-color 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1A1A1A', flex: 1 }}>
                    {item.title}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#007834',
                      backgroundColor: '#E6F4EC',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}
                  >
                    <span>{isOpen ? 'Zwiń' : 'Więcej'}</span>
                    {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 14px 12px 14px', borderTop: '1px solid #EDF2F7' }}>
                    <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: '#4A4A4A', margin: '8px 0 0 0' }}>
                      {item.body}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
