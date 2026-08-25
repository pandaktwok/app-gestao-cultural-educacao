'use client';

import React, { useState, useEffect } from 'react';
import { School, LogOut, Key, Shield, User, Wifi, WifiOff } from 'lucide-react';
import { api, isOnline } from '../lib/api';
import { BentoCard } from '../components/bento/BentoCard';
import { StackedFolders } from '../components/folders/StackedFolders';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { EventNotificationBanner } from '../components/common/EventNotificationBanner';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER';
  mustChangePassword: boolean;
  avatarColor: string;
  initialAvatar: string;
}

interface SchoolItem {
  id: string;
  name: string;
  boardName?: string;
  themeColor: string;
  initialAvatar: string;
  _count?: { students: number };
}

export default function HomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(true);

  // Mandatory First Access Reset
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Teacher session state
  const [teacherSchools, setTeacherSchools] = useState<SchoolItem[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolItem | null>(null);
  const [pendingFeedbackReports, setPendingFeedbackReports] = useState<any[]>([]);

  useEffect(() => {
    // Online/Offline detection
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Restore stored user session
    const savedUser = localStorage.getItem('cultural_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        if (parsed.mustChangePassword) {
          setShowPasswordReset(true);
        } else if (parsed.role === 'TEACHER') {
          fetchTeacherSchools();
          fetchPendingFeedback();
        }
      } catch (err) {
        console.error(err);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchTeacherSchools = async () => {
    try {
      if (isOnline()) {
        const res = await api.get('/schools');
        setTeacherSchools(res.data);
      }
    } catch (err) {
      console.error('Error fetching teacher schools:', err);
    }
  };

  const fetchPendingFeedback = async () => {
    try {
      if (isOnline()) {
        const res = await api.get('/reports/monthly/pending-feedback');
        if (Array.isArray(res.data)) {
          setPendingFeedbackReports(res.data);
        }
      }
    } catch (err) {
      console.error('Error fetching pending feedback:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user: loggedUser } = res.data;

      localStorage.setItem('cultural_token', token);
      localStorage.setItem('cultural_user', JSON.stringify(loggedUser));
      setUser(loggedUser);

      if (loggedUser.mustChangePassword) {
        setShowPasswordReset(true);
      } else if (loggedUser.role === 'TEACHER') {
        fetchTeacherSchools();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', { newPassword });
      const updated = { ...user!, mustChangePassword: false };
      setUser(updated);
      localStorage.setItem('cultural_user', JSON.stringify(updated));
      setShowPasswordReset(false);

      if (updated.role === 'TEACHER') {
        fetchTeacherSchools();
      }
      alert('Senha alterada com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cultural_token');
    localStorage.removeItem('cultural_user');
    setUser(null);
    setSelectedSchool(null);
  };

  // Login Screen
  if (!user) {
    return (
      <main className="min-h-screen bg-bgLight flex items-center justify-center p-4">
        <div className="max-w-md w-full bento-card p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-charcoal text-white flex items-center justify-center mx-auto shadow-xl font-extrabold text-2xl">
              GC
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Gestão Cultural & Prestação de Contas</h1>
            <p className="text-xs text-gray-500 font-medium">Acesse sua conta para registrar presenças e fotos dos projetos.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@projeto.org"
                className="w-full p-3.5 rounded-2xl border text-sm font-medium focus:ring-2 focus:ring-charcoal focus:outline-none bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3.5 rounded-2xl border text-sm font-medium focus:ring-2 focus:ring-charcoal focus:outline-none bg-gray-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full font-extrabold text-sm bg-charcoal text-white hover:bg-black transition shadow-lg active:scale-[0.99]"
            >
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="text-center border-t pt-4">
            <p className="text-[11px] text-gray-400 font-bold">
              Primeiro Acesso Administrador: <br />
              <code className="text-gray-700">admin@projeto.org</code> / <code className="text-gray-700">admin123</code>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-bgLight">
      {/* Top Bar Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: user.avatarColor }}
              className="w-10 h-10 rounded-full text-white font-extrabold flex items-center justify-center text-sm shadow-md"
            >
              {user.initialAvatar}
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-gray-900 leading-tight">{user.name}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {user.role === 'ADMIN' ? 'Diretoria / Admin' : 'Professor de Campo'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full ${
                onlineStatus ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {onlineStatus ? <Wifi size={12} /> : <WifiOff size={12} />}
              {onlineStatus ? 'Online' : 'Offline (Local-First)'}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Upcoming Event Quick Notification Banner */}
      <EventNotificationBanner activeSchoolId={selectedSchool?.id} />

      {/* Yellow Revision Banner for Admin Pendencies */}
      {user.role === 'TEACHER' && pendingFeedbackReports.length > 0 && (
        <div className="bg-amber-400 text-amber-950 px-4 py-3 border-b border-amber-500 shadow-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            {pendingFeedbackReports.map((report) => (
              <div key={report.id} className="flex items-center gap-2.5 text-xs font-bold flex-wrap">
                <span className="px-2 py-0.5 bg-amber-500 text-amber-950 rounded-full font-extrabold">⚠️ Revisão Necessária</span>
                <span>
                  Seu relatório de <strong>{report.monthYear}</strong> ({report.school?.name || 'Escola'}) possui itens questionados pela diretoria.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const target = teacherSchools.find((s) => s.id === report.schoolId);
                    if (target) setSelectedSchool(target);
                  }}
                  className="px-3 py-1 bg-amber-950 text-amber-100 rounded-full font-extrabold hover:bg-black transition shadow-sm text-[11px]"
                >
                  Clique aqui para revisar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        {user.role === 'ADMIN' ? (
          <AdminDashboard />
        ) : selectedSchool ? (
          <StackedFolders
            schoolId={selectedSchool.id}
            schoolName={selectedSchool.name}
            onBackToSchools={() => setSelectedSchool(null)}
          />
        ) : (
          /* Teacher Hub of School Cards */
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Suas Escolas Parceiras</h1>
              <p className="text-xs text-gray-500 font-medium">Selecione uma escola para abrir a sessão pedagógica do dia.</p>
            </div>

            {teacherSchools.length === 0 ? (
              <div className="bento-card p-12 text-center text-gray-400 space-y-2">
                <School size={40} className="mx-auto text-gray-300" />
                <h3 className="font-extrabold text-base text-gray-700">Nenhuma escola vinculada ao seu perfil</h3>
                <p className="text-xs text-gray-500">Solicite à Diretoria/Administração o vínculo com sua escola parceira.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teacherSchools.map((school) => {
                  const isCompleted = typeof window !== 'undefined' && localStorage.getItem(`visit_completed_${school.id}`) === 'true';
                  const isStarted = typeof window !== 'undefined' && localStorage.getItem(`visit_started_${school.id}`) && !isCompleted;

                  return (
                    <BentoCard
                      key={school.id}
                      title={school.name}
                      subtitle={school.boardName || 'Diretoria Regional'}
                      badge={
                        isCompleted
                          ? '🟩 Visita Concluída'
                          : isStarted
                          ? '🟡 Em Atendimento'
                          : `${school._count?.students || 0} alunos`
                      }
                      bgColor={school.themeColor}
                      textColor="#FFFFFF"
                      onClick={() => setSelectedSchool(school)}
                    >
                      <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-xs font-bold">
                        <span>{isCompleted ? 'Ver Dados da Visita' : isStarted ? 'Continuar Visita' : 'Iniciar Visita'}</span>
                        <span>→</span>
                      </div>
                    </BentoCard>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mandatory First Access Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <Key size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-extrabold text-gray-900">Primeiro Acesso Detectado</h3>
              <p className="text-xs text-gray-600 font-medium">
                Por motivos de segurança, você deve redefinir sua senha temporária antes de continuar.
              </p>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-charcoal focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-charcoal focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full font-extrabold text-xs bg-charcoal text-white hover:bg-black transition shadow-md"
              >
                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
