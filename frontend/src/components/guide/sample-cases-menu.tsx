import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { sampleCases, type GuideInput } from '@/lib/guide';

export function SampleCasesMenu({ onSelect }: { onSelect: (input: GuideInput) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Zamykanie menu po kliknięciu poza obszarem lub wciśnięciu Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectCase = (sampleInput: GuideInput) => {
    onSelect(sampleInput);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          backgroundColor: isOpen ? '#E6F4EC' : '#FFFFFF',
          border: isOpen ? '1.5px solid #007834' : '1.5px solid #CBD5E0',
          borderRadius: '6px',
          fontSize: '0.86rem',
          fontWeight: 600,
          color: isOpen ? '#007834' : '#00441c',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E6F4EC';
          e.currentTarget.style.borderColor = '#007834';
          e.currentTarget.style.color = '#007834';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#CBD5E0';
            e.currentTarget.style.color = '#00441c';
          }
        }}
      >
        <FolderOpen className="size-4 text-[#007834]" aria-hidden="true" />
        <span>Załaduj przykładową sprawę ZUS</span>
        <ChevronDown
          className="size-3.5 text-gray-500 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            width: '320px',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #CBD5E0',
            borderRadius: '8px',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#00441c',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FolderOpen className="size-4 text-[#007834]" />
            <span>Sprawy testowe (z wyzwania ZUS):</span>
          </div>

          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {sampleCases.map((sample) => (
              <button
                key={sample.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelectCase(sample.input)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: '1px solid #F1F5F9',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E6F4EC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1A1A1A' }}>
                  {sample.label}
                </span>
                <span style={{ fontSize: '0.76rem', color: '#6B7280' }}>
                  {sample.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
