import React, { useState } from 'react';

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTestCase: (caseId: string) => void;
}

export const PdfModal: React.FC<PdfModalProps> = ({
  isOpen,
  onClose,
  onLoadTestCase,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState('case-1');

  if (!isOpen) return null;

  const testCases = [
    {
      id: 'case-1',
      title: 'Sprawa 1: Pracownica – Ciąża i zwolnienie z kodem B (Formularz Z-3 + e-ZLA)',
      desc: 'Umowa o pracę na czas nieokreślony, wynagrodzenie 6 500 zł brutto, niezdolność od 14. tygodnia ciąży, płatnik >20 pracowników.',
      tag: 'Pozytywna kwalifikacja (100%)',
    },
    {
      id: 'case-2',
      title: 'Sprawa 2: Samozatrudniona – Dobrowolne ubezpieczenie chorobowe i wniosek ZAM',
      desc: 'Działalność gospodarcza od 2 lat, opłacona dobrowolna składka chorobowa, ustalenie podstawy wymiaru z 12 miesięcy, brak zaległości.',
      tag: 'Zasiłek macierzyński 81,5%',
    },
    {
      id: 'case-3',
      title: 'Sprawa 3: Wcześniak – Uzupełniający urlop macierzyński (Zaświadczenie szpitalne)',
      desc: 'Dziecko urodzone w 27. tygodniu ciąży, masa 920g, pobyt w szpitalu 8 tygodni. Wniosek o 8 dodatkowych tygodni macierzyńskiego.',
      tag: 'Art. 180(2) KP (100%)',
    },
    {
      id: 'case-4',
      title: 'Sprawa 4: Ojciec dziecka – 9 tygodni rodzicielskiego + Urlop ojcowski (Z-3a)',
      desc: 'Ojciec zatrudniony na umowę o pracę, wykorzystanie 14 dni urlopu ojcowskiego oraz 9 nieprzenoszalnych tygodni rodzicielskiego.',
      tag: 'Urlop ojcowski + rodzicielski',
    },
    {
      id: 'case-5',
      title: 'Sprawa 5: Upadłość pracodawcy w trakcie ciąży (Zasiłek z ZUS)',
      desc: 'Rozwiązanie stosunku pracy z powodu likwidacji zakładu po upływie 3. miesiąca ciąży. Wypłata zasiłku w wysokości macierzyńskiego przez ZUS.',
      tag: 'Art. 30 Ustawy zasiłkowej',
    },
  ];

  const handleApply = () => {
    onLoadTestCase(selectedCaseId);
    onClose();
  };

  return (
    <div className="zus-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pdf-modal-title">
      <div className="zus-modal">
        <div className="zus-modal-header">
          <h2 id="pdf-modal-title" className="zus-modal-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007834" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span>Strefa Testowa: Przykładowe sprawy PDF z ZUS</span>
          </h2>
          <button type="button" className="zus-modal-close-btn" onClick={onClose} aria-label="Zamknij okno">
            &times;
          </button>
        </div>

        <div className="zus-modal-body">
          <p className="zus-modal-desc">
            Wybierz jeden z oficjalnych przypadków testowych udostępnionych przez ZUS na HackNation, aby automatycznie załadować dokumenty, zweryfikować uprawnienia i sprawdzić wyniki kalkulatora.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            {testCases.map((tc) => (
              <div
                key={tc.id}
                role="button"
                tabIndex={0}
                className={`zus-modal-case-item ${selectedCaseId === tc.id ? 'selected' : ''}`}
                onClick={() => setSelectedCaseId(tc.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCaseId(tc.id);
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="zus-modal-case-title">{tc.title}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#007834', backgroundColor: '#E6F4EC', padding: '2px 6px', borderRadius: '4px' }}>
                    {tc.tag}
                  </span>
                </div>
                <span className="zus-modal-case-desc">{tc.desc}</span>
              </div>
            ))}
          </div>

          <div style={{ border: '2px dashed #CBD5E0', padding: '16px', borderRadius: '6px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ margin: '0 auto 6px auto', display: 'block' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1A1A1A' }}>
              Możesz również wgrać własny wniosek PDF (ZAM, Z-3, e-ZLA)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
              Obsługiwane formaty: PDF, JPG, PNG (anonimizowane formularze ZUS)
            </div>
          </div>
        </div>

        <div className="zus-modal-footer">
          <button type="button" className="zus-btn-secondary" onClick={onClose}>
            Anuluj
          </button>
          <button type="button" className="zus-btn-primary" onClick={handleApply}>
            Załaduj wybraną sprawę &gt;
          </button>
        </div>
      </div>
    </div>
  );
};
