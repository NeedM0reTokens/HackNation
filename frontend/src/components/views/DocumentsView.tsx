import { ViewHeader } from "../common/ViewHeader";
import React, { useState } from 'react';
import { ApplicationSimulator } from './ApplicationSimulator';
import { AiFieldExplainer } from '@/components/ai/AiFieldExplainer';

export const DocumentsView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'simulator' | 'deadlines' | 'forms' | 'protection' | 'risks'>('simulator');

  return (
    <div className="zus-view-container">
      <ViewHeader
        title="Co, gdzie i kiedy złożyć? – Przewodnik formalności ZUS"
        description={<>Terminowe złożenie właściwych formularzy jest kluczem do uzyskania optymalnych stawek (np. <strong>81,5% za cały okres</strong>) oraz pełnej ochrony przed zwolnieniem z pracy.</>}
      />

      {/* Zakładki kategorii */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #E2E8F0', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`zus-tab-btn ${activeCategory === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveCategory('simulator')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>
            INTERAKTYWNY
          </span>
          Symulator Wniosków (ZAM / Urlopowy)
        </button>
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
          Katalog Wniosków (ZAM, Z-3, Z-3a)
        </button>
        <button
          type="button"
          className={`zus-tab-btn ${activeCategory === 'protection' ? 'active' : ''}`}
          onClick={() => setActiveCategory('protection')}
        >
          Szczególna Ochrona Pracy (art. 177 KP)
        </button>
        <button
          type="button"
          className={`zus-tab-btn ${activeCategory === 'risks' ? 'active' : ''}`}
          onClick={() => setActiveCategory('risks')}
        >
          Zagrożenia i Ryzyka Utraty Praw
        </button>
      </div>

      {/* 0. INTERAKTYWNY SYMULATOR WNIOSKÓW */}
      {activeCategory === 'simulator' && <ApplicationSimulator />}

      {/* 1. TERMINY */}
      {activeCategory === 'deadlines' && (
        <div className="zus-card">
          <h2 className="zus-card-header-title">Harmonogram najważniejszych terminów</h2>
          <div className="zus-timeline-list">
            <div className="zus-timeline-item">
              <div className="zus-timeline-badge">21 DNI</div>
              <div>
                <strong>Wniosek o zasiłek macierzyński i rodzicielski w pełnym wymiarze (art. 30a)</strong>
                <p>Termin 21 dni liczy się od dnia porodu. Złożenie wniosku ZAM o wariant ujednolicony gwarantuje wypłatę uśrednionego zasiłku w wysokości <strong>81,5%</strong> za cały okres urlopu macierzyńskiego i rodzicielskiego matki.</p>
              </div>
            </div>

            <div className="zus-timeline-item">
              <div className="zus-timeline-badge">14 DNI</div>
              <div>
                <strong>Rezygnacja matki z części macierzyńskiego na rzecz ojca</strong>
                <p>Matka musi złożyć wniosek u pracodawcy najpóźniej na 14 dni przed planowanym powrotem do pracy (po wykorzystaniu min. 14 tygodni osobiście).</p>
              </div>
            </div>

            <div className="zus-timeline-item">
              <div className="zus-timeline-badge">7 DNI</div>
              <div>
                <strong>Wniosek o urlop ojcowski (art. 182(3) KP)</strong>
                <p>Pracownik-ojciec składa wniosek do pracodawcy najpóźniej na 7 dni przed planowanym rozpoczęciem urlopu ojcowskiego (14 dni płatne 100%).</p>
              </div>
            </div>

            <div className="zus-timeline-item">
              <div className="zus-timeline-badge">21 DNI</div>
              <div>
                <strong>Uzupełniający urlop macierzyński dla rodziców wcześniaków</strong>
                <p>Wniosek składa się co najmniej na 21 dni przed zakończeniem urlopu macierzyńskiego wraz z zaświadczeniem ze szpitala o okresie hospitalizacji.</p>
              </div>
            </div>

            <div className="zus-timeline-item">
              <div className="zus-timeline-badge">21 DNI</div>
              <div>
                <strong>Łączenie urlopu rodzicielskiego z pracą na 1/2 etatu</strong>
                <p>Wniosek o wykonywanie pracy u pracodawcy w trakcie urlopu rodzicielskiego należy złożyć na min. 21 dni przed planowanym powrotem na część etatu.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FORMULARZE */}
      {activeCategory === 'forms' && (
        <>
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div>
              <strong style={{ color: '#166534', fontSize: '0.95rem' }}>
                Chcesz wygenerować gotowy wniosek (PDF) i zasymulować wysyłkę?
              </strong>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#15803D' }}>
                Przejdź do naszego Kreatora: pobierz dane z profilu mObywatel, wygeneruj formalne pismo z podpisami i odbierz Urzędowe Poświadczenie Odbioru (UPO).
              </p>
            </div>
            <button
              type="button"
              className="zus-btn zus-btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.88rem' }}
              onClick={() => setActiveCategory('simulator')}
            >
              Uruchom Symulator Wniosków &rarr;
            </button>
          </div>

          <div className="zus-view-grid">
          <div className="zus-card">
            <h2 className="zus-card-header-title">Dla Pracowników (Umowa o Pracę)</h2>
            <div style={{ marginBottom: '14px', padding: '10px', backgroundColor: '#E8F1F8', borderRadius: '6px', fontSize: '0.85rem', color: '#003B6F' }}>
              <strong>Kto wypłaca zasiłek?</strong><br />
              • Płatnik zatrudniający <strong>powyżej 20 ubezpieczonych</strong>: wypłaca zasiłek we własnym zakresie.<br />
              • Płatnik zatrudniający <strong>do 20 ubezpieczonych</strong>: przekazuje dokumentację do ZUS, a zasiłek wypłaca bezpośrednio ZUS.
            </div>
            <ul className="zus-list">
              <li><strong>Z-3 (Zaświadczenie płatnika składek):</strong> Przesyłane przez pracodawcę do ZUS ze składnikami wynagrodzenia, gdy zasiłek wypłaca ZUS.</li>
              <li><strong>Wniosek o urlop macierzyński i rodzicielski:</strong> Składany u pracodawcy w terminie 21 dni od porodu.</li>
              <li><strong>ZAS-12:</strong> Zaświadczenie płatnika na dalszy okres niezdolności do pracy.</li>
              <li><strong>Odpis aktu urodzenia:</strong> Ze szpitala lub USC (odpis skrócony lub zupełny).</li>
            </ul>
          </div>

          <div className="zus-card">
            <h2 className="zus-card-header-title">Dla Samozatrudnionych (JDG) i Zleceniobiorców</h2>
            <div style={{ marginBottom: '14px', padding: '10px', backgroundColor: '#FEF3C7', borderRadius: '6px', fontSize: '0.85rem', color: '#B45309' }}>
              <strong>Ważna zmiana od 24 października 2026 r.:</strong><br />
              • Formularze <strong>ZUR</strong> oraz <strong>ZAO</strong> zostały połączone ze zunifikowanym formularzem <strong>ZAM</strong> i zlikwidowane.<br />
              • Formularz <strong>Z-3b</strong> dla przedsiębiorców został zlikwidowany (obecnie ZUS korzysta z danych z konta płatnika).
            </div>
            <ul className="zus-list">
              <li><strong>ZAM:</strong> Zunifikowany wniosek o zasiłek macierzyński (składany bezpośrednio do ZUS przez eZUS / PUE).</li>
              <li><strong>Z-3a:</strong> Zaświadczenie płatnika składek dla osób wykonujących pracę na podstawie umowy zlecenia.</li>
              <li><strong>ZAS-53:</strong> Wniosek o zasiłek chorobowy składany przez osoby prowadzące pozarolniczą działalność gospodarczą.</li>
            </ul>
          </div>
          </div>
        </>
      )}

      {/* 3. OCHRONA */}
      {activeCategory === 'protection' && (
        <div className="zus-card">
          <h2 className="zus-card-header-title">Gwarancje prawne pracownicy i pracownika</h2>
          <div className="zus-notice-box" style={{ marginBottom: '16px' }}>
            <strong>Art. 177 Kodeksu pracy:</strong> W okresie ciąży oraz w okresie urlopów związanych z rodzicielstwem pracodawca nie może prowadzić przygotowań do wypowiedzenia ani rozwiązać umowy o pracę z pracownicą lub pracownikiem.
          </div>
          <div className="zus-stat-grid">
            <div className="zus-stat-item">
              <div className="zus-stat-label">Umowa na czas określony</div>
              <div style={{ fontSize: '0.9rem', color: '#1A1A1A' }}>
                Przedłuża się z mocy prawa do dnia porodu, jeśli uległaby rozwiązaniu po upływie 3. miesiąca ciąży.
              </div>
            </div>
            <div className="zus-stat-item">
              <div className="zus-stat-label">Wynagrodzenie chorobowe w ciąży</div>
              <div style={{ fontSize: '0.9rem', color: '#007834', fontWeight: 700 }}>
                100% podstawy (pierwsze 33 dni płaci pracodawca, od 34. dnia zasiłek z FUS płaci ZUS).
              </div>
            </div>
            <div className="zus-stat-item">
              <div className="zus-stat-label">Wyjątki od ochrony</div>
              <div style={{ fontSize: '0.9rem', color: '#B45309' }}>
                Upadłość lub likwidacja pracodawcy – wówczas ZUS wypłaca zasiłek w wysokości zasiłku macierzyńskiego aż do dnia porodu.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. RYZYKA I ZAGROŻENIA */}
      {activeCategory === 'risks' && (
        <div className="zus-card">
          <h2 className="zus-card-header-title">Zagrożenia związane z prawem do zasiłków (Wytyczne ZUS)</h2>
          <div className="zus-timeline-list">
            <div className="zus-timeline-item">
              <div className="zus-timeline-badge" style={{ backgroundColor: '#991B1B' }}>RYZYKO 1</div>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <strong>Zawarcie umowy o pracę lub rejestracja JDG dla pozoru (art. 83 § 1 KC)</strong>
                  <AiFieldExplainer topicId="ryzyko-pozornosc-umowy" label="Pozorność zatrudnienia" buttonText="Kontrola ZUS" />
                </div>
                <p>Podjęcie zatrudnienia lub zarejestrowanie działalności gospodarczej wyłącznie w celu uzyskania ochrony ubezpieczeniowej i prawa do wysokich zasiłków bez faktycznego świadczenia pracy skutkuje postępowaniem wyjaśniającym ZUS. W razie uznania pozorności ZUS wydaje decyzję o niepodleganiu ubezpieczeniom społecznym, co oznacza brak prawa do jakichkolwiek zasiłków oraz konieczność zwrotu pobranych kwot.</p>
              </div>
            </div>

            <div className="zus-timeline-item">
              <div className="zus-timeline-badge" style={{ backgroundColor: '#B45309' }}>RYZYKO 2</div>
              <div>
                <strong>Sztuczne podwyższenie podstawy wymiaru składek w okresie ciąży</strong>
                <p>Nagłe i nieuzasadnione rynkowo podwyższenie wynagrodzenia pracownicy lub zadeklarowanie maksymalnej podstawy składek w JDG tuż przed pójściem na zwolnienie lekarskie. ZUS po przeprowadzeniu kontroli może uznać podwyższenie za sprzeczne z zasadami współżycia społecznego i wydać decyzję obniżającą podstawę wymiaru zasiłków.</p>
              </div>
            </div>

            <div className="zus-timeline-item">
              <div className="zus-timeline-badge" style={{ backgroundColor: '#003B6F' }}>RYZYKO 3</div>
              <div>
                <strong>Brak ubezpieczenia chorobowego na dzień porodu</strong>
                <p>Niezgłoszenie się w terminie do dobrowolnego ubezpieczenia chorobowego (dla umów zleceń i JDG), wygaśnięcie umowy cywilnoprawnej przed porodem lub opóźnienie w opłaceniu składek powoduje wyrejestrowanie z ubezpieczenia i brak uprawnień do zasiłku macierzyńskiego z FUS.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
