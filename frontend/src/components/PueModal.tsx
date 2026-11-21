import React, { useState } from 'react';

interface PueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSuccess: () => void;
}

export const PueModal: React.FC<PueModalProps> = ({
  isOpen,
  onClose,
  onConfirmSuccess,
}) => {
  const [loginMethod, setLoginMethod] = useState<'profil' | 'certyfikat'>('profil');
  const [pesel, setPesel] = useState('92051203456');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSimulateSync = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onConfirmSuccess();
      onClose();
    }, 900);
  };

  return (
    <div className="zus-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pue-modal-title">
      <div className="zus-modal">
        <div className="zus-modal-header">
          <h2 id="pue-modal-title" className="zus-modal-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007834" strokeWidth="2.5">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span>Symulacja połączenia z PUE/eZUS</span>
          </h2>
          <button type="button" className="zus-modal-close-btn" onClick={onClose} aria-label="Zamknij okno">
            &times;
          </button>
        </div>

        <div className="zus-modal-body">
          <p className="zus-modal-desc">
            Narzędzie symuluje bezpieczną wymianę danych z elektroniczną platformą <strong>PUE/eZUS</strong>. Pozwala to na automatyczną weryfikację stanu konta ubezpieczonego, płatnika składek oraz wystawionych zwolnień lekarskich.
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className={loginMethod === 'profil' ? 'zus-btn-primary' : 'zus-btn-secondary'}
              style={{ flex: 1, padding: '8px' }}
              onClick={() => setLoginMethod('profil')}
            >
              Profil Zaufany / Login.gov.pl
            </button>
            <button
              type="button"
              className={loginMethod === 'certyfikat' ? 'zus-btn-primary' : 'zus-btn-secondary'}
              style={{ flex: 1, padding: '8px' }}
              onClick={() => setLoginMethod('certyfikat')}
            >
              Certyfikat kwalifikowany
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4A4A4A' }}>
              Numer PESEL osoby ubezpieczonej:
            </label>
            <input
              type="text"
              value={pesel}
              onChange={(e) => setPesel(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1.5px solid #CBD5E0',
                borderRadius: '4px',
                fontSize: '1rem',
                fontFamily: 'inherit',
              }}
              placeholder="Wprowadź 11-cyfrowy PESEL"
            />
          </div>

          <div style={{ backgroundColor: '#E6F4EC', padding: '12px', borderRadius: '4px', borderLeft: '4px solid #007834' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00441c' }}>
              Środowisko testowe HackNation ZUS
            </div>
            <div style={{ fontSize: '0.8rem', color: '#1A1A1A', marginTop: '2px' }}>
              Pobranie danych zasymuluje profil ubezpieczonej <strong>Anny Kowalskiej</strong> z aktywnym ubezpieczeniem i e-ZLA z kodem B.
            </div>
          </div>
        </div>

        <div className="zus-modal-footer">
          <button type="button" className="zus-btn-secondary" onClick={onClose} disabled={isProcessing}>
            Anuluj
          </button>
          <button type="button" className="zus-btn-primary" onClick={handleSimulateSync} disabled={isProcessing}>
            {isProcessing ? 'Pobieranie z PUE/eZUS...' : 'Zsynchronizuj dane z PUE >'}
          </button>
        </div>
      </div>
    </div>
  );
};
