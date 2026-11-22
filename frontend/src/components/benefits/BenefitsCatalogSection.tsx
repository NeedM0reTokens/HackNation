import React, { useState, useMemo, useEffect } from 'react';
import {
  evaluateBenefits,
  BenefitEvaluationResult,
  UserRole,
  EmploymentType,
  UserConditions,
  MOCK_LOGGED_IN_PROFILE,
} from '../../utils/benefitsEvaluator';

interface BenefitsCatalogSectionProps {
  isLoggedIn: boolean;
  onLoginToggle: () => void;
  onOpenPdfModal?: () => void;
}

export const BenefitsCatalogSection: React.FC<BenefitsCatalogSectionProps> = ({
  isLoggedIn,
  onLoginToggle,
  onOpenPdfModal,
}) => {
  // Stan filtrów ręcznych (dla niezalogowanego - domyślnie wszystko odznaczone/false)
  const [role, setRole] = useState<UserRole | null>(null);
  const [employment, setEmployment] = useState<EmploymentType | null>(null);
  const [conditions, setConditions] = useState<UserConditions>({
    hasSicknessInsurance: false,
    waitingPeriodPassed: false,
    hasEZlaCodeB: false,
    hasZusDebt: false,
    isHospitalizedPremature: false,
    hasZaZyciemCertificate: false,
  });

  // Filtrowanie widoku kart (wszystkie / tylko kwalifikujące się / niekwalifikujące)
  const [statusFilter, setStatusFilter] = useState<'all' | 'eligible' | 'not_eligible'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Przełączanie formy zatrudnienia (kliknięcie zaznacza lub odznacza)
  const handleEmploymentChange = (newEmp: EmploymentType) => {
    setEmployment((prev) => (prev === newEmp ? null : newEmp));
  };

  // Przełączanie roli (kliknięcie zaznacza lub odznacza)
  const handleRoleChange = (newRole: UserRole) => {
    setRole((prev) => (prev === newRole ? null : newRole));
  };

  // Ewaluacja świadczeń w zależności od trybu
  const evaluatedBenefits = useMemo<BenefitEvaluationResult[]>(() => {
    if (isLoggedIn) {
      // Tryb zalogowany: profil z mObywatel / ZUS (Anna Kowalska)
      return evaluateBenefits(MOCK_LOGGED_IN_PROFILE);
    }

    // Tryb niezalogowany: stan z formularza filtrów ręcznych
    return evaluateBenefits({
      role,
      employment,
      conditions,
      isLoggedIn: false,
    });
  }, [isLoggedIn, role, employment, conditions]);

  // Liczniki
  const eligibleCount = useMemo(
    () => evaluatedBenefits.filter((b) => b.isEligible).length,
    [evaluatedBenefits]
  );
  const notEligibleCount = evaluatedBenefits.length - eligibleCount;

  // Sortowanie: w trybie zalogowanym zawsze najpierw spełnione,
  // a także filtrowanie po statusie, kategorii i wyszukiwaniu
  const visibleBenefits = useMemo(() => {
    let list = [...evaluatedBenefits];

    // Filtrowanie po statusie kwalifikacji
    if (statusFilter === 'eligible') {
      list = list.filter((b) => b.isEligible);
    } else if (statusFilter === 'not_eligible') {
      list = list.filter((b) => !b.isEligible);
    }

    // Filtrowanie po kategorii
    if (categoryFilter !== 'all') {
      list = list.filter((b) => b.category === categoryFilter);
    }

    // Wyszukiwanie tekstowe
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.shortDescription.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.rate.toLowerCase().includes(q) ||
          b.legalBasis.toLowerCase().includes(q)
      );
    }

    // Sortowanie: w trybie zalogowanym (oraz domyślnie) spełnione na samej górze
    list.sort((a, b) => {
      if (a.isEligible === b.isEligible) {
        return a.order - b.order;
      }
      return a.isEligible ? -1 : 1;
    });

    return list;
  }, [evaluatedBenefits, statusFilter, categoryFilter, searchQuery]);

  const toggleCardExpand = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleResetFilters = () => {
    setRole(null);
    setEmployment(null);
    setConditions({
      hasSicknessInsurance: false,
      waitingPeriodPassed: false,
      hasEZlaCodeB: false,
      hasZusDebt: false,
      isHospitalizedPremature: false,
      hasZaZyciemCertificate: false,
    });
    setCategoryFilter('all');
    setSearchQuery('');
  };

  return (
    <section className="zus-benefits-catalog-section" id="katalog-swiadczen">
      <div className="zus-container">
        {/* NAGŁÓWEK SEKCJI */}
        <div className="zus-catalog-header">
          <div className="zus-catalog-header-top">
            <span className="zus-official-pill">Katalog Zasiłków i Praw 2026</span>
            <div className="zus-catalog-auth-status">
              <span className={`zus-status-dot ${isLoggedIn ? 'online' : 'manual'}`}></span>
              <span className="zus-status-mode-label">
                {isLoggedIn
                  ? 'Tryb automatyczny: Dane pobrane z mObywatel / ZUS'
                  : 'Tryb manualny: Symulacja na podstawie filtrów'}
              </span>
            </div>
          </div>

          <h2 className="zus-catalog-title">Twoje uprawnienia i świadczenia</h2>
          <p className="zus-catalog-subtitle">
            Interaktywny katalog 16 świadczeń społecznych i rodzicielskich ZUS. Sprawdź na jakie wsparcie możesz
            liczyć, jakie warunki musisz spełnić oraz jaka jest dokładna podstawa prawna.
          </p>
        </div>

        {/* 1. TRYB DLA ZALOGOWANEGO: BELKA INFORMACYJNA */}
        {isLoggedIn ? (
          <div className="zus-auth-summary-bar">
            <div className="zus-auth-summary-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
              </svg>
            </div>
            <div className="zus-auth-summary-content">
              <div className="zus-auth-summary-headline">
                <strong>Przeanalizowano automatycznie na podstawie Twoich danych z ZUS (mObywatel)</strong>
                <span className="zus-auth-verified-pill">Dane zweryfikowane w czasie rzeczywistym</span>
              </div>
              <p className="zus-auth-summary-desc">
                Zalogowano jako: <strong>Anna Kowalska</strong> (PESEL: 920512•••••) • Płatnik składek:{' '}
                <strong>TechSolutions Sp. z o.o.</strong>
              </p>

              <div className="zus-auth-tags-grid">
                <div className="zus-auth-param-chip">
                  <span className="zus-param-label">Tytuł ubezpieczenia:</span>
                  <span className="zus-param-value">Umowa o pracę (UoP)</span>
                </div>
                <div className="zus-auth-param-chip">
                  <span className="zus-param-label">Ubezpieczenie chorobowe:</span>
                  <span className="zus-param-value zus-text-success">Aktywne (obowiązkowe)</span>
                </div>
                <div className="zus-auth-param-chip">
                  <span className="zus-param-label">Okres wyczekiwania:</span>
                  <span className="zus-param-value zus-text-success">Spełniony (&gt; 30 dni)</span>
                </div>
                <div className="zus-auth-param-chip">
                  <span className="zus-param-label">Zwolnienie e-ZLA:</span>
                  <span className="zus-param-value zus-text-success">Aktywne (Kod B – ciąża)</span>
                </div>
                <div className="zus-auth-param-chip">
                  <span className="zus-param-label">Stan rozliczeń składek:</span>
                  <span className="zus-param-value zus-text-success">Brak zaległości (0,00 zł)</span>
                </div>
              </div>
            </div>

            <div className="zus-auth-summary-actions">
              <button
                type="button"
                className="zus-btn-auth-switch"
                onClick={onLoginToggle}
                title="Przełącz na ręczny symulator"
              >
                Przełącz na ręczne filtry &gt;
              </button>
            </div>
          </div>
        ) : (
          /* 2. TRYB DLA NIEZALOGOWANEGO: PANEL FILTRÓW RĘCZNYCH */
          <div className="zus-filter-panel-box">
            <div className="zus-filter-panel-header">
              <div className="zus-filter-header-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                <h3>Zaznacz swoją sytuację, aby sprawdzić uprawnienia</h3>
              </div>
              <div className="zus-filter-header-actions">
                <button
                  type="button"
                  className="zus-btn-secondary-link"
                  onClick={handleResetFilters}
                >
                  ↺ Resetuj kryteria
                </button>
                <button
                  type="button"
                  className="zus-btn-quick-mobywatel"
                  onClick={onLoginToggle}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                  </svg>
                  <span>Wypełnij automatycznie przez mObywatel</span>
                </button>
              </div>
            </div>

            <div className="zus-filter-body-grid">
              {/* KROK 1: Rola / sytuacja życiowa */}
              <div className="zus-filter-group">
                <label className="zus-filter-group-label">
                  <span className="zus-step-num">1</span> Rola / sytuacja życiowa:
                </label>
                <div className="zus-role-toggle-group">
                  <button
                    type="button"
                    className={`zus-role-chip-btn ${role === 'mother_pregnancy' ? 'active' : ''}`}
                    onClick={() => handleRoleChange('mother_pregnancy')}
                  >
                    Matka (ciąża)
                  </button>
                  <button
                    type="button"
                    className={`zus-role-chip-btn ${role === 'mother_postpartum' ? 'active' : ''}`}
                    onClick={() => handleRoleChange('mother_postpartum')}
                  >
                    Matka (po porodzie)
                  </button>
                  <button
                    type="button"
                    className={`zus-role-chip-btn ${role === 'father' ? 'active' : ''}`}
                    onClick={() => handleRoleChange('father')}
                  >
                    Ojciec
                  </button>
                  <button
                    type="button"
                    className={`zus-role-chip-btn ${role === 'adoption' ? 'active' : ''}`}
                    onClick={() => handleRoleChange('adoption')}
                  >
                    Adopcja / Rodzina zastępcza
                  </button>
                  <button
                    type="button"
                    className={`zus-role-chip-btn ${role === 'difficult' ? 'active' : ''}`}
                    onClick={() => handleRoleChange('difficult')}
                  >
                    Sytuacja trudna (utrata / wcześniak)
                  </button>
                </div>
              </div>

              {/* KROK 2: Forma zatrudnienia */}
              <div className="zus-filter-group">
                <label className="zus-filter-group-label">
                  <span className="zus-step-num">2</span> Forma zatrudnienia / tytuł do ubezpieczeń:
                </label>
                <div className="zus-employment-grid">
                  <label className={`zus-choice-card ${employment === 'uop' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="employment_choice"
                      value="uop"
                      checked={employment === 'uop'}
                      onClick={() => handleEmploymentChange('uop')}
                      onChange={() => {}}
                    />
                    <div className="zus-choice-content">
                      <span className="zus-choice-title">Umowa o pracę (UoP)</span>
                      <span className="zus-choice-desc">Pełne ubezpieczenie chorobowe obowiązkowe</span>
                    </div>
                  </label>

                  <label className={`zus-choice-card ${employment === 'zlecenie' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="employment_choice"
                      value="zlecenie"
                      checked={employment === 'zlecenie'}
                      onClick={() => handleEmploymentChange('zlecenie')}
                      onChange={() => {}}
                    />
                    <div className="zus-choice-content">
                      <span className="zus-choice-title">Umowa zlecenie</span>
                      <span className="zus-choice-desc">Chorobowe dobrowolne na wniosek</span>
                    </div>
                  </label>

                  <label className={`zus-choice-card ${employment === 'jdg' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="employment_choice"
                      value="jdg"
                      checked={employment === 'jdg'}
                      onClick={() => handleEmploymentChange('jdg')}
                      onChange={() => {}}
                    />
                    <div className="zus-choice-content">
                      <span className="zus-choice-title">Działalność gospodarcza (JDG)</span>
                      <span className="zus-choice-desc">Dobrowolne chorobowe, wymóg braku zaległości</span>
                    </div>
                  </label>

                  <label className={`zus-choice-card ${employment === 'none' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="employment_choice"
                      value="none"
                      checked={employment === 'none'}
                      onClick={() => handleEmploymentChange('none')}
                      onChange={() => {}}
                    />
                    <div className="zus-choice-content">
                      <span className="zus-choice-title">Brak ubezpieczenia</span>
                      <span className="zus-choice-desc">Student, bezrobotny, dzieło (kosiniakowe)</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* KROK 3: Dodatkowe warunki i okoliczności */}
              <div className="zus-filter-group">
                <label className="zus-filter-group-label">
                  <span className="zus-step-num">3</span> Dodatkowe warunki i dokumenty (zaznacz wszystkie spełnione):
                </label>
                <div className="zus-checkboxes-grid">
                  <label className="zus-checkbox-row">
                    <input
                      type="checkbox"
                      checked={conditions.hasSicknessInsurance}
                      onChange={(e) =>
                        setConditions((prev) => ({ ...prev, hasSicknessInsurance: e.target.checked }))
                      }
                    />
                    <span className="zus-checkbox-text">
                      <strong>Podlegam ubezpieczeniu chorobowemu</strong>
                      <span className="zus-checkbox-sub">Obowiązkowe dla UoP, dobrowolne dla zleceń i JDG</span>
                    </span>
                  </label>

                  <label className="zus-checkbox-row">
                    <input
                      type="checkbox"
                      checked={conditions.waitingPeriodPassed}
                      onChange={(e) =>
                        setConditions((prev) => ({ ...prev, waitingPeriodPassed: e.target.checked }))
                      }
                    />
                    <span className="zus-checkbox-text">
                      <strong>Minął okres wyczekiwania</strong>
                      <span className="zus-checkbox-sub">30 dni dla UoP / 90 dni dla zleceń i JDG</span>
                    </span>
                  </label>

                  <label className="zus-checkbox-row">
                    <input
                      type="checkbox"
                      checked={conditions.hasEZlaCodeB}
                      onChange={(e) =>
                        setConditions((prev) => ({ ...prev, hasEZlaCodeB: e.target.checked }))
                      }
                    />
                    <span className="zus-checkbox-text">
                      <strong>Mam zaświadczenie lekarskie e-ZLA z kodem B</strong>
                      <span className="zus-checkbox-sub">Elektroniczne zwolnienie w okresie ciąży (płatne 100%)</span>
                    </span>
                  </label>

                  <label className={`zus-checkbox-row ${employment !== 'jdg' ? 'zus-checkbox-dimmed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={conditions.hasZusDebt}
                      onChange={(e) =>
                        setConditions((prev) => ({ ...prev, hasZusDebt: e.target.checked }))
                      }
                    />
                    <span className="zus-checkbox-text">
                      <strong className={conditions.hasZusDebt ? 'zus-text-warning' : ''}>
                        Mam zaległości w składkach ZUS (dotyczy JDG)
                      </strong>
                      <span className="zus-checkbox-sub">Zadłużenie &gt;1% min. pensji blokuje wypłatę zasiłków</span>
                    </span>
                  </label>

                  <label className="zus-checkbox-row">
                    <input
                      type="checkbox"
                      checked={conditions.isHospitalizedPremature}
                      onChange={(e) =>
                        setConditions((prev) => ({ ...prev, isHospitalizedPremature: e.target.checked }))
                      }
                    />
                    <span className="zus-checkbox-text">
                      <strong>Dziecko wymaga hospitalizacji / wcześniak</strong>
                      <span className="zus-checkbox-sub">Uprawnia do uzupełniającego urlopu macierzyńskiego</span>
                    </span>
                  </label>

                  <label className="zus-checkbox-row">
                    <input
                      type="checkbox"
                      checked={conditions.hasZaZyciemCertificate}
                      onChange={(e) =>
                        setConditions((prev) => ({ ...prev, hasZaZyciemCertificate: e.target.checked }))
                      }
                    />
                    <span className="zus-checkbox-text">
                      <strong>Posiadam zaświadczenie „Za życiem”</strong>
                      <span className="zus-checkbox-sub">Wydłuża urlop rodzicielski aż do 65–67 tygodni</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASEK STATYSTYK, WYSZUKIWANIA I PRZEŁĄCZNIKÓW WIDOKU */}
        <div className="zus-catalog-toolbar">
          <div className="zus-toolbar-summary">
            <span className="zus-toolbar-result-badge">
              Kwalifikujesz się do <strong>{eligibleCount}</strong> z 16 świadczeń
            </span>
            {notEligibleCount > 0 && (
              <span className="zus-toolbar-sub-badge">
                ({notEligibleCount} obecnie niespełnione lub niedotyczące profilu)
              </span>
            )}
          </div>

          <div className="zus-toolbar-controls">
            {/* Przełącznik filtru kwalifikowalności */}
            <div className="zus-filter-tabs">
              <button
                type="button"
                className={`zus-filter-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Wszystkie (16)
              </button>
              <button
                type="button"
                className={`zus-filter-tab-btn eligible ${statusFilter === 'eligible' ? 'active' : ''}`}
                onClick={() => setStatusFilter('eligible')}
              >
                ✓ Kwalifikujesz się ({eligibleCount})
              </button>
              <button
                type="button"
                className={`zus-filter-tab-btn not-eligible ${statusFilter === 'not_eligible' ? 'active' : ''}`}
                onClick={() => setStatusFilter('not_eligible')}
              >
                ✕ Nie kwalifikujesz się ({notEligibleCount})
              </button>
            </div>

            {/* Szukajka tekstowa */}
            <div className="zus-search-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Szukaj świadczenia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="zus-catalog-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="zus-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SIATKA KART ŚWIADCZEŃ (RWD) */}
        {visibleBenefits.length === 0 ? (
          <div className="zus-catalog-empty">
            <p>Nie znaleziono świadczeń odpowiadających wybranym kryteriom wyszukiwania.</p>
            <button
              type="button"
              className="zus-btn-secondary"
              onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('all');
                setSearchQuery('');
              }}
            >
              Pokaż wszystkie świadczenia
            </button>
          </div>
        ) : (
          <div className="zus-benefits-grid">
            {visibleBenefits.map((item) => {
              const isExpanded = Boolean(expandedCards[item.id]);

              return (
                <article
                  key={item.id}
                  className={`zus-benefit-card ${item.isEligible ? 'is-eligible' : 'is-not-eligible'}`}
                >
                  {/* Górny pasek karty: Kategoria i numer */}
                  <div className="zus-card-top-row">
                    <span className="zus-card-category-pill">{item.category}</span>
                    <span className="zus-card-order-tag">#{item.order}</span>
                  </div>

                  {/* Tytuł świadczenia */}
                  <h3 className="zus-card-title">{item.title}</h3>
                  <p className="zus-card-desc">{item.shortDescription}</p>

                  {/* Plakietka kwalifikacji + uzasadnienie */}
                  <div className="zus-card-qualification-box">
                    <div className={`zus-badge-qualification ${item.isEligible ? 'badge-green' : 'badge-red'}`}>
                      {item.isEligible ? (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                          <span>Kwalifikujesz się</span>
                        </>
                      ) : (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                          </svg>
                          <span>Nie kwalifikujesz się</span>
                        </>
                      )}
                    </div>
                    {/* 1 krótkie zdanie wyjaśniające dlaczego */}
                    <p className={`zus-card-reason-text ${item.isEligible ? 'text-eligible' : 'text-not-eligible'}`}>
                      {item.reason}
                    </p>
                  </div>

                  {/* Parametry świadczenia: Stawka, czas trwania, płatnik */}
                  <div className="zus-card-specs-grid">
                    <div className="zus-spec-col">
                      <span className="zus-spec-label">Wysokość / stawka:</span>
                      <strong className="zus-spec-val highlight-rate">{item.rate}</strong>
                    </div>
                    <div className="zus-spec-col">
                      <span className="zus-spec-label">Czas przysługiwania:</span>
                      <strong className="zus-spec-val">{item.duration}</strong>
                    </div>
                    <div className="zus-spec-col">
                      <span className="zus-spec-label">Organ wypłacający:</span>
                      <span className="zus-spec-val">{item.disbursingEntity}</span>
                    </div>
                  </div>

                  {/* Rozwijane szczegóły i podstawa prawna */}
                  {isExpanded && (
                    <div className="zus-card-expanded-content">
                      <div className="zus-card-rules-block">
                        <span className="zus-rules-heading">Kluczowe warunki i zasady ZUS:</span>
                        <ul className="zus-rules-list">
                          {item.keyRules.map((rule, idx) => (
                            <li key={idx}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="zus-legal-basis-box">
                        <span className="zus-legal-label">Podstawa prawna:</span>
                        <span className="zus-legal-text">{item.legalBasis}</span>
                      </div>
                    </div>
                  )}

                  {/* Stopka karty: przycisk rozwijania i testu PDF */}
                  <div className="zus-card-footer">
                    <button
                      type="button"
                      className="zus-card-expand-btn"
                      onClick={() => toggleCardExpand(item.id)}
                      aria-expanded={isExpanded}
                    >
                      <span>{isExpanded ? 'Zwiń szczegóły' : 'Pokaż zasady i podstawę prawną'}</span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>

                    {onOpenPdfModal && (
                      <button
                        type="button"
                        className="zus-card-pdf-action"
                        onClick={onOpenPdfModal}
                        title="Sprawdź wzór wniosku w Strefie PDF"
                      >
                        Wniosek PDF
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
