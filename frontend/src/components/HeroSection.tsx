import { useAppState } from "./app-state";
import React, { useState } from 'react';

export type RoleType = 'mother' | 'father' | 'adoption' | 'difficult';

interface HeroSectionProps {
  isLoggedIn: boolean;
  onLoginToggle: () => void;
  onOpenPdfModal: () => void;
  onSelectRoleAction?: (role: RoleType) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  isLoggedIn,
  onLoginToggle,
  onOpenPdfModal,
  onSelectRoleAction,
}) => {
  const { user } = useAppState();
  const [selectedRole, setSelectedRole] = useState<RoleType>('mother');

  // Dane dla poszczególnych ról
  const roleData: Record<
    RoleType,
    {
      label: string;
      title: string;
      badge: string;
      benefits: Array<{ title: string; desc: string }>;
      ctaText: string;
      legalBasis: string;
    }
  > = {
    mother: {
      label: 'Matka (Ciąża / Poród)',
      title: 'Uprawnienia matki w okresie ciąży, porodu i rodzicielstwa',
      badge: 'Świadczenia 100% i 81,5%',
      benefits: [
        {
          title: 'Zasiłek chorobowy w ciąży (100% podstawy)',
          desc: 'Wystawiany na e-ZLA z kodem „B”. Okres zasiłkowy wynosi aż 270 dni. Brak limitu 182 dni.',
        },
        {
          title: 'Urlop macierzyński (20 do 37 tygodni)',
          desc: '100% podstawy wymiaru. Pierwsze 14 tygodni po porodzie przysługuje wyłącznie matce na regenerację.',
        },
        {
          title: 'Urlop rodzicielski (do 41 lub 43 tygodni)',
          desc: 'Możliwość uśrednionego zasiłku 81,5% za cały okres przy złożeniu wniosku w ciągu 21 dni od porodu.',
        },
        {
          title: 'Ochrona przed zwolnieniem (art. 177 KP)',
          desc: 'Zakaz wypowiedzenia i rozwiązania umowy o pracę w okresie ciąży oraz urlopów związanych z rodzicielstwem.',
        },
      ],
      ctaText: 'Przejdź do kalkulatora dla matki >',
      legalBasis: 'Ustawa zasiłkowa z dn. 25.06.1999 r. oraz Kodeks pracy (Dz.U. 2026)',
    },
    father: {
      label: 'Ojciec',
      title: 'Prawa i świadczenia przysługujące ojcu dziecka',
      badge: 'Niezbywalne 9 tygodni i ojcowski',
      benefits: [
        {
          title: 'Urlop ojcowski (14 dni / 2 tygodnie)',
          desc: '100% podstawy wymiaru. Wyłączne prawo ojca do wykorzystania do ukończenia 12. miesiąca życia dziecka.',
        },
        {
          title: '9 tygodni nieprzenoszalnego urlopu rodzicielskiego',
          desc: 'Zasiłek 70% podstawy. Część zarezerwowana wyłącznie dla drugiego rodzica – nie przepada na rzecz matki.',
        },
        {
          title: 'Przejęcie urlopu macierzyńskiego po 14. tygodniu',
          desc: 'Matka po wykorzystaniu 14 tygodni może powrócić do pracy, przekazując resztę macierzyńskiego ojcu.',
        },
        {
          title: 'Równoczesne korzystanie z urlopu rodzicielskiego',
          desc: 'Oboje rodzice mogą przebywać na urlopie rodzicielskim w tym samym czasie (do łącznego limitu tygodni).',
        },
      ],
      ctaText: 'Przejdź do kalkulatora dla ojca >',
      legalBasis: 'Art. 182(1a) oraz Art. 182(3) Kodeksu pracy (Dz.U. 2026)',
    },
    adoption: {
      label: 'Adopcja / Rodzina zastępcza',
      title: 'Świadczenia przy przyjęciu dziecka na wychowanie',
      badge: 'Równe uprawnienia do zasiłków',
      benefits: [
        {
          title: 'Urlop na warunkach macierzyńskiego (20–37 tyg.)',
          desc: 'Płatny 100% podstawy wymiaru. Gwarantowany minimalny okres wynosi 9 tygodni bez względu na wiek dziecka.',
        },
        {
          title: 'Wymiar zależny od wieku i liczby dzieci',
          desc: 'Przysługuje do ukończenia przez dziecko 7. roku życia (lub 10. r.ż. przy odroczeniu szkoły, do 14 r.ż. przy przysposobieniu).',
        },
        {
          title: 'Urlop rodzicielski dla opiekunów (do 41–43 tyg.)',
          desc: 'Identyczne zasady podziału i stawek (70% lub uśredniona stawka 81,5% z wnioskiem w 21 dni).',
        },
        {
          title: 'Urlop ojcowski dla ojca adopcyjnego',
          desc: '14 dni urlopu do 12 miesięcy od uprawomocnienia postanowienia sądu (nie później niż do 14. r.ż. dziecka).',
        },
      ],
      ctaText: 'Przejdź do kalkulatora adopcyjnego >',
      legalBasis: 'Art. 183 Kodeksu pracy oraz Art. 29 ust. 1 pkt 2-3 Ustawy zasiłkowej',
    },
    difficult: {
      label: 'Trudna sytuacja',
      title: 'Wsparcie w sytuacjach kryzysowych i powikłaniach',
      badge: 'Uzupełniający macierzyński i wsparcie',
      benefits: [
        {
          title: 'Uzupełniający urlop macierzyński (wcześniaki / szpital)',
          desc: 'Nawet do 15 tygodni dodatkowego urlopu płatnego 100% za czas hospitalizacji malucha po porodzie.',
        },
        {
          title: 'Wydłużony urlop z zaświadczeniem „Za życiem”',
          desc: 'Aż do 65 lub 67 tygodni urlopu rodzicielskiego w przypadku ciężkich wad prenatalnych lub okołoporodowych.',
        },
        {
          title: 'Martwe urodzenie lub zgon dziecka',
          desc: 'Prawo do 8 tygodni zasiłku macierzyńskiego (100%), brak konieczności powrotu do pracy oraz zasiłek pogrzebowy 7000 zł.',
        },
        {
          title: 'Upadłość / likwidacja pracodawcy w ciąży',
          desc: 'Zasiłek w wysokości macierzyńskiego wypłacany przez ZUS do dnia porodu po ustaniu zatrudnienia.',
        },
      ],
      ctaText: 'Sprawdź procedury w trudnych sytuacjach >',
      legalBasis: 'Art. 180(1), Art. 180(2) KP oraz Art. 30 Ustawy zasiłkowej',
    },
  };

  const currentRole = roleData[selectedRole];

  return (
    <section className="zus-hero-section" id="start">
      <div className="zus-container zus-hero-grid">
        {/* LEWA KOLUMNA (68%) */}
        <div className="zus-hero-main">
          <div className="zus-official-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>Oficjalny Przewodnik Ubezpieczeń Społecznych ZUS 2026</span>
          </div>

          <h1 className="zus-hero-title">
            Sprawdź swoje uprawnienia i zasiłki krok po kroku
          </h1>

          <p className="zus-hero-desc">
            Narzędzie pomaga przyszłym rodzicom, osobom w ciąży oraz rodzicom adopcyjnym i zastępczym ustalić prawo do świadczeń i uniknąć błędów w dokumentach. Przeprowadzimy Cię przez cały proces: od kwalifikacji do zasiłku chorobowego z kodem B, przez urlop macierzyński i rodzicielski, aż po optymalizację podziału urlopów.
          </p>

          {/* POZIOMY PASEK ZAKŁADEK (CHARAKTERYSTYCZNY STYL ZUS Z ZIELONĄ LINIĄ) */}
          <div className="zus-role-tabs-container">
            <div className="zus-role-tabs" role="tablist" aria-label="Wybierz rolę ubezpieczonego">
              {(Object.keys(roleData) as RoleType[]).map((roleKey) => (
                <button
                  key={roleKey}
                  type="button"
                  role="tab"
                  aria-selected={selectedRole === roleKey}
                  className={`zus-role-tab ${selectedRole === roleKey ? 'active' : ''}`}
                  onClick={() => setSelectedRole(roleKey)}
                >
                  <span className="zus-role-tab-icon">
                    {roleKey === 'mother' }
                    {roleKey === 'father' }
                    {roleKey === 'adoption'}
                    {roleKey === 'difficult'}
                  </span>
                  <span>{roleData[roleKey].label}</span>
                </button>
              ))}
            </div>

            {/* DYNAMICZNA KARTA PODSUMOWANIA DLA WYBRANEJ ROLI */}
            <div className="zus-role-summary-card">
              <div className="zus-role-summary-header">
                <h2 className="zus-role-summary-title">
                  <span>{currentRole.title}</span>
                </h2>
                <span className="zus-role-summary-badge">{currentRole.badge}</span>
              </div>

              <ul className="zus-benefits-list">
                {currentRole.benefits.map((benefit, index) => (
                  <li key={index} className="zus-benefit-item">
                    <svg className="zus-benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <div>
                      <strong>{benefit.title}: </strong>
                      <span>{benefit.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="zus-role-card-footer">
                <button
                  type="button"
                  className="zus-btn-role-calculator"
                  onClick={() => {
                    if (onSelectRoleAction) {
                      onSelectRoleAction(selectedRole);
                    } else {
                      alert(`Przejście do zintegrowanego kalkulatora z prekonfiguracją dla roli: ${currentRole.label}`);
                    }
                  }}
                >
                  <span>{currentRole.ctaText}</span>
                </button>

                <div className="zus-role-note">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>Podstawa: {currentRole.legalBasis}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRAWA KOLUMNA (32%) - KARTA BOCZNA "TWÓJ STATUS W ZUS" */}
        <aside className="zus-hero-sidebar" aria-label="Status w Zakładzie Ubezpieczeń Społecznych">
          <div className="zus-sidebar-header">
            <h3 className="zus-sidebar-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Twój status w ZUS</span>
            </h3>
            <span className={`zus-status-pill ${isLoggedIn ? 'online' : 'offline'}`}>
              {isLoggedIn ? 'Zalogowano' : 'Niezalogowany'}
            </span>
          </div>

          <div className="zus-sidebar-body">
            {!isLoggedIn ? (
              /* Wariant NIEZALOGOWANY */
              <div className="zus-not-logged-box">
                <p className="zus-not-logged-text">
                  Zaloguj się profilem <strong>mObywatel</strong>, aby natychmiast zaimportować dane o ubezpieczeniu, tytule składek oraz wystawionych zwolnieniach lekarskich <strong>e-ZLA</strong> z bazy ZUS.
                </p>

                <div className="zus-sidebar-action-btns">
                  <button
                    type="button"
                    className="zus-btn-sidebar-login"
                    onClick={onLoginToggle}
                  >
                    <span className="mobywatel-icon-wrapper">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
                        <path d="M12 18h.01" />
                        <path d="m9 10 2 2 4-4" />
                      </svg>
                    </span>
                    <span className="mobywatel-btn-text">
                      Zaloguj przez <strong>mObywatel</strong>
                    </span>
                    <svg className="mobywatel-btn-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="zus-btn-sidebar-pdf"
                    onClick={onOpenPdfModal}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <span>Przetestuj sprawę PDF</span>
                  </button>

                  <button
                    type="button"
                    className="zus-btn-sidebar-manual"
                    onClick={() => {
                      if (onSelectRoleAction) {
                        onSelectRoleAction('mother');
                      }
                    }}
                  >
                    Wypełnij dane bez logowania
                  </button>
                </div>
              </div>
            ) : (
              /* Wariant ZALOGOWANY (Mockowe dane ZUS / mObywatel) */
              <div className="zus-logged-box">
                {(() => {
                  const initials = user ? `${user.firstName[0] || "O"}${user.lastName[0] || "B"}` : "AK";
                  const fullName = user ? `${user.firstName} ${user.lastName}` : "Anna Kowalska";
                  const peselDisplay = user ? user.peselMasked : "920512•••••";
                  return (
                    <div className="zus-user-header">
                      <div className="zus-user-avatar">{initials}</div>
                      <div className="zus-user-details">
                        <span className="zus-user-name">{fullName}</span>
                        <span className="zus-user-pesel">PESEL: {peselDisplay}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* 1. Status ubezpieczenia chorobowego */}
                <div className="zus-data-row">
                  <span className="zus-data-label">Ubezpieczenie chorobowe</span>
                  <span className="zus-data-val-primary">
                    {user?.simulation?.has_sickness_insurance !== false
                      ? `Aktywne – ${user?.simulation?.insurance_title || "Umowa o pracę"}`
                      : "Brak ubezpieczenia chorobowego"}
                  </span>
                  <span className="zus-data-val-sub">
                    Płatnik: {user?.simulation?.payer_name || "TechPol Sp. z o.o."}
                  </span>
                  <span className="zus-ezla-badge">
                    {user?.simulation?.waiting_period_satisfied !== false
                      ? "Spełniony okres karencji"
                      : "Niespełniony okres karencji"}
                  </span>
                </div>

                {/* 2. Ostatnie e-ZLA */}
                <div className="zus-data-row">
                  <span className="zus-data-label">Aktywne zwolnienie e-ZLA</span>
                  {(() => {
                    const activeEzla = user?.simulation?.active_ezla;
                    const hasCodeB = activeEzla?.some((c: any) => c.medical_code === "B");
                    if (hasCodeB) {
                      const ezla = activeEzla.find((c: any) => c.medical_code === "B");
                      return (
                        <>
                          <span className="zus-data-val-primary">
                            {ezla.document_id || "e-ZLA"} (Kod B – ciąża)
                          </span>
                          <span className="zus-data-val-sub">
                            {ezla.start_date} – {ezla.end_date} ({ezla.days_count} dni) • Płatne 100%
                          </span>
                          {ezla.doctor_name && (
                            <span className="zus-data-val-sub">Lekarz: {ezla.doctor_name}</span>
                          )}
                        </>
                      );
                    }
                    if (user?.simulation?.has_active_ezla && activeEzla && activeEzla.length > 0) {
                      const ezla = activeEzla[0];
                      return (
                        <>
                          <span className="zus-data-val-primary">{ezla.document_id || "e-ZLA"}</span>
                          <span className="zus-data-val-sub">
                            {ezla.start_date} – {ezla.end_date} ({ezla.days_count} dni)
                          </span>
                        </>
                      );
                    }
                    return (
                      <span className="zus-data-val-primary" style={{ color: "#666" }}>
                        Brak aktywnego zwolnienia lekarskiego
                      </span>
                    );
                  })()}
                </div>

                {/* 3. Stan składek */}
                <div className="zus-data-row">
                  <span className="zus-data-label">Rozliczenia ze składek</span>
                  {user?.simulation?.has_overdue_contributions ? (
                    <>
                      <span className="zus-data-val-primary" style={{ color: "#d32f2f" }}>
                        Zaległość: {user.simulation.overdue_amount ? `${user.simulation.overdue_amount.toFixed(2)} zł` : "powyżej limitu"}
                      </span>
                      <span className="zus-data-val-sub">Wstrzymanie wypłaty świadczeń (art. 2a)</span>
                    </>
                  ) : (
                    <>
                      <span className="zus-data-val-primary" style={{ color: "#007834" }}>
                        Brak zadłużenia (0,00 zł)
                      </span>
                      <span className="zus-data-val-sub">Wszystkie składki opłacone terminowo</span>
                    </>
                  )}
                </div>

                {/* Przycisk wylogowania */}
                <button
                  type="button"
                  className="zus-btn-logout"
                  onClick={onLoginToggle}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Wyloguj z profilu</span>
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
};
