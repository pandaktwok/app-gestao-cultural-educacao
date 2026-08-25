import React, { useState, useEffect } from 'react';
import { Users, School as SchoolIcon, Filter, Key, Plus, FileSpreadsheet, Link as LinkIcon, BarChart3, Calendar as CalendarIcon, MapPin, X } from 'lucide-react';
import { BentoCard } from '../bento/BentoCard';
import { api } from '../../lib/api';
import { InteractiveCalendar, EventItem } from '../common/InteractiveCalendar';

interface Teacher {
  id: string;
  name: string;
  email: string;
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

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'TEACHERS' | 'SCHOOLS' | 'CALENDAR' | 'REPORTS' | 'ANNUAL'>('METRICS');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');

  // Questioning and Reset state
  const [questionModalReportId, setQuestionModalReportId] = useState<string | null>(null);
  const [questionFieldKey, setQuestionFieldKey] = useState<string>('difficultiesDetails');
  const [questionComment, setQuestionComment] = useState<string>('');

  // Global events state for Admin
  const [globalEvents, setGlobalEvents] = useState<EventItem[]>([]);

  // New User Form State
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [tempPasswordModal, setTempPasswordModal] = useState<{ email: string; pass: string } | null>(null);

  // New School Form State
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [boardName, setBoardName] = useState('');
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

