import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAppState } from '@/components/app-state';

export const AssistantFab: React.FC = () => {
  const { assistantOpen, setAssistantOpen } = useAppState();

  if (assistantOpen) return null;

  return (
    <button
      type="button"
      onClick={() => setAssistantOpen(true)}
      className="zus-assistant-fab"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
      }}
      aria-label="Otwórz Asystenta AI ZUS"
      title="Zadaj pytanie asystentowi AI"
    >
      <span className="zus-assistant-fab-icon">
        <Sparkles size={18} color="#FFFFFF" />
      </span>
      <span className="zus-assistant-fab-text">Zapytaj AI</span>
    </button>
  );
};

export default AssistantFab;
