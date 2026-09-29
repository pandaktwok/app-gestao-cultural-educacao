import React, { useState, useEffect } from 'react';
import { UserCheck, UserPlus, CheckCircle2, UserX, Play, AlertTriangle, Clock, Camera, Minus, Plus, Check, X, Loader2 } from 'lucide-react';
import { api, isOnline } from '../../lib/api';
import { db } from '../../lib/db';
import { compressPhoto } from '../../lib/imageUtils';
import { ImageCaptureModal } from '../common/ImageCaptureModal';
import { BottomSheet } from '../common/BottomSheet';

interface FolderAttendanceProps {
  schoolId: string;
  onComplete: (status: boolean) => void;
  isReadOnly?: boolean;
}

interface Student {
  id: string;
  name: string;
  age: number;
  gender: string;
  status: 'ACTIVE' | 'DROPOUT';
  dropoutDate?: string;
  consecutiveAbsences?: number;
  presenceRate?: number;
  totalPresence?: number;
  totalAbsence?: number;
}

type Category = 'Ensaio' | 'Reposição' | 'Reforço';

const CATEGORY_LABEL: Record<Category, { icon: string; label: string }> = {
  Ensaio: { icon: '🎵', label: 'Ensaio' },
  Reposição: { icon: '🔄', label: 'Reposição' },
  Reforço: { icon: '💪', label: 'Reforço' },
};

const initials = (name: string) => name.trim().substring(0, 2).toUpperCase();

