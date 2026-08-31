import React, { useState, useEffect, useMemo } from 'react';
import { Users, School as SchoolIcon, Filter, Key, Plus, FileSpreadsheet, Link as LinkIcon, BarChart3, Calendar as CalendarIcon, MapPin, X, Phone, Mail, UserCheck, Clock, Award, AlertTriangle, Eye, ChevronRight, FileText, ShieldCheck } from 'lucide-react';
import { BentoCard } from '../bento/BentoCard';
import { api } from '../../lib/api';
import { InteractiveCalendar, EventItem } from '../common/InteractiveCalendar';
import { Button, ButtonGroup } from '../common/ButtonGroup';
import { Widget3 } from '../watermelon-ui/widget-3';
import { Widget4 } from '../watermelon-ui/widget-4';
import { useFrequencyData, AttendanceRecord } from '../../hooks/useFrequencyData';
import { CertificateTemplate } from '../common/CertificateTemplate';

interface Teacher {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  role: string;
  avatarColor: string;
  initialAvatar: string;
  mustChangePassword: boolean;
  teacherSchools?: { school: School }[];
}

interface School {
  id: string;
  name: string;
  boardName?: string;
  directorName?: string;
  phone?: string;
  email?: string;
  address?: string;
  themeColor: string;
  initialAvatar: string;
  logoUrl?: string;
  _count?: {
    students: number;
    attendanceSessions?: number;
    rehearsalPhotos?: number;
  };
}

interface PublicAttendedDonutChartProps {
  totalAttended: number;
}

const PublicAttendedDonutChart: React.FC<PublicAttendedDonutChartProps> = ({ totalAttended }) => {
  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
          {/* Background Ring */}
          <circle cx="20" cy="20" r="15.9155" stroke="#F3F4F6" strokeWidth="4" fill="none" />
          {/* Full Cyan Donut Ring */}
          <circle
            cx="20"
            cy="20"
            r="15.9155"
            stroke="#00b8d9"
            strokeWidth="4.5"
            strokeDasharray="96 4"
            strokeDashoffset="0"
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-500 shadow-md"
            style={{ filter: 'drop-shadow(0px 0px 4px #00b8d9)' }}
          />
        </svg>

        {/* Center Text: Total Accumulated */}
        <div className="absolute flex flex-col items-center justify-center text-center px-2">
          <span className="text-3xl font-black text-gray-900 tracking-tight">
            {totalAttended.toLocaleString('pt-BR')}
          </span>
          <span className="text-[10px] font-extrabold text-cyan-700 uppercase tracking-wider mt-0.5">
            TOTAL ATENDIDOS
          </span>
        </div>
      </div>
      <p className="text-[11px] font-bold text-gray-500 mt-2 text-center">
        Alunos e participantes consolidados
      </p>
    </div>
  );
};

interface AttendanceGroupedBarChartProps {
  periodFilter: 'dia' | 'semana' | 'mes';
  basePresent: number;
  baseAbsent: number;
  baseDropout: number;
}

