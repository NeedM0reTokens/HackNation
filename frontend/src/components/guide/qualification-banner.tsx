import React from 'react';
import { ShieldCheck, TriangleAlert } from 'lucide-react';
import type { Qualification } from '@/lib/guide';

export function QualificationBanner({ qualification }: { qualification: Qualification }) {
  const Icon = qualification.eligible ? ShieldCheck : TriangleAlert;

  return (
    <section
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px 24px',
        borderRadius: '8px',
        backgroundColor: qualification.eligible ? '#007834' : '#991B1B',
        color: '#FFFFFF',
        marginBottom: '24px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '52px',
          height: '52px',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          flexShrink: 0,
        }}
      >
        <Icon className="size-8 text-white" aria-hidden="true" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: '#FFFFFF',
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          {qualification.headline}
        </h2>
        <p
          style={{
            fontSize: '0.94rem',
            color: qualification.eligible ? '#E6F4EC' : '#FEE2E2',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {qualification.reason}
        </p>
      </div>
    </section>
  );
}