const Stepper: React.FC<{ value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; tone: 'green' | 'red' }> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  label,
  tone,
}) => (
  <div>
    <span className="block text-xs font-extrabold text-gray-700 mb-1.5">{label}</span>
    <div className={`flex items-center rounded-2xl border-2 overflow-hidden ${tone === 'green' ? 'border-emerald-300 bg-emerald-50/50' : 'border-rose-300 bg-rose-50/50'}`}>
      <button type="button" aria-label={`Diminuir ${label}`} onClick={() => onChange(Math.max(min, value - 1))} className="h-14 w-14 flex items-center justify-center active:bg-black/10 shrink-0">
        <Minus size={20} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value, 10) || 0)))}
        className={`w-full min-w-0 h-14 text-center text-2xl font-extrabold bg-transparent focus:outline-none ${tone === 'green' ? 'text-emerald-800' : 'text-rose-800'}`}
      />
      <button type="button" aria-label={`Aumentar ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="h-14 w-14 flex items-center justify-center active:bg-black/10 shrink-0">
        <Plus size={20} />
      </button>
    </div>
  </div>
);


export const FolderAttendance: React.FC<FolderAttendanceProps> = ({ schoolId, onComplete, isReadOnly = false }) => {
  const [submodule, setSubmodule] = useState<'MANUAL' | 'EXTERNAL'>('MANUAL');
  const [category, setCategory] = useState<Category>('Ensaio');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const [selectedStudentHistory, setSelectedStudentHistory] = useState<any | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [externalPhoto, setExternalPhoto] = useState<string | null>(null);
  const [externalPresent, setExternalPresent] = useState<number>(0);
  const [externalAbsent, setExternalAbsent] = useState<number>(0);
  const [showExternalImageModal, setShowExternalImageModal] = useState(false);

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentAge, setNewStudentAge] = useState<number>(10);
  const [newStudentGender, setNewStudentGender] = useState<'M' | 'F'>('M');

  const [dropoutTarget, setDropoutTarget] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const fetchStudents = async () => {
    try {
      if (isOnline()) {
        const res = await api.get(`/students/school/${schoolId}`);
        setStudents(res.data);
        const initialMap: Record<string, boolean> = {};
        res.data.forEach((s: Student) => {
          if (s.status === 'ACTIVE') initialMap[s.id] = true; // começa como presente
        });
        setAttendance(initialMap);
      } else {
        const local = await db.offlineStudents.where('schoolId').equals(schoolId).toArray();
        const mapped = local.map((s) => ({
          id: s.serverId || String(s.id),
          name: s.name,
          age: s.age,
          gender: s.gender,
          status: s.status as 'ACTIVE' | 'DROPOUT',
          dropoutDate: s.dropoutDate,
          consecutiveAbsences: 0,
        }));
        setStudents(mapped);
        const initialMap: Record<string, boolean> = {};
        mapped.forEach((s) => {
          if (s.status === 'ACTIVE') initialMap[s.id] = true;
        });
        setAttendance(initialMap);
      }
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  const openStudentHistoryModal = async (studentId: string) => {
    setLoadingHistory(true);
    const studentObj = students.find((s) => s.id === studentId);
    // abre já com os dados que temos, e completa quando a API responder
    setSelectedStudentHistory({
      student: studentObj,
      stats: {
        presenceRate: studentObj?.presenceRate ?? 100,
        totalPresence: studentObj?.totalPresence ?? 0,
        totalAbsence: studentObj?.totalAbsence ?? 0,
        consecutiveAbsences: studentObj?.consecutiveAbsences ?? 0,
      },
      timeline: [],
    });
    try {
      if (isOnline()) {
        const res = await api.get(`/students/${studentId}/history`);
        setSelectedStudentHistory(res.data);
      }
    } catch (err) {
      console.error('Error loading student history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const setStudentPresence = (studentId: string, isPresent: boolean) => {
    setAttendance((prev) => ({ ...prev, [studentId]: isPresent }));
  };

  const setAll = (isPresent: boolean) => {
    const map: Record<string, boolean> = {};
    students.filter((s) => s.status === 'ACTIVE').forEach((s) => (map[s.id] = isPresent));
    setAttendance(map);
  };

  const activeStudents = students.filter((s) => s.status === 'ACTIVE');
  const presentCount = activeStudents.filter((s) => attendance[s.id]).length;
  const absentCount = activeStudents.length - presentCount;

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    try {
      if (isOnline()) {
        const res = await api.post('/students', {
          name: newStudentName.trim(),
          age: newStudentAge,
          gender: newStudentGender,
          schoolId,
        });
        setStudents((prev) => [...prev, res.data]);
        setAttendance((prev) => ({ ...prev, [res.data.id]: true }));
      } else {
        const id = await db.offlineStudents.add({
          schoolId,
          name: newStudentName.trim(),
          age: newStudentAge,
          gender: newStudentGender,
          status: 'ACTIVE',
          synced: false,
        });
        const newObj: Student = {
          id: `temp_${id}`,
          name: newStudentName.trim(),
          age: newStudentAge,
          gender: newStudentGender,
          status: 'ACTIVE',
        };
        setStudents((prev) => [...prev, newObj]);
        setAttendance((prev) => ({ ...prev, [newObj.id]: true }));
      }
      setNewStudentName('');
      setShowAddStudent(false);
    } catch (err) {
      console.error('Error adding student:', err);
    }
  };

  const confirmDropout = async () => {
    if (!dropoutTarget) return;
    const studentId = dropoutTarget.id;
    try {
      if (isOnline()) {
        await api.patch(`/students/${studentId}/dropout`, { dropoutDate: new Date() });
      }
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: 'DROPOUT', dropoutDate: new Date().toISOString() } : s))
      );
    } catch (err) {
      console.error('Error marking dropout:', err);
    } finally {
      setDropoutTarget(null);
    }
  };

  const handleExternalPhotoCaptured = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const compressed = await compressPhoto(files[0]);
    setExternalPhoto(compressed);
  };

  const handleSubmitAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        date: new Date().toISOString(),
        schoolId,
        type: submodule,
        category,
        countPresent: submodule === 'MANUAL' ? presentCount : externalPresent,
        countAbsent: submodule === 'MANUAL' ? absentCount : externalAbsent,
        records:
          submodule === 'MANUAL'
            ? activeStudents.map((s) => ({ studentId: s.id, isPresent: !!attendance[s.id] }))
            : undefined,
        photoListUrl: submodule === 'EXTERNAL' ? externalPhoto : undefined,
      };

      if (isOnline()) {
        await api.post('/sessions/attendance', payload);
      } else {
        await db.pendingAttendance.add({
          schoolId,
          date: new Date().toISOString(),
          type: submodule,
          countPresent: payload.countPresent,
          countAbsent: payload.countAbsent,
          records: payload.records,
          photoListUrl: payload.photoListUrl || undefined,
          synced: false,
          timestamp: Date.now(),
        });
      }

      setSubmitted(true);
      setShowAttendanceModal(false);
      onComplete(true);
      fetchStudents();
    } catch (err) {
      console.error('Error submitting attendance:', err);
      setError('Não foi possível enviar a chamada. Confira a internet e tente de novo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-b-bento-lg space-y-5">
      {/* Abas */}
      <div className="grid grid-cols-2 bg-gray-100 p-1.5 rounded-full">
        {(
          [
            ['MANUAL', 'Chamada no app'],
            ['EXTERNAL', 'Lista em papel'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubmodule(key)}
            className={`min-h-[48px] px-3 text-sm font-extrabold rounded-full transition-all ${
              submodule === key ? 'bg-accentMint text-white shadow-md' : 'text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-3">
          {error}
        </p>
      )}

      {submodule === 'MANUAL' ? (
        <div className="space-y-5">
          {/* Tipo do encontro */}
          <div className="space-y-2">
            <span className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider">Tipo do encontro</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CATEGORY_LABEL) as Category[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                  className={`min-h-[64px] rounded-2xl text-xs font-extrabold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                    category === cat ? 'bg-charcoal text-white shadow-md' : 'bg-gray-50 text-gray-700 border'
                  }`}
                >
                  <span className="text-xl leading-none">{CATEGORY_LABEL[cat].icon}</span>
                  {CATEGORY_LABEL[cat].label}
                </button>
              ))}
            </div>
          </div>

          {/* Iniciar chamada */}
          <button
            type="button"
            onClick={() => setShowAttendanceModal(true)}
            disabled={isReadOnly || activeStudents.length === 0}
            className="w-full min-h-[64px] rounded-3xl bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-300 text-white font-extrabold text-lg flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.98] transition-all"
          >
            <Play size={22} fill="white" /> {submitted ? 'Refazer a chamada' : 'Fazer a chamada'}
          </button>

          {submitted && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">Presentes</span>
                <p className="text-4xl font-extrabold text-emerald-800">{presentCount}</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
                <span className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider">Faltas</span>
                <p className="text-4xl font-extrabold text-rose-800">{absentCount}</p>
              </div>
            </div>
          )}

          {/* Lista de alunos */}
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-extrabold text-base text-gray-900">Alunos ({activeStudents.length})</h4>
                <p className="text-xs text-gray-500 font-medium">Toque no aluno para ver o histórico</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudent(true)}
                className="min-h-[44px] flex items-center gap-1.5 text-sm font-extrabold bg-accentMint/10 text-accentMint px-4 rounded-full active:bg-accentMint/25 shrink-0"
              >
                <UserPlus size={17} /> Novo aluno
              </button>
            </div>

            {activeStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed text-sm font-bold">
                Nenhum aluno ativo nesta escola.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeStudents.map((student) => {
                  const streak = student.consecutiveAbsences || 0;
                  const hasAlert = streak >= 2;
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center gap-2 p-2 pl-3 rounded-2xl border ${
                        hasAlert ? 'bg-amber-50 border-amber-300' : 'bg-gray-50/60 border-gray-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => openStudentHistoryModal(student.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 min-h-[56px] text-left"
                      >
                        <span
                          className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 ${
                            student.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                          }`}
                        >
                          {initials(student.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-bold text-gray-900 leading-tight truncate">{student.name}</span>
                          <span className="block text-xs text-gray-500 font-medium">
                            {student.age} anos · {student.gender === 'M' ? 'Menino' : 'Menina'} · {student.presenceRate ?? 100}%
                          </span>
                          {hasAlert && (
                            <span
                              className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                                streak >= 3 ? 'bg-rose-600 text-white' : 'bg-amber-400 text-amber-950'
                              }`}
                            >
                              <AlertTriangle size={11} /> {streak >= 3 ? 'Risco de evasão' : `${streak} faltas seguidas`}
                            </span>
                          )}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDropoutTarget(student)}
                        disabled={isReadOnly}
                        aria-label={`Registrar desistência de ${student.name}`}
                        className="h-12 w-12 rounded-full text-rose-600 bg-rose-50 active:bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 disabled:opacity-40"
                      >
                        <UserX size={19} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Lista em papel */
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setShowExternalImageModal(true)}
            className="w-full rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50/60 active:bg-gray-100 p-5 flex flex-col items-center gap-2 min-h-[140px] justify-center"
          >
            {externalPhoto ? (
              <img src={externalPhoto} alt="Lista em papel" className="max-h-48 rounded-2xl border shadow-sm" />
            ) : (
              <span className="h-16 w-16 rounded-full bg-charcoal text-white flex items-center justify-center shadow-lg">
                <Camera size={30} />
              </span>
            )}
            <span className="text-base font-extrabold text-gray-900">
              {externalPhoto ? 'Tirar outra foto da lista' : 'Fotografar a lista em papel'}
            </span>
            <span className="text-xs text-gray-500 font-medium">Foto da folha com as assinaturas</span>
          </button>

          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
            <Stepper label="Total de presentes" value={externalPresent} onChange={setExternalPresent} tone="green" />
            <Stepper label="Total de faltas" value={externalAbsent} onChange={setExternalAbsent} tone="red" />
          </div>

          <button
            type="button"
            onClick={handleSubmitAttendance}
            disabled={loading || submitted || !externalPhoto}
            className={`w-full min-h-[56px] rounded-full font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
              submitted
                ? 'bg-emerald-600 text-white'
                : !externalPhoto
                ? 'bg-gray-200 text-gray-400 shadow-none'
                : 'bg-charcoal text-white active:scale-[0.98]'
            }`}
          >
            {submitted ? (
              <>
                <CheckCircle2 size={22} /> Lista enviada!
              </>
            ) : loading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Enviando…
              </>
            ) : (
              'Enviar lista em papel'
            )}
          </button>
        </div>
      )}

      {/* CHAMADA — tela cheia no celular */}
      <BottomSheet
        open={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        full
        title={`Chamada · ${category}`}
        subtitle="Toque no aluno para marcar presente ou ausente"
        footer={
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 py-2">
                <span className="text-2xl font-extrabold text-emerald-800 leading-none">{presentCount}</span>
                <span className="block text-[11px] font-extrabold text-emerald-700 uppercase">Presentes</span>
              </div>
              <div className="rounded-2xl bg-rose-50 border border-rose-200 py-2">
                <span className="text-2xl font-extrabold text-rose-800 leading-none">{absentCount}</span>
                <span className="block text-[11px] font-extrabold text-rose-700 uppercase">Ausentes</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSubmitAttendance}
              disabled={loading}
              className="w-full min-h-[56px] rounded-full font-extrabold text-base bg-charcoal text-white shadow-xl active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <Check size={20} /> Finalizar e enviar chamada
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="flex-1 min-h-[46px] rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-extrabold active:bg-emerald-100"
          >
            Todos presentes
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="flex-1 min-h-[46px] rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-sm font-extrabold active:bg-rose-100"
          >
            Todos ausentes
          </button>
        </div>

        <div className="space-y-2">
          {activeStudents.map((student) => {
            const isPresent = !!attendance[student.id];
            const streak = student.consecutiveAbsences || 0;
            return (
              <button
                key={student.id}
                type="button"
                role="switch"
                aria-checked={isPresent}
                aria-label={`${student.name}: ${isPresent ? 'presente' : 'ausente'}`}
                onClick={() => setStudentPresence(student.id, !isPresent)}
                className={`w-full min-h-[68px] flex items-center gap-3 px-3 py-2 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                  isPresent ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'
                }`}
              >
                <span
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 ${
                    student.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                  }`}
                >
                  {initials(student.name)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-[15px] text-gray-900 leading-tight truncate">{student.name}</span>
                  {streak >= 2 && (
                    <span className="inline-block mt-0.5 text-[11px] font-extrabold text-amber-900 bg-amber-300 px-1.5 py-0.5 rounded">
                      ⚠️ {streak} faltas seguidas
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 min-w-[96px] h-11 rounded-xl flex items-center justify-center gap-1 text-sm font-extrabold ${
                    isPresent ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {isPresent ? (
                    <>
                      <Check size={17} /> Presente
                    </>
                  ) : (
                    <>
                      <X size={17} /> Ausente
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* HISTÓRICO DO ALUNO */}
      <BottomSheet
        open={!!selectedStudentHistory}
        onClose={() => setSelectedStudentHistory(null)}
        title={selectedStudentHistory?.student?.name || 'Aluno'}
        subtitle={
          selectedStudentHistory?.student
            ? `${selectedStudentHistory.student.age} anos · ${selectedStudentHistory.student.gender === 'M' ? 'Menino' : 'Menina'}`
            : undefined
        }
        footer={
          <button
            type="button"
            onClick={() => setSelectedStudentHistory(null)}
            className="w-full min-h-[52px] rounded-full font-extrabold text-sm bg-gray-100 text-gray-800 active:bg-gray-200"
          >
            Fechar
          </button>
        }
      >
        {selectedStudentHistory && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase block">Frequência</span>
                <p className="text-2xl font-extrabold text-emerald-900">{selectedStudentHistory.stats?.presenceRate}%</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-extrabold text-amber-800 uppercase block">Seguidas</span>
                <p className="text-2xl font-extrabold text-amber-900">{selectedStudentHistory.stats?.consecutiveAbsences}</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-extrabold text-indigo-700 uppercase block">P / F</span>
                <p className="text-xl font-extrabold text-indigo-900 mt-1">
                  {selectedStudentHistory.stats?.totalPresence} / {selectedStudentHistory.stats?.totalAbsence}
                </p>
              </div>
            </div>

            <h4 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-accentMint" /> Histórico de presenças
            </h4>
            {loadingHistory ? (
              <p className="text-sm text-gray-400 text-center py-4">Carregando…</p>
            ) : !selectedStudentHistory.timeline || selectedStudentHistory.timeline.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-4 text-center">Sem encontros registrados.</p>
            ) : (
              <div className="space-y-2">
                {selectedStudentHistory.timeline.map((item: any) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-sm font-bold ${
                      item.isPresent ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="min-w-0">
                      <span>
                        {new Date(item.date).toLocaleDateString('pt-BR')} · {item.category}
                      </span>
                      {item.justification && <p className="text-xs font-medium text-gray-500">{item.justification}</p>}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold shrink-0 ${
                        item.isPresent ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {item.isPresent ? 'Presente' : 'Falta'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* CONFIRMAR DESISTÊNCIA */}
      <BottomSheet
        open={!!dropoutTarget}
        onClose={() => setDropoutTarget(null)}
        title="Registrar desistência?"
        subtitle={dropoutTarget?.name}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDropoutTarget(null)}
              className="min-h-[52px] rounded-full font-extrabold text-sm bg-gray-100 text-gray-800 active:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDropout}
              className="min-h-[52px] rounded-full font-extrabold text-sm bg-rose-600 text-white active:bg-rose-700"
            >
              Confirmar
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 font-medium">
          O aluno deixa de aparecer na chamada e as métricas anteriores ficam congeladas na data de hoje.
        </p>
      </BottomSheet>

      {/* NOVO ALUNO */}
      <BottomSheet
        open={showAddStudent}
        onClose={() => setShowAddStudent(false)}
        title="Novo aluno"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowAddStudent(false)}
              className="min-h-[52px] rounded-full font-extrabold text-sm bg-gray-100 text-gray-800 active:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-novo-aluno"
              disabled={!newStudentName.trim()}
              className="min-h-[52px] rounded-full font-extrabold text-sm bg-accentMint text-white disabled:bg-gray-300 active:opacity-90"
            >
              Cadastrar
            </button>
          </div>
        }
      >
        <form id="form-novo-aluno" onSubmit={handleAddStudent} className="space-y-5">
          <div>
            <label htmlFor="novo-aluno-nome" className="block text-xs font-extrabold text-gray-700 mb-1.5">
              Nome completo
            </label>
            <input
              id="novo-aluno-nome"
              type="text"
              required
              autoComplete="off"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="Nome do aluno"
              className="w-full h-14 px-4 rounded-2xl border-2 text-base font-medium focus:border-accentMint focus:outline-none"
            />
          </div>

          <div>
            <span className="block text-xs font-extrabold text-gray-700 mb-1.5">Sexo</span>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['M', 'Menino', 'bg-blue-600'],
                  ['F', 'Menina', 'bg-pink-600'],
                ] as const
              ).map(([key, label, color]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={newStudentGender === key}
                  onClick={() => setNewStudentGender(key)}
                  className={`min-h-[56px] rounded-2xl font-extrabold text-base border-2 transition ${
                    newStudentGender === key ? `${color} text-white border-transparent shadow-md` : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-extrabold text-gray-700 mb-1.5">Idade</span>
            <div className="flex items-center rounded-2xl border-2 overflow-hidden">
              <button
                type="button"
                aria-label="Diminuir idade"
                onClick={() => setNewStudentAge((a) => Math.max(4, a - 1))}
                className="h-14 w-16 flex items-center justify-center active:bg-gray-100 shrink-0"
              >
                <Minus size={22} />
              </button>
              <span className="flex-1 text-center text-2xl font-extrabold">{newStudentAge} anos</span>
              <button
                type="button"
                aria-label="Aumentar idade"
                onClick={() => setNewStudentAge((a) => Math.min(99, a + 1))}
                className="h-14 w-16 flex items-center justify-center active:bg-gray-100 shrink-0"
              >
                <Plus size={22} />
              </button>
            </div>
          </div>
        </form>
      </BottomSheet>

      {/* Câmera (somente câmera, sem galeria) */}
      <ImageCaptureModal
        isOpen={showExternalImageModal}
        onClose={() => setShowExternalImageModal(false)}
        onCapture={handleExternalPhotoCaptured}
        title="Foto da lista em papel"
      />
    </div>
  );
};
