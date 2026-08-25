import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Camera, Calendar, FileText, CheckCircle2, ChevronDown, Lock, Play, LogOut, AlertCircle } from 'lucide-react';
import { FolderAttendance } from './FolderAttendance';
import { FolderRehearsalPhotos } from './FolderRehearsalPhotos';
import { FolderEvents } from './FolderEvents';
import { FolderMonthlyReport } from './FolderMonthlyReport';
import { api, isOnline } from '../../lib/api';

interface StackedFoldersProps {
  schoolId: string;
  schoolName: string;
  onBackToSchools: () => void;
}

export const StackedFolders: React.FC<StackedFoldersProps> = ({ schoolId, schoolName, onBackToSchools }) => {
  const [activeFolder, setActiveFolder] = useState<number | null>(null);

  // Visit Lifecycle State
  const [isVisitStarted, setIsVisitStarted] = useState(false);
  const [isVisitCompleted, setIsVisitCompleted] = useState(false);
  const [lastVisitEndTime, setLastVisitEndTime] = useState<number | null>(null);

  // Folder completion status
  const [attendanceDone, setAttendanceDone] = useState(false);
  const [photosDone, setPhotosDone] = useState(false);

  useEffect(() => {
    const storedStart = localStorage.getItem(`visit_started_${schoolId}`);
    const storedCompleted = localStorage.getItem(`visit_completed_${schoolId}`);
    const storedEnd = localStorage.getItem(`visit_ended_time_${schoolId}`);

    if (storedEnd) {
      const time = new Date(storedEnd).getTime();
      if (!isNaN(time)) setLastVisitEndTime(time);
    }

    if (storedCompleted === 'true') {
      setIsVisitCompleted(true);
      setIsVisitStarted(true);
    } else if (storedStart) {
      setIsVisitStarted(true);
      setActiveFolder(1); // Open first unlocked module by default
    }
  }, [schoolId]);

  const isCoolDown = lastVisitEndTime ? Date.now() - lastVisitEndTime < 24 * 60 * 60 * 1000 : false;
  const hoursRemaining = lastVisitEndTime
    ? Math.max(1, Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - lastVisitEndTime)) / (1000 * 60 * 60)))
    : 0;

  const handleStartVisit = () => {
    if (isCoolDown) {
      alert(`Visita bloqueada por 24h. Disponível novamente em ~${hoursRemaining} horas.`);
      return;
    }
    setIsVisitStarted(true);
    localStorage.setItem(`visit_started_${schoolId}`, new Date().toISOString());
    setActiveFolder(1); // Open Chamada e Frequência
  };

  const handleEndVisit = async () => {
    if (progressPercent < 100) return;

    if (confirm('Deseja encerrar a visita para esta escola? Os dados serão consolidados e o bloqueio de 24h será ativado.')) {
      const nowIso = new Date().toISOString();
      setIsVisitCompleted(true);
      setLastVisitEndTime(Date.now());
      localStorage.setItem(`visit_completed_${schoolId}`, 'true');
      localStorage.setItem(`visit_ended_time_${schoolId}`, nowIso);
      try {
        if (isOnline()) {
          await api.post(`/schools/${schoolId}/end-visit`);
        }
      } catch (err) {
        console.error('Error in end-visit API call:', err);
      }
      onBackToSchools();
    }
  };

  // Daily Progress percentage
  const totalTasks = 2; // Attendance + Photos mandatory
  const completedCount = (attendanceDone ? 1 : 0) + (photosDone ? 1 : 0);
  const progressPercent = Math.round((completedCount / totalTasks) * 100);

  const toggleFolder = (index: number, isLocked: boolean) => {
    if (isLocked && !isCoolDown) {
      alert('Módulo bloqueado! Clique em "Iniciar Visita" para liberar a chamada e fotos.');
      return;
    }
    setActiveFolder((prev) => (prev === index ? null : index));
  };

  const FOLDERS = [
    {
      id: 1,
      title: 'Chamada e Frequência',
      bgColor: '#3D8A7E',
      textColor: '#FFFFFF',
      icon: <UserCheck size={22} />,
      isLocked: !isVisitStarted && !isCoolDown,
      isCompleted: attendanceDone,
      component: (
        <FolderAttendance
          schoolId={schoolId}
          onComplete={(status) => setAttendanceDone(status)}
          isReadOnly={isCoolDown}
        />
      ),
    },
    {
      id: 2,
      title: 'Fotos de Ensaios',
      bgColor: '#FFB074',
      textColor: '#1E1E24',
      icon: <Camera size={22} />,
      isLocked: !isVisitStarted && !isCoolDown,
      isCompleted: photosDone,
      component: (
        <FolderRehearsalPhotos
          schoolId={schoolId}
          onComplete={(status) => setPhotosDone(status)}
          isReadOnly={isCoolDown}
        />
      ),
    },
    {
      id: 3,
      title: 'Eventos e Apresentações',
      bgColor: '#8F94FB',
      textColor: '#FFFFFF',
      icon: <Calendar size={22} />,
      isLocked: false,
      isCompleted: false,
      component: <FolderEvents schoolId={schoolId} />, // Editable even during cool-down!
    },
    {
      id: 4,
      title: 'Relatório Mensal',
      bgColor: '#FFD166',
      textColor: '#1E1E24',
      icon: <FileText size={22} />,
      isLocked: false,
      isCompleted: false,
      component: (
        <FolderMonthlyReport
          schoolId={schoolId}
          onComplete={() => {}}
          isReadOnly={isCoolDown}
        />
      ),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Header & Visit Control Card */}
      <div className="bento-card p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToSchools}
            className="text-xs font-extrabold px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition flex items-center gap-1"
          >
            ← Voltar para Escolas
          </button>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contexto da Visita</span>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{schoolName}</h2>
          <p className="text-xs text-gray-500 font-medium">
            {isCoolDown
              ? `Visita encerrada. Período de bloqueio de 24h ativo (Liberado em ~${hoursRemaining}h). Histórico em modo de leitura.`
              : isVisitCompleted
              ? 'Visita do dia encerrada e salva com sucesso.'
              : isVisitStarted
              ? 'Visita em andamento. Conclua os módulos obrigatórios (100%) para liberar o encerramento.'
              : 'Clique em "Iniciar Visita" para liberar os módulos de chamada e fotos.'}
          </p>
        </div>

        {/* VISIT LIFECYCLE ACTION BANNER */}
        {isCoolDown ? (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-amber-950">Bloqueio de 24h Ativo</h4>
                <p className="text-xs text-amber-800">
                  Novas chamadas e envio de fotos estarão disponíveis em ~{hoursRemaining} horas. O módulo de Eventos permanece editável.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="px-5 py-2.5 rounded-full bg-gray-200 text-gray-500 font-extrabold text-xs cursor-not-allowed border border-gray-300 shrink-0"
            >
              Bloqueado ({hoursRemaining}h)
            </button>
          </div>
        ) : isVisitCompleted ? (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-emerald-950">Visita Concluída</h4>
                <p className="text-xs text-emerald-800">Atendimento do dia finalizado (100% de progresso atingido).</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onBackToSchools}
              className="px-5 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition"
            >
              Ir ao Hub
            </button>
          </div>
        ) : !isVisitStarted ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-amber-900">Visita Não Iniciada</h4>
                <p className="text-xs text-amber-700">Módulos de Chamada e Fotos temporariamente bloqueados.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartVisit}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 shrink-0"
            >
              <Play size={16} fill="white" /> Iniciar Visita
            </button>
          </div>
        ) : (
          /* ACTIVE VISIT STATUS & PROGRESS + TRAVA DE SEGURANÇA NO BOTÃO ENCERRAR */
          <div className="space-y-4 pt-1 border-t">
            {/* Daily Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Progressão da Visita
                </span>
                <span className={progressPercent === 100 ? 'text-emerald-700 font-extrabold' : 'text-accentMint'}>
                  {progressPercent}% Concluído
                </span>
              </div>
              <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border">
                <div
                  className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                    progressPercent === 100 ? 'bg-emerald-600' : 'bg-accentMint'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Encerrar Visita Button with 100% Lock Criteria */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                {progressPercent < 100 ? (
                  <>
                    <AlertCircle size={15} className="text-amber-600 shrink-0" />
                    <span>Progresso em {progressPercent}%. Complete a chamada e fotos para liberar o encerramento.</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="text-emerald-800 font-bold">100% de progresso atingido! Você pode encerrar a visita.</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleEndVisit}
                disabled={progressPercent < 100}
                className={`w-full sm:w-auto px-6 py-3 rounded-full font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-md shrink-0 ${
                  progressPercent < 100
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg active:scale-95 cursor-pointer'
                }`}
                title={progressPercent < 100 ? 'Requer 100% de progresso para encerrar' : 'Encerrar visita'}
              >
                <LogOut size={16} /> Encerrar Visita
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stacked Vertical Folders */}
      <div className="space-y-3">
        {FOLDERS.map((folder) => {
          const isOpen = activeFolder === folder.id;
          const isLocked = folder.isLocked;

          return (
            <div
              key={folder.id}
              className={`rounded-bento-lg overflow-hidden shadow-bento transition-all duration-300 ${
                isLocked ? 'opacity-65 grayscale-[40%]' : ''
              }`}
            >
              {/* Folder Header / Tab */}
              <div
                onClick={() => toggleFolder(folder.id, isLocked)}
                style={{
                  backgroundColor: isLocked ? '#E5E7EB' : folder.bgColor,
                  color: isLocked ? '#6B7280' : folder.textColor,
                }}
                className={`folder-header p-5 flex items-center justify-between cursor-pointer ${
                  isLocked ? 'cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-black/10 backdrop-blur-sm shrink-0">
                    {isLocked ? <Lock size={22} className="text-gray-500" /> : folder.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                      {folder.title}
                      {isLocked && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gray-300 text-gray-700">
                          Bloqueado
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!isLocked && folder.isCompleted && (
                    <span className="flex items-center gap-1 text-xs font-extrabold bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                      <CheckCircle2 size={14} /> Concluído
                    </span>
                  )}
                  {!isLocked && (
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={22} />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Folder Body Accordion */}
              <AnimatePresence initial={false}>
                {!isLocked && isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    {folder.component}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