const AttendanceGroupedBarChart: React.FC<AttendanceGroupedBarChartProps> = ({
  periodFilter,
  basePresent,
  baseAbsent,
  baseDropout,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate data items based on periodFilter
  const getDataset = () => {
    if (periodFilter === 'dia') {
      return [
        { label: '06/07', presentes: Math.round((basePresent || 28) * 0.8), faltas: Math.round((baseAbsent || 3) * 0.7), desistentes: 0 },
        { label: '07/07', presentes: Math.round((basePresent || 30) * 0.9), faltas: Math.round((baseAbsent || 2) * 0.8), desistentes: 1 },
        { label: '13/07', presentes: Math.round((basePresent || 29) * 0.85), faltas: Math.round((baseAbsent || 4) * 0.9), desistentes: 0 },
        { label: '15/07', presentes: Math.round((basePresent || 32) * 1.0), faltas: Math.round((baseAbsent || 1) * 0.5), desistentes: 0 },
        { label: '20/07', presentes: Math.round((basePresent || 27) * 0.75), faltas: Math.round((baseAbsent || 5) * 1.1), desistentes: 1 },
        { label: '22/07', presentes: Math.round((basePresent || 31) * 0.95), faltas: Math.round((baseAbsent || 2) * 0.6), desistentes: 0 },
      ];
    }

    if (periodFilter === 'semana') {
      return [
        { label: 'Sem 1', presentes: Math.round((basePresent || 28) * 2.2), faltas: Math.round((baseAbsent || 3) * 2.1), desistentes: 1 },
        { label: 'Sem 2', presentes: Math.round((basePresent || 30) * 2.4), faltas: Math.round((baseAbsent || 2) * 1.8), desistentes: 0 },
        { label: 'Sem 3', presentes: Math.round((basePresent || 29) * 2.3), faltas: Math.round((baseAbsent || 4) * 2.0), desistentes: 1 },
        { label: 'Sem 4', presentes: Math.round((basePresent || 32) * 2.6), faltas: Math.round((baseAbsent || 1) * 1.5), desistentes: 0 },
      ];
    }

    // Default 'mes'
    return [
      { label: 'Jan', presentes: Math.round((basePresent || 30) * 2.5), faltas: 12, desistentes: 2 },
      { label: 'Fev', presentes: Math.round((basePresent || 30) * 2.8), faltas: 15, desistentes: 1 },
      { label: 'Mar', presentes: Math.round((basePresent || 30) * 3.1), faltas: 10, desistentes: 0 },
      { label: 'Abr', presentes: Math.round((basePresent || 30) * 3.2), faltas: 18, desistentes: 3 },
      { label: 'Mai', presentes: Math.round((basePresent || 30) * 2.9), faltas: 14, desistentes: 1 },
      { label: 'Jun', presentes: Math.round((basePresent || 30) * 3.3), faltas: 8, desistentes: 0 },
      { label: 'Jul', presentes: Math.round((basePresent || 30) * 3.0), faltas: 11, desistentes: 2 },
      { label: 'Ago', presentes: Math.round((basePresent || 30) * 3.4), faltas: 6, desistentes: 1 },
    ];
  };

  const dataset = getDataset();
  const maxVal = Math.max(
    ...dataset.flatMap((d) => [d.presentes, d.faltas, d.desistentes]),
    35
  );

  return (
    <div className="space-y-3">
      {/* Top Centered Legend Pills (No Right Numeric Counters) */}
      <div className="flex items-center justify-center gap-3 text-xs font-extrabold pb-1">
        <div className="flex items-center gap-1.5 bg-cyan-50 border border-cyan-200 text-cyan-900 px-3 py-1 rounded-full shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00b8d9]" />
          <span>Presentes</span>
        </div>
        <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-900 px-3 py-1 rounded-full shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7f56d9]" />
          <span>Faltas</span>
        </div>
        <div className="flex items-center gap-1.5 bg-pink-50 border border-pink-200 text-pink-900 px-3 py-1 rounded-full shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e040fb]" />
          <span>Desistências</span>
        </div>
      </div>

      {/* Grouped Bar Chart Canvas */}
      <div className="h-44 flex items-end justify-between gap-2 border-b border-dashed border-gray-300 pb-2 px-2 relative bg-gray-50/50 rounded-2xl p-3">
        {/* Horizontal Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 p-3">
          <div className="border-b border-gray-400 w-full" />
          <div className="border-b border-gray-400 w-full" />
          <div className="border-b border-gray-400 w-full" />
        </div>

        {dataset.map((d, idx) => {
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={d.label}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="flex-1 flex flex-col items-center gap-1 h-full justify-end z-10 group cursor-pointer relative"
            >
              {/* Tooltip on Hover */}
              {isHovered && (
                <div className="absolute -top-10 z-30 bg-gray-900 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap animate-fadeIn">
                  {d.label}: {d.presentes} Pres. | {d.faltas} Faltas | {d.desistentes} Des.
                </div>
              )}

              {/* Bars Grouping */}
              <div className={`flex items-end gap-1 w-full justify-center h-full transition-transform ${isHovered ? 'scale-105' : ''}`}>
                {/* Presentes Bar (Cyan) */}
                <div
                  style={{ height: `${Math.max((d.presentes / maxVal) * 100, 8)}%` }}
                  className="w-2 sm:w-3 bg-[#00b8d9] rounded-t-md group-hover:brightness-110 transition-all shadow-xs"
                  title={`Presentes (${d.label}): ${d.presentes}`}
                />
                {/* Faltas Bar (Purple) */}
                <div
                  style={{ height: `${Math.max((d.faltas / maxVal) * 100, 8)}%` }}
                  className="w-2 sm:w-3 bg-[#7f56d9] rounded-t-md group-hover:brightness-110 transition-all shadow-xs"
                  title={`Faltas (${d.label}): ${d.faltas}`}
                />
                {/* Desistencias Bar (Pink) */}
                <div
                  style={{ height: `${Math.max((d.desistentes / maxVal) * 100, 8)}%` }}
                  className="w-2 sm:w-3 bg-[#e040fb] rounded-t-md group-hover:brightness-110 transition-all shadow-xs"
                  title={`Desistências (${d.label}): ${d.desistentes}`}
                />
              </div>

              {/* X-Axis Label */}
              <span className={`text-[10px] font-extrabold transition-colors ${isHovered ? 'text-cyan-800 font-black scale-110' : 'text-gray-500'}`}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'TEACHERS' | 'SCHOOLS' | 'CALENDAR' | 'REPORTS' | 'ANNUAL' | 'FORM_MANAGER' | 'NOTIFICATIONS'>('METRICS');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  // Alerts Summary State
  const [alertsSummary, setAlertsSummary] = useState<any | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');

  // School Detailed View state
  const [detailedSchoolData, setDetailedSchoolData] = useState<any | null>(null);
  const [loadingSchoolDetails, setLoadingSchoolDetails] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'dia' | 'semana' | 'mes'>('mes');

  // Student Performance History Modal inside Admin
  const [adminStudentHistory, setAdminStudentHistory] = useState<any | null>(null);

  // Questioning and Reset state
  const [questionModalReportId, setQuestionModalReportId] = useState<string | null>(null);
  const [questionFieldKey, setQuestionFieldKey] = useState<string>('difficultiesDetails');
  const [questionComment, setQuestionComment] = useState<string>('');

  // Global events state for Admin
  const [globalEvents, setGlobalEvents] = useState<EventItem[]>([]);

  // New User Form State
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherCpf, setTeacherCpf] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [tempPasswordModal, setTempPasswordModal] = useState<{ email: string; cpf?: string; pass: string } | null>(null);

  // New School Form State
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [boardName, setBoardName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');

  // Collective Multi-School Event Form State
  const [showAddCollectiveEvent, setShowAddCollectiveEvent] = useState(false);
  const [collectiveEventName, setCollectiveEventName] = useState('');
  const [collectiveEventDate, setCollectiveEventDate] = useState('');
  const [collectiveLocation, setCollectiveLocation] = useState('');
  const [selectedCollectiveSchoolIds, setSelectedCollectiveSchoolIds] = useState<string[]>([]);
  const [loadingCollective, setLoadingCollective] = useState(false);

  // School linking state
  const [linkingTeacherId, setLinkingTeacherId] = useState<string | null>(null);
  const [linkedSchoolIds, setLinkedSchoolIds] = useState<string[]>([]);

  // Annual Report
  const [annualData, setAnnualData] = useState<any>(null);

  // Audit Log Modal State
  const [auditLogsModalReportId, setAuditLogsModalReportId] = useState<string | null>(null);
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // Certificate Modal State
  const [selectedCertificateData, setSelectedCertificateData] = useState<any>(null);

  // Custom Questionnaire Manager state
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);
  const [newQTitle, setNewQTitle] = useState('');
  const [newQFieldType, setNewQFieldType] = useState('TEXTAREA');
  const [newQScopeType, setNewQScopeType] = useState('GLOBAL');
  const [newQRequired, setNewQRequired] = useState(true);

  useEffect(() => {
    fetchData();
    fetchGlobalEvents();
    fetchCustomQuestions();
  }, []);

  const fetchCustomQuestions = async () => {
    try {
      const res = await api.get('/questionnaire');
      if (Array.isArray(res.data)) {
        setCustomQuestions(res.data);
      }
    } catch (err) {
      console.error('Error fetching questionnaire:', err);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQTitle.trim()) return;
    try {
      await api.post('/questionnaire', {
        title: newQTitle,
        fieldType: newQFieldType,
        scopeType: newQScopeType,
        isRequired: newQRequired,
        order: customQuestions.length + 1,
      });
      setNewQTitle('');
      fetchCustomQuestions();
      alert('Pergunta personalizada criada com sucesso!');
    } catch (err) {
      console.error('Error creating question:', err);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (confirm('Deseja excluir esta pergunta do questionário?')) {
      try {
        await api.delete(`/questionnaire/${id}`);
        fetchCustomQuestions();
      } catch (err) {
        console.error('Error deleting question:', err);
      }
    }
  };

  const handleToggleQuestionActive = async (id: string) => {
    try {
      await api.patch(`/questionnaire/${id}/toggle`);
      fetchCustomQuestions();
    } catch (err) {
      console.error('Error toggling question active status:', err);
    }
  };

  const handleExportSchoolPDF = async () => {
    if (!detailedSchoolData) return;
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;
      const element = document.getElementById('school-pdf-card');
      if (!element) return;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Ficha_Escolar_${detailedSchoolData.school?.name?.replace(/\s+/g, '_') || 'Escola'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      await html2pdf().from(element).set(opt).save();
    } catch (err) {
      console.error('Error exporting school PDF:', err);
      alert('Erro ao exportar PDF da Ficha da Escola.');
    }
  };

  const fetchData = async () => {
    try {
      const [uRes, sRes] = await Promise.all([api.get('/auth/users'), api.get('/schools')]);
      setTeachers(uRes.data);
      setSchools(sRes.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  const fetchGlobalEvents = async () => {
    try {
      const res = await api.get('/sessions/events/all');
      if (Array.isArray(res.data)) {
        setGlobalEvents(res.data);
      }
    } catch (err) {
      console.error('Error fetching global events:', err);
    }
  };

  const openSchoolDetailsModal = async (schoolId: string) => {
    setLoadingSchoolDetails(true);
    try {
      const res = await api.get(`/schools/${schoolId}/details`);
      setDetailedSchoolData(res.data);
    } catch (err) {
      console.error('Error fetching school details:', err);
      alert('Erro ao carregar detalhes da escola');
    } finally {
      setLoadingSchoolDetails(false);
    }
  };

  const openAdminStudentHistory = async (studentId: string) => {
    try {
      const res = await api.get(`/students/${studentId}/history`);
      setAdminStudentHistory(res.data);
    } catch (err) {
      console.error('Error loading student history:', err);
    }
  };

  const handleCpfChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) setTeacherCpf(digits);
    else if (digits.length <= 6) setTeacherCpf(`${digits.slice(0, 3)}.${digits.slice(3)}`);
    else if (digits.length <= 9) setTeacherCpf(`${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`);
    else setTeacherCpf(`${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`);
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/users', {
        name: teacherName,
        email: teacherEmail,
        cpf: teacherCpf,
        phone: teacherPhone,
        role: 'TEACHER',
      });
      setTempPasswordModal({ email: teacherEmail, cpf: teacherCpf, pass: res.data.tempPassword });
      setTeacherName('');
      setTeacherEmail('');
      setTeacherCpf('');
      setTeacherPhone('');
      setShowAddTeacher(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar professor');
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/schools', {
        name: schoolName,
        boardName,
        directorName,
        phone: schoolPhone,
        email: schoolEmail,
        address: schoolAddress,
      });
      setSchoolName('');
      setBoardName('');
      setDirectorName('');
      setSchoolPhone('');
      setSchoolEmail('');
      setSchoolAddress('');
      setShowAddSchool(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar escola');
    }
  };

  const handleCreateCollectiveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectiveEventName || !collectiveEventDate || selectedCollectiveSchoolIds.length === 0) {
      alert('Preencha o nome do evento, data/hora e selecione ao menos uma escola participante.');
      return;
    }

    setLoadingCollective(true);
    try {
      await api.post('/sessions/events', {
        name: collectiveEventName,
        date: new Date(collectiveEventDate).toISOString(),
        locationAddress: collectiveLocation || undefined,
        schoolIds: selectedCollectiveSchoolIds,
      });

      setCollectiveEventName('');
      setCollectiveLocation('');
      setSelectedCollectiveSchoolIds([]);
      setShowAddCollectiveEvent(false);
      fetchGlobalEvents();
      alert('Evento coletivo criado e vinculado às escolas selecionadas!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao cadastrar evento coletivo');
    } finally {
      setLoadingCollective(false);
    }
  };

  const openSchoolLinkModal = (teacher: Teacher) => {
    setLinkingTeacherId(teacher.id);
    const existingIds = teacher.teacherSchools?.map((ts) => ts.school.id) || [];
    setLinkedSchoolIds(existingIds);
  };

  const handleSaveSchoolLinks = async () => {
    if (!linkingTeacherId) return;
    try {
      await api.put(`/auth/users/${linkingTeacherId}/schools`, {
        schoolIds: linkedSchoolIds,
      });
      setLinkingTeacherId(null);
      fetchData();
    } catch (err) {
      console.error('Error linking schools:', err);
    }
  };

  const fetchAnnualReport = async () => {
    try {
      const res = await api.get('/reports/annual?year=2026');
      setAnnualData(res.data);
      setActiveTab('ANNUAL');
    } catch (err) {
      console.error('Error fetching annual report:', err);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionModalReportId || !questionComment) return;

    try {
      await api.post(`/reports/monthly/${questionModalReportId}/question`, {
        fieldKey: questionFieldKey,
        comment: questionComment,
      });
      alert('Questionamento enviado ao professor com sucesso!');
      setQuestionModalReportId(null);
      setQuestionComment('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao questionar resposta');
    }
  };

  const handleResetReport = async (reportId: string) => {
    if (confirm('Tem certeza que deseja resetar este relatório? O status voltará para Pendente (DRAFT), permitindo que o professor edite e reenvie.')) {
      try {
        await api.post(`/reports/monthly/${reportId}/reset`);
        alert('Relatório resetado para DRAFT com sucesso!');
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Erro ao resetar relatório');
      }
    }
  };

  const handleApproveReport = async (reportId: string) => {
    if (confirm('Deseja aprovar este relatório mensal? O status será alterado para APROVADO.')) {
      try {
        await api.post(`/reports/monthly/${reportId}/approve`);
        alert('✅ Relatório aprovado pela Diretoria Executiva!');
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Erro ao aprovar relatório');
      }
    }
  };

  const handleOpenAuditLogs = async (reportId: string) => {
    setAuditLogsModalReportId(reportId);
    setLoadingAuditLogs(true);
    try {
      const res = await api.get(`/reports/monthly/${reportId}/audit-logs`);
      setAuditLogsList(res.data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      alert('Erro ao carregar histórico de auditoria.');
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const handleIssueCertificateForStudent = async (studentId: string) => {
    try {
      const eventsRes = await api.get('/sessions/events/all');
      const firstEvent = Array.isArray(eventsRes.data) && eventsRes.data.length > 0 ? eventsRes.data[0] : null;

      if (!firstEvent) {
        alert('Não há eventos cadastrados no sistema para vincular ao certificado.');
        return;
      }

      const res = await api.post('/certificates/issue', {
        studentId,
        eventSessionId: firstEvent.id,
      });

      setSelectedCertificateData({
        studentName: res.data.student.name,
        schoolName: res.data.student.school.name,
        eventName: res.data.eventSession.name,
        eventDate: res.data.eventSession.date,
        eventLocation: res.data.eventSession.locationAddress,
        instructorName: res.data.eventSession.teacher?.name || 'Professor Instrutor',
        hash: res.data.certificate.hash,
        attendanceRate: res.data.certificate.attendanceRate,
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao emitir certificado.');
    }
  };

  const fetchAlertsSummary = async () => {
    setLoadingAlerts(true);
    try {
      const res = await api.get('/schools/alerts/summary');
      setAlertsSummary(res.data);
      setActiveTab('NOTIFICATIONS');
    } catch (err) {
      console.error('Error fetching alerts summary:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleDeletePhotoAudit = async (type: 'rehearsal' | 'event', photoId: string) => {
    if (confirm(`Tem certeza que deseja excluir esta foto de ${type === 'rehearsal' ? 'ensaio' : 'evento'}?`)) {
      try {
        await api.delete(`/reports/photos/${type}/${photoId}`);
        alert('Foto excluída com sucesso!');
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Erro ao excluir foto');
      }
    }
  };

  // Filtered metrics & hierarchical available schools logic
  const availableSchools = useMemo(() => {
    if (selectedTeacherId === 'ALL') return schools;
    const teacher = teachers.find((t) => t.id === selectedTeacherId);
    if (!teacher || !teacher.teacherSchools) return schools;
    const assignedSchoolIds = new Set(teacher.teacherSchools.map((ts) => ts.school?.id || (ts as any).schoolId));
    return schools.filter((s) => assignedSchoolIds.has(s.id));
  }, [schools, teachers, selectedTeacherId]);

  // Auto-reset school filter if the currently selected school is not available for the active teacher
  useEffect(() => {
    if (selectedSchoolId !== 'ALL' && !availableSchools.some((s) => s.id === selectedSchoolId)) {
      setSelectedSchoolId('ALL');
    }
  }, [selectedTeacherId, availableSchools, selectedSchoolId]);

  const filteredSchools = schools.filter((s) => {
    if (selectedSchoolId !== 'ALL' && s.id !== selectedSchoolId) return false;
    if (selectedTeacherId !== 'ALL') {
      const teacher = teachers.find((t) => t.id === selectedTeacherId);
      const isAssigned = teacher?.teacherSchools?.some((ts) => ts.school?.id === s.id);
      if (!isAssigned) return false;
    }
    return true;
  });

  // Dynamic attendance records dataset generation (Jan to Dez per school & teacher)
  const allAttendanceRecords = useMemo<AttendanceRecord[]>(() => {
    const records: AttendanceRecord[] = [];
    schools.forEach((school) => {
      const assignedTeachers = teachers.filter((t) =>
        t.teacherSchools?.some((ts) => (ts.school?.id || (ts as any).schoolId) === school.id)
      );
      const teacherIds = assignedTeachers.length > 0 ? assignedTeachers.map((t) => t.id) : [teachers[0]?.id || 'default-prof'];

      teacherIds.forEach((profId) => {
        const baseSeed = (school.name.charCodeAt(0) + profId.charCodeAt(0)) % 15;
        for (let m = 0; m < 12; m++) {
          const baseAttended = 35 + baseSeed + ((m * 7 + baseSeed * 3) % 25);
          const baseAbsent = 4 + ((m * 3 + baseSeed) % 10);
          const baseDropped = (m === 5 || m === 6 || m === 3) ? ((m + baseSeed) % 2) : 0;

          records.push({
            id: `rec-${school.id}-${profId}-${m}`,
            professorId: profId,
            schoolId: school.id,
            date: `2026-${(m + 1).toString().padStart(2, '0')}-15`,
            month: m,
            attended: baseAttended,
            absent: baseAbsent,
            dropped: baseDropped,
          });
        }
      });
    });
    return records;
  }, [schools, teachers]);

  // Reactive frequency stats calculated via useFrequencyData hook
  const frequencyChartData = useFrequencyData(
    allAttendanceRecords,
    selectedTeacherId,
    selectedSchoolId
  );

  // Dynamic Subtitle Context Feedback
  const dynamicFrequencySubtitle = useMemo(() => {
    if (selectedSchoolId !== 'ALL') {
      const school = schools.find((s) => s.id === selectedSchoolId);
      return `Métricas exclusivas de ${school?.name || 'Escola'}`;
    }
    if (selectedTeacherId !== 'ALL') {
      const teacher = teachers.find((t) => t.id === selectedTeacherId);
      return `Consolidado das escolas atendidas por ${teacher?.name || 'Professor'}`;
    }
    return "Histórico mensal consolidado de toda a rede";
  }, [selectedSchoolId, selectedTeacherId, schools, teachers]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Header & Navigation Menu */}
      <div className="bento-card p-5 space-y-4 bg-gradient-to-r from-adminBlue/10 via-indigo-50/50 to-white border border-adminBlue/20 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white p-1.5 border border-adminBlue/30 shadow-md flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Sociedade Cultural Cruzeiro do Sul" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-adminBlue bg-adminBlue/10 px-2.5 py-0.5 rounded-full border border-adminBlue/20 inline-block">
                Diretoria & Coordenação
              </span>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight mt-0.5">
                Painel Executivo da Diretoria
              </h1>
            </div>
          </div>

          {/* Navigation Menu Tabs */}
          <div className="bg-white/90 p-1.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-1 overflow-x-auto scrollbar-none max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('METRICS')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'METRICS'
                  ? 'bg-adminBlue text-white shadow-md scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CALENDAR')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'CALENDAR'
                  ? 'bg-adminBlue text-white shadow-md scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
              }`}
            >
              Calendário Global
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TEACHERS')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'TEACHERS'
                  ? 'bg-adminBlue text-white shadow-md scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
              }`}
            >
              Professores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SCHOOLS')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'SCHOOLS'
                  ? 'bg-adminBlue text-white shadow-md scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
              }`}
            >
              Escolas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('REPORTS')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'REPORTS'
                  ? 'bg-adminBlue text-white shadow-md scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
              }`}
            >
              Auditoria & Respostas
            </button>
            <button
              type="button"
              onClick={fetchAnnualReport}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'ANNUAL'
                  ? 'bg-adminBlue text-white shadow-md scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
              }`}
            >
              Relatório Anual
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('FORM_MANAGER')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'FORM_MANAGER'
                  ? 'bg-adminBlue text-white shadow-md scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
              }`}
            >
              Gestor de Formulários
            </button>
            <button
              type="button"
              onClick={fetchAlertsSummary}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-rose-600 text-white shadow-md scale-[1.02]'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              🔔 Central de Alertas
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'METRICS' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bento-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1 flex items-center gap-1.5">
                <Filter size={14} className="text-adminBlue" /> Filtrar por Professor
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full p-3 rounded-2xl border text-xs font-bold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-adminBlue"
              >
                <option value="ALL">Todos os Professores</option>
                {teachers
                  .filter((t) => t.role === 'TEACHER')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.cpf || t.email})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1 flex items-center gap-1.5">
                <SchoolIcon size={14} className="text-adminBlue" /> Filtrar por Escola
              </label>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full p-3 rounded-2xl border text-xs font-bold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-adminBlue"
              >
                <option value="ALL">
                  {selectedTeacherId !== 'ALL'
                    ? `Todas as Escolas do Professor (${availableSchools.length})`
                    : 'Todas as Escolas Parceiras'}
                </option>
                {availableSchools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Dashboard Layout (Section 6.2): Left Vertical Stacked Cards + Right Grouped Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Vertical Stacked Metric Cards */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                    Total Alunos
                  </span>
                  <BarChart3 size={24} className="text-emerald-200" />
                </div>
                <h4 className="text-3xl font-black">
                  {filteredSchools.reduce((acc, s) => acc + (s._count?.students || 0), 0)}
                </h4>
                <p className="text-xs text-emerald-100 font-medium">Alunos Beneficiados nas Oficinas</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-5 rounded-3xl shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                    Escolas Atendidas
                  </span>
                  <SchoolIcon size={24} className="text-indigo-200" />
                </div>
                <h4 className="text-3xl font-black">{filteredSchools.length}</h4>
                <p className="text-xs text-indigo-100 font-medium">Polos Institucionais Ativos</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 rounded-3xl shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                    Professores Ativos
                  </span>
                  <Users size={24} className="text-amber-200" />
                </div>
                <h4 className="text-3xl font-black">
                  {teachers.filter((t) => t.role === 'TEACHER').length}
                </h4>
                <p className="text-xs text-amber-100 font-medium">Docentes em Campo</p>
              </div>
            </div>

            {/* Right Column: Card de Evolução de Atendimentos & Frequência (Bento UI Reativo) */}
            <Widget3
              className="lg:col-span-2"
              title="Evolução de Atendimentos & Frequência"
              subtitle={dynamicFrequencySubtitle}
              data={frequencyChartData}
            />
          </div>

          {/* Schools Bento Cards List */}
          <div className="space-y-4">
            <h3 className="text-xl font-extrabold text-gray-900">Polos de Atendimento ({filteredSchools.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSchools.map((school) => (
                <div
                  key={school.id}
                  style={{ borderLeftColor: school.themeColor }}
                  onClick={() => openSchoolDetailsModal(school.id)}
                  className="bento-card p-5 border-l-8 flex items-center justify-between cursor-pointer hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      style={{ backgroundColor: school.themeColor }}
                      className="w-12 h-12 rounded-2xl text-white font-extrabold text-lg flex items-center justify-center shadow-md"
                    >
                      {school.initialAvatar}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-gray-900">{school.name}</h4>
                      <p className="text-xs text-gray-500 font-medium">
                        {school.directorName ? `Diretora: ${school.directorName}` : school.boardName || 'Diretoria Regional'} • {school.address || 'Sem endereço'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-gray-100 text-gray-800">
                      {school._count?.students || 0} Alunos
                    </span>
                    <button
                      type="button"
                      className="p-2 bg-adminBlue text-white rounded-full hover:bg-black transition shadow"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR GLOBAL TAB */}
      {activeTab === 'CALENDAR' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50 border border-indigo-200 p-5 rounded-2xl">
            <div>
              <h3 className="text-xl font-extrabold text-indigo-950 flex items-center gap-2">
                <CalendarIcon className="text-indigo-600" /> Calendário Global Unificado da Diretoria
              </h3>
              <p className="text-xs text-indigo-800 font-medium mt-1">
                Visualização integrada de eventos de todos os polos parceiros e criação de eventos coletivos com vínculo multi-escolas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                setCollectiveEventDate(now.toISOString().slice(0, 16));
                setShowAddCollectiveEvent(true);
              }}
              className="px-5 py-3 rounded-full bg-adminBlue text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition shrink-0"
            >
              <Plus size={16} /> Cadastrar Evento Coletivo (Multi-Escolas)
            </button>
          </div>

          <InteractiveCalendar events={globalEvents} />
        </div>
      )}

      {activeTab === 'TEACHERS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-extrabold text-gray-900">Gestão de Professores</h3>
            <button
              type="button"
              onClick={() => setShowAddTeacher(true)}
              className="bento-pill-btn px-5 py-2.5 text-xs flex items-center gap-2"
            >
              <Plus size={16} /> Cadastrar Professor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="bento-card p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: teacher.avatarColor }}
                    className="w-12 h-12 rounded-full text-white font-extrabold flex items-center justify-center shadow-md"
                  >
                    {teacher.initialAvatar}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-gray-900">{teacher.name}</h4>
                    <p className="text-xs text-gray-500 font-medium">
                      CPF: <strong>{teacher.cpf || 'Não cadastrado'}</strong> • {teacher.phone || teacher.email}
                    </p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {teacher.teacherSchools?.map((ts) => (
                        <span
                          key={ts.school.id}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                          {ts.school.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openSchoolLinkModal(teacher)}
                  className="p-2.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                  title="Vincular Escolas"
                >
                  <LinkIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'SCHOOLS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-extrabold text-gray-900">Gestão de Escolas</h3>
            <button
              type="button"
              onClick={() => setShowAddSchool(true)}
              className="bento-pill-btn px-5 py-2.5 text-xs flex items-center gap-2"
            >
              <Plus size={16} /> Cadastrar Escola
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schools.map((school) => (
              <div
                key={school.id}
                onClick={() => openSchoolDetailsModal(school.id)}
                className="bento-card p-5 flex items-center justify-between cursor-pointer hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: school.themeColor }}
                    className="w-12 h-12 rounded-2xl text-white font-extrabold flex items-center justify-center shadow-md"
                  >
                    {school.initialAvatar}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-gray-900">{school.name}</h4>
                    <p className="text-xs text-gray-500 font-medium">
                      {school.directorName ? `Diretora: ${school.directorName}` : school.boardName || 'Sem diretoria'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    {school._count?.students || 0} alunos
                  </span>
                  <button
                    type="button"
                    className="p-2 bg-adminBlue text-white rounded-full hover:bg-black transition shadow"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENDER REPORTS AUDIT TAB */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          <div className="bento-card p-6 bg-indigo-50 border border-indigo-200">
            <h3 className="text-xl font-extrabold text-indigo-950 mb-1 flex items-center gap-2">
              <FileSpreadsheet className="text-indigo-600" /> Auditoria e Controle de Respostas Administrativas
            </h3>
            <p className="text-xs text-indigo-800 font-medium">
              Audite respostas enviadas pelos professores, questionar itens específicos, resetar relatórios para revisão e excluir mídias incorretas.
            </p>
          </div>

          <div className="space-y-4">
            {schools.map((school: any) => {
              const reports = school.monthlyReports || [];
              const rehearsals = school.rehearsalPhotos || [];

              return (
                <div key={school.id} className="bento-card p-6 space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: school.themeColor }}
                        className="w-10 h-10 rounded-xl text-white font-extrabold flex items-center justify-center text-sm shadow-md"
                      >
                        {school.initialAvatar}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-gray-900">{school.name}</h4>
                        <p className="text-xs text-gray-500">{school.boardName || 'Diretoria Regional'}</p>
                      </div>
                    </div>

                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-800">
                      {reports.length} Relatório(s) registrado(s)
                    </span>
                  </div>

                  {/* Monthly Reports Section */}
                  <div className="space-y-3">
                    <h5 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">
                      Relatórios Mensais de Prestação de Contas
                    </h5>

                    {reports.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhum relatório criado ainda para esta escola.</p>
                    ) : (
                      reports.map((report: any) => (
                        <div key={report.id} className="p-4 rounded-2xl bg-gray-50 border space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                            <div>
                              <span className="text-xs font-extrabold text-indigo-950">
                                Mês Referência: {report.monthYear}
                              </span>
                              <span
                                className={`ml-2 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                  report.status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : report.status === 'SUBMITTED'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : report.status === 'REVISION_REQUESTED'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {report.status === 'APPROVED'
                                  ? '✅ APROVADO PELA DIRETORIA'
                                  : report.status === 'SUBMITTED'
                                  ? '⏳ AGUARDANDO ANÁLISE'
                                  : report.status === 'REVISION_REQUESTED'
                                  ? '⚠️ REVISÃO SOLICITADA'
                                  : '📝 RASCUNHO (DRAFT)'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {report.status !== 'APPROVED' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveReport(report.id)}
                                  className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition flex items-center gap-1 cursor-pointer"
                                >
                                  ✓ Aprovar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setQuestionModalReportId(report.id);
                                  setQuestionFieldKey('monitoringEvaluation');
                                  setQuestionComment('');
                                }}
                                className="px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-extrabold shadow-xs transition flex items-center gap-1 cursor-pointer"
                              >
                                ⚠️ Questionar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAuditLogs(report.id)}
                                className="px-3 py-1.5 rounded-full bg-charcoal hover:bg-black text-white text-xs font-extrabold shadow-xs transition flex items-center gap-1 cursor-pointer"
                              >
                                📜 Histórico
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetReport(report.id)}
                                className="px-3 py-1.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-extrabold shadow-xs transition flex items-center gap-1 cursor-pointer"
                              >
                                🔄 Resetar
                              </button>
                            </div>
                          </div>

                          {/* Report Content Review */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-white rounded-xl border">
                              <span className="font-extrabold text-gray-500 block mb-0.5">Título do Projeto:</span>
                              <span className="font-bold text-gray-900">{report.projectTitle}</span>
                            </div>
                            <div className="p-3 bg-white rounded-xl border">
                              <span className="font-extrabold text-gray-500 block mb-0.5">Órgão Concedente:</span>
                              <span className="font-bold text-gray-900">{report.grantorName}</span>
                            </div>
                            <div className="col-span-1 sm:col-span-2 p-3 bg-white rounded-xl border">
                              <span className="font-extrabold text-gray-500 block mb-0.5">
                                Detalhamento de Dificuldades Encontradas:
                              </span>
                              <p className="font-medium text-gray-800">{report.difficultiesDetails || 'Sem registro.'}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'ANNUAL' && (
        <div className="space-y-6">
          <div className="bento-card p-6 bg-amber-50 border border-amber-200">
            <h3 className="text-xl font-extrabold text-amber-950 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="text-amber-600" /> Relatório Anual Consolidado Institucional (2026)
            </h3>
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Varredura global que compila presenças, total de ensaios, taxa de evasão e links das fotos no Google Drive para prestação de contas aos órgãos concedentes.
            </p>
          </div>

          {annualData?.consolidatedSchools && (
            <div className="space-y-4">
              {annualData.consolidatedSchools.map((item: any) => (
                <div key={item.schoolId} className="bento-card p-5 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Escola</span>
                    <p className="font-extrabold text-sm text-gray-900">{item.schoolName}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Alunos Ativos</span>
                    <p className="font-extrabold text-sm text-emerald-700">{item.activeStudents}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Desistências</span>
                    <p className="font-extrabold text-sm text-rose-700">{item.dropoutStudents}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Frequência %</span>
                    <p className="font-extrabold text-sm text-indigo-700">{item.attendancePercentage}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Ensaios</span>
                    <p className="font-extrabold text-sm text-amber-700">{item.totalRehearsals}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GESTOR DINÂMICO DE QUESTIONÁRIOS (SEÇÃO 5) */}
      {activeTab === 'FORM_MANAGER' && (
        <div className="space-y-6">
          <div className="bento-card p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
            <h3 className="text-xl font-extrabold text-indigo-950 flex items-center gap-2">
              <FileText className="text-indigo-600" /> Gerenciador Dinâmico de Questionários e Formulários
            </h3>
            <p className="text-xs text-indigo-800 font-medium mt-1">
              Crie, edite, reordene e exclua perguntas personalizadas para os Relatórios Mensais dos professores.
            </p>
          </div>

          {/* Form Create Question */}
          <form onSubmit={handleCreateQuestion} className="bento-card p-5 space-y-4 bg-white border">
            <h4 className="text-sm font-extrabold text-gray-900 border-b pb-2">Nova Pergunta Personalizada</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Título / Pergunta *</label>
                <input
                  type="text"
                  required
                  value={newQTitle}
                  onChange={(e) => setNewQTitle(e.target.value)}
                  placeholder="Ex: Descreva as inovações pedagógicas aplicadas no mês"
                  className="w-full p-3 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Campo</label>
                <select
                  value={newQFieldType}
                  onChange={(e) => setNewQFieldType(e.target.value)}
                  className="w-full p-3 rounded-xl border text-xs font-bold bg-gray-50 focus:ring-2 focus:ring-adminBlue focus:outline-none"
                >
                  <option value="TEXTAREA">Texto Longo (Textarea)</option>
                  <option value="TEXT">Texto Curto</option>
                  <option value="BOOLEAN">Sim / Não Condicional</option>
                  <option value="RADIO">Múltipla Escolha (Radio)</option>
                  <option value="CHECKBOX">Seleção Múltipla (Checkbox)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={newQRequired}
                  onChange={(e) => setNewQRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-adminBlue focus:ring-adminBlue"
                />
                Resposta de preenchimento obrigatório pelo professor
              </label>

              <button
                type="submit"
                className="px-6 py-3 rounded-full bg-adminBlue hover:bg-black text-white text-xs font-extrabold shadow-md transition"
              >
                + Adicionar Pergunta
              </button>
            </div>
          </form>

          {/* List of Custom Questions */}
          <div className="space-y-3">
            <h4 className="text-base font-extrabold text-gray-900">
              Perguntas Cadastradas ({customQuestions.length})
            </h4>

            {customQuestions.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed text-xs text-gray-400 font-bold">
                Nenhuma pergunta personalizada cadastrada. As perguntas padrão do relatório serão exibidas aos professores.
              </div>
            ) : (
              <div className="space-y-2">
                {customQuestions.map((q, idx) => (
                  <div key={q.id} className={`p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-sm transition ${q.isActive !== false ? 'bg-white border-gray-200' : 'bg-gray-50/70 border-gray-200 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-sm text-gray-900">{q.title}</p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${q.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                            {q.isActive !== false ? 'ATIVA' : 'DESATIVADA'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                          Tipo: {q.fieldType} • {q.isRequired ? 'Obrigatória' : 'Opcional'} • Escopo: {q.scopeType}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleQuestionActive(q.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition shadow-sm ${q.isActive !== false ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
                      >
                        {q.isActive !== false ? '✓ Ativa' : '✕ Desativada'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="px-3 py-1.5 rounded-full text-xs font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CENTRAL DE NOTIFICAÇÕES & ALERTAS DE EVASÃO (REDE GERAL) */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bento-card p-6 bg-gradient-to-r from-rose-900 via-rose-950 to-gray-900 text-white border border-rose-700/80 shadow-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500 text-white rounded-2xl shrink-0 shadow-lg">
                <AlertTriangle size={26} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 bg-rose-950/80 px-3 py-1 rounded-full border border-rose-800">
                  Monitoramento Preventivo de Evasão Escolar
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  Central de Alertas & Notificações da Rede
                </h3>
              </div>
            </div>
            <p className="text-xs text-rose-200/90 font-medium leading-relaxed max-w-3xl">
              Consolidado em tempo real de alunos com 3 ou mais faltas consecutivas nos ensaios diários e acompanhamento de relatórios mensais pendentes de envio.
            </p>
          </div>

          {/* Stat Cards Bento UI */}
          {alertsSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bento-card p-5 bg-rose-50 border border-rose-200 text-center space-y-1">
                <span className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider block">Alunos em Risco de Evasão</span>
                <p className="text-3xl font-black text-rose-950">{alertsSummary.totalRiskStudents}</p>
                <span className="text-[10px] text-rose-700 font-bold block">Faltas consecutivas ≥ 3</span>
              </div>

              <div className="bento-card p-5 bg-amber-50 border border-amber-200 text-center space-y-1">
                <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider block">Escolas com Ocorrências</span>
                <p className="text-3xl font-black text-amber-950">{alertsSummary.schoolsWithRiskCount} / {alertsSummary.totalSchoolsCount}</p>
                <span className="text-[10px] text-amber-700 font-bold block">Polos afetados</span>
              </div>

              <div className="bento-card p-5 bg-indigo-50 border border-indigo-200 text-center space-y-1">
                <span className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider block">Relatórios Pendentes</span>
                <p className="text-3xl font-black text-indigo-950">
                  {alertsSummary.schoolsSummary?.filter((s: any) => s.hasPendingReport).length || 0}
                </p>
                <span className="text-[10px] text-indigo-700 font-bold block">Aguardando envio do professor</span>
              </div>
            </div>
          )}

          {/* Schools Breakdown List */}
          {loadingAlerts ? (
            <div className="p-8 text-center text-xs text-gray-500 font-medium">Carregando alertas da rede...</div>
          ) : alertsSummary?.schoolsSummary ? (
            <div className="space-y-4">
              {alertsSummary.schoolsSummary.map((school: any) => (
                <div key={school.schoolId} className="bento-card p-5 space-y-4 bg-white border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                    <div>
                      <h4 className="text-base font-black text-gray-950">{school.schoolName}</h4>
                      <p className="text-xs text-gray-500 font-medium">
                        Professores Responsáveis: {school.assignedTeachers.map((t: any) => t.name).join(', ') || 'Nenhum'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${school.riskStudentsCount > 0 ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-emerald-100 text-emerald-900'}`}>
                        {school.riskStudentsCount > 0 ? `⚠️ ${school.riskStudentsCount} Aluno(s) em Risco` : '✓ Sem Alertas de Evasão'}
                      </span>
                      {school.hasPendingReport && (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                          📝 Relatório em Aberto
                        </span>
                      )}
                    </div>
                  </div>

                  {/* List of Risk Students in this school */}
                  {school.riskStudentsCount > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[11px] font-black text-rose-900 uppercase tracking-wider block">
                        Alunos em Risco de Desistência:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {school.riskStudents.map((st: any) => (
                          <div key={st.id} className="p-3 bg-rose-50/80 rounded-2xl border border-rose-200 flex items-center justify-between text-xs font-bold text-rose-950">
                            <div>
                              <p className="font-extrabold">{st.name} ({st.age} anos)</p>
                              <p className="text-[10px] text-rose-700 font-medium">Última ausência: {st.lastAbsenceDate ? new Date(st.lastAbsenceDate).toLocaleDateString('pt-BR') : '-'}</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-black text-[10px] shrink-0">
                              {st.consecutiveAbsences} Faltas Seguidas
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Todos os alunos inscritos possuem bom ritmo de assiduidade.</p>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* VISÃO DETALHADA DA ESCOLA (SEÇÃO 5 DA ESPECIFICAÇÃO) */}
      {detailedSchoolData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-4xl w-full space-y-6 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  style={{ backgroundColor: detailedSchoolData.school?.themeColor }}
                  className="w-12 h-12 rounded-2xl text-white font-extrabold text-lg flex items-center justify-center shadow-md"
                >
                  {detailedSchoolData.school?.initialAvatar}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
                    {detailedSchoolData.school?.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Visão Geral Institucional e Desempenho de Alunos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportSchoolPDF}
                  className="px-4 py-2 rounded-full bg-adminBlue hover:bg-black text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition"
                >
                  <FileSpreadsheet size={16} /> Exportar Ficha em PDF
                </button>

                <button
                  type="button"
                  onClick={() => setDetailedSchoolData(null)}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div id="school-pdf-card" className="space-y-6 overflow-y-auto flex-1 pr-1 bg-white p-2">
              {/* 1. BLOCO DE DADOS INSTITUCIONAIS & CONTATO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dados da Escola */}
                <div className="bg-gray-50 p-4 rounded-2xl border space-y-2">
                  <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider border-b pb-1">
                    1. Dados Institucionais da Escola
                  </h4>
                  <div className="text-xs space-y-1 text-gray-700 font-medium">
                    <p><strong>Nome Oficial:</strong> {detailedSchoolData.school?.name}</p>
                    <p><strong>Diretora / Gestora:</strong> {detailedSchoolData.school?.directorName || 'Não informado'}</p>
                    <p><strong>Endereço:</strong> {detailedSchoolData.school?.address || 'Não informado'}</p>
                    <p><strong>E-mail Oficial:</strong> {detailedSchoolData.school?.email || 'Não informado'}</p>
                    <p><strong>Telefone Oficial:</strong> {detailedSchoolData.school?.phone || 'Não informado'}</p>
                  </div>
                </div>

                {/* Card do Professor Responsável */}
                <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 space-y-2">
                  <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider border-b border-indigo-200 pb-1">
                    Card do Professor Responsável
                  </h4>
                  {detailedSchoolData.assignedTeachers?.length === 0 ? (
                    <p className="text-xs text-indigo-700 italic">Nenhum professor vinculado ainda.</p>
                  ) : (
                    detailedSchoolData.assignedTeachers.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
                        <div
                          style={{ backgroundColor: t.avatarColor }}
                          className="w-10 h-10 rounded-full text-white font-extrabold text-xs flex items-center justify-center"
                        >
                          {t.initialAvatar}
                        </div>
                        <div className="text-xs space-y-0.5">
                          <p className="font-bold text-gray-900">{t.name}</p>
                          <p className="text-gray-600">CPF: <strong>{t.cpf || 'Não informado'}</strong></p>
                          <p className="text-gray-600">Tel/WhatsApp: {t.phone || t.email}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. PAINEL DETALHADO DA ESCOLA (NOVA ESTRUTURA COM WIDGET3 E WIDGET4 - WATERMELON UI) */}
              <div className="w-full my-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-2 gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Público Atendido & Frequência</h3>
                    <p className="text-sm text-slate-500">Métricas consolidadas de atendimento e engajamento escolar</p>
                  </div>

                  <ButtonGroup size="sm" variant="secondary">
                    <Button
                      onPress={() => setPeriodFilter("dia")}
                      className={periodFilter === "dia" ? "font-semibold text-cyan-700 bg-white shadow-sm" : "text-slate-600 font-medium"}
                    >
                      Dia
                    </Button>
                    <ButtonGroup.Separator />
                    <Button
                      onPress={() => setPeriodFilter("semana")}
                      className={periodFilter === "semana" ? "font-semibold text-cyan-700 bg-white shadow-sm" : "text-slate-600 font-medium"}
                    >
                      Semana
                    </Button>
                    <ButtonGroup.Separator />
                    <Button
                      onPress={() => setPeriodFilter("mes")}
                      className={periodFilter === "mes" ? "font-semibold text-cyan-700 bg-white shadow-sm" : "text-slate-600 font-medium"}
                    >
                      Mês
                    </Button>
                  </ButtonGroup>
                </div>

                {(() => {
                  const basePresent = detailedSchoolData.stats?.totalPresentRecords || 0;
                  const eventPublicSum = 180;
                  const periodMult = periodFilter === 'dia' ? 0.3 : periodFilter === 'semana' ? 0.7 : 1;
                  const totalAttended = Math.round((basePresent + eventPublicSum) * periodMult);

                  const audienceData = [
                    {
                      id: "alunos",
                      label: "Alunos em Ensaios",
                      value: `${Math.round(basePresent * periodMult)}`,
                      numericValue: Math.round(basePresent * periodMult),
                      fill: "#00b8d9",
                    },
                    {
                      id: "eventos",
                      label: "Público em Eventos",
                      value: `${Math.round(eventPublicSum * periodMult)}`,
                      numericValue: Math.round(eventPublicSum * periodMult),
                      fill: "#00b8d9",
                      opacity: 0.7,
                    },
                  ];

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col items-center justify-center">
                        <Widget4
                          className="bg-transparent text-slate-900 w-full"
                          data={audienceData}
                          period={periodFilter}
                          title="Público Atendido"
                          totalAttended={totalAttended}
                        />
                      </div>

                      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
                        <Widget3
                          className="bg-transparent text-slate-900 w-full"
                          period={periodFilter}
                          title="Evolução de Presença"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 3. RELAÇÃO DE ALUNOS (ATIVOS VS DESISTENTES COM DATA DE CORTE) */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border">
                <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center justify-between border-b pb-2">
                  <span>3. Relação de Alunos ({detailedSchoolData.students?.length} Total)</span>
                  <span className="text-[11px] font-bold text-gray-600">
                    {detailedSchoolData.stats?.activeCount} Ativos • {detailedSchoolData.stats?.dropoutCount} Desistentes
                  </span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {detailedSchoolData.students?.map((student: any) => {
                    const isDropout = student.status === 'DROPOUT';

                    return (
                      <div
                        key={student.id}
                        onClick={() => openAdminStudentHistory(student.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                          isDropout
                            ? 'bg-rose-50 border-rose-200 text-rose-950'
                            : 'bg-white border-gray-200 hover:border-accentMint'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isDropout ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                          <div>
                            <p className="font-bold text-gray-900">{student.name}</p>
                            <p className="text-[11px] text-gray-500">
                              {student.age} anos • {student.gender === 'M' ? 'Masculino' : 'Feminino'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isDropout
                              ? 'bg-rose-200 text-rose-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isDropout
                            ? `Corte: ${new Date(student.dropoutDate).toLocaleDateString('pt-BR')}`
                            : 'ATIVO'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. LINHA DO TEMPO DE EVENTOS (RODAPÉ DO PAINEL) */}
              <div className="space-y-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200">
                <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-indigo-200 pb-2">
                  <Award size={14} className="text-indigo-600" /> 4. Linha do Tempo de Eventos Culturais & Apresentações ({detailedSchoolData.events?.length})
                </h4>

                {detailedSchoolData.events?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-2">Nenhum evento registrado para esta escola.</p>
                ) : (
                  <div className="space-y-2">
                    {detailedSchoolData.events?.map((ev: any) => (
                      <div key={ev.id} className="p-3 bg-white rounded-xl border flex items-center justify-between text-xs font-bold shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                            🎉
                          </div>
                          <div>
                            <p className="font-extrabold text-gray-900">{ev.name}</p>
                            <p className="text-[11px] text-gray-500 font-medium">📍 {ev.locationAddress || 'Local não informado'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-3 py-1 rounded-full">
                          {new Date(ev.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-3 shrink-0 text-right">
              <button
                type="button"
                onClick={() => setDetailedSchoolData(null)}
                className="px-6 py-2.5 rounded-full font-bold text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Fechar Detalhes da Escola
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT PERFORMANCE HISTORY MODAL INSIDE ADMIN */}
      {adminStudentHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-lg w-full space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-adminBlue text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                  {adminStudentHistory.student?.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 leading-tight">
                    {adminStudentHistory.student?.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {adminStudentHistory.student?.age} anos • {adminStudentHistory.student?.gender === 'M' ? 'Masculino' : 'Feminino'} • Auditoria do Aluno
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminStudentHistory(null)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Performance Stats Cards Grid */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">Frequência %</span>
                <p className="text-2xl font-extrabold text-emerald-900 mt-0.5">
                  {adminStudentHistory.stats?.presenceRate}%
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">Faltas Seguidas</span>
                <p className="text-2xl font-extrabold text-amber-900 mt-0.5">
                  {adminStudentHistory.stats?.consecutiveAbsences}
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">Presenças / Faltas</span>
                <p className="text-base font-extrabold text-indigo-900 mt-1">
                  {adminStudentHistory.stats?.totalPresence}P / {adminStudentHistory.stats?.totalAbsence}F
                </p>
              </div>
            </div>

            {/* Attendance Session Timeline */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <h4 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-adminBlue" /> Linha do Tempo de Presença Auditada
              </h4>

              {adminStudentHistory.timeline?.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center">Sem sessões no histórico deste aluno.</p>
              ) : (
                <div className="space-y-2">
                  {adminStudentHistory.timeline?.map((item: any) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                        item.isPresent
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50/50 border-rose-200 text-rose-950'
                      }`}
                    >
                      <div>
                        <span>
                          {new Date(item.date).toLocaleDateString('pt-BR')} • {item.category}
                        </span>
                        {item.justification && (
                          <p className="text-[11px] font-medium text-gray-500">{item.justification}</p>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          item.isPresent
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-rose-200 text-rose-900'
                        }`}
                      >
                        {item.isPresent ? 'PRESENTE' : 'FALTA'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-3 shrink-0 flex gap-2">
              <button
                type="button"
                onClick={() => handleIssueCertificateForStudent(adminStudentHistory.student?.id)}
                className="flex-1 py-3 rounded-full font-black text-xs bg-amber-400 text-amber-950 hover:bg-amber-500 transition shadow-md flex items-center justify-center gap-1 cursor-pointer"
              >
                🎓 Emitir Certificado Cultural
              </button>
              <button
                type="button"
                onClick={() => setAdminStudentHistory(null)}
                className="px-6 py-3 rounded-full font-bold text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-extrabold text-gray-900">Cadastrar Professor</h3>
            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">CPF (Login do App) *</label>
                <input
                  type="text"
                  required
                  value={teacherCpf}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none tracking-wider"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">E-mail Institucional *</label>
                <input
                  type="email"
                  required
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeacher(false)}
                  className="flex-1 py-3 rounded-full text-xs font-bold text-gray-600 bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full text-xs font-bold text-white bg-adminBlue"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temp Password Credential Modal */}
      {tempPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Key size={24} />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Primeiro Acesso Gerado!</h3>
            <p className="text-xs text-gray-600 font-medium">
              Envie as credenciais abaixo ao professor. A redefinição de senha será obrigatória no primeiro login.
            </p>
            <div className="bg-gray-100 p-4 rounded-2xl text-left space-y-1 font-mono text-xs">
              <p><strong>CPF Login:</strong> {tempPasswordModal.cpf}</p>
              <p><strong>Email:</strong> {tempPasswordModal.email}</p>
              <p><strong>Senha Provisória:</strong> {tempPasswordModal.pass}</p>
            </div>
            <button
              type="button"
              onClick={() => setTempPasswordModal(null)}
              className="w-full py-3 rounded-full text-xs font-bold bg-charcoal text-white"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Add School Modal */}
      {showAddSchool && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-extrabold text-gray-900">Cadastrar Escola Parceira</h3>
            <form onSubmit={handleCreateSchool} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Escola *</label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Diretora / Gestora</label>
                  <input
                    type="text"
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    placeholder="Dra. Helena"
                    className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Diretoria Regional</label>
                  <input
                    type="text"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Telefone Oficial</label>
                  <input
                    type="text"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                    placeholder="(11) 3241-5500"
                    className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">E-mail Oficial</label>
                  <input
                    type="email"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    placeholder="escola@educacao.sp.gov.br"
                    className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade"
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSchool(false)}
                  className="flex-1 py-3 rounded-full text-xs font-bold text-gray-600 bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full text-xs font-bold text-white bg-adminBlue"
                >
                  Cadastrar Escola
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Schools Modal */}
      {linkingTeacherId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-extrabold text-gray-900">Vincular Escolas ao Professor</h3>
            <p className="text-xs text-gray-500 font-medium">Selecione quais polos este professor poderá gerenciar.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {schools.map((school) => {
                const isLinked = linkedSchoolIds.includes(school.id);
                return (
                  <div
                    key={school.id}
                    onClick={() => {
                      setLinkedSchoolIds((prev) =>
                        isLinked ? prev.filter((id) => id !== school.id) : [...prev, school.id]
                      );
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isLinked ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-gray-900">{school.name}</span>
                    <input type="checkbox" checked={isLinked} readOnly className="rounded text-adminBlue" />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLinkingTeacherId(null)}
                className="flex-1 py-3 rounded-full text-xs font-bold text-gray-600 bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSchoolLinks}
                className="flex-1 py-3 rounded-full text-xs font-bold text-white bg-adminBlue"
              >
                Salvar Vínculos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG TIMELINE MODAL (DIRETORIA EXCLUSIVA) */}
      {auditLogsModalReportId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-charcoal text-white rounded-2xl">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                    Histórico & Rastreabilidade Geral
                  </span>
                  <h3 className="text-lg font-black text-gray-950">
                    Linha do Tempo do Relatório
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditLogsModalReportId(null)}
                className="text-xs font-bold text-gray-400 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100"
              >
                ✕ Fechar
              </button>
            </div>

            {loadingAuditLogs ? (
              <div className="p-8 text-center text-xs text-gray-500 font-medium">
                Carregando registros de auditoria...
              </div>
            ) : auditLogsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 italic">
                Nenhum evento registrado ainda para este relatório.
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {auditLogsList.map((log: any, idx: number) => {
                  const isSubmitted = log.action === 'SUBMITTED';
                  const isQuestioned = log.action === 'QUESTIONED';
                  const isRevised = log.action === 'REVISED';
                  const isApproved = log.action === 'APPROVED';

                  return (
                    <div key={log.id || idx} className="flex items-start gap-3 relative pl-2">
                      {/* Vertical line connector */}
                      {idx < auditLogsList.length - 1 && (
                        <div className="absolute left-5 top-7 bottom-0 w-0.5 bg-gray-200" />
                      )}

                      <div
                        className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 z-10 ${
                          isApproved
                            ? 'bg-emerald-500 text-white'
                            : isQuestioned
                            ? 'bg-amber-500 text-black'
                            : isRevised
                            ? 'bg-indigo-500 text-white'
                            : 'bg-charcoal text-white'
                        }`}
                      >
                        {isApproved ? '✓' : isQuestioned ? '⚠️' : isRevised ? '🔄' : '📝'}
                      </div>

                      <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/80 flex-1 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              log.userRole === 'ADMIN'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-indigo-100 text-indigo-900'
                            }`}
                          >
                            {log.userRole === 'ADMIN' ? 'Diretoria / Admin' : 'Professor'}
                          </span>
                          <span className="text-gray-400">
                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        <p className="text-xs font-black text-gray-900">{log.userName}</p>
                        <p className="text-xs text-gray-700 font-medium">{log.details}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setAuditLogsModalReportId(null)}
                className="px-6 py-2.5 rounded-full bg-gray-900 hover:bg-black text-white text-xs font-bold transition"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATE PREVIEW & EMISSION MODAL */}
      {selectedCertificateData && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="max-w-5xl w-full max-h-[95vh] overflow-y-auto">
            <CertificateTemplate
              studentName={selectedCertificateData.studentName}
              schoolName={selectedCertificateData.schoolName}
              eventName={selectedCertificateData.eventName}
              eventDate={selectedCertificateData.eventDate}
              eventLocation={selectedCertificateData.eventLocation}
              instructorName={selectedCertificateData.instructorName}
              hash={selectedCertificateData.hash}
              attendanceRate={selectedCertificateData.attendanceRate}
              onClose={() => setSelectedCertificateData(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
