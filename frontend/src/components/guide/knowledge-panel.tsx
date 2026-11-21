import React from 'react';
import { Lightbulb } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ExplainSparkle } from '@/components/ai/explain-sparkle';
import { moreKnowledge, type KnowledgeCard } from '@/lib/guide';

export function KnowledgePanel({ cards }: { cards: KnowledgeCard[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '1rem',
              fontWeight: 700,
              color: '#1A1A1A',
              margin: 0,
            }}
          >
            <span>{card.title}</span>
            {card.topicId && <ExplainSparkle topicId={card.topicId} label={card.title} />}
          </h3>

          <p style={{ fontSize: '0.88rem', lineHeight: 1.5, color: '#4A4A4A', margin: 0 }}>
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

      {/* Akordeon dodatkowej wiedzy prawnej */}
      <div
        data-legal
        style={{
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#00441c', margin: '0 0 10px 0' }}>
          Dodatkowe informacje i wyjaśnienia ZUS:
        </p>
        <Accordion>
          {moreKnowledge.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="py-2 text-sm font-semibold text-[#1A1A1A]">
                {item.title}
              </AccordionTrigger>
              <AccordionContent>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.5, color: '#4A4A4A', paddingBottom: '8px' }}>
                  {item.body}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
