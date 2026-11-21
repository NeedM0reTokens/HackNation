import React, { useState } from 'react';

export const DocumentsView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'forms' | 'protection' | 'deadlines'>('deadlines');

  return (
    <div className="zus-view-container">
      <div className="zus-view-header">
        <div className="zus-official-pill">Procedury, Wnioski i Kodeks Pracy</div>
        <h1 className="zus-view-title">Co, gdzie i kiedy złożyć? – Przewodnik formalności ZUS</h1>
        <p className="zus-view-desc">
          Terminowe złożenie właściwych formularzy jest kluczem do uzyskania optymalnych stawek (np. <strong>81,5% za cały okres</strong>) oraz pełnej ochrony przed zwolnieniem z pracy.
        </p>
      </div>

      {/* Zakładki kategorii */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #E2E8F0' }}>
        <button
          type="button"
          className={`zus-tab-btn ${activeCategory === 'deadlines' ? 'active' : ''}`}
          onClick={() => setActiveCategory('deadlines')}
        >
          Kluczowe Terminy (Zasada 21 dni)
        </button>
        <button
          type="button"
          className={`zus-tab-btn ${activeCategory === 'forms' ? 'active' : ''}`}
          onClick={() => setActiveCategory('forms')}
        >
          Katalog Wniosków (ZAM, Z-3, Z-3a, e-ZLA)
        </button>
        <button
          type="button"
          className={`zus-tab-btn ${activeCategory === 'protection' ? 'active' : ''}`}
          onClick={() => setActiveCategory('protection')}
        >
          Szczególna Ochrona Pracy (art. 177 KP)
        </button>
      </div>

      {/* Zawartość zależna od aktywnej kategorii */}
      {activeCategory === 'deadlines' && (
        <div className="zus-card">
          <h2 className="zus-card-header-title">Harmonogram najważniejszych terminów</h2>
          <div className="zus-timeline-list">
            <div className="zus-timeline-item">
              <div className="zus-timeline-badge">21 DNI</div>
              <div>
                <strong>Wniosek o zasiłek macierzyński i rodzicielski w pełnym wymiarze (art. 30a)</strong>
                <p>Termin 21 dni liczy się od dnia porodu. Złożenie tzw. „długiego wniosku” gwarantuje wypłatę uśrednionego zasiłku w wysokości <strong>81,5%</strong> za cały okres urlopu macierzyńskiego i rodzicielskiego matki.</p>
              </div>
            </div>

            <div className="zus-timeline-item">
              <div className="zus-timeline-badge">7 DNI</div>
              <div>
                <strong>Zgłoszenie do dobrowolnego ubezpieczenia chorobowego (zleceniobiorcy i JDG)</strong>
                <p>Aby ubezpieczenie chorobowe obowiązywało od pierwszego dnia nowej umowy/działalności, zgłoszenie ZUS ZUA musi nastąpić w ciągu 7 dni.</p>
              </div>
            </div>

            <div className="zus-timeline-item">
              <div className="zus-timeline-badge">7 DNI</div>
              <div>
                <strong>Wniosek o urlop ojcowski (art. 182(3) KP)</strong>
                <p>Pracownik-ojciec składa wniosek do pracodawcy najpóźniej na 7 dni przed planowanym rozpoczęciem urlopu ojcowskiego.</p>
              </div>
            </div>

            <div className="zus-timeline-item">
              <div className="zus-timeline-badge">21 DNI</div>
              <div>
                <strong>Uzupełniający urlop macierzyński dla rodziców wcześniaków</strong>
                <p>Wniosek składa się co najmniej na 21 dni przed zakończeniem urlopu macierzyńskiego wraz z zaświadczeniem ze szpitala.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'forms' && (
        <div className="zus-view-grid">
          <div className="zus-card">
            <h2 className="zus-card-header-title">Dla Pracowników (Umowa o Pracę)</h2>
            <ul className="zus-list">
              <li><strong>Z-3 (Zaświadczenie płatnika składek):</strong> Przesyłane przez pracodawcę do ZUS ze składnikami wynagrodzenia, gdy zasiłek wypłaca ZUS.</li>
              <li><strong>Wniosek o urlop macierzyński i rodzicielski:</strong> Składany u pracodawcy w terminie 21 dni od porodu.</li>
              <li><strong>Odpis skrócony aktu urodzenia:</strong> Do wglądu dla pracodawcy (lub ZUS pobiera automatycznie z USC).</li>
            </ul>
          </div>

          <div className="zus-card">
            <h2 className="zus-card-header-title">Dla Samozatrudnionych i Zleceniobiorców</h2>
            <ul className="zus-list">
              <li><strong>ZAM:</strong> Wniosek o zasiłek macierzyński składany bezpośrednio do ZUS (przez portal eZUS/PUE).</li>
              <li><strong>Z-3b / Z-3a:</strong> Zaświadczenie płatnika składek dla przedsiębiorców i osób wykonujących zlecenia.</li>
              <li><strong>ZAS-53:</strong> Wniosek o zasiłek chorobowy składany przez osoby prowadzące działalność gospodarczą.</li>
            </ul>
          </div>
        </div>
      )}

      {activeCategory === 'protection' && (
        <div className="zus-card">
          <h2 className="zus-card-header-title">Gwarancje prawne pracownicy i pracownika</h2>
          <div className="zus-notice-box" style={{ marginBottom: '16px' }}>
            <strong>Art. 177 Kodeksu pracy:</strong> Pracodawca nie może prowadzić przygotowań do wypowiedzenia ani rozwiązać umowy o pracę w okresie ciąży, urlopu macierzyńskiego, rodzicielskiego i ojcowskiego.
          </div>
          <div className="zus-stat-grid">
            <div className="zus-stat-item">
              <div className="zus-stat-label">Umowa na czas określony</div>
              <div style={{ fontSize: '0.9rem', color: '#1A1A1A' }}>
                Przedłuża się z mocy prawa do dnia porodu, jeśli uległaby rozwiązaniu po 3. miesiącu ciąży.
              </div>
            </div>
            <div className="zus-stat-item">
              <div className="zus-stat-label">Wynagrodzenie chorobowe w ciąży</div>
              <div style={{ fontSize: '0.9rem', color: '#007834', fontWeight: 700 }}>
                100% pensji (pierwsze 33 dni płaci pracodawca, od 34. dnia zasiłek z ZUS).
              </div>
            </div>
            <div className="zus-stat-item">
              <div className="zus-stat-label">Wyjątki od ochrony</div>
              <div style={{ fontSize: '0.9rem', color: '#B45309' }}>
                Tylko w razie upadłości lub likwidacji pracodawcy (wtedy ZUS wypłaca zasiłek w wysokości macierzyńskiego).
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
