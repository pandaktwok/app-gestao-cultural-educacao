import React, { useState, useEffect } from 'react';
import { Users, School as SchoolIcon, Filter, Key, Plus, FileSpreadsheet, Link as LinkIcon, BarChart3, Calendar as CalendarIcon, MapPin, X, Phone, Mail, UserCheck, Clock, Award, AlertTriangle, Eye, ChevronRight } from 'lucide-react';
import { BentoCard } from '../bento/BentoCard';
import { api } from '../../lib/api';
import { InteractiveCalendar, EventItem } from '../common/InteractiveCalendar';

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

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'TEACHERS' | 'SCHOOLS' | 'CALENDAR' | 'REPORTS' | 'ANNUAL'>('METRICS');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');

  // School Detailed View state
  const [detailedSchoolData, setDetailedSchoolData] = useState<any | null>(null);
  const [loadingSchoolDetails, setLoadingSchoolDetails] = useState(false);

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

              <button
                type="button"
                onClick={() => setDetailedSchoolData(null)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="space-y-6 overflow-y-auto flex-1 pr-1">
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

              {/* 2. PAINEL LATERAL ESQUERDO (GRÁFICO EM ROSCA / DONUT CHART) + ESTATÍSTICAS */}
              <div className="bg-white p-5 rounded-2xl border grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* SVG Donut Chart */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      {/* Background circle */}
                      <path
                        className="text-gray-100 stroke-current"
                        strokeWidth="3.8"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Presence arc (Emerald) */}
                      <path
                        className="text-emerald-500 stroke-current"
                        strokeWidth="3.8"
                        strokeDasharray={`${detailedSchoolData.stats?.overallPresenceRate || 100}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-extrabold text-emerald-950">
                        {detailedSchoolData.stats?.overallPresenceRate}%
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Frequência Geral</span>
                    </div>
                  </div>
                </div>

                {/* Donut Legend Cards */}
                <div className="col-span-2 grid grid-cols-3 gap-3 text-center">
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                    <span className="text-[10px] font-extrabold text-emerald-700 uppercase block">Presenças</span>
                    <p className="text-2xl font-extrabold text-emerald-900 mt-1">
                      {detailedSchoolData.stats?.totalPresentRecords || 0}
                    </p>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl">
                    <span className="text-[10px] font-extrabold text-rose-700 uppercase block">Faltas</span>
                    <p className="text-2xl font-extrabold text-rose-900 mt-1">
                      {detailedSchoolData.stats?.totalAbsentRecords || 0}
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
                    <span className="text-[10px] font-extrabold text-amber-800 uppercase block">Desistentes</span>
                    <p className="text-2xl font-extrabold text-amber-900 mt-1">
                      {detailedSchoolData.stats?.dropoutCount || 0}
                    </p>
                  </div>
                </div>
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

            <div className="border-t pt-3 shrink-0">
              <button
                type="button"
                onClick={() => setAdminStudentHistory(null)}
                className="w-full py-3 rounded-full font-bold text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Fechar Auditoria
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
    </div>
  );
};
