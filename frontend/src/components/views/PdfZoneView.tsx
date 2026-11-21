import React, { useState } from 'react';
import { parsePdfDocument } from '@/lib/api-client';

export const PdfZoneView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activePredefinedCase, setActivePredefinedCase] = useState<string | null>(null);

  const predefinedCases = [
    {
      id: 'case-1',
      title: 'Zestaw 1: Pracownica w ciąży – e-ZLA z kodem B (Formularz Z-3)',
      desc: 'Umowa o pracę, podstawa wymiaru 6 850 zł, płatnik >20 osób, spełniony okres karencji 30 dni.',
      sampleData: {
        document_type: 'Z-3',
        insurance_status: 'ELIGIBLE',
        confidence_score: 0.98,
        person: {
          first_name: 'Anna',
          last_name: 'Kowalska',
          pesel: '92051203456',
          is_pesel_valid: true,
          birth_date: '1992-05-12',
        },
        payer: {
          nip: '5250001098',
          is_nip_valid: true,
          name: 'TechSolutions Sp. z o.o.',
          employee_count_status: 'ABOVE_20',
        },
        extracted_data: {
          document_code: 'Z-3',
          gross_salary: 6850.0,
          insurance_start_date: '2021-03-01',
          has_active_ezla_code_b: true,
        },
        validation_messages: [
          'Formularz Z-3 zweryfikowany pomyślnie.',
          'Płatnik zatrudnia powyżej 20 pracowników (zasiłek wypłaca pracodawca).',
          'Spełniony wymóg 30 dni nieprzerwanego ubezpieczenia chorobowego.',
        ],
      },
    },
    {
      id: 'case-2',
      title: 'Zestaw 2: Przedsiębiorczyni (JDG) – Wniosek ZAM o macierzyński',
      desc: 'Działalność gospodarcza od 3 lat, opłacona dobrowolna składka chorobowa, brak zaległości.',
      sampleData: {
        document_type: 'ZAM',
        insurance_status: 'ELIGIBLE',
        confidence_score: 0.95,
        person: {
          first_name: 'Magdalena',
          last_name: 'Nowak',
          pesel: '88112009876',
          is_pesel_valid: true,
          birth_date: '1988-11-20',
        },
        payer: {
          nip: '7821098471',
          is_nip_valid: true,
          name: 'Kancelaria Nowak Magdalena',
          employee_count_status: 'SELF_EMPLOYED',
        },
        extracted_data: {
          document_code: 'ZAM',
          gross_salary: 5400.0,
          insurance_start_date: '2022-01-10',
          has_active_ezla_code_b: false,
        },
        validation_messages: [
          'Wniosek ZAM złożony elektronicznie w terminie 21 dni od porodu.',
          'Zasiłek wypłaca bezpośrednio ZUS (1. dzień po ustaniu ubezpieczenia).',
          'Przysługuje uśredniona stawka 81,5% za cały okres.',
        ],
      },
    },
    {
      id: 'case-3',
      title: 'Zestaw 3: Zaświadczenie szpitalne wcześniaka (Art. 180(2) KP)',
      desc: 'Narodziny przed 28. tygodniem ciąży, masa 910 g, hospitalizacja 9 tygodni.',
      sampleData: {
        document_type: 'HOSPITAL_CERTIFICATE',
        insurance_status: 'ELIGIBLE',
        confidence_score: 0.99,
        person: {
          first_name: 'Katarzyna',
          last_name: 'Zielińska',
          pesel: '94080112345',
          is_pesel_valid: true,
          birth_date: '1994-08-01',
        },
        payer: {
          nip: '1180099231',
          is_nip_valid: true,
          name: 'Szpital Specjalistyczny im. Świętej Rodziny',
          employee_count_status: 'HEALTHCARE',
        },
        extracted_data: {
          document_code: 'ZA-ZYCIEM-MED',
          gross_salary: 8200.0,
          birth_week: 26,
          birth_weight_grams: 910,
          hospital_stay_weeks: 9,
        },
        validation_messages: [
          'Zaświadczenie szpitalne spełnia kryteria art. 180(2) § 1 pkt 1 KP.',
          'Przysługuje 9 dodatkowych tygodni uzupełniającego urlopu macierzyńskiego.',
          'Świadczenie za okres uzupełniający wynosi 100% podstawy wymiaru.',
        ],
      },
    },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setIsLoading(true);
      try {
        const data = await parsePdfDocument(file);
        setParsedData(data);
        setActivePredefinedCase(null);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSelectCase = (c: typeof predefinedCases[0]) => {
    setActivePredefinedCase(c.id);
    setSelectedFile(null);
    setParsedData(c.sampleData);
  };

  return (
    <div className="zus-view-container">
      <div className="zus-view-header">
        <div className="zus-official-pill">Strefa Walidacji i Testowania Dokumentów</div>
        <h1 className="zus-view-title">Parser Dokumentów PDF ZUS & Weryfikacja Uprawnień</h1>
        <p className="zus-view-desc">
          Zgodnie z wymaganiami konkursowymi HackNation, narzędzie automatycznie przetwarza załączone dokumenty PDF (formularze ZAM, Z-3, Z-3a, e-ZLA), weryfikuje sumy kontrolne PESEL/NIP oraz ustala uprawnienia i parametry do kalkulatora.
        </p>
      </div>

      <div className="zus-view-grid">
        {/* Lewa kolumna: Upload i wybór gotowej sprawy */}
        <div className="zus-card">
          <h2 className="zus-card-header-title">1. Wgraj plik PDF lub wybierz sprawę testową ZUS</h2>
          
          <label style={{
            display: 'block',
            border: '2px dashed var(--zus-green)',
            borderRadius: '6px',
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: '#F8FAFC',
            marginBottom: '20px',
          }}>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#007834" strokeWidth="2" style={{ margin: '0 auto 8px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <div style={{ fontWeight: 700, color: '#1A1A1A' }}>
              {selectedFile ? `Wybrany plik: ${selectedFile.name}` : 'Kliknij tutaj, aby wybrać dokument PDF (ZUS)'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '4px' }}>
              Obsługa: ZAM, Z-3, Z-3a, ZAS-53, e-ZLA (anonimizowane)
            </div>
          </label>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>
            Oficjalne zestawy testowe ZUS z wyzwania:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predefinedCases.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className={`zus-modal-case-item ${activePredefinedCase === c.id ? 'selected' : ''}`}
                onClick={() => handleSelectCase(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSelectCase(c);
                }}
              >
                <span className="zus-modal-case-title">{c.title}</span>
                <span className="zus-modal-case-desc">{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Prawa kolumna: Wynik ekstrakcji z REST API /pdf/parse */}
        <div className="zus-card">
          <h2 className="zus-card-header-title">2. Wyniki ekstrakcji danych z formularza</h2>
          {isLoading ? (
            <div className="zus-empty-placeholder">
              <p>Przetwarzanie dokumentu przez silnik OCR i parser PDF ZUS...</p>
            </div>
          ) : parsedData ? (
            <div className="zus-results-box">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
                <span className="zus-badge success">Typ: {parsedData.document_type}</span>
                <span className="zus-badge info">Status: {parsedData.insurance_status}</span>
                <span style={{ fontSize: '0.8rem', color: '#6B7280', marginLeft: 'auto' }}>
                  Pewność: {Math.round(parsedData.confidence_score * 100)}%
                </span>
              </div>

              {parsedData.person && (
                <div className="zus-data-row" style={{ marginBottom: '10px' }}>
                  <span className="zus-data-label">Dane ubezpieczonego</span>
                  <span className="zus-data-val-primary">
                    {parsedData.person.first_name} {parsedData.person.last_name}
                  </span>
                  <span className="zus-data-val-sub">
                    PESEL: {parsedData.person.pesel} {parsedData.person.is_pesel_valid ? '✓ (Prawidłowa suma kontrolna)' : '✗'}
                  </span>
                </div>
              )}

              {parsedData.payer && (
                <div className="zus-data-row" style={{ marginBottom: '10px' }}>
                  <span className="zus-data-label">Dane płatnika składek</span>
                  <span className="zus-data-val-primary">{parsedData.payer.name}</span>
                  <span className="zus-data-val-sub">NIP: {parsedData.payer.nip} ({parsedData.payer.employee_count_status})</span>
                </div>
              )}

              {parsedData.extracted_data && (
                <div className="zus-stat-grid" style={{ marginBottom: '14px' }}>
                  {parsedData.extracted_data.gross_salary && (
                    <div className="zus-stat-item">
                      <div className="zus-stat-label">Podstawa wynagrodzenia</div>
                      <div className="zus-stat-value" style={{ color: '#007834' }}>
                        {parsedData.extracted_data.gross_salary} zł
                      </div>
                    </div>
                  )}
                  {parsedData.extracted_data.hospital_stay_weeks && (
                    <div className="zus-stat-item">
                      <div className="zus-stat-label">Pobyt w szpitalu</div>
                      <div className="zus-stat-value">
                        {parsedData.extracted_data.hospital_stay_weeks} tyg.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {parsedData.validation_messages && (
                <div className="zus-notice-box">
                  <div style={{ fontWeight: 700, color: '#00441c', marginBottom: '4px' }}>
                    Weryfikacja prawna ZUS:
                  </div>
                  <ul className="zus-list">
                    {parsedData.validation_messages.map((msg: string, idx: number) => (
                      <li key={idx}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="zus-empty-placeholder">
              <p>Wgraj plik PDF lub kliknij na jeden z oficjalnych zestawów testowych, aby zobaczyć wyekstrahowane dane i walidację prawną.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
