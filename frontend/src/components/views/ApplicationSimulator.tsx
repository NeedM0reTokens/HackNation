import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  Download,
  CheckCircle2,
  Building2,
  Landmark,
  Sparkles,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  User,
  Baby,
  RefreshCw,
  Eye,
  ExternalLink,
} from 'lucide-react';
import type {
  ApplicationCategory,
  ApplicationType,
  ApplicationTemplateInfo,
  ApplicantData,
  EmployerData,
  ChildData,
  LeavePeriodData,
  ApplicationDetailResponse,
  SubmissionConfirmation,
} from '@/types/applications';
import {
  fetchApplicationTemplates,
  prefillApplication,
  createApplication,
  submitApplication,
  downloadApplicationPdfBlob,
} from '@/lib/api-client';

export const ApplicationSimulator: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [templates, setTemplates] = useState<ApplicationTemplateInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ApplicationCategory>('EMPLOYER_LEAVE');
  const [selectedType, setSelectedType] = useState<ApplicationType>('UNIFIED_MATERNITY_PARENTAL_81_5');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form State
  const [applicant, setApplicant] = useState<ApplicantData>({
    first_name: 'Anna',
    last_name: 'Kowalska',
    pesel: '92011501234',
    address_street: 'ul. Marszałkowska 10/12',
    address_postal_code: '00-001',
    address_city: 'Warszawa',
    phone_number: '+48 601 234 567',
    email: 'anna.kowalska@example.com',
  });

  const [employer, setEmployer] = useState<EmployerData>({
    company_name: 'TechPol Sp. z o.o.',
    nip: '5250001090',
    address_street: 'Al. Jerozolimskie 100',
    address_postal_code: '02-001',
    address_city: 'Warszawa',
    payer_size: 'ABOVE_20',
  });

  const [child, setChild] = useState<ChildData>({
    first_name: 'Jan',
    last_name: 'Kowalski',
    date_of_birth: new Date().toISOString().split('T')[0],
    birth_certificate_number: 'AU/2026/09812',
    usc_city: 'Warszawa-Śródmieście',
    gestational_age_weeks: 39,
    birth_weight_grams: 3400,
    hospital_stay_weeks: 0,
  });

  const [leavePeriod, setLeavePeriod] = useState<LeavePeriodData>({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 364 * 86400000).toISOString().split('T')[0],
    weeks_count: 52,
    days_count: 364,
    selected_rate_variant: 'UNIFIED_81_5',
    work_time_fraction: '1/2',
  });

  const [attachmentsProvided, setAttachmentsProvided] = useState<string[]>([
    'BIRTH_CERTIFICATE',
    'OTHER_PARENT_DECLARATION',
  ]);

  const [advisoryNotes, setAdvisoryNotes] = useState<string[]>([]);
  const [createdApplication, setCreatedApplication] = useState<ApplicationDetailResponse | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionConfirmation | null>(null);

  // Load templates on mount
  useEffect(() => {
    fetchApplicationTemplates().then((tpls) => {
      setTemplates(tpls);
    });
  }, []);

  const handleAutoPrefill = async (appTypeToPrefill: ApplicationType = selectedType) => {
    setIsLoading(true);
    setStatusMessage('Pobieram dane tożsamości z mObywatel oraz parametry z kalkulatora...');
    try {
      const resp = await prefillApplication({
        application_type: appTypeToPrefill,
        pesel_or_user_id: 'anna-kowalska',
        selected_variant: leavePeriod.selected_rate_variant || 'UNIFIED_81_5',
      });
      setApplicant(resp.applicant);
      setEmployer(resp.employer);
      setChild(resp.child);
      setLeavePeriod(resp.leave_period);
      setAdvisoryNotes(resp.advisory_notes);
      setAttachmentsProvided(
        resp.required_attachments.filter((a) => a.is_mandatory).map((a) => a.code)
      );
      setStatusMessage('Pomyślnie zsynchronizowano dane z profilem ubezpieczonej i kalkulatorem ZUS.');
    } catch (err) {
      console.error(err);
      setStatusMessage('Zastosowano dane domyślne dla profilu testowego.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleSelectTemplate = (tpl: ApplicationTemplateInfo) => {
    setSelectedType(tpl.type);
    setSelectedCategory(tpl.category);
    handleAutoPrefill(tpl.type);
  };

  const handleCategoryChange = (cat: ApplicationCategory) => {
    setSelectedCategory(cat);
    const catTemplates = templates.filter((t) => t.category === cat);
    if (catTemplates.length > 0) {
      const isCurrentInCat = catTemplates.some((t) => t.type === selectedType);
      if (!isCurrentInCat) {
        handleSelectTemplate(catTemplates[0]);
      }
    }
  };

  const handleCreateApplication = async () => {
    setIsLoading(true);
    try {
      const resp = await createApplication({
        application_type: selectedType,
        applicant,
        employer: selectedCategory === 'EMPLOYER_LEAVE' ? employer : undefined,
        child,
        leave_period: leavePeriod,
        attachments_provided: attachmentsProvided,
        place_of_signing: 'Warszawa',
        signing_date: new Date().toISOString().split('T')[0],
      });
      setCreatedApplication(resp);
      setSubmissionResult(resp.submission_confirmation || null);
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Wystąpił błąd podczas generowania podglądu wniosku.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async (appId: string) => {
    setIsDownloadingPdf(true);
    try {
      const blob = await downloadApplicationPdfBlob(appId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wniosek-${appId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Błąd pobierania pliku PDF. Upewnij się, że backend działa pod adresem http://127.0.0.1:8000.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSubmit = async (destination: 'EMPLOYER' | 'ZUS' | 'USC') => {
    if (!createdApplication) return;
    setIsSubmitting(true);
    try {
      const channel =
        destination === 'EMPLOYER'
          ? 'PORTAL_PRACOWNICZY'
          : destination === 'USC'
          ? 'PORTAL_GOV_PL_EPUAP'
          : 'PUE_EZUS';
      const result = await submitApplication(createdApplication.id, {
        destination,
        delivery_channel: channel,
        delivery_method: channel,
        notes:
          destination === 'USC'
            ? 'Wniosek o odpis z Rejestru Stanu Cywilnego (gov.pl / ePUAP) - zwolnienie z opłaty 0 zł.'
            : 'Wniosek złożony w terminie ustawowym przez Symulator Rodzica.',
        confirm_truthfulness: true,
      });
      setSubmissionResult(result);
      setCreatedApplication((prev) => (prev ? { ...prev, status: result.status, submission_confirmation: result } : null));
      setStep(4);
    } catch (err) {
      console.error(err);
      alert('Błąd symulacji wysyłki wniosku.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTemplate = templates.find((t) => t.type === selectedType);

  return (
    <div className="zus-application-simulator" style={{ marginTop: '16px' }}>
      {/* Pasek postępu kroków */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: '16px 24px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: step >= 1 ? '#007834' : '#E2E8F0',
            color: step >= 1 ? '#FFFFFF' : '#4A4A4A',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}>1</span>
          <span style={{ fontWeight: step === 1 ? 700 : 500, color: step === 1 ? '#007834' : '#4A4A4A' }}>
            Wybór typu wniosku
          </span>
        </div>

        <ArrowRight size={18} color="#94A3B8" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: step >= 2 ? '#007834' : '#E2E8F0',
            color: step >= 2 ? '#FFFFFF' : '#4A4A4A',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}>2</span>
          <span style={{ fontWeight: step === 2 ? 700 : 500, color: step === 2 ? '#007834' : '#4A4A4A' }}>
            Formularz & Załączniki
          </span>
        </div>

        <ArrowRight size={18} color="#94A3B8" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: step >= 3 ? '#007834' : '#E2E8F0',
            color: step >= 3 ? '#FFFFFF' : '#4A4A4A',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}>3</span>
          <span style={{ fontWeight: step === 3 ? 700 : 500, color: step === 3 ? '#007834' : '#4A4A4A' }}>
            Podgląd formalny & PDF
          </span>
        </div>

        <ArrowRight size={18} color="#94A3B8" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: step >= 4 ? '#007834' : '#E2E8F0',
            color: step >= 4 ? '#FFFFFF' : '#4A4A4A',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}>4</span>
          <span style={{ fontWeight: step === 4 ? 700 : 500, color: step === 4 ? '#007834' : '#4A4A4A' }}>
            Potwierdzenie UPO
          </span>
        </div>
      </div>

      {statusMessage && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: '#E8F1F8',
          color: '#003B6F',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderLeft: '4px solid #003B6F',
        }}>
          <Sparkles size={18} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* KROK 1: WYBÓR WNIOSKU */}
      {step === 1 && (
        <div className="zus-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="zus-card-header-title">Krok 1: Wybierz rodzaj dokumentu do przygotowania</h2>
              <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                Wnioski o urlopy pracownicze wymagają autorskiego układu (MRPiPS 2025), a wnioski do ZUS mają sztywne druki (www.zus.pl).
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`zus-btn ${selectedCategory === 'EMPLOYER_LEAVE' ? 'zus-btn-primary' : 'zus-btn-outline'}`}
                onClick={() => handleCategoryChange('EMPLOYER_LEAVE')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Building2 size={16} />
                Do Pracodawcy (Urlopy)
              </button>
              <button
                type="button"
                className={`zus-btn ${selectedCategory === 'ZUS_BENEFIT' ? 'zus-btn-primary' : 'zus-btn-outline'}`}
                onClick={() => handleCategoryChange('ZUS_BENEFIT')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Landmark size={16} />
                Do ZUS (Zasiłki)
              </button>
              <button
                type="button"
                className={`zus-btn ${selectedCategory === 'USC_CIVIL_ACT' ? 'zus-btn-primary' : 'zus-btn-outline'}`}
                onClick={() => handleCategoryChange('USC_CIVIL_ACT')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileText size={16} />
                Do USC / gov.pl (Rejestr Stanu Cywilnego)
              </button>
            </div>
          </div>

          {/* Sekcja informacyjna: Co możesz wygenerować w tym kreatorze */}
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileText size={18} color="#003B6F" />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#003B6F' }}>
                Tu wygenerujesz, uzupełnisz i pobierzesz oficjalne wnioski:
              </h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>
              Kreator umożliwia kompleksowe przygotowanie dokumentów rodzicielskich zgodnych ze standardami 2025/2026, z opcją automatycznego zaciągnięcia danych (mObywatel/ZUS), podglądu czarno-białego druku urzędowego PDF oraz elektronicznej symulacji wysyłki:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                borderLeft: '4px solid #003B6F',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#003B6F', marginBottom: '6px' }}>
                  <Building2 size={16} /> Wnioski do Pracodawcy (Urlopy)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                  • <strong>Urlop macierzyński i rodzicielski</strong> (stawka 81,5% przy wniosku w 21 dni)<br />
                  • <strong>Urlop ojcowski</strong> (14 dni, 100% zasiłku do 12 m.ż. dziecka)<br />
                  • <strong>Urlop dla rodziców wcześniaków</strong> (art. 180¹ KP – hospitalizacja noworodka)<br />
                  • <strong>Łączenie rodzicielskiego z pracą</strong> na część etatu (maks. 1/2 wymiaru)
                </div>
              </div>

              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                borderLeft: '4px solid #007834',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#007834', marginBottom: '6px' }}>
                  <Landmark size={16} /> Wnioski do ZUS (Zasiłki i zaświadczenia)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                  • <strong>Druk ZUS ZAM</strong> – jednolity wniosek o wypłatę zasiłku macierzyńskiego<br />
                  • <strong>Druk ZUS ZAS-53</strong> – wniosek o zasiłek macierzyński / ojcowski płatny przez ZUS<br />
                  • <strong>Zaświadczenie Z-3 / Z-3a</strong> – formularz płatnika składek z podstawą wymiaru
                </div>
              </div>

              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                borderLeft: '4px solid #0284C7',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#0284C7', marginBottom: '6px' }}>
                  <ShieldCheck size={16} /> Wnioski do USC / gov.pl (Akty urodzenia)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                  • <strong>Odpis skrócony aktu urodzenia</strong> – podstawowy dokument do rejestracji w ZUS<br />
                  • <strong>Odpis zupełny aktu urodzenia</strong> – pełne dane rodziców i adnotacje urzędowe<br />
                  • <strong>Ustawowe zwolnienie 0 zł</strong> z opłaty skarbowej na cele zasiłkowe + UPO
                </div>
              </div>
            </div>
          </div>

          {selectedCategory === 'USC_CIVIL_ACT' && (
            <div style={{
              padding: '14px 18px',
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={22} color="#0284C7" />
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#0369A1' }}>
                    Centralny Rejestr Stanu Cywilnego (RSC) • Portal Rzeczypospolitej Polskiej gov.pl
                  </strong>
                  <div style={{ fontSize: '0.82rem', color: '#0C4A6E', marginTop: '2px' }}>
                    Złóż wniosek o wydanie odpisu aktu urodzenia dziecka przez ePUAP (art. 44–45 ustawy Prawo o aktach stanu cywilnego).
                    Odpis na cele zasiłku macierzyńskiego w ZUS jest <strong>ustawowo zwolniony z opłaty skarbowej (0 zł)</strong> na mocy art. 2 ust. 1 pkt 1 lit. c ustawy o opłacie skarbowej.
                  </div>
                </div>
              </div>
              <a
                href="https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.82rem',
                  color: '#0284C7',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#FFFFFF',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #BAE6FD',
                }}
              >
                gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego <ExternalLink size={14} />
              </a>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {templates
              .filter((t) => t.category === selectedCategory)
              .map((tpl) => {
                const isSelected = selectedType === tpl.type;
                return (
                  <div
                    key={tpl.type}
                    style={{
                      padding: '20px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #007834' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,120,52,0.12)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                    onClick={() => handleSelectTemplate(tpl)}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                          {tpl.official_form_number ? `Druk urzędowy: ${tpl.official_form_number}` : 'Wniosek do pracodawcy'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={14} />
                          {tpl.deadline_description.split('(')[0]}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                        {tpl.title}
                      </h3>

                      <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, marginBottom: '12px' }}>
                        {tpl.description}
                      </p>

                      <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic', marginBottom: '12px' }}>
                        Podstawa prawna: {tpl.legal_basis}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                      <span style={{ fontSize: '0.82rem', color: isSelected ? '#007834' : '#64748B', fontWeight: isSelected ? 700 : 500 }}>
                        {isSelected ? '✓ Wybrany wniosek' : `${tpl.required_attachments.length} załączniki formalne`}
                      </span>
                      <button
                        type="button"
                        className={`zus-btn ${isSelected ? 'zus-btn-primary' : 'zus-btn-outline'}`}
                        style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) {
                            setStep(2);
                          } else {
                            handleSelectTemplate(tpl);
                          }
                        }}
                      >
                        {isSelected ? 'Wypełnij ten wniosek \u2192' : 'Wybierz'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Dolny pasek potwierdzenia wyboru wniosku i przejścia do kroku 2 */}
          <div style={{
            marginTop: '24px',
            padding: '16px 20px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Aktualnie zaznaczony wniosek:</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#003B6F' }}>
                {currentTemplate?.title || 'Wybierz wniosek z listy powyżej'}
              </div>
            </div>
            <button
              type="button"
              className="zus-btn zus-btn-primary"
              disabled={!selectedType}
              onClick={() => setStep(2)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '1rem' }}
            >
              Dalej: Wypełnij wniosek <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* KROK 2: FORMULARZ DANYCH */}
      {step === 2 && (
        <div className="zus-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#007834', textTransform: 'uppercase' }}>
                {selectedCategory === 'EMPLOYER_LEAVE'
                  ? 'Wniosek do Pracodawcy'
                  : selectedCategory === 'USC_CIVIL_ACT'
                  ? 'Wniosek do Urzędu Stanu Cywilnego (gov.pl / RSC)'
                  : 'Wniosek do ZUS'}
              </span>
              <h2 className="zus-card-header-title" style={{ marginTop: '4px' }}>
                {currentTemplate?.title || 'Wypełnienie wniosku'}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="zus-btn zus-btn-outline"
                onClick={() => setStep(1)}
              >
                &larr; Zmień typ wniosku
              </button>
              <button
                type="button"
                className="zus-btn zus-btn-outline"
                style={{ borderColor: '#007834', color: '#007834', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleAutoPrefill()}
                disabled={isLoading}
              >
                <Sparkles size={16} />
                Auto-wypełnij z mObywatel/ZUS
              </button>
            </div>
          </div>

          {/* Wskazówki formalne */}
          {advisoryNotes.length > 0 && (
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '6px', borderLeft: '4px solid #007834', marginBottom: '20px' }}>
              <strong style={{ fontSize: '0.85rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <ShieldCheck size={16} color="#007834" />
                Ustawowe wytyczne formalne dla tego wniosku:
              </strong>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: '#334155' }}>
                {advisoryNotes.map((note, idx) => (
                  <li key={idx} style={{ marginBottom: '2px' }}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Dane wnioskodawcy */}
            <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FAFAFA' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#003B6F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <User size={18} />
                1. Dane Wnioskodawcy (Pracownika / Matki)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label className="zus-label">Imię i Nazwisko</label>
                  <input
                    type="text"
                    className="zus-input"
                    value={`${applicant.first_name} ${applicant.last_name}`}
                    onChange={(e) => {
                      const [fn, ...ln] = e.target.value.split(' ');
                      setApplicant({ ...applicant, first_name: fn || '', last_name: ln.join(' ') || '' });
                    }}
                  />
                </div>
                <div>
                  <label className="zus-label">PESEL</label>
                  <input
                    type="text"
                    className="zus-input"
                    value={applicant.pesel}
                    onChange={(e) => setApplicant({ ...applicant, pesel: e.target.value })}
                  />
                </div>
                <div>
                  <label className="zus-label">Adres zamieszkania</label>
                  <input
                    type="text"
                    className="zus-input"
                    value={`${applicant.address_street || ''}, ${applicant.address_postal_code || ''} ${applicant.address_city || ''}`}
                    onChange={(e) => setApplicant({ ...applicant, address_street: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Dane pracodawcy lub właściwego USC */}
            {selectedCategory === 'USC_CIVIL_ACT' ? (
              <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FAFAFA' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#003B6F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Landmark size={18} />
                  2. Właściwy Urząd Stanu Cywilnego (USC)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label className="zus-label">Właściwy Urząd Stanu Cywilnego</label>
                    <input
                      type="text"
                      className="zus-input"
                      value={child.usc_city || 'USC Warszawa-Śródmieście'}
                      onChange={(e) => setChild({ ...child, usc_city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="zus-label">Rejestr państwowy</label>
                    <input
                      type="text"
                      className="zus-input"
                      readOnly
                      value="Centralny Rejestr Stanu Cywilnego (gov.pl / RSC)"
                      style={{ backgroundColor: '#F1F5F9' }}
                    />
                  </div>
                  <div>
                    <label className="zus-label">Forma i kanał doręczenia</label>
                    <input
                      type="text"
                      className="zus-input"
                      readOnly
                      value="Postać elektroniczna (ePUAP / mObywatel)"
                      style={{ backgroundColor: '#F1F5F9' }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FAFAFA' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#003B6F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Building2 size={18} />
                  2. Dane Pracodawcy / Płatnika składek
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label className="zus-label">Pełna nazwa firmy</label>
                    <input
                      type="text"
                      className="zus-input"
                      value={employer.company_name}
                      onChange={(e) => setEmployer({ ...employer, company_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="zus-label">NIP Płatnika</label>
                    <input
                      type="text"
                      className="zus-input"
                      value={employer.nip || ''}
                      onChange={(e) => setEmployer({ ...employer, nip: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="zus-label">Wielkość płatnika</label>
                    <select
                      className="zus-select"
                      value={employer.payer_size || 'ABOVE_20'}
                      onChange={(e) => setEmployer({ ...employer, payer_size: e.target.value })}
                    >
                      <option value="ABOVE_20">Powyżej 20 ubezpieczonych (sam wypłaca zasiłek)</option>
                      <option value="UP_TO_20">Do 20 ubezpieczonych (wypłaca ZUS po Z-3)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Dane dziecka */}
            <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FAFAFA' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#003B6F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Baby size={18} />
                3. Dane Dziecka (Akt Urodzenia)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label className="zus-label">Imię i nazwisko dziecka</label>
                  <input
                    type="text"
                    className="zus-input"
                    value={child.first_name || ''}
                    onChange={(e) => setChild({ ...child, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="zus-label">Data urodzenia</label>
                  <input
                    type="date"
                    className="zus-input"
                    value={child.date_of_birth || ''}
                    onChange={(e) => setChild({ ...child, date_of_birth: e.target.value })}
                  />
                </div>
                <div>
                  <label className="zus-label">
                    {selectedCategory === 'USC_CIVIL_ACT'
                      ? 'Oznaczenie aktu w RSC (jeśli znane)'
                      : 'Nr odpisu aktu urodzenia z USC'}
                  </label>
                  <input
                    type="text"
                    className="zus-input"
                    value={child.birth_certificate_number || ''}
                    placeholder="np. AU/2026/09812"
                    onChange={(e) => setChild({ ...child, birth_certificate_number: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Parametry urlopu lub parametry odpisu USC */}
            {selectedCategory === 'USC_CIVIL_ACT' ? (
              <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FAFAFA' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#003B6F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Clock size={18} />
                  4. Parametry Odpisu i Zwolnienie 0 zł
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label className="zus-label">Rodzaj odpisu</label>
                    <select
                      className="zus-select"
                      value={selectedType}
                      onChange={(e) => {
                        const newType = e.target.value as ApplicationType;
                        setSelectedType(newType);
                        handleAutoPrefill(newType);
                      }}
                    >
                      <option value="USC_BIRTH_CERTIFICATE_SHORT">
                        Odpis skrócony (podstawa do wniosku ZAM w ZUS)
                      </option>
                      <option value="USC_BIRTH_CERTIFICATE_FULL">
                        Odpis zupełny (pełna treść ze wzmiankami marginesowymi)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="zus-label">Cel wydania dokumentu</label>
                    <input
                      type="text"
                      className="zus-input"
                      readOnly
                      value="Zasiłek macierzyński ZUS / urlop rodzicielski"
                      style={{ backgroundColor: '#F1F5F9' }}
                    />
                  </div>
                  <div>
                    <label className="zus-label">Opłata skarbowa</label>
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: '#DCFCE7',
                      border: '1px solid #86EFAC',
                      borderRadius: '6px',
                      color: '#166534',
                      fontWeight: 700,
                      fontSize: '0.88rem'
                    }}>
                      0,00 PLN (ustawowe zwolnienie art. 2 ust. 1 pkt 1 lit. c)
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FAFAFA' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#003B6F', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Clock size={18} />
                  4. Okres i Wariant Zasiłku
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label className="zus-label">Początek urlopu</label>
                      <input
                        type="date"
                        className="zus-input"
                        value={leavePeriod.start_date}
                        onChange={(e) => setLeavePeriod({ ...leavePeriod, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="zus-label">Koniec urlopu</label>
                      <input
                        type="date"
                        className="zus-input"
                        value={leavePeriod.end_date}
                        onChange={(e) => setLeavePeriod({ ...leavePeriod, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="zus-label">Wymiar urlopu</label>
                    <input
                      type="text"
                      className="zus-input"
                      readOnly
                      value={`${leavePeriod.weeks_count} tygodni (${leavePeriod.days_count} dni)`}
                    />
                  </div>
                  <div>
                    <label className="zus-label">Wariant stawki zasiłku</label>
                    <select
                      className="zus-select"
                      value={leavePeriod.selected_rate_variant || 'UNIFIED_81_5'}
                      onChange={(e) => setLeavePeriod({ ...leavePeriod, selected_rate_variant: e.target.value })}
                    >
                      <option value="UNIFIED_81_5">81,5% za cały okres (art. 30a - wniosek do 21 dni)</option>
                      <option value="STANDARD_100_70">100% macierzyński / 70% rodzicielski</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lista załączników */}
          <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #CBD5E1', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#007834" />
              {selectedCategory === 'USC_CIVIL_ACT'
                ? 'Wymagane załączniki i oświadczenia (ustawa Prawo o aktach stanu cywilnego):'
                : 'Wymagane załączniki formalne (zgodnie z rozporządzeniem MRPiPS z 11 marca 2025 r.):'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentTemplate?.required_attachments.map((att) => (
                <label key={att.code} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={attachmentsProvided.includes(att.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAttachmentsProvided([...attachmentsProvided, att.code]);
                      } else {
                        setAttachmentsProvided(attachmentsProvided.filter((c) => c !== att.code));
                      }
                    }}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <strong>{att.title}</strong> {att.is_mandatory && <span style={{ color: '#DC2626' }}>* (wymagany)</span>}
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{att.description} — <em>{att.legal_basis}</em></div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="zus-btn zus-btn-outline"
              onClick={() => setStep(1)}
            >
              Wróć do wyboru
            </button>
            <button
              type="button"
              className="zus-btn zus-btn-primary"
              onClick={handleCreateApplication}
              disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Eye size={18} />
              Wygeneruj formalny wniosek i podgląd &rarr;
            </button>
          </div>
        </div>
      )}

      {/* KROK 3: PODGLĄD FORMALNY & PDF */}
      {step === 3 && createdApplication && (
        <div className="zus-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="zus-official-pill">{createdApplication.id}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Utworzono: {new Date(createdApplication.created_at).toLocaleString('pl-PL')}
                </span>
              </div>
              <h2 className="zus-card-header-title" style={{ marginTop: '6px' }}>
                Podgląd formalnego dokumentu
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="zus-btn zus-btn-outline"
                onClick={() => setStep(2)}
              >
                &larr; Edytuj dane
              </button>
              <button
                type="button"
                className="zus-btn zus-btn-outline"
                style={{ borderColor: '#007834', color: '#007834', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleDownloadPdf(createdApplication.id)}
                disabled={isDownloadingPdf}
              >
                <Download size={16} />
                {isDownloadingPdf ? 'Pobieranie...' : 'Pobierz plik PDF'}
              </button>
            </div>
          </div>

          {/* Ramka urzędowa podglądu dokumentu */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '2px solid #CBD5E1',
            borderRadius: '6px',
            padding: '24px',
            fontFamily: 'Courier New, Courier, monospace',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            color: '#0F172A',
            marginBottom: '24px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}>
            {createdApplication.formal_content_text}
          </div>

          {/* Panel akcji wysyłki */}
          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: '#166534', fontSize: '1rem', fontWeight: 700 }}>
                Gotowy do złożenia? Zasymuluj oficjalne przesłanie wniosku
              </h4>
              <p style={{ margin: 0, color: '#15803D', fontSize: '0.85rem' }}>
                {createdApplication.category === 'EMPLOYER_LEAVE'
                  ? 'Wniosek zostanie skierowany do Działu Kadr pracodawcy (rejestracja i ochrona z art. 177 K.p.).'
                  : createdApplication.category === 'USC_CIVIL_ACT'
                  ? 'Wniosek zostanie skierowany do Rejestru Stanu Cywilnego przez portal gov.pl / ePUAP (doręczenie odpisu na skrzynkę ePUAP).'
                  : 'Wniosek zostanie skierowany do Elektronicznej Skrzynki Podawczej ZUS (rejestracja w PUE/eZUS).'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {createdApplication.category === 'EMPLOYER_LEAVE' ? (
                <button
                  type="button"
                  className="zus-btn zus-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.95rem' }}
                  onClick={() => handleSubmit('EMPLOYER')}
                  disabled={isSubmitting}
                >
                  <Send size={18} />
                  {isSubmitting ? 'Wysyłanie...' : 'Wyślij do Pracodawcy (symulacja)'}
                </button>
              ) : createdApplication.category === 'USC_CIVIL_ACT' ? (
                <button
                  type="button"
                  className="zus-btn zus-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.95rem', backgroundColor: '#0284C7' }}
                  onClick={() => handleSubmit('USC')}
                  disabled={isSubmitting}
                >
                  <Send size={18} />
                  {isSubmitting ? 'Wysyłanie...' : 'Wyślij przez ePUAP / gov.pl (symulacja)'}
                </button>
              ) : (
                <button
                  type="button"
                  className="zus-btn zus-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.95rem', backgroundColor: '#003B6F' }}
                  onClick={() => handleSubmit('ZUS')}
                  disabled={isSubmitting}
                >
                  <Landmark size={18} />
                  {isSubmitting ? 'Wysyłanie...' : 'Wyślij przez eZUS / PUE (symulacja)'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KROK 4: POTWIERDZENIE DORĘCZENIA (UPO) */}
      {step === 4 && submissionResult && (
        <div className="zus-card" style={{ borderTop: '4px solid #007834' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={28} color="#007834" />
            </div>
            <div>
              <span className="zus-official-pill" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                Status: {submissionResult.status}
              </span>
              <h2 className="zus-card-header-title" style={{ margin: '4px 0 0 0' }}>
                Wniosek został pomyślnie złożony i zarejestrowany!
              </h2>
            </div>
          </div>

          {/* Certyfikat doręczenia / UPO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px', backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Urzędowy Znak Sprawy</div>
              <strong style={{ fontSize: '1.1rem', color: '#0F172A', fontFamily: 'monospace' }}>
                {submissionResult.case_number}
              </strong>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Identyfikator Poświadczenia (UPO / UPPO)</div>
              <strong style={{ fontSize: '0.95rem', color: '#007834', fontFamily: 'monospace' }}>
                {submissionResult.upo_reference_code}
              </strong>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Adresat doręczenia</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>
                {submissionResult.recipient_name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Data i godzina wpływu</div>
              <div style={{ fontSize: '0.95rem', color: '#0F172A' }}>
                {new Date(submissionResult.submitted_at).toLocaleString('pl-PL')}
              </div>
            </div>
          </div>

          {/* Karta wydanego odpisu z Rejestru Stanu Cywilnego jeśli złożono wniosek do USC */}
          {submissionResult.status === 'SUBMITTED_TO_USC' && (
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              backgroundColor: '#F0F9FF',
              border: '2px solid #38BDF8',
              borderRadius: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={22} color="#0284C7" />
                  <span style={{ fontWeight: 700, color: '#0369A1', fontSize: '1rem' }}>
                    Elektroniczny Odpis Aktu Urodzenia z Rejestru Stanu Cywilnego
                  </span>
                </div>
                <span style={{
                  fontSize: '0.78rem',
                  backgroundColor: '#E0F2FE',
                  color: '#0369A1',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontWeight: 600
                }}>
                  Kwalifikowana Pieczęć Cyfrowa Ministra Cyfryzacji
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#0C4A6E', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                Dokument został wygenerowany z centralnego Rejestru Stanu Cywilnego (gov.pl) i opatrzony pieczęcią cyfrową zgodnie z art. 45 ust. 4 ustawy Prawo o aktach stanu cywilnego. Odpis posiada moc prawną oryginału i może być bezpośrednio użyty we wniosku ZAM w eZUS.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '6px', border: '1px solid #BAE6FD', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Dziecko</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{child.first_name || 'Jan'} {applicant.last_name || 'Kowalski'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Oznaczenie aktu w RSC</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0284C7', fontFamily: 'monospace' }}>
                    {child.birth_certificate_number || 'AU/2026/09812'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Opłata skarbowa</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16A34A' }}>0,00 PLN (zwolnienie art. 2)</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Kanał doręczenia</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>Skrzynka ePUAP / gov.pl</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <a
                  href="https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.82rem', color: '#0284C7', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline', fontWeight: 600 }}
                >
                  Weryfikuj autentyczność w Rejestrze Stanu Cywilnego na gov.pl <ExternalLink size={14} />
                </a>
                <span style={{ fontSize: '0.8rem', color: '#0369A1', fontWeight: 600 }}>
                  Znak RSC: {submissionResult.case_number}
                </span>
              </div>
            </div>
          )}

          {/* Następne kroki */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#003B6F', marginBottom: '10px' }}>
              Co dzieje się dalej? (Kolejne kroki proceduralne)
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
              {submissionResult.next_steps.map((stepTxt, idx) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{stepTxt}</li>
              ))}
            </ul>
          </div>

          {/* Pouczenia prawne */}
          <div style={{ marginBottom: '24px', padding: '12px 16px', backgroundColor: '#FEF3C7', borderRadius: '6px', borderLeft: '4px solid #B45309' }}>
            <strong style={{ fontSize: '0.85rem', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <AlertCircle size={16} />
              Pouczenie prawne dla wnioskodawcy:
            </strong>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: '#78350F' }}>
              {submissionResult.legal_notices.map((notice, idx) => (
                <li key={idx}>{notice}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
            <button
              type="button"
              className="zus-btn zus-btn-outline"
              onClick={() => {
                setStep(1);
                setCreatedApplication(null);
                setSubmissionResult(null);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={16} />
              Złóż kolejny wniosek
            </button>

            <button
              type="button"
              className="zus-btn zus-btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
              onClick={() => handleDownloadPdf(submissionResult.application_id)}
              disabled={isDownloadingPdf}
            >
              <Download size={18} />
              {isDownloadingPdf ? 'Generowanie...' : 'Pobierz gotowy PDF z pieczęcią UPO'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
