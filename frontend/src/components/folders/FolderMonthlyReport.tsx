import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  Share2,
  Check,
  Sparkles,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Users,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  Play
} from 'lucide-react';
import { api, isOnline } from '../../lib/api';

interface FolderMonthlyReportProps {
  schoolId: string;
  onComplete: (status: boolean) => void;
  isReadOnly?: boolean;
}

const STANDARD_NO_DIFFICULTIES_TEXT =
  'Não foram observadas dificuldades ou empecilhos de ordem técnica, pedagógica ou operacional no decorrer das atividades do mês.';

const STANDARD_SOLUTIONS_NO_NEED_TEXT =
  'Tendo em vista que não foram observadas dificuldades ou empecilhos no período, não houve necessidade de aplicação de medidas corretivas.';

export const FolderMonthlyReport: React.FC<FolderMonthlyReportProps> = ({
  schoolId,
  onComplete,
  isReadOnly = false
}) => {
  // Wizard view state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Administrative / Metadata States
  const [projectTitle, setProjectTitle] = useState('Projeto Cultural & Arte nas Escolas');
  const [grantorName, setGrantorName] = useState('Secretaria de Estado da Cultura');
  const [fundingAgreementNo, setFundingAgreementNo] = useState('Termo de Fomento nº 042/2026');
  const [responsibleName, setResponsibleName] = useState('Coordenação Geral de Projetos');
  const [referenceMonthLabel, setReferenceMonthLabel] = useState('Junho/Julho');
  const [locationCityDate, setLocationCityDate] = useState('São Paulo - SP, 23/08/2026');

  // Questionnaire States (Sections 1 - 6)
  const [activitiesFocus, setActivitiesFocus] = useState('');
  const [eventPublicCounts, setEventPublicCounts] = useState<{ [eventId: string]: number }>({});
  const [impactIndicators, setImpactIndicators] = useState('');
  const [monitoringEvaluation, setMonitoringEvaluation] = useState('');
  const [hasDifficulties, setHasDifficulties] = useState(false);
  const [difficultiesDetails, setDifficultiesDetails] = useState(STANDARD_NO_DIFFICULTIES_TEXT);
  const [achievedResults, setAchievedResults] = useState(STANDARD_SOLUTIONS_NO_NEED_TEXT);

  // Status & Feedback
  const [reportStatus, setReportStatus] = useState('DRAFT');
  const [adminFeedback, setAdminFeedback] = useState<any[]>([]);

  // Month & Related Data
  const [monthYear, setMonthYear] = useState('08_2026');
  const [schoolData, setSchoolData] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [teacherSchools, setTeacherSchools] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [rehearsalPhotos, setRehearsalPhotos] = useState<any[]>([]);
  const [eventSessions, setEventSessions] = useState<any[]>([]);
  const [selectedRehearsalIds, setSelectedRehearsalIds] = useState<string[]>([]);
  const [selectedEventPhotoIds, setSelectedEventPhotoIds] = useState<string[]>([]);

  // UI Loaders
  const [loading, setLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    try {
      if (isOnline()) {
        const [historyRes, reportRes, studentsRes] = await Promise.all([
          api.get(`/sessions/school/${schoolId}`),
          api.get(`/reports/monthly?schoolId=${schoolId}&monthYear=08_2026`),
          api.get(`/students/school/${schoolId}`)
        ]);

        setSchoolData(historyRes.data.school);
        if (Array.isArray(studentsRes.data)) {
          setStudentsList(studentsRes.data);
        }
        const rehearsals = historyRes.data.rehearsalPhotos || [];
        const events = historyRes.data.eventSessions || [];
        const sessions = historyRes.data.attendanceSessions || [];

        setAttendanceSessions(sessions);
        setRehearsalPhotos(rehearsals);
        setEventSessions(events);

        // Pre-select 1 photo per rehearsal by default
        setSelectedRehearsalIds(rehearsals.map((r: any) => r.id));

        // Pre-select max 2 photos per event by default
        const allEventPhotoIds: string[] = [];
        events.forEach((ev: any) => {
          if (Array.isArray(ev.photos)) {
            ev.photos.slice(0, 2).forEach((p: any) => allEventPhotoIds.push(p.id));
          }
        });
        setSelectedEventPhotoIds(allEventPhotoIds);

        // Parse Report Response
        if (reportRes.data) {
          const r = reportRes.data;
          if (r.projectTitle) setProjectTitle(r.projectTitle);
          if (r.grantorName) setGrantorName(r.grantorName);
          if (r.fundingAgreementNo) setFundingAgreementNo(r.fundingAgreementNo);
          if (r.responsibleName) setResponsibleName(r.responsibleName);
          if (r.referenceMonthLabel) setReferenceMonthLabel(r.referenceMonthLabel);
          if (r.locationCityDate) setLocationCityDate(r.locationCityDate);

          if (r.activitiesFocus) setActivitiesFocus(r.activitiesFocus);
          if (r.impactIndicators) setImpactIndicators(r.impactIndicators);
          if (r.monitoringEvaluation) setMonitoringEvaluation(r.monitoringEvaluation);
          if (r.achievedResults) setAchievedResults(r.achievedResults);

          if (r.eventPublicCounts) {
            try {
              setEventPublicCounts(JSON.parse(r.eventPublicCounts));
            } catch (e) {
              setEventPublicCounts({});
            }
          }

          setHasDifficulties(!!r.hasDifficulties);
          if (r.difficultiesDetails) setDifficultiesDetails(r.difficultiesDetails);
          setReportStatus(r.status || 'DRAFT');

          if (r.teacher) setTeacherData(r.teacher);
          if (Array.isArray(r.teacherSchools)) setTeacherSchools(r.teacherSchools);

          if (r.adminFeedback) {
            try {
              setAdminFeedback(JSON.parse(r.adminFeedback));
            } catch (e) {
              setAdminFeedback([]);
            }
          }

          if (r.selectedRehearsalPhotos) {
            try {
              setSelectedRehearsalIds(JSON.parse(r.selectedRehearsalPhotos));
            } catch (e) {}
          }

          if (r.selectedEventPhotos) {
            try {
              setSelectedEventPhotoIds(JSON.parse(r.selectedEventPhotos));
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error('Error fetching monthly report data:', err);
    }
  };

  const handleDifficultiesToggle = (yes: boolean) => {
    setHasDifficulties(yes);
    if (!yes) {
      setDifficultiesDetails(STANDARD_NO_DIFFICULTIES_TEXT);
      setAchievedResults(STANDARD_SOLUTIONS_NO_NEED_TEXT);
    } else {
      if (difficultiesDetails === STANDARD_NO_DIFFICULTIES_TEXT) setDifficultiesDetails('');
      if (achievedResults === STANDARD_SOLUTIONS_NO_NEED_TEXT) setAchievedResults('');
    }
  };

  const handleEventPublicChange = (eventId: string, count: number) => {
    setEventPublicCounts((prev) => ({
      ...prev,
      [eventId]: count
    }));
  };

  const toggleSelectRehearsalPhoto = (photoId: string) => {
    setSelectedRehearsalIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const toggleSelectEventPhoto = (photoId: string, eventId?: string) => {
    setSelectedEventPhotoIds((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      } else {
        if (eventId) {
          const ev = eventSessions.find((e) => e.id === eventId);
          if (ev && Array.isArray(ev.photos)) {
            const currentSelectedForEv = ev.photos.filter((p: any) => prev.includes(p.id)).length;
            if (currentSelectedForEv >= 2) {
              alert('Curadoria de Evento: É permitido selecionar no máximo 2 fotos por evento.');
              return prev;
            }
          }
        }
        return [...prev, photoId];
      }
    });
  };

  const validateReport = (isSilentAutoFill = false) => {
    let focus = activitiesFocus.trim();
    if (!focus) {
      if (isSilentAutoFill) {
        focus = 'Ensaios semanais focados em aprimoramento técnico e pedagógico dos alunos.';
        setActivitiesFocus(focus);
      } else {
        alert('Campo Obrigatório: Responda qual foi o foco dos ensaios na Seção 1.');
        return false;
      }
    }
    let impact = impactIndicators.trim();
    if (!impact) {
      if (isSilentAutoFill) {
        impact = 'Avanço na disciplina, postura e engajamento da comunidade escolar.';
        setImpactIndicators(impact);
      } else {
        alert('Campo Obrigatório: Responda os indicadores de resultado na Seção 3.');
        return false;
      }
    }
    let evalText = monitoringEvaluation.trim();
    if (!evalText) {
      if (isSilentAutoFill) {
        evalText = 'Monitoramento realizado via controle diário de presenças e curadoria de fotos.';
        setMonitoringEvaluation(evalText);
      } else {
        alert('Campo Obrigatório: Responda como foi realizado o monitoramento e avaliação na Seção 4.');
        return false;
      }
    }
    if (hasDifficulties) {
      if (!difficultiesDetails.trim()) {
        if (isSilentAutoFill) {
          setDifficultiesDetails(STANDARD_NO_DIFFICULTIES_TEXT);
        } else {
          alert('Campo Obrigatório: Descreva as dificuldades encontradas na Seção 5.');
          return false;
        }
      }
      if (!achievedResults.trim()) {
        if (isSilentAutoFill) {
          setAchievedResults(STANDARD_SOLUTIONS_NO_NEED_TEXT);
        } else {
          alert('Campo Obrigatório: Descreva as soluções adotadas na Seção 6.');
          return false;
        }
      }
    }
    if (attendanceSessions.length > 0 && selectedRehearsalIds.length < attendanceSessions.length) {
      if (isSilentAutoFill && rehearsalPhotos.length > 0) {
        setSelectedRehearsalIds(rehearsalPhotos.map((p) => p.id));
      } else if (!isSilentAutoFill) {
        if (confirm(`Atenção: Existem ${attendanceSessions.length} atendimentos executados, mas apenas ${selectedRehearsalIds.length} foto(s) selecionada(s). Deseja gerar o PDF com as fotos disponíveis?`)) {
          return true;
        }
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!activitiesFocus.trim()) {
        alert('Atenção: Por favor, preencha qual foi o foco dos ensaios deste mês para continuar.');
        return;
      }
    } else if (currentStep === 3) {
      if (!impactIndicators.trim()) {
        alert('Atenção: Por favor, descreva os indicadores de resultado e impacto para continuar.');
        return;
      }
    } else if (currentStep === 4) {
      if (!monitoringEvaluation.trim()) {
        alert('Atenção: Por favor, descreva como foi realizado o monitoramento e avaliação.');
        return;
      }
    } else if (currentStep === 5) {
      if (hasDifficulties && !difficultiesDetails.trim()) {
        alert('Atenção: Por favor, descreva as dificuldades encontradas no período.');
        return;
      }
    } else if (currentStep === 6) {
      if (hasDifficulties && !achievedResults.trim()) {
        alert('Atenção: Por favor, descreva as soluções adotadas para sanar as dificuldades.');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(7, prev + 1));
  };

  const handleSaveReport = async () => {
    if (!validateReport(false)) return;
    setLoading(true);
    try {
      if (isOnline()) {
        await api.post('/reports/monthly', {
          schoolId,
          monthYear,
          projectTitle,
          grantorName,
          fundingAgreementNo,
          responsibleName,
          referenceMonthLabel,
          locationCityDate,
          activitiesFocus,
          eventPublicCounts,
          impactIndicators,
          monitoringEvaluation,
          hasDifficulties,
          difficultiesDetails,
          achievedResults,
          selectedRehearsalPhotos: selectedRehearsalIds,
          selectedEventPhotos: selectedEventPhotoIds
        });
      }
      alert('Relatório Mensal salvo e parametrizado com sucesso!');
      onComplete(true);
    } catch (err) {
      console.error('Error saving report:', err);
      alert('Erro ao salvar relatório mensal.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!validateReport(true)) return;
    setPdfGenerating(true);
    try {
      if (typeof window !== 'undefined') {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        const element = reportRef.current;
        if (element) {
          const sanitizedSchoolName = (schoolData?.name || schoolNameFormatted || 'Escola')
            .replace(/[^a-zA-Z0-9_-]/g, '_');
          const opt = {
            margin: [0.3, 0.3, 0.3, 0.3],
            filename: `Relatorio_Mensal_${sanitizedSchoolName}_${monthYear}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              logging: false,
              ignoreElements: (el: Element) => el.classList.contains('pdf-exclude')
            },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
          };
          await html2pdf().set(opt).from(element).save();
          alert('✅ Relatório PDF gerado e baixado com sucesso!');
        } else {
          throw new Error('Elemento de visualização do relatório não encontrado.');
        }
      }
      onComplete(true);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Iniciando modo de impressão/salvar como PDF nativo do navegador...');
      window.print();
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Relatório Mensal - ${monthYear}`,
          text: `Prestação de Contas do Projeto Cultural (${monthYear})`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share canceled', err);
      }
    } else {
      alert('Compartilhamento nativo indisponível. Utilize o botão Download PDF.');
    }
  };

  // Helpers
  const activeStudents = studentsList.filter((s) => s.status === 'ACTIVE');

  const formatDateStr = (dateInput: any) => {
    if (!dateInput) return '20/08/2026';
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? '20/08/2026' : d.toLocaleDateString('pt-BR');
  };

  const formatTimeStr = (dateInput: any, endOffsetHours = 2) => {
    if (!dateInput) return { start: '14:00', end: '16:00' };
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return { start: '14:00', end: '16:00' };

    const start = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const endDate = new Date(d.getTime() + endOffsetHours * 60 * 60 * 1000);
    const end = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return { start, end };
  };

  const schoolNameFormatted = schoolData?.name || 'Escola Parceira';
  const instructorNameFormatted = teacherData?.name || 'Professor Instrutor';
  const directorNameFormatted = schoolData?.boardName || 'Diretoria de Ensino';

  const selectedRehearsalList = rehearsalPhotos.filter((p) => selectedRehearsalIds.includes(p.id));
  const selectedEventPhotoList: { photo: any; event: any }[] = [];
  eventSessions.forEach((ev) => {
    if (Array.isArray(ev.photos)) {
      ev.photos.forEach((photo: any) => {
        if (selectedEventPhotoIds.includes(photo.id)) {
          selectedEventPhotoList.push({ photo, event: ev });
        }
      });
    }
  });

  const STEPS = [
    { id: 1, title: '1. Atividades' },
    { id: 2, title: '2. Beneficiários' },
    { id: 3, title: '3. Indicadores' },
    { id: 4, title: '4. Avaliação' },
    { id: 5, title: '5. Dificuldades' },
    { id: 6, title: '6. Resultados' },
    { id: 7, title: '7. Fotos & PDF' }
  ];

  return (
    <div className="p-6 bg-white rounded-b-bento-lg space-y-6 font-sans">
      {/* INITIAL BANNER & ACTION TO OPEN WIZARD */}
      {!isWizardOpen ? (
        <div className="bento-card p-6 bg-gradient-to-br from-amber-50/90 to-amber-100/50 border border-amber-200/80 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-extrabold shadow-lg shrink-0">
                <FileText size={28} />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-800">
                  Módulo de Prestação de Contas Mensal
                </span>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  Questionário & Relatório Mensal
                </h3>
                <p className="text-xs text-gray-600 font-medium mt-0.5">
                  Preencha o assistente guiado em 7 etapas com dados qualitativos e curadoria fotográfica.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold tracking-wide ${
                  reportStatus === 'SUBMITTED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : reportStatus === 'REVISION_REQUESTED'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                    : 'bg-amber-200/80 text-amber-900 border border-amber-300'
                }`}
              >
                {reportStatus === 'SUBMITTED'
                  ? '✓ Relatório Concluído'
                  : reportStatus === 'REVISION_REQUESTED'
                  ? '⚠️ Revisão Solicitada'
                  : '📝 Rascunho em Aberto'}
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-amber-200/60">
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-gray-500 block uppercase">Ensaios no Mês</span>
              <span className="text-lg font-black text-gray-900">{rehearsalPhotos.length}</span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-gray-500 block uppercase">Eventos no Mês</span>
              <span className="text-lg font-black text-gray-900">{eventSessions.length}</span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-gray-500 block uppercase">Fotos Selecionadas</span>
              <span className="text-lg font-black text-amber-700">
                {selectedRehearsalIds.length + selectedEventPhotoIds.length}
              </span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-gray-500 block uppercase">Escola Principal</span>
              <span className="text-xs font-black text-gray-900 truncate block">{schoolNameFormatted}</span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-black text-sm bg-charcoal text-white hover:bg-black transition shadow-xl flex items-center justify-center gap-3 group active:scale-95 cursor-pointer"
            >
              <Play size={18} fill="white" className="group-hover:scale-110 transition" />
              Iniciar Relatório (Assistente)
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={pdfGenerating}
              className="w-full sm:w-auto px-6 py-4 rounded-full font-black text-sm bg-amber-400 text-black hover:bg-amber-500 transition shadow-xl flex items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <Download size={18} className="group-hover:scale-110 transition" />
              {pdfGenerating ? 'Gerando PDF...' : 'Download PDF Direto'}
            </button>

            <p className="text-xs text-gray-500 font-medium">
              * Responda ao assistente de 7 etapas ou gere o documento PDF oficial diretamente.
            </p>
          </div>
        </div>
      ) : (
        /* GUIDED WIZARD QUESTIONNAIRE CONTAINER */
        <div className="space-y-6 border border-gray-200 rounded-bento-lg p-6 bg-amber-50/20 shadow-xl">
          {/* Wizard Header Bar & Stepper Progress */}
          <div className="space-y-4 border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-500 shrink-0" size={20} />
                <h3 className="text-lg font-black text-gray-900">
                  Assistente de Preenchimento do Relatório Mensal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWizardOpen(false)}
                className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                ✕ Minimizar Assistente
              </button>
            </div>

            {/* Stepper Steps Navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isPassed = currentStep > step.id;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                      isActive
                        ? 'bg-amber-400 text-black border-amber-500 shadow-md scale-105'
                        : isPassed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {isPassed ? <Check size={14} className="text-emerald-700" /> : null}
                    {step.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP            {/* SEÇÃO 1: DESCRIÇÃO DAS ATIVIDADES PLANEJADAS / EXECUTADAS */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                    <Calendar size={18} className="text-amber-600" /> Seção 1: Descrição das Atividades Executadas
                  </h4>
                  <p className="text-xs text-amber-800 font-medium">
                    Resumo automático computado pelas visitas do mês e foco pedagógico informado pelo instrutor.
                  </p>
                </div>

                {/* Automatic Computed Summary */}
                <div className="p-4 bg-gray-50 rounded-2xl border space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    📊 Resumo Automático Computado no Mês:
                  </span>
                  <p className="text-xs font-semibold text-gray-800">
                    • <strong>Ensaios/Oficinas Executados:</strong> {rehearsalPhotos.length} ensaio(s) registrado(s).
                  </p>
                  <p className="text-xs font-semibold text-gray-800">
                    • <strong>Eventos / Apresentações:</strong> {eventSessions.length} evento(s) cadastrado(s).
                  </p>
                </div>

                {/* Question */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                    Os ensaios deste mês tiveram foco em melhorar qual área ou aspecto? *
                  </label>
                  <textarea
                    rows={3}
                    value={activitiesFocus}
                    onChange={(e) => setActivitiesFocus(e.target.value)}
                    placeholder="Exemplo: Foco no aprimoramento da afinação, marcha rítmica, postura de apresentação e sincronia da percussão..."
                    className="w-full p-3.5 rounded-xl border text-xs font-medium bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none placeholder:text-gray-400/60"
                  />
                </div>

                {/* Formatted Output Preview */}
                <div className="p-4 bg-amber-100/40 rounded-2xl border border-amber-200 text-xs font-medium space-y-1">
                  <span className="font-extrabold text-amber-950 block">✨ Formatação Final no Documento:</span>
                  <p className="italic text-amber-900">
                    "Ensaios semanais com foco em {activitiesFocus || '[descreva o foco acima]'}."
                  </p>
                </div>
              </div>
            )}

            {/* SEÇÃO 2: PÚBLICO BENEFICIÁRIO (TABELA COMPARATIVA DINÂMICA) */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                    <Users size={18} className="text-amber-600" /> Seção 2: Público Beneficiário (Tabela Comparativa)
                  </h4>
                  <p className="text-xs text-amber-800 font-medium">
                    Tabela dinâmica com colunas organizadas lado a lado para cada escola atendida e dados de chamada de ensaios e eventos.
                  </p>
                </div>

                {/* Comparative Table */}
                <div className="overflow-x-auto border rounded-2xl shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-extrabold border-b">
                      <tr>
                        <th className="p-3">Atividade / Data</th>
                        <th className="p-3">Escola Atendida</th>
                        <th className="p-3 text-right">Público / Alunos Presentes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                      {/* Attendance Sessions / Rehearsals */}
                      {attendanceSessions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-gray-400 italic">
                            Nenhum ensaio registrado este mês.
                          </td>
                        </tr>
                      ) : (
                        attendanceSessions.map((session, index) => (
                          <tr key={session.id} className="hover:bg-gray-50">
                            <td className="p-3 font-extrabold text-gray-900">
                              {index + 1}º ensaio ({formatDateStr(session.date)})
                            </td>
                            <td className="p-3 font-medium text-gray-700">{schoolNameFormatted}</td>
                            <td className="p-3 text-right font-black text-amber-700">
                              {session.countPresent} alunos
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Events Rows with Public Questions */}
                      {eventSessions.map((ev) => {
                        const currentPublic = eventPublicCounts[ev.id] || 0;
                        return (
                          <tr key={ev.id} className="bg-amber-50/50 font-bold">
                            <td className="p-3 text-amber-950">
                              🎉 Evento: {ev.name} ({formatDateStr(ev.date)})
                            </td>
                            <td className="p-3 text-gray-700">{ev.locationAddress || schoolNameFormatted}</td>
                            <td className="p-3 text-right">
                              <span className="text-emerald-800 font-black">{currentPublic} pessoas</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Event Public Questionnaire Inputs */}
                {eventSessions.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                    <span className="text-xs font-extrabold text-amber-950 block">
                      📌 Preenchimento de Público em Eventos / Ensaios Extras:
                    </span>
                    {eventSessions.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border">
                        <label className="text-xs font-bold text-gray-800">
                          Quantas pessoas/público participaram do evento <strong>[{ev.name}]</strong>?
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={eventPublicCounts[ev.id] || ''}
                          onChange={(e) => handleEventPublicChange(ev.id, parseInt(e.target.value) || 0)}
                          placeholder="Ex: 150"
                          className="w-28 p-2 rounded-lg border text-xs font-black text-right focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SEÇÃO 3: INDICADORES DE RESULTADO E IMPACTO */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-600" /> Seção 3: Indicadores de Resultado e Impacto
                  </h4>
                  <p className="text-xs text-amber-800 font-medium">
                    Relate os principais avanços técnicos, engajamento dos alunos e desdobramentos comunitários.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                    Quais foram os principais indicadores de resultado e impacto observados no período? *
                  </label>
                  <textarea
                    rows={4}
                    value={impactIndicators}
                    onChange={(e) => setImpactIndicators(e.target.value)}
                    placeholder="Exemplo: Em ambas as escolas, estamos nos preparativos para as futuras apresentações, trabalhando a marcha e sequência de toques com grande adesão da comunidade..."
                    className="w-full p-3.5 rounded-xl border text-xs font-medium bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none placeholder:text-gray-400/60"
                  />
                </div>
              </div>
            )}

            {/* SEÇÃO 4: MONITORAMENTO E AVALIAÇÃO */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-amber-600" /> Seção 4: Monitoramento e Avaliação
                  </h4>
                  <p className="text-xs text-amber-800 font-medium">
                    Descreva os procedimentos de controle de assiduidade, disciplina e acompanhamento individual.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                    Como foi realizado o monitoramento e a avaliação dos alunos durante as atividades? *
                  </label>
                  <textarea
                    rows={4}
                    value={monitoringEvaluation}
                    onChange={(e) => setMonitoringEvaluation(e.target.value)}
                    placeholder="Exemplo: Acompanhamento de frequência e assiduidade através de chamadas diárias. Alunos com faltas consecutivas foram advertidos/remanejados e contatados junto à coordenação escolar..."
                    className="w-full p-3.5 rounded-xl border text-xs font-medium bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none placeholder:text-gray-400/60"
                  />
                </div>
              </div>
            )}

            {/* SEÇÃO 5: DIFICULDADES ENCONTRADAS (CONDICIONAL SIM / NÃO) */}
            {currentStep === 5 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-600" /> Seção 5: Dificuldades Encontradas
                  </h4>
                  <p className="text-xs text-amber-800 font-medium">
                    Informe se houve intercorrências estruturais, técnicas ou pedagógicas durante o mês.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border space-y-4">
                  <label className="block text-xs font-bold text-gray-800">
                    Houve dificuldades encontradas no período de atividades?
                  </label>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleDifficultiesToggle(false)}
                      className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-black transition-all ${
                        !hasDifficulties
                          ? 'bg-amber-400 text-black shadow-lg scale-105 border-amber-500'
                          : 'bg-gray-100 text-gray-700 border hover:bg-gray-200'
                      }`}
                    >
                      [NÃO] Sem Intercorrências
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDifficultiesToggle(true)}
                      className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-black transition-all ${
                        hasDifficulties
                          ? 'bg-amber-400 text-black shadow-lg scale-105 border-amber-500'
                          : 'bg-gray-100 text-gray-700 border hover:bg-gray-200'
                      }`}
                    >
                      [SIM] Com Dificuldades
                    </button>
                  </div>

                  {hasDifficulties ? (
                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-bold text-gray-700">
                        Quais foram as dificuldades enfrentadas no período? *
                      </label>
                      <textarea
                        rows={4}
                        value={difficultiesDetails}
                        onChange={(e) => setDifficultiesDetails(e.target.value)}
                        placeholder="Descreva detalhadamente as dificuldades estruturais, pedagógicas ou operacionais..."
                        className="w-full p-3.5 rounded-xl border text-xs font-medium bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none placeholder:text-gray-400/60"
                      />
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium space-y-1">
                      <span className="font-extrabold flex items-center gap-1.5 text-emerald-950">
                        <CheckCircle2 size={16} className="text-emerald-600" /> Resposta Padrão Automática (Sem Dificuldades):
                      </span>
                      <p className="italic">"{STANDARD_NO_DIFFICULTIES_TEXT}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SEÇÃO 6: SOLUÇÕES ADOTADAS */}
            {currentStep === 6 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-amber-600" /> Seção 6: Soluções Adotadas
                  </h4>
                  <p className="text-xs text-amber-800 font-medium">
                    Descreva as providências e soluções aplicadas (dependente da resposta da Seção 5).
                  </p>
                </div>

                {!hasDifficulties ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-medium space-y-2">
                    <span className="font-extrabold flex items-center gap-1.5 text-emerald-950 text-sm">
                      <CheckCircle2 size={18} className="text-emerald-600" /> Preenchimento Automático (Pergunta 5 = NÃO):
                    </span>
                    <p className="italic bg-white p-3 rounded-xl border border-emerald-200 font-semibold">
                      "{STANDARD_SOLUTIONS_NO_NEED_TEXT}"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                      Quais soluções foram adotadas para sanar as dificuldades relatadas? *
                    </label>
                    <textarea
                      rows={4}
                      value={achievedResults}
                      onChange={(e) => setAchievedResults(e.target.value)}
                      placeholder="Descreva as soluções e medidas corretivas aplicadas..."
                      className="w-full p-3.5 rounded-xl border text-xs font-medium bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none placeholder:text-gray-400/60"
                    />
                  </div>
                )}
              </div>
            )}

            {/* SEÇÃO 7: CURATORIA FOTOGRÁFICA & DOCUMENTO FINAL PDF */}
            {currentStep === 7 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                    <ImageIcon size={18} className="text-amber-600" /> Seção 7: Curadoria Fotográfica & Gerador de PDF
                  </h4>
                  <p className="text-xs text-amber-800 font-medium">
                    Regras de quantidade: Exatamente 1 foto por atendimento executado e 1 a 2 fotos por evento.
                  </p>
                </div>

                {/* Rehearsal Photos Curation */}
                <div className="space-y-3 bg-white p-4 rounded-2xl border">
                  <h5 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center justify-between">
                    <span>1. Fotos de Atendimentos / Ensaios ({selectedRehearsalIds.length} de {attendanceSessions.length || 1} selecionadas)</span>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      Exatamente 1 por atendimento (Obrigatório)
                    </span>
                  </h5>

                  {rehearsalPhotos.length === 0 ? (
                    <div className="text-xs text-gray-400 bg-gray-50 p-4 rounded-xl text-center">
                      Nenhuma foto de ensaio registrada este mês.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {rehearsalPhotos.map((photo) => {
                        const isSelected = selectedRehearsalIds.includes(photo.id);
                        const photoDate = photo.originalTimestamp || photo.date || photo.createdAt;
                        const times = formatTimeStr(photoDate);

                        return (
                          <div
                            key={photo.id}
                            onClick={() => toggleSelectRehearsalPhoto(photo.id)}
                            className={`relative rounded-2xl border-2 cursor-pointer transition-all p-2.5 bg-white ${
                              isSelected
                                ? 'border-amber-500 shadow-md ring-2 ring-amber-200'
                                : 'border-gray-200 opacity-60'
                            }`}
                          >
                            <div className="relative rounded-xl overflow-hidden mb-2">
                              <img src={photo.photoUrl} alt="Ensaio" className="w-full h-32 object-cover" />
                              {isSelected && (
                                <div className="absolute top-2 right-2 bg-amber-500 text-black rounded-full p-1 shadow-md">
                                  <Check size={14} />
                                </div>
                              )}
                            </div>

                            {/* Standardized Caption Rule */}
                            <div className="bg-gray-50 p-2 rounded-xl border text-[10px] font-mono space-y-0.5">
                              <p className="font-black text-gray-900">
                                Ensaio • {schoolNameFormatted}
                              </p>
                              <p className="text-gray-600 font-bold">
                                {formatDateStr(photoDate)} das {times.start} às {times.end}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Event Photos Curation */}
                <div className="space-y-3 bg-white p-4 rounded-2xl border">
                  <h5 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center justify-between">
                    <span>2. Fotos de Eventos / Apresentações ({selectedEventPhotoIds.length} selecionada(s))</span>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      Máx. 1 a 2 fotos por evento
                    </span>
                  </h5>

                  {eventSessions.length === 0 ? (
                    <div className="text-xs text-gray-400 bg-gray-50 p-4 rounded-xl text-center">
                      Nenhum evento registrado este mês.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {eventSessions.map((ev) => (
                        <div key={ev.id} className="p-3 bg-gray-50 rounded-2xl border space-y-2">
                          <div className="flex items-center justify-between text-xs font-extrabold text-gray-900 border-b pb-1">
                            <span>🎉 Evento: {ev.name}</span>
                            <span className="text-gray-500 font-medium">📍 {ev.locationAddress || schoolNameFormatted}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {ev.photos?.map((photo: any) => {
                              const isSelected = selectedEventPhotoIds.includes(photo.id);
                              const photoDate = photo.createdAt || ev.date;
                              const times = formatTimeStr(photoDate);

                              return (
                                <div
                                  key={photo.id}
                                  onClick={() => toggleSelectEventPhoto(photo.id, ev.id)}
                                  className={`relative rounded-xl p-2 bg-white border-2 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'border-amber-500 shadow-sm ring-2 ring-amber-200'
                                      : 'border-gray-200 opacity-60'
                                  }`}
                                >
                                  <div className="relative rounded-lg overflow-hidden mb-2">
                                    <img src={photo.photoUrl} alt="Evento" className="w-full h-28 object-cover" />
                                    {isSelected && (
                                      <div className="absolute top-1.5 right-1.5 bg-amber-500 text-black rounded-full p-0.5">
                                        <Check size={12} />
                                      </div>
                                    )}
                                  </div>

                                  {/* Standardized Caption Rule */}
                                  <div className="bg-gray-50 p-2 rounded-lg border text-[10px] font-mono space-y-0.5">
                                    <p className="font-black text-gray-900">
                                      Evento: {ev.name} • {schoolNameFormatted}
                                    </p>
                                    <p className="text-gray-600 font-bold">
                                      {formatDateStr(photoDate)} das {times.start} às {times.end}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* FORMAL DOCUMENT PDF PREVIEW WITH INSTITUTIONAL FOOTER */}
                <div className="space-y-3 pt-4">
                  <h4 className="font-extrabold text-lg text-gray-900 flex items-center gap-2">
                    <FileText className="text-amber-600" size={20} /> Preview do Documento Oficial (PDF)
                  </h4>

                  <div
                    ref={reportRef}
                    className="bg-white border-2 border-gray-300 rounded-2xl p-8 space-y-6 shadow-2xl text-gray-900 font-sans"
                    style={{ maxWidth: '800px', margin: '0 auto' }}
                  >
                    {/* Institutional Header */}
                    <div className="border-b-2 border-amber-500 pb-4 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                          Relatório Mensal Institucional de Prestação de Contas
                        </span>
                        <h2 className="text-xl font-black text-gray-950 tracking-tight leading-tight">
                          {projectTitle}
                        </h2>
                        <p className="text-xs font-bold text-gray-700 mt-0.5">{fundingAgreementNo}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-gray-600 block">{grantorName}</span>
                        <p className="text-xs font-extrabold text-amber-900 bg-amber-100 px-3 py-1 rounded-full inline-block mt-1">
                          Mês: {referenceMonthLabel || monthYear}
                        </p>
                      </div>
                    </div>

                    {/* Section 1 Render */}
                    <div className="space-y-1">
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                        1. Descrição das Atividades Executadas
                      </h3>
                      <p className="text-xs text-gray-800 bg-gray-50 p-3 rounded-xl border font-medium leading-relaxed">
                        Ensaios semanais com foco em {activitiesFocus || 'aprimoramento técnico e pedagógico'}.
                      </p>
                    </div>

                    {/* Section 2 Render */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                        2. Público Beneficiário (Tabela Comparativa)
                      </h3>
                      <table className="w-full text-[11px] text-left border">
                        <thead className="bg-gray-100 text-gray-800 font-bold border-b">
                          <tr>
                            <th className="p-2 border-r">Atividade</th>
                            <th className="p-2 border-r">Escola Atendida</th>
                            <th className="p-2 text-right">Público / Alunos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {attendanceSessions.map((session, i) => (
                            <tr key={session.id}>
                              <td className="p-2 border-r font-bold">
                                {i + 1}º ensaio - {session.category || 'Ensaio'} ({formatDateStr(session.date)})
                              </td>
                              <td className="p-2 border-r">{schoolNameFormatted}</td>
                              <td className="p-2 text-right font-black">{session.countPresent} alunos</td>
                            </tr>
                          ))}
                          {eventSessions.map((ev) => (
                            <tr key={ev.id} className="bg-amber-50/40">
                              <td className="p-2 border-r font-bold">🎉 Evento: {ev.name}</td>
                              <td className="p-2 border-r">{ev.locationAddress || schoolNameFormatted}</td>
                              <td className="p-2 text-right font-black">
                                {eventPublicCounts[ev.id] || 0} pessoas
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Nominata de Alunos (Lista Nominal Completa de Ativos no Mês) */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                        Anexo: Nominata Nominal de Alunos Atendidos ({activeStudents.length} Ativos)
                      </h3>
                      <table className="w-full text-[10px] text-left border">
                        <thead className="bg-gray-100 text-gray-800 font-bold border-b">
                          <tr>
                            <th className="p-1.5 border-r w-10 text-center">Nº</th>
                            <th className="p-1.5 border-r">Nome Completo do Aluno</th>
                            <th className="p-1.5 border-r w-16 text-center">Idade</th>
                            <th className="p-1.5 border-r w-16 text-center">Sexo</th>
                            <th className="p-1.5 text-center w-24">Status no Mês</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {activeStudents.map((student, index) => (
                            <tr key={student.id}>
                              <td className="p-1.5 border-r text-center font-bold text-gray-500">{index + 1}</td>
                              <td className="p-1.5 border-r font-bold text-gray-900">{student.name}</td>
                              <td className="p-1.5 border-r text-center">{student.age} anos</td>
                              <td className="p-1.5 border-r text-center">{student.gender === 'M' ? 'Masculino' : 'Feminino'}</td>
                              <td className="p-1.5 text-center font-bold text-emerald-800 bg-emerald-50">ATIVO</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Section 3 & 4 Render */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                          3. Indicadores de Resultado & Impacto
                        </h3>
                        <p className="text-xs text-gray-800 bg-gray-50 p-3 rounded-xl border font-medium">
                          {impactIndicators || 'Indicadores de evolução pedagógica mantidos.'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                          4. Monitoramento & Avaliação
                        </h3>
                        <p className="text-xs text-gray-800 bg-gray-50 p-3 rounded-xl border font-medium">
                          {monitoringEvaluation || 'Acompanhamento de frequência e assiduidade mantidos.'}
                        </p>
                      </div>
                    </div>

                    {/* Section 5 & 6 Render */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                        5 & 6. Dificuldades Encontradas & Soluções Adotadas
                      </h3>
                      <div className="p-3 bg-gray-50 rounded-xl border text-xs space-y-2">
                        <p className="font-semibold text-gray-800">
                          <strong>Dificuldades:</strong> {hasDifficulties ? difficultiesDetails : STANDARD_NO_DIFFICULTIES_TEXT}
                        </p>
                        <p className="font-semibold text-gray-800 border-t pt-1">
                          <strong>Soluções Adotadas:</strong> {!hasDifficulties ? STANDARD_SOLUTIONS_NO_NEED_TEXT : achievedResults}
                        </p>
                      </div>
                    </div>

                    {/* Section 7 Render: Photo Grid */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                        7. Curadoria Fotográfica dos Ensaios & Eventos
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        {selectedRehearsalList.map((photo, i) => {
                          const photoDate = photo.originalTimestamp || photo.date || photo.createdAt;
                          const times = formatTimeStr(photoDate);
                          return (
                            <div key={i} className="border p-2 rounded-xl space-y-1.5 bg-white">
                              <img src={photo.photoUrl} alt="Ensaio" className="w-full h-36 object-cover rounded-lg" />
                              <div className="bg-amber-50 p-2 rounded-lg text-[10px] font-mono leading-tight">
                                <p className="font-black text-gray-900">{formatDateStr(photoDate)} das {times.start} às {times.end}</p>
                                <p className="text-gray-700 font-bold">Ensaio • {schoolNameFormatted}</p>
                              </div>
                            </div>
                          );
                        })}

                        {selectedEventPhotoList.map((item, i) => {
                          const photoDate = item.photo.createdAt || item.event.date;
                          const times = formatTimeStr(photoDate);
                          return (
                            <div key={i} className="border p-2 rounded-xl space-y-1.5 bg-white">
                              <img src={item.photo.photoUrl} alt="Evento" className="w-full h-36 object-cover rounded-lg" />
                              <div className="bg-indigo-50 p-2 rounded-lg text-[10px] font-mono leading-tight">
                                <p className="font-black text-gray-900">{formatDateStr(photoDate)} das {times.start} às {times.end}</p>
                                <p className="text-gray-700 font-bold">Evento: {item.event.name} • {schoolNameFormatted}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CONSOLIDATED INSTITUTIONAL FOOTER & METADATA */}
                    <div className="pt-6 border-t-2 border-gray-900 space-y-4 text-xs font-medium text-gray-800">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border">
                        <div>
                          <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Mês de Referência</span>
                          <span className="font-black text-gray-900">{referenceMonthLabel}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Local e Data</span>
                          <span className="font-black text-gray-900">{locationCityDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Instrutor / Professor</span>
                          <span className="font-black text-gray-900">{instructorNameFormatted}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Escolas Atendidas</span>
                          <span className="font-bold text-gray-900">
                            {teacherSchools.length > 0
                              ? teacherSchools.map((s) => s.name).join(', ')
                              : schoolNameFormatted}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Diretoria / Gestão</span>
                          <span className="font-bold text-gray-900">{schoolData?.directorName || directorNameFormatted}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Responsável Técnico</span>
                          <span className="font-bold text-gray-900">{responsibleName}</span>
                        </div>
                      </div>

                      {/* Dupla Assinatura no Rodapé (Professor + Direção Escolar) */}
                      <div className="pt-8 border-t border-gray-300 grid grid-cols-2 gap-8 text-center">
                        <div className="space-y-1">
                          <div className="w-full border-b border-gray-900 mb-2 mx-auto" />
                          <p className="font-black text-xs text-gray-900">{instructorNameFormatted}</p>
                          <p className="text-[10px] text-gray-600 font-bold">CPF: {teacherData?.cpf || '111.222.333-44'}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase">Professor / Instrutor do Projeto</p>
                        </div>

                        <div className="space-y-1">
                          <div className="w-full border-b border-gray-900 mb-2 mx-auto" />
                          <p className="font-black text-xs text-gray-900">{schoolData?.directorName || directorNameFormatted || 'Direção Escolar'}</p>
                          <p className="text-[10px] text-gray-600 font-bold">Diretora / Gestão Escolar</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase">{schoolNameFormatted}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* WIZARD NAVIGATION FOOTER */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className={`px-5 py-3 rounded-full text-xs font-black flex items-center gap-1.5 transition ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              <ChevronLeft size={16} /> Anterior
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveReport}
                disabled={loading}
                className="px-5 py-3 rounded-full text-xs font-black bg-charcoal text-white hover:bg-black transition flex items-center gap-2 shadow-md"
              >
                <FileText size={15} /> Salvar Rascunho
              </button>

              {currentStep < 7 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3 rounded-full text-xs font-black bg-amber-400 text-black hover:bg-amber-500 transition flex items-center gap-1.5 shadow-md"
                >
                  Próximo <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={pdfGenerating}
                  className="px-6 py-3 rounded-full text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg"
                >
                  <Download size={15} /> {pdfGenerating ? 'Gerando PDF...' : 'Download PDF Final'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable PDF Container for Instant Export from any step or initial screen */}
      {(!isWizardOpen || currentStep !== 7) && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none opacity-0 z-[-1]" aria-hidden="true">
          <div
            ref={reportRef}
            className="bg-white border-2 border-gray-300 rounded-2xl p-8 space-y-6 text-gray-900 font-sans"
            style={{ width: '800px' }}
          >
            {/* Institutional Header */}
            <div className="border-b-2 border-amber-500 pb-4 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                  Relatório Mensal Institucional de Prestação de Contas
                </span>
                <h2 className="text-xl font-black text-gray-950 tracking-tight leading-tight">
                  {projectTitle}
                </h2>
                <p className="text-xs font-bold text-gray-700 mt-0.5">{fundingAgreementNo}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-gray-600 block">{grantorName}</span>
                <p className="text-xs font-extrabold text-amber-900 bg-amber-100 px-3 py-1 rounded-full inline-block mt-1">
                  Mês: {referenceMonthLabel || monthYear}
                </p>
              </div>
            </div>

            {/* Section 1 Render */}
            <div className="space-y-1">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                1. Descrição das Atividades Executadas
              </h3>
              <p className="text-xs text-gray-800 bg-gray-50 p-3 rounded-xl border font-medium leading-relaxed">
                Ensaios semanais com foco em {activitiesFocus || 'aprimoramento técnico e pedagógico'}.
              </p>
            </div>

            {/* Section 2 Render */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                2. Público Beneficiário (Tabela Comparativa)
              </h3>
              <table className="w-full text-[11px] text-left border">
                <thead className="bg-gray-100 text-gray-800 font-bold border-b">
                  <tr>
                    <th className="p-2 border-r">Atividade</th>
                    <th className="p-2 border-r">Escola Atendida</th>
                    <th className="p-2 text-right">Público / Alunos</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {attendanceSessions.map((session, i) => (
                    <tr key={session.id}>
                      <td className="p-2 border-r font-bold">
                        {i + 1}º ensaio - {session.category || 'Ensaio'} ({formatDateStr(session.date)})
                      </td>
                      <td className="p-2 border-r">{schoolNameFormatted}</td>
                      <td className="p-2 text-right font-black">{session.countPresent} alunos</td>
                    </tr>
                  ))}
                  {eventSessions.map((ev) => (
                    <tr key={ev.id} className="bg-amber-50/40">
                      <td className="p-2 border-r font-bold">🎉 Evento: {ev.name}</td>
                      <td className="p-2 border-r">{ev.locationAddress || schoolNameFormatted}</td>
                      <td className="p-2 text-right font-black">
                        {eventPublicCounts[ev.id] || 0} pessoas
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Nominata de Alunos */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                Anexo: Nominata Nominal de Alunos Atendidos ({activeStudents.length} Ativos)
              </h3>
              <table className="w-full text-[10px] text-left border">
                <thead className="bg-gray-100 text-gray-800 font-bold border-b">
                  <tr>
                    <th className="p-1.5 border-r w-10 text-center">Nº</th>
                    <th className="p-1.5 border-r">Nome Completo do Aluno</th>
                    <th className="p-1.5 border-r w-16 text-center">Idade</th>
                    <th className="p-1.5 border-r w-16 text-center">Sexo</th>
                    <th className="p-1.5 text-center w-24">Status no Mês</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeStudents.map((student, index) => (
                    <tr key={student.id}>
                      <td className="p-1.5 border-r text-center font-bold text-gray-500">{index + 1}</td>
                      <td className="p-1.5 border-r font-bold text-gray-900">{student.name}</td>
                      <td className="p-1.5 border-r text-center">{student.age} anos</td>
                      <td className="p-1.5 border-r text-center">{student.gender === 'M' ? 'Masculino' : 'Feminino'}</td>
                      <td className="p-1.5 text-center font-bold text-emerald-800 bg-emerald-50">ATIVO</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 3 & 4 Render */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                  3. Indicadores de Resultado & Impacto
                </h3>
                <p className="text-xs text-gray-800 bg-gray-50 p-3 rounded-xl border font-medium">
                  {impactIndicators || 'Indicadores de evolução pedagógica mantidos.'}
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                  4. Monitoramento & Avaliação
                </h3>
                <p className="text-xs text-gray-800 bg-gray-50 p-3 rounded-xl border font-medium">
                  {monitoringEvaluation || 'Acompanhamento de frequência e assiduidade mantidos.'}
                </p>
              </div>
            </div>

            {/* Section 5 & 6 Render */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                5 & 6. Dificuldades Encontradas & Soluções Adotadas
              </h3>
              <div className="p-3 bg-gray-50 rounded-xl border text-xs space-y-2">
                <p className="font-semibold text-gray-800">
                  <strong>Dificuldades:</strong> {hasDifficulties ? difficultiesDetails : STANDARD_NO_DIFFICULTIES_TEXT}
                </p>
                <p className="font-semibold text-gray-800 border-t pt-1">
                  <strong>Soluções Adotadas:</strong> {!hasDifficulties ? STANDARD_SOLUTIONS_NO_NEED_TEXT : achievedResults}
                </p>
              </div>
            </div>

            {/* Section 7 Render: Photo Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b pb-1">
                7. Curadoria Fotográfica dos Ensaios & Eventos
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {selectedRehearsalList.map((photo, i) => {
                  const photoDate = photo.originalTimestamp || photo.date || photo.createdAt;
                  const times = formatTimeStr(photoDate);
                  return (
                    <div key={i} className="border p-2 rounded-xl space-y-1.5 bg-white">
                      <img src={photo.photoUrl} alt="Ensaio" className="w-full h-36 object-cover rounded-lg" />
                      <div className="bg-amber-50 p-2 rounded-lg text-[10px] font-mono leading-tight">
                        <p className="font-black text-gray-900">{formatDateStr(photoDate)} das {times.start} às {times.end}</p>
                        <p className="text-gray-700 font-bold">Ensaio • {schoolNameFormatted}</p>
                      </div>
                    </div>
                  );
                })}

                {selectedEventPhotoList.map((item, i) => {
                  const photoDate = item.photo.createdAt || item.event.date;
                  const times = formatTimeStr(photoDate);
                  return (
                    <div key={i} className="border p-2 rounded-xl space-y-1.5 bg-white">
                      <img src={item.photo.photoUrl} alt="Evento" className="w-full h-36 object-cover rounded-lg" />
                      <div className="bg-indigo-50 p-2 rounded-lg text-[10px] font-mono leading-tight">
                        <p className="font-black text-gray-900">{formatDateStr(photoDate)} das {times.start} às {times.end}</p>
                        <p className="text-gray-700 font-bold">Evento: {item.event.name} • {schoolNameFormatted}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CONSOLIDATED INSTITUTIONAL FOOTER */}
            <div className="pt-6 border-t-2 border-gray-900 space-y-4 text-xs font-medium text-gray-800">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border">
                <div>
                  <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Mês de Referência</span>
                  <span className="font-black text-gray-900">{referenceMonthLabel}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Local e Data</span>
                  <span className="font-black text-gray-900">{locationCityDate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Instrutor / Professor</span>
                  <span className="font-black text-gray-900">{instructorNameFormatted}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Escolas Atendidas</span>
                  <span className="font-bold text-gray-900">
                    {teacherSchools.length > 0
                      ? teacherSchools.map((s) => s.name).join(', ')
                      : schoolNameFormatted}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Diretoria / Gestão</span>
                  <span className="font-bold text-gray-900">{schoolData?.directorName || directorNameFormatted}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-gray-500 block uppercase">Responsável Técnico</span>
                  <span className="font-bold text-gray-900">{responsibleName}</span>
                </div>
              </div>

              {/* Dupla Assinatura */}
              <div className="pt-8 border-t border-gray-300 grid grid-cols-2 gap-8 text-center">
                <div className="space-y-1">
                  <div className="w-full border-b border-gray-900 mb-2 mx-auto" />
                  <p className="font-black text-xs text-gray-900">{instructorNameFormatted}</p>
                  <p className="text-[10px] text-gray-600 font-bold">CPF: {teacherData?.cpf || '111.222.333-44'}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Professor / Instrutor do Projeto</p>
                </div>

                <div className="space-y-1">
                  <div className="w-full border-b border-gray-900 mb-2 mx-auto" />
                  <p className="font-black text-xs text-gray-900">{schoolData?.directorName || directorNameFormatted || 'Direção Escolar'}</p>
                  <p className="text-[10px] text-gray-600 font-bold">Diretora / Gestão Escolar</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{schoolNameFormatted}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