  useEffect(() => {
    fetchData();
    fetchGlobalEvents();
  }, []);

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

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/users', {
        name: teacherName,
        email: teacherEmail,
        role: 'TEACHER',
      });
      setTempPasswordModal({ email: teacherEmail, pass: res.data.tempPassword });
      setTeacherName('');
      setTeacherEmail('');
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
        address: schoolAddress,
      });
      setSchoolName('');
      setBoardName('');
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

  // Filtered metrics logic
  const filteredSchools = schools.filter((s) => {
    if (selectedSchoolId !== 'ALL' && s.id !== selectedSchoolId) return false;
    if (selectedTeacherId !== 'ALL') {
      const teacher = teachers.find((t) => t.id === selectedTeacherId);
      const isAssigned = teacher?.teacherSchools?.some((ts) => ts.school.id === s.id);
      if (!isAssigned) return false;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="bento-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-adminBlue/10 to-indigo-50 border border-adminBlue/20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-adminBlue text-white flex items-center justify-center font-extrabold text-xl shadow-lg">
            AD
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Painel Executivo da Diretoria</h1>
            <p className="text-xs text-gray-600 font-medium">Gestão de Escolas, Professores, Calendário Global e Prestação de Contas</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-white/80 p-1.5 rounded-full border shadow-sm self-start sm:self-auto flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('METRICS')}
            className={`px-4 py-2 text-xs font-extrabold rounded-full transition-all ${
              activeTab === 'METRICS' ? 'bg-adminBlue text-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CALENDAR')}
            className={`px-4 py-2 text-xs font-extrabold rounded-full transition-all ${
              activeTab === 'CALENDAR' ? 'bg-adminBlue text-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Calendário Global
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TEACHERS')}
            className={`px-4 py-2 text-xs font-extrabold rounded-full transition-all ${
              activeTab === 'TEACHERS' ? 'bg-adminBlue text-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Professores
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SCHOOLS')}
            className={`px-4 py-2 text-xs font-extrabold rounded-full transition-all ${
              activeTab === 'SCHOOLS' ? 'bg-adminBlue text-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Escolas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REPORTS')}
            className={`px-4 py-2 text-xs font-extrabold rounded-full transition-all ${
              activeTab === 'REPORTS' ? 'bg-adminBlue text-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Auditoria & Respostas
          </button>
          <button
            type="button"
            onClick={fetchAnnualReport}
            className={`px-4 py-2 text-xs font-extrabold rounded-full transition-all ${
              activeTab === 'ANNUAL' ? 'bg-adminBlue text-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Relatório Anual
          </button>
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
                      {t.name}
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
                <option value="ALL">Todas as Escolas Parceiras</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Metrics Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BentoCard
              title="Escolas Atendidas"
              subtitle="Total de polos de atendimento"
              bgColor="#3D8A7E"
              textColor="#FFFFFF"
              badge={`${filteredSchools.length} Polos`}
              icon={<SchoolIcon size={24} className="text-white" />}
            >
              <p className="text-4xl font-extrabold mt-2">{filteredSchools.length}</p>
            </BentoCard>

            <BentoCard
              title="Professores Ativos"
              subtitle="Corpo docente em campo"
              bgColor="#8F94FB"
              textColor="#FFFFFF"
              badge={`${teachers.filter((t) => t.role === 'TEACHER').length} Docentes`}
              icon={<Users size={24} className="text-white" />}
            >
              <p className="text-4xl font-extrabold mt-2">
                {teachers.filter((t) => t.role === 'TEACHER').length}
              </p>
            </BentoCard>

            <BentoCard
              title="Alunos Beneficiados"
              subtitle="Alunos matriculados nas oficinas"
              bgColor="#FFB074"
              textColor="#1E1E24"
              icon={<BarChart3 size={24} className="text-gray-900" />}
            >
              <p className="text-4xl font-extrabold mt-2">
                {filteredSchools.reduce((acc, s) => acc + (s._count?.students || 0), 0)}
              </p>
            </BentoCard>
          </div>

          {/* Schools Bento Cards List */}
          <div className="space-y-4">
            <h3 className="text-xl font-extrabold text-gray-900">Polos de Atendimento ({filteredSchools.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSchools.map((school) => (
                <div
                  key={school.id}
                  style={{ borderLeftColor: school.themeColor }}
                  className="bento-card p-5 border-l-8 flex items-center justify-between"
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
                        {school.boardName || 'Diretoria Regional'} • {school.address || 'Sem endereço'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-gray-100 text-gray-800">
                      {school._count?.students || 0} Alunos
                    </span>
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
                    <p className="text-xs text-gray-500 font-medium">{teacher.email}</p>
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
              <div key={school.id} className="bento-card p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: school.themeColor }}
                    className="w-12 h-12 rounded-2xl text-white font-extrabold flex items-center justify-center shadow-md"
                  >
                    {school.initialAvatar}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-gray-900">{school.name}</h4>
                    <p className="text-xs text-gray-500 font-medium">{school.boardName || 'Sem diretoria'}</p>
                  </div>
                </div>

                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {school._count?.students || 0} alunos
                </span>
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
                                  report.status === 'SUBMITTED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : report.status === 'REVISION_REQUESTED'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {report.status === 'SUBMITTED'
                                  ? 'ENVIADO / CONCLUÍDO'
                                  : report.status === 'REVISION_REQUESTED'
                                  ? 'REVISÃO SOLICITADA'
                                  : 'EM RASCUNHO (DRAFT)'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setQuestionModalReportId(report.id);
                                  setQuestionFieldKey('difficultiesDetails');
                                  setQuestionComment('');
                                }}
                                className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-black text-xs font-extrabold shadow-sm transition"
                              >
                                Questionar Resposta
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetReport(report.id)}
                                className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm transition"
                              >
                                Resetar Relatório
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

                  {/* Photos Audit Section */}
                  <div className="space-y-3 pt-2">
                    <h5 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">
                      Auditoria de Fotos dos Ensaios ({rehearsals.length})
                    </h5>

                    {rehearsals.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhuma foto de ensaio registrada.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {rehearsals.map((photo: any) => (
                          <div key={photo.id} className="relative group rounded-xl overflow-hidden border bg-gray-100 shadow-sm">
                            <img src={photo.photoUrl} alt="Ensaio" className="w-full h-24 object-cover" />
                            <button
                              type="button"
                              onClick={() => handleDeletePhotoAudit('rehearsal', photo.id)}
                              className="absolute top-1 right-1 bg-rose-600 text-white p-1.5 rounded-full text-[10px] font-bold opacity-90 hover:opacity-100 transition shadow"
                              title="Excluir foto"
                            >
                              Excluir
                            </button>
                          </div>
                        ))}
                      </div>
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

      {/* Add Teacher Modal */}
      {showAddTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-extrabold text-gray-900">Cadastrar Professor</h3>
            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">E-mail Institucional</label>
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
          <div className="bg-white rounded-bento-lg p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-extrabold text-gray-900">Cadastrar Escola Parceira</h3>
            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Escola</label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Diretoria / Regional</label>
                <input
                  type="text"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
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
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Collective Multi-School Event Modal */}
      {showAddCollectiveEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-extrabold text-gray-900">Novo Evento Coletivo (Multi-Escolas)</h3>
              <button
                type="button"
                onClick={() => setShowAddCollectiveEvent(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCollectiveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Evento *</label>
                <input
                  type="text"
                  required
                  value={collectiveEventName}
                  onChange={(e) => setCollectiveEventName(e.target.value)}
                  placeholder="Ex: Desfile Cívico Geral, Mostra Cultural Regional"
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Data e Horário *</label>
                <input
                  type="datetime-local"
                  required
                  value={collectiveEventDate}
                  onChange={(e) => setCollectiveEventDate(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Endereço do Local (Opcional)</label>
                <input
                  type="text"
                  value={collectiveLocation}
                  onChange={(e) => setCollectiveLocation(e.target.value)}
                  placeholder="Ex: Praça Central, Centro Cultural"
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none"
                />
              </div>

              {/* Multi-School Checkbox List Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Selecione as Escolas Participantes * ({selectedCollectiveSchoolIds.length} selecionada(s))
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-xl p-3 bg-gray-50">
                  {schools.map((school) => {
                    const isChecked = selectedCollectiveSchoolIds.includes(school.id);
                    return (
                      <label
                        key={school.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white cursor-pointer transition text-xs font-bold"
                      >
                        <span className="text-gray-800">{school.name}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCollectiveSchoolIds((prev) => [...prev, school.id]);
                            } else {
                              setSelectedCollectiveSchoolIds((prev) => prev.filter((id) => id !== school.id));
                            }
                          }}
                          className="w-4 h-4 accent-adminBlue rounded"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCollectiveEvent(false)}
                  className="flex-1 py-3 rounded-full text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingCollective}
                  className="flex-1 py-3 rounded-full text-xs font-bold text-white bg-adminBlue hover:opacity-95 shadow-md"
                >
                  {loadingCollective ? 'Criando...' : 'Salvar Evento Coletivo'}
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
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {schools.map((school) => {
                const isChecked = linkedSchoolIds.includes(school.id);
                return (
                  <label
                    key={school.id}
                    className="flex items-center justify-between p-3 rounded-xl border hover:bg-gray-50 cursor-pointer"
                  >
                    <span className="text-sm font-bold text-gray-800">{school.name}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLinkedSchoolIds((prev) => [...prev, school.id]);
                        } else {
                          setLinkedSchoolIds((prev) => prev.filter((id) => id !== school.id));
                        }
                      }}
                      className="w-5 h-5 accent-adminBlue rounded"
                    />
                  </label>
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

      {/* Question Field Modal */}
      {questionModalReportId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-extrabold text-gray-900">Questionar Resposta do Relatório</h3>
              <button
                type="button"
                onClick={() => setQuestionModalReportId(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuestionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Campo A Questionar</label>
                <select
                  value={questionFieldKey}
                  onChange={(e) => setQuestionFieldKey(e.target.value)}
                  className="w-full p-3 rounded-xl border text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="difficultiesDetails">Detalhamento de Dificuldades Encontradas</option>
                  <option value="projectTitle">Título do Projeto</option>
                  <option value="grantorName">Órgão Concedente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Comentário / Solicitação de Correção *</label>
                <textarea
                  rows={4}
                  required
                  value={questionComment}
                  onChange={(e) => setQuestionComment(e.target.value)}
                  placeholder="Ex: Por favor detalhar em quais dias e turmas houve alteração de horário durante as provas."
                  className="w-full p-3 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuestionModalReportId(null)}
                  className="flex-1 py-3 rounded-full text-xs font-bold text-gray-600 bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full text-xs font-bold text-black bg-amber-400 hover:bg-amber-500 shadow-md"
                >
                  Enviar Questionamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
