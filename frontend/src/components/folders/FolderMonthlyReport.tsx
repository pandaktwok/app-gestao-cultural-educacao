import React, { useState, useEffect, useMemo } from 'react';
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
import { api, isOnline, API_ORIGIN } from '../../lib/api';
import { ReportWizard } from '../report/ReportWizard';
import { buildAttendanceSummary, isInMonth, monthLabel, toMonthYear } from '../../lib/reportStats';

// Mínimo de ensaios com foto para liberar o relatório. Em teste fica em 0 (sem bloqueio);
// para voltar a exigir 4, defina NEXT_PUBLIC_MIN_REHEARSALS=4 no frontend/.env.local.
const daysLeftInMonthFrom = (now: Date) => new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
const MIN_REHEARSALS_TO_ISSUE = parseInt(process.env.NEXT_PUBLIC_MIN_REHEARSALS ?? '0', 10) || 0;

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
  const daysLeftInMonth = daysLeftInMonthFrom(new Date());
  const [currentStep, setCurrentStep] = useState(1);

  // Administrative / Metadata States
  const [projectTitle, setProjectTitle] = useState('Projeto Cultural & Arte nas Escolas');
  const [grantorName, setGrantorName] = useState('Secretaria de Estado da Cultura');
  const [fundingAgreementNo, setFundingAgreementNo] = useState('Termo de Fomento nº 042/2026');
  const [responsibleName, setResponsibleName] = useState('Coordenação Geral de Projetos');
  const [referenceMonthLabel, setReferenceMonthLabel] = useState('');
  const [locationCityDate, setLocationCityDate] = useState(`Criciúma - SC, ${new Date().toLocaleDateString('pt-BR')}`);

  // Questionnaire States (Sections 1 - 6)
  const [activitiesFocus, setActivitiesFocus] = useState('');
  const [customQuestions, setCustomQuestions] = useState<{ id: string; title: string; fieldType: string; isRequired: boolean; options?: string | null }[]>([]);
  const [customAnswers, setCustomAnswers] = useState<{ [id: string]: { title: string; answer: string } }>({});
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
  const [monthYear, setMonthYear] = useState(toMonthYear(new Date()));
  const [nominataColumns, setNominataColumns] = useState<2 | 3>(2);
  const [officialBusy, setOfficialBusy] = useState(false);
  const [officialUrl, setOfficialUrl] = useState<string | null>(null);
  const [officialError, setOfficialError] = useState<string | null>(null);
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

  useEffect(() => {
    fetchData();
  }, [schoolId, monthYear]);

  useEffect(() => () => { if (officialUrl) URL.revokeObjectURL(officialUrl); }, [officialUrl]);

  const fetchData = async () => {
    // Ao trocar de mês, limpa os campos do relatório anterior antes de carregar o novo
    setActivitiesFocus('');
    setImpactIndicators('');
    setMonitoringEvaluation('');
    setEventPublicCounts({});
    setCustomAnswers({});
    setHasDifficulties(false);
    setDifficultiesDetails(STANDARD_NO_DIFFICULTIES_TEXT);
    setAchievedResults(STANDARD_SOLUTIONS_NO_NEED_TEXT);
    setReferenceMonthLabel('');
    setReportStatus('DRAFT');
    setAdminFeedback([]);
    try {
      if (isOnline()) {
        const [historyRes, reportRes, studentsRes] = await Promise.all([
          api.get(`/sessions/school/${schoolId}`),
          api.get(`/reports/monthly?schoolId=${schoolId}&monthYear=${monthYear}`),
          api.get(`/students/school/${schoolId}`)
        ]);

        setSchoolData(historyRes.data.school);
        if (Array.isArray(studentsRes.data)) {
          setStudentsList(studentsRes.data);
        }
        const rehearsals = (historyRes.data.rehearsalPhotos || []).filter((r: any) =>
          isInMonth(r.originalTimestamp || r.date, monthYear)
        );
        const events = (historyRes.data.eventSessions || []).filter((e: any) => isInMonth(e.date, monthYear));
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
        try {
          const q = await api.get('/questionnaire/mine');
          if (Array.isArray(q.data)) setCustomQuestions(q.data);
        } catch {
          /* sem perguntas extras */
        }

        if (reportRes.data) {
          const r = reportRes.data;
          if (r.customAnswers) {
            try { setCustomAnswers(JSON.parse(r.customAnswers)); } catch { setCustomAnswers({}); }
          }
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

  // Salva o rascunho sem validar nem exibir alertas (usado pelo assistente a cada passo)
  const saveDraftSilently = async (): Promise<boolean> => {
    if (!isOnline()) return false;
    try {
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
        selectedEventPhotos: selectedEventPhotoIds,
        customAnswers
      });
      return true;
    } catch {
      return false;
    }
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
          selectedEventPhotos: selectedEventPhotoIds,
          customAnswers
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

  // ---- PDF oficial (padrão SCCS, gerado no servidor com a skill sccs-relatorio) ----
  const fmtShortDate = (d: any) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const fmtFullDate = (d: any) => new Date(d).toLocaleDateString('pt-BR');
  const fmtWhen = (d: any) => {
    const x = new Date(d);
    const m = x.getMinutes();
    return `${fmtFullDate(x)} · ${x.getHours()}h${m ? String(m).padStart(2, '0') : ''}`;
  };

  // Foto -> data URL reduzida (máx. 1400 px), para o servidor não depender de links externos
  const photoToDataUrl = async (url: string): Promise<string | null> => {
    if (url.startsWith('/uploads/')) return url; // arquivo do próprio servidor
    try {
      let src = url;
      if (!url.startsWith('data:')) {
        const r = await fetch(url);
        if (!r.ok) return null;
        const blob = await r.blob();
        src = await new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result as string);
          fr.onerror = () => rej(new Error('leitura'));
          fr.readAsDataURL(blob);
        });
      }
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error('imagem'));
        i.src = src;
      });
      const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  };

  const buildOfficialPayload = async () => {
    const photoSources = [
      ...selectedRehearsalList.map((p) => ({
        url: p.photoUrl as string,
        group: 'Ensaios',
        title: `Ensaio · ${schoolNameFormatted}`,
        when: fmtWhen(p.originalTimestamp || p.date || p.createdAt),
      })),
      ...selectedEventPhotoList.map(({ photo, event }) => ({
        url: photo.photoUrl as string,
        group: `Evento: ${event.name}`,
        title: `${event.name} · ${schoolNameFormatted}`,
        when: fmtWhen(photo.createdAt || event.date),
      })),
    ];
    const resolved = await Promise.all(photoSources.map((ph) => photoToDataUrl(ph.url)));
    const photos = photoSources.flatMap((ph, i) => (resolved[i] ? [{ ...ph, url: resolved[i] as string }] : []));

    return {
      payload: {
        monthLabel: referenceMonthLabel.trim() || monthLabel(monthYear),
        schoolName: schoolNameFormatted,
        directorName: schoolData?.directorName || '',
        instructorName: instructorNameFormatted,
        locationCityDate,
        nominataColumns,
        extras: customQuestions
          .map((q) => ({ title: q.title, answer: customAnswers[q.id]?.answer || '' }))
          .filter((x) => x.answer.trim()),
        texts: {
          activitiesFocus,
          impactIndicators,
          monitoringEvaluation,
          hasDifficulties,
          difficultiesDetails,
          achievedResults
        },
        stats: {
          totalStudents: summary.totalStudents,
          boys: summary.boys,
          girls: summary.girls,
          totalPresences: summary.totalPresences,
          totalAbsences: summary.totalAbsences,
          averageRate: summary.averageRate,
          audience: summary.audience
        },
        encounters: summary.perSession.map((s) => ({
          dateShort: fmtShortDate(s.session.date),
          dateFull: fmtFullDate(s.session.date),
          category: s.session.category || 'Ensaio',
          present: s.present,
          absent: s.absent,
          rate: s.rate
        })),
        students: summary.rows.map((r) => ({
          name: r.student.name,
          age: r.student.age,
          sex: r.student.gender === 'F' ? 'F' : 'M',
          marks: r.marks,
          present: r.present,
          absent: r.absent,
          rate: r.rate
        })),
        events: eventSessions.map((e) => ({
          name: e.name,
          dateFull: fmtFullDate(e.date),
          publicCount: eventPublicCounts[e.id] || 0
        })),
        photos
      },
      droppedPhotos: photoSources.length - photos.length
    };
  };

  const generateOfficial = async (mode: 'preview' | 'download') => {
    setOfficialBusy(true);
    setOfficialError(null);
    try {
      const { payload, droppedPhotos } = await buildOfficialPayload();
      let res;
      try {
        res = await api.post('/reports/monthly/pdf', payload, { responseType: 'blob', timeout: 180000 });
      } catch (err: any) {
        let msg = 'Não foi possível gerar o PDF no servidor.';
        const data = err?.response?.data;
        if (data instanceof Blob) {
          try {
            msg = JSON.parse(await data.text()).error || msg;
          } catch {}
        }
        throw new Error(msg);
      }
      const skipped = droppedPhotos + Number(res.headers?.['x-skipped-photos'] || 0);
      if (skipped > 0) {
        setOfficialError(`${skipped} foto(s) não puderam ser incluídas (arquivo ilegível ou indisponível).`);
      }
      const url = URL.createObjectURL(res.data);
      if (mode === 'preview') {
        setOfficialUrl(url);
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Relatorio_${schoolNameFormatted.replace(/[^a-zA-Z0-9_-]+/g, '_')}_${monthYear}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (err: any) {
      setOfficialError(err.message || 'Erro ao gerar o PDF.');
      throw err;
    } finally {
      setOfficialBusy(false);
    }
  };

  // O único PDF do relatório mensal é o oficial (padrão SCCS), gerado no servidor.
  // Se não der para gerar, avisamos o motivo em vez de entregar outro documento.
  const handleExportPDF = async () => {
    if (!validateReport(true)) return;
    if (!isOnline()) {
      alert('Sem internet: o PDF oficial é gerado no servidor. Seu relatório continua salvo como rascunho. Conecte-se e gere o PDF de novo.');
      return;
    }
    setPdfGenerating(true);
    try {
      await generateOfficial('download');
      onComplete(true);
    } catch (err: any) {
      alert(`Não foi possível gerar o PDF oficial.\n\n${err.message}`);
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

  const summary = useMemo(
    () => buildAttendanceSummary(attendanceSessions, studentsList, monthYear),
    [attendanceSessions, studentsList, monthYear]
  );

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
    <div className="p-4 sm:p-6 bg-white rounded-b-bento-lg space-y-6 font-sans">
      {/* BANNER AMARELO FIXO DE REVISÃO DA DIRETORIA */}
      {reportStatus === 'REVISION_REQUESTED' && (
        <div className="p-5 bg-amber-50 border-2 border-amber-400 rounded-3xl space-y-3 shadow-lg animate-fadeIn">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-amber-400 text-amber-950 rounded-2xl shrink-0 mt-0.5">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                Aviso da Coordenação Geral
              </span>
              <h4 className="text-base font-extrabold text-amber-950">
                ⚠️ Revisão Necessária: O relatório possui observações da diretoria
              </h4>
              <p className="text-xs text-amber-900 font-medium">
                A coordenação solicitou justificativas ou ajustes em um ou mais campos abaixo. Corrija os pontos destacados em amarelo e clique em <strong>"Reenviar Relatório para Auditoria"</strong>.
              </p>
            </div>
          </div>

          {adminFeedback && adminFeedback.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-amber-200/80">
              {adminFeedback.map((fb: any, idx: number) => (
                <div key={idx} className="text-xs bg-white/90 p-3 rounded-2xl border border-amber-300 text-amber-950 font-medium flex flex-col sm:flex-row items-start gap-1 sm:gap-2 shadow-xs">
                  <span className="text-amber-600 font-bold sm:shrink-0">📌 Campo ({fb.fieldKey}):</span>
                  <span className="min-w-0 break-words">"{fb.comment}"</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BANNER INTELEGENE 5 DIAS RESTANTES - ENVIO 1-CLIQUE */}
      {reportStatus === 'DRAFT' && daysLeftInMonth <= 7 && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 to-purple-900 text-white rounded-3xl space-y-4 shadow-xl border border-indigo-700/80 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-amber-400 text-amber-950 rounded-2xl shrink-0 mt-0.5 shadow-md">
                <Calendar size={24} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                  Lembrete de prazo
                </span>
                <h4 className="text-base font-extrabold text-white">
                  {daysLeftInMonth === 0
                    ? '📅 Hoje é o último dia do mês para fechar o relatório!'
                    : `📅 Faltam ${daysLeftInMonth} ${daysLeftInMonth === 1 ? 'dia' : 'dias'} para o fim do mês.`}
                </h4>
                <p className="text-xs text-indigo-200 font-medium">
                  Use o assistente para preencher o relatório do mês.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (validateReport(true)) {
                  handleSaveReport();
                }
              }}
              className="min-h-[52px] px-6 rounded-full font-black text-sm bg-amber-400 text-amber-950 active:bg-amber-300 transition shadow-lg shrink-0 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Sparkles size={16} /> Enviar agora
            </button>
          </div>
        </div>
      )}

      {/* INITIAL BANNER & ACTION TO OPEN WIZARD */}
      {!isWizardOpen ? (
        <div className="bento-card p-4 sm:p-6 bg-gradient-to-br from-amber-50/90 to-amber-100/50 border border-amber-200/80 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-extrabold shadow-lg shrink-0">
                <FileText size={28} />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-800">
                  Prestação de contas
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                  Relatório Mensal
                </h3>
                <p className="text-xs text-gray-600 font-medium mt-0.5">
                  Responda algumas perguntas rápidas e gere o PDF oficial.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="month"
                value={`${monthYear.split('_')[1]}-${monthYear.split('_')[0]}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-');
                  if (y && m) setMonthYear(`${m}_${y}`);
                }}
                aria-label="Mês de referência"
                className="h-11 px-4 rounded-full border border-amber-300 bg-white text-sm font-extrabold text-amber-950 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              <span
                className={`px-3 py-2 rounded-full text-xs font-extrabold tracking-wide ${
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-amber-200/60">
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
              <span className="text-[10px] font-bold text-gray-500 block uppercase">Presenças / Faltas</span>
              <span className="text-lg font-black text-gray-900">
                <span className="text-emerald-700">{summary.totalPresences}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-rose-700">{summary.totalAbsences}</span>
              </span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-gray-500 block uppercase">Escola Principal</span>
              <span className="text-xs font-black text-gray-900 truncate block">{schoolNameFormatted}</span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {rehearsalPhotos.length < MIN_REHEARSALS_TO_ISSUE ? (
              <div className="w-full p-4 bg-amber-100/90 border border-amber-300 rounded-2xl flex items-center gap-3 text-amber-950">
                <AlertTriangle className="text-amber-700 shrink-0" size={20} />
                <div className="text-xs font-medium">
                  <span className="font-extrabold block">🔒 Emissão Bloqueada:</span>
                  É necessário registrar no mínimo <strong>{MIN_REHEARSALS_TO_ISSUE} atendimentos/ensaios</strong> na unidade para liberar o relatório. (Atuais: <strong>{rehearsalPhotos.length}/{MIN_REHEARSALS_TO_ISSUE}</strong>)
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                className="w-full sm:w-auto min-h-[60px] px-8 rounded-full font-black text-base bg-charcoal text-white active:bg-black transition shadow-xl flex items-center justify-center gap-3 group active:scale-95 cursor-pointer"
              >
                <Play size={18} fill="white" className="group-hover:scale-110 transition" />
                Preencher o relatório
              </button>
            )}

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={pdfGenerating}
              className="w-full sm:w-auto min-h-[56px] px-6 rounded-full font-black text-sm bg-amber-400 text-black active:bg-amber-500 transition shadow-xl flex items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <Download size={18} className="group-hover:scale-110 transition" />
              {pdfGenerating ? 'Gerando PDF...' : 'Baixar PDF do mês'}
            </button>

            <p className="text-xs text-gray-500 font-medium">
              O PDF usa o que já estiver preenchido.
            </p>
          </div>
        </div>
      ) : (
        <ReportWizard
          schoolName={schoolNameFormatted}
          monthText={monthLabel(monthYear)}
          attendanceSessions={attendanceSessions}
          eventSessions={eventSessions}
          rehearsalPhotos={rehearsalPhotos}
          summary={summary}
          formatDateStr={formatDateStr}
          activitiesFocus={activitiesFocus}
          setActivitiesFocus={setActivitiesFocus}
          impactIndicators={impactIndicators}
          setImpactIndicators={setImpactIndicators}
          monitoringEvaluation={monitoringEvaluation}
          setMonitoringEvaluation={setMonitoringEvaluation}
          customQuestions={customQuestions}
          customAnswers={customAnswers}
          onCustomAnswer={(q, answer) => setCustomAnswers((prev) => ({ ...prev, [q.id]: { title: q.title, answer } }))}
          hasDifficulties={hasDifficulties}
          onToggleDifficulties={handleDifficultiesToggle}
          difficultiesDetails={difficultiesDetails}
          setDifficultiesDetails={setDifficultiesDetails}
          achievedResults={achievedResults}
          setAchievedResults={setAchievedResults}
          eventPublicCounts={eventPublicCounts}
          onEventPublicChange={handleEventPublicChange}
          selectedRehearsalIds={selectedRehearsalIds}
          onToggleRehearsalPhoto={toggleSelectRehearsalPhoto}
          selectedEventPhotoIds={selectedEventPhotoIds}
          onToggleEventPhoto={toggleSelectEventPhoto}
          nominataColumns={nominataColumns}
          setNominataColumns={setNominataColumns}
          officialBusy={officialBusy}
          officialUrl={officialUrl}
          officialError={officialError}
          onGenerate={() => generateOfficial('preview').catch(() => {})}
          downloadName={`Relatorio_${schoolNameFormatted.replace(/[^a-zA-Z0-9_-]+/g, '_')}_${monthYear}.pdf`}
          onSaveDraft={saveDraftSilently}
          onFinish={async () => {
            await handleSaveReport();
            setIsWizardOpen(false);
            if (!officialUrl) handleExportPDF();
          }}
          onClose={() => setIsWizardOpen(false)}
          finishing={loading || pdfGenerating}
        />
      )}
    </div>
  );
};
