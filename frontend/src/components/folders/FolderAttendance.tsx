import React, { useState, useEffect } from 'react';
import { UserCheck, Upload, UserPlus, CheckCircle2, UserX, Play, X } from 'lucide-react';
import { api, isOnline } from '../../lib/api';
import { db } from '../../lib/db';
import { compressPhoto } from '../../lib/imageUtils';
import { ImageCaptureModal } from '../common/ImageCaptureModal';

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
}

export const FolderAttendance: React.FC<FolderAttendanceProps> = ({ schoolId, onComplete, isReadOnly = false }) => {
  const [submodule, setSubmodule] = useState<'MANUAL' | 'EXTERNAL'>('MANUAL');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Dedicated Attendance Modal state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  // Submodule B state
  const [externalPhoto, setExternalPhoto] = useState<string | null>(null);
  const [externalPresent, setExternalPresent] = useState<number>(0);
  const [externalAbsent, setExternalAbsent] = useState<number>(0);
  const [showExternalImageModal, setShowExternalImageModal] = useState(false);

  // New Student modal
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentAge, setNewStudentAge] = useState<number>(10);
  const [newStudentGender, setNewStudentGender] = useState<'M' | 'F'>('M');

  useEffect(() => {
    fetchStudents();
  }, [schoolId]);

  const fetchStudents = async () => {
    try {
      if (isOnline()) {
        const res = await api.get(`/students/school/${schoolId}`);
        setStudents(res.data);
        const initialMap: Record<string, boolean> = {};
        res.data.forEach((s: Student) => {
          if (s.status === 'ACTIVE') {
            initialMap[s.id] = true; // Default to present when opening session
          }
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
        }));
        setStudents(mapped);
        const initialMap: Record<string, boolean> = {};
        mapped.forEach((s) => {
          if (s.status === 'ACTIVE') {
            initialMap[s.id] = true;
          }
        });
        setAttendance(initialMap);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const setStudentPresence = (studentId: string, isPresent: boolean) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: isPresent,
    }));
  };

  const activeStudents = students.filter((s) => s.status === 'ACTIVE');
  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = activeStudents.length - presentCount;

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName) return;

    try {
      if (isOnline()) {
        const res = await api.post('/students', {
          name: newStudentName,
          age: newStudentAge,
          gender: newStudentGender,
          schoolId,
        });
        setStudents((prev) => [...prev, res.data]);
        setAttendance((prev) => ({ ...prev, [res.data.id]: true }));
      } else {
        const id = await db.offlineStudents.add({
          schoolId,
          name: newStudentName,
          age: newStudentAge,
          gender: newStudentGender,
          status: 'ACTIVE',
          synced: false,
        });
        const newObj: Student = {
          id: `temp_${id}`,
          name: newStudentName,
          age: newStudentAge,
          gender: newStudentGender,
          status: 'ACTIVE',
        };
        setStudents((prev) => [...prev, newObj]);
        setAttendance((prev) => ({ ...prev, [newObj.id]: true }));
      }
      setNewStudentName('');
      setShowAddStudent(false);
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const handleMarkDropout = async (studentId: string) => {
    if (!confirm('Deseja marcar a desistência deste aluno? As métricas anteriores serão congeladas na data atual.')) return;

    try {
      if (isOnline()) {
        await api.patch(`/students/${studentId}/dropout`, { dropoutDate: new Date() });
      }
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: 'DROPOUT', dropoutDate: new Date().toISOString() } : s))
      );
    } catch (error) {
      console.error('Error marking dropout:', error);
    }
  };

  const handleExternalPhotoCaptured = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const compressed = await compressPhoto(file);
    setExternalPhoto(compressed);
  };

  const handleSubmitAttendance = async () => {
    setLoading(true);
    try {
      const payload = {
        date: new Date().toISOString(),
        schoolId,
        type: submodule,
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
    } catch (error) {
      console.error('Error submitting attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-b-bento-lg space-y-6">
      {/* Submodule selector tabs */}
      <div className="flex bg-gray-100 p-1.5 rounded-full max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setSubmodule('MANUAL')}
          className={`flex-1 py-2.5 px-4 text-sm font-extrabold rounded-full transition-all ${
            submodule === 'MANUAL'
              ? 'bg-accentMint text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Chamada no App
        </button>
        <button
          type="button"
          onClick={() => setSubmodule('EXTERNAL')}
          className={`flex-1 py-2.5 px-4 text-sm font-extrabold rounded-full transition-all ${
            submodule === 'EXTERNAL'
              ? 'bg-accentMint text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Anexar Lista Externa
        </button>
      </div>

      {submodule === 'MANUAL' ? (
        <div className="space-y-6">
          {/* Action Header & Primary Start Attendance Button */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <UserCheck size={26} className="text-emerald-700" />
              <h3 className="text-lg font-extrabold text-emerald-950">Chamada Diária dos Alunos</h3>
            </div>
            <p className="text-xs text-emerald-800 font-medium max-w-md mx-auto">
              Clique em &quot;Iniciar Chamada&quot; para abrir a conferência nominal de presença.
            </p>

            <button
              type="button"
              onClick={() => setShowAttendanceModal(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 mx-auto shadow-lg active:scale-95 transition-all"
            >
              <Play size={18} fill="white" /> Iniciar Chamada
            </button>
          </div>

          {/* Consolidated Summary (Rendered after submitted or when active) */}
          {submitted && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Presentes</span>
                <p className="text-3xl font-extrabold text-emerald-800">{presentCount}</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Total Faltas</span>
                <p className="text-3xl font-extrabold text-rose-800">{absentCount}</p>
              </div>
            </div>
          )}

          {/* Student List View (Focusing on Dropout Action) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-base text-gray-900">
                  Alunos Cadastrados ({activeStudents.length})
                </h4>
                <p className="text-[11px] text-gray-500 font-medium">
                  Gerenciamento de matriculados e descontinuidade
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudent(true)}
                className="flex items-center gap-1.5 text-xs font-bold bg-accentMint/10 text-accentMint px-3.5 py-2 rounded-full hover:bg-accentMint/20 transition shadow-sm"
              >
                <UserPlus size={14} /> Novo Aluno
              </button>
            </div>

            {activeStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed text-xs font-bold">
                Nenhum aluno ativo nesta escola.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {activeStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl border bg-gray-50/50 hover:bg-white transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm ${
                          student.gender === 'M'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-pink-100 text-pink-700'
                        }`}
                      >
                        {student.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{student.name}</p>
                        <span className="text-xs text-gray-500 font-medium">
                          {student.age} anos • {student.gender === 'M' ? 'Masculino' : 'Feminino'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMarkDropout(student.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition border border-rose-200"
                      title="Registrar Desistência"
                    >
                      <UserX size={14} /> Registrar Desistência
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Submodule B: External List Upload */
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-3xl p-6 text-center hover:border-accentMint transition bg-gray-50/50">
            <Upload size={36} className="mx-auto text-accentMint mb-2" />
            <p className="text-sm font-bold text-gray-700">Foto da Folha Física ou PDF</p>
            <p className="text-xs text-gray-500 mb-4">Anexe a imagem da lista física com assinaturas</p>

            <button
              type="button"
              onClick={() => setShowExternalImageModal(true)}
              className="inline-block bg-charcoal text-white text-xs font-extrabold px-6 py-3 rounded-full cursor-pointer hover:bg-black shadow-md transition"
            >
              Anexar Foto da Lista
            </button>

            {externalPhoto && (
              <div className="mt-4">
                <img
                  src={externalPhoto}
                  alt="Lista física"
                  className="max-h-48 mx-auto rounded-2xl border shadow-sm"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Total de Presentes</label>
              <input
                type="number"
                min="0"
                value={externalPresent}
                onChange={(e) => setExternalPresent(parseInt(e.target.value, 10) || 0)}
                className="w-full p-3 rounded-2xl border font-bold text-lg text-emerald-800 bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Total de Faltas</label>
              <input
                type="number"
                min="0"
                value={externalAbsent}
                onChange={(e) => setExternalAbsent(parseInt(e.target.value, 10) || 0)}
                className="w-full p-3 rounded-2xl border font-bold text-lg text-rose-800 bg-rose-50/40 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmitAttendance}
            disabled={loading || submitted || !externalPhoto}
            className={`w-full py-4 rounded-full font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
              submitted
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-charcoal text-white hover:bg-black active:scale-[0.99]'
            }`}
          >
            {submitted ? (
              <>
                <CheckCircle2 size={20} /> Lista Externa Finalizada!
              </>
            ) : (
              'Finalizar Chamada Externa'
            )}
          </button>
        </div>
      )}

      {/* DEDICATED ATTENDANCE CONFERENCE MODAL */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-md w-full space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Conferência de Chamada</h3>
                <p className="text-xs text-gray-500 font-medium">
                  Selecione o estado de cada aluno e clique em Enviar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nominal Student Attendance List */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {activeStudents.map((student) => {
                const isPresent = !!attendance[student.id];
                return (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isPresent
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-rose-50/60 border-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs ${
                          student.gender === 'M'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-pink-100 text-pink-700'
                        }`}
                      >
                        {student.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm text-gray-900">{student.name}</span>
                    </div>

                    {/* Tactile Presence Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStudentPresence(student.id, true)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all active:scale-95 ${
                          isPresent
                            ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600'
                            : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700'
                        }`}
                      >
                        ✓ Verde: Presente
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentPresence(student.id, false)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all active:scale-95 ${
                          !isPresent
                            ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-600'
                            : 'bg-gray-100 text-gray-500 hover:bg-rose-100 hover:text-rose-700'
                        }`}
                      >
                        ✕ Vermelho: Ausente
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Submit Button */}
            <div className="border-t pt-4 shrink-0">
              <button
                type="button"
                onClick={handleSubmitAttendance}
                disabled={loading}
                className="w-full py-4 rounded-full font-extrabold text-sm bg-charcoal text-white hover:bg-black transition shadow-xl active:scale-[0.99]"
              >
                {loading ? 'Enviando Chamada...' : 'Enviar Chamada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Image Capture Modal for External List */}
      <ImageCaptureModal
        isOpen={showExternalImageModal}
        onClose={() => setShowExternalImageModal(false)}
        onCapture={handleExternalPhotoCaptured}
        title="Anexar Foto da Lista Externa"
      />

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-extrabold text-gray-900">Novo Aluno</h3>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Nome do aluno"
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-accentMint focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Idade</label>
                  <input
                    type="number"
                    min="4"
                    max="99"
                    required
                    value={newStudentAge}
                    onChange={(e) => setNewStudentAge(parseInt(e.target.value, 10))}
                    className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-accentMint focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Sexo</label>
                  <select
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value as 'M' | 'F')}
                    className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-accentMint focus:outline-none"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="flex-1 py-3 rounded-full text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full text-xs font-bold text-white bg-accentMint hover:bg-accentSage"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
