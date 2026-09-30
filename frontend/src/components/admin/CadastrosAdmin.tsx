import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, Copy, KeyRound, Loader2, Pencil, Plus, Trash2, X, UserX, UserCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { ConfirmDialog } from '../common/ConfirmDialog';

const apiError = (e: any, fallback: string) => e?.response?.data?.error || fallback;

const maskCpf = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const inputCls = 'w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-adminBlue focus:outline-none';

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) =>
  typeof document === 'undefined'
    ? null
    : createPortal(
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <div
            className={`bg-white rounded-3xl p-6 w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[90vh] overflow-y-auto shadow-2xl space-y-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-extrabold text-gray-900">{title}</h3>
              <button type="button" onClick={onClose} aria-label="Fechar" className="h-9 w-9 rounded-full hover:bg-gray-100 grid place-items-center">
                <X size={18} />
              </button>
            </div>
            {children}
          </div>
        </div>,
        document.body
      );

// ============================== PROFESSORES ==============================

export interface TeacherRow {
  id: string;
  name: string;
  email: string;
  cpf?: string | null;
  phone?: string | null;
  role: string;
  isActive?: boolean;
  avatarColor: string;
  initialAvatar: string;
  teacherSchools?: { school: { id: string; name: string } }[];
}

export const TeacherActions: React.FC<{
  teacher: TeacherRow;
  onLinkSchools: () => void;
  onChanged: () => void;
}> = ({ teacher, onLinkSchools, onChanged }) => {
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [access, setAccess] = useState<{ name: string; cpf?: string | null; email: string; tempPassword: string } | null>(null);
  const [impact, setImpact] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const openDelete = async () => {
    setError('');
    try {
      const r = await api.get(`/auth/users/${teacher.id}/impact`);
      setImpact(r.data);
    } catch {
      setImpact(null);
    }
    setConfirmDelete(true);
  };

  const doReset = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/auth/users/${teacher.id}/reset-password`);
      setConfirmReset(false);
      setAccess(r.data.access);
      onChanged();
    } catch (e) {
      alert(apiError(e, 'Não foi possível redefinir a senha.'));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/auth/users/${teacher.id}`);
      setConfirmDelete(false);
      onChanged();
    } catch (e: any) {
      setError(apiError(e, 'Não foi possível excluir.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      await api.patch(`/auth/users/${teacher.id}/active`, { active: teacher.isActive === false });
      setConfirmDelete(false);
      onChanged();
    } catch (e) {
      alert(apiError(e, 'Não foi possível alterar o acesso.'));
    } finally {
      setBusy(false);
    }
  };

  const accessText = access
    ? `Acesso ao app — ${access.name}\nCPF (login): ${access.cpf || access.email}\nSenha provisória: ${access.tempPassword}\nNo primeiro acesso será pedido para criar uma nova senha.`
    : '';

  const btn = 'h-10 w-10 rounded-full grid place-items-center transition';

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        <button type="button" onClick={onLinkSchools} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`} title="Vincular escolas" aria-label="Vincular escolas">
          <Plus size={16} />
        </button>
        <button type="button" onClick={() => setEditing(true)} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`} title="Editar cadastro" aria-label="Editar cadastro">
          <Pencil size={16} />
        </button>
        <button type="button" onClick={() => setConfirmReset(true)} className={`${btn} bg-amber-50 text-amber-700 hover:bg-amber-100`} title="Redefinir senha e ver dados de login" aria-label="Redefinir senha">
          <KeyRound size={16} />
        </button>
        <button type="button" onClick={openDelete} className={`${btn} bg-rose-50 text-rose-600 hover:bg-rose-100`} title="Excluir cadastro" aria-label="Excluir cadastro">
          <Trash2 size={16} />
        </button>
      </div>

      {editing && <EditTeacherModal teacher={teacher} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />}

      <ConfirmDialog
        open={confirmReset}
        danger={false}
        busy={busy}
        title="Redefinir a senha?"
        confirmLabel="Gerar nova senha"
        onCancel={() => setConfirmReset(false)}
        onConfirm={doReset}
      >
        <p>
          A senha atual de <b>{teacher.name}</b> deixa de funcionar. Vamos gerar uma senha provisória e mostrar os dados de login para você enviar.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDelete}
        busy={busy}
        title={impact?.hasHistory ? 'Este professor tem histórico' : 'Excluir este cadastro?'}
        confirmLabel={impact?.hasHistory ? (teacher.isActive === false ? 'Reativar acesso' : 'Desativar acesso') : 'Excluir'}
        danger={!impact?.hasHistory}
        onCancel={() => { setConfirmDelete(false); setError(''); }}
        onConfirm={impact?.hasHistory ? toggleActive : doDelete}
      >
        {impact?.hasHistory ? (
          <p>
            <b>{teacher.name}</b> já registrou {impact.sessions} chamada(s), {impact.reports} relatório(s), {impact.rehearsals} foto(s) de ensaio e {impact.events} evento(s).
            Para não perder as estatísticas, o cadastro não pode ser apagado — mas você pode {teacher.isActive === false ? 'reativar' : 'desativar'} o acesso.
          </p>
        ) : (
          <p>
            O cadastro de <b>{teacher.name}</b> será apagado de vez. Essa ação não pode ser desfeita.
          </p>
        )}
        {error && <p className="text-rose-600 font-bold">{error}</p>}
      </ConfirmDialog>

      {access && (
        <Modal title="Dados de login" onClose={() => setAccess(null)}>
          <p className="text-xs text-gray-600 font-medium">Envie ao professor. No primeiro acesso ele será obrigado a criar uma nova senha.</p>
          <div className="bg-gray-100 rounded-2xl p-4 font-mono text-xs space-y-1 break-all">
            <p><b>Login (CPF):</b> {access.cpf || '—'}</p>
            <p><b>E-mail:</b> {access.email}</p>
            <p><b>Senha provisória:</b> {access.tempPassword}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                try { await navigator.clipboard.writeText(accessText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
              }}
              className="flex-1 min-h-[44px] rounded-full border border-gray-300 text-sm font-extrabold flex items-center justify-center gap-2"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />} {copied ? 'Copiado' : 'Copiar'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(accessText)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-h-[44px] rounded-full bg-emerald-600 text-white text-sm font-extrabold flex items-center justify-center"
            >
              Enviar pelo WhatsApp
            </a>
          </div>
        </Modal>
      )}
    </>
  );
};

const EditTeacherModal: React.FC<{ teacher: TeacherRow; onClose: () => void; onSaved: () => void }> = ({ teacher, onClose, onSaved }) => {
  const [name, setName] = useState(teacher.name);
  const [cpf, setCpf] = useState(teacher.cpf || '');
  const [phone, setPhone] = useState(teacher.phone || '');
  const [email, setEmail] = useState(teacher.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.put(`/auth/users/${teacher.id}`, { name, cpf, phone, email });
      onSaved();
    } catch (err) {
      setError(apiError(err, 'Não foi possível salvar.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Editar professor" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Nome completo *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">CPF (login do app) *</label>
          <input required value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" className={inputCls + ' tracking-wider'} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Telefone / WhatsApp</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">E-mail *</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <p className="text-[11px] text-gray-500 font-medium">A senha não é alterada aqui. Para isso use o botão da chave (redefinir senha).</p>
        {error && <p role="alert" className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 min-h-[46px] rounded-full border border-gray-300 text-sm font-extrabold">Cancelar</button>
          <button type="submit" disabled={busy} className="flex-1 min-h-[46px] rounded-full bg-charcoal text-white text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 size={16} className="animate-spin" />} Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const InactiveBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
    <UserX size={11} /> Acesso desativado
  </span>
);
export const ActiveBadgeIcon = UserCheck;

// ============================== ESCOLAS ==============================

export interface SchoolRow {
  id: string;
  name: string;
  boardName?: string | null;
  directorName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export const SchoolActions: React.FC<{ school: SchoolRow; onChanged: () => void }> = ({ school, onChanged }) => {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [impact, setImpact] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const openDelete = async () => {
    try {
      setImpact((await api.get(`/schools/${school.id}/impact`)).data);
    } catch {
      setImpact(null);
    }
    setConfirmDelete(true);
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/schools/${school.id}`);
      setConfirmDelete(false);
      onChanged();
    } catch (e) {
      alert(apiError(e, 'Não foi possível excluir a escola.'));
    } finally {
      setBusy(false);
    }
  };

  const btn = 'h-10 w-10 rounded-full grid place-items-center transition';
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <>
      <button type="button" onClick={stop(() => setEditing(true))} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`} title="Editar escola" aria-label="Editar escola">
        <Pencil size={16} />
      </button>
      <button type="button" onClick={stop(openDelete)} className={`${btn} bg-rose-50 text-rose-600 hover:bg-rose-100`} title="Excluir escola" aria-label="Excluir escola">
        <Trash2 size={16} />
      </button>

      {editing && <EditSchoolModal school={school} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />}

      <ConfirmDialog
        open={confirmDelete}
        busy={busy}
        title="Excluir esta escola?"
        confirmLabel="Excluir escola"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={doDelete}
      >
        <p><b>{school.name}</b> será apagada de vez.</p>
        {impact && (impact.students + impact.sessions + impact.reports + impact.rehearsals + impact.events > 0) ? (
          <p className="text-rose-700 font-bold">
            Junto vão {impact.students} aluno(s), {impact.sessions} chamada(s), {impact.reports} relatório(s), {impact.rehearsals} foto(s) de ensaio e {impact.events} evento(s).
            As cópias mensais de estatísticas já geradas continuam guardadas.
          </p>
        ) : (
          <p>Ela ainda não tem alunos nem registros.</p>
        )}
        <p>Essa ação não pode ser desfeita.</p>
      </ConfirmDialog>
    </>
  );
};

const EditSchoolModal: React.FC<{ school: SchoolRow; onClose: () => void; onSaved: () => void }> = ({ school, onClose, onSaved }) => {
  const [f, setF] = useState({
    name: school.name || '',
    directorName: school.directorName || '',
    boardName: school.boardName || '',
    phone: school.phone || '',
    email: school.email || '',
    address: school.address || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.put(`/schools/${school.id}`, f);
      onSaved();
    } catch (err) {
      setError(apiError(err, 'Não foi possível salvar.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Editar escola" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Nome da escola *</label>
          <input required value={f.name} onChange={set('name')} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Diretora / gestora</label>
            <input value={f.directorName} onChange={set('directorName')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Mantenedora</label>
            <input value={f.boardName} onChange={set('boardName')} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Telefone</label>
            <input value={f.phone} onChange={set('phone')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">E-mail</label>
            <input value={f.email} onChange={set('email')} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Endereço</label>
          <input value={f.address} onChange={set('address')} className={inputCls} />
        </div>
        {error && <p role="alert" className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 min-h-[46px] rounded-full border border-gray-300 text-sm font-extrabold">Cancelar</button>
          <button type="submit" disabled={busy} className="flex-1 min-h-[46px] rounded-full bg-charcoal text-white text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 size={16} className="animate-spin" />} Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ============================== ALERTAS ==============================

const SEV: Record<string, { label: string; cls: string }> = {
  INFO: { label: 'Informativo', cls: 'bg-sky-100 text-sky-800' },
  WARNING: { label: 'Atenção', cls: 'bg-amber-100 text-amber-800' },
  URGENT: { label: 'Urgente', cls: 'bg-rose-100 text-rose-800' },
};

export const AlertasAdmin: React.FC<{ teachers: TeacherRow[] }> = ({ teachers }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('INFO');
  const [target, setTarget] = useState('ALL');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      setAlerts((await api.get('/alerts')).data);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/alerts', { title, message, severity, teacherId: target === 'ALL' ? null : target, dueDate: dueDate || null });
      setTitle(''); setMessage(''); setSeverity('INFO'); setTarget('ALL'); setDueDate('');
      setOpen(false);
      load();
    } catch (err) {
      setError(apiError(err, 'Não foi possível cadastrar o alerta.'));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.delete(`/alerts/${toDelete.id}`);
      setToDelete(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const teacherOptions = teachers.filter((t) => t.role === 'TEACHER' && t.isActive !== false);

  return (
    <div className="bento-card p-5 space-y-4 bg-white border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-black text-gray-900 flex items-center gap-2"><Bell size={18} className="text-adminBlue" /> Avisos para os professores</h4>
          <p className="text-xs text-gray-500 font-medium">O aviso aparece no app do professor até ele tocar em "Entendi".</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="bento-pill-btn px-5 py-2.5 text-xs flex items-center gap-2 self-start">
          <Plus size={16} /> Cadastrar alerta
        </button>
      </div>

      {alerts.length === 0 ? (
        <p className="text-xs text-gray-400 font-bold text-center py-4 bg-gray-50 rounded-2xl border border-dashed">Nenhum aviso cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="rounded-2xl border bg-white p-3.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${SEV[a.severity]?.cls}`}>{SEV[a.severity]?.label}</span>
                  <p className="font-extrabold text-sm text-gray-900">{a.title}</p>
                </div>
                <p className="text-xs text-gray-600 font-medium mt-1 whitespace-pre-line">{a.message}</p>
                <p className="text-[11px] text-gray-500 font-bold mt-1.5">
                  Para: {a.teacherName || 'Todos os professores'} · Lido por {a.readCount}/{a.targetCount}
                  {a.dueDate ? ` · Até ${new Date(a.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setToDelete(a)} aria-label="Excluir alerta" className="h-10 w-10 shrink-0 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 grid place-items-center">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title="Cadastrar alerta" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Vincular a *</label>
              <select value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls + ' bg-gray-50 font-bold'}>
                <option value="ALL">Todos os professores</option>
                {teacherOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Título *</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Entregar o relatório até sexta" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mensagem *</label>
              <textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Importância</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputCls + ' bg-gray-50 font-bold'}>
                  <option value="INFO">Informativo</option>
                  <option value="WARNING">Atenção</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mostrar até (opcional)</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
              </div>
            </div>
            {error && <p role="alert" className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 min-h-[46px] rounded-full border border-gray-300 text-sm font-extrabold">Cancelar</button>
              <button type="submit" disabled={busy} className="flex-1 min-h-[46px] rounded-full bg-charcoal text-white text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-60">
                {busy && <Loader2 size={16} className="animate-spin" />} Enviar alerta
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog open={!!toDelete} busy={busy} title="Excluir este alerta?" confirmLabel="Excluir" onCancel={() => setToDelete(null)} onConfirm={doDelete}>
        <p>"{toDelete?.title}" deixa de aparecer para os professores.</p>
      </ConfirmDialog>
    </div>
  );
};

// ============================== QUESTIONÁRIO: VÍNCULO ==============================

/** Escolha: todos os professores ou só alguns. value = lista de ids (vazia = todos). */
export const TeacherPicker: React.FC<{
  teachers: TeacherRow[];
  value: string[];
  onChange: (ids: string[]) => void;
}> = ({ teachers, value, onChange }) => {
  const list = teachers.filter((t) => t.role === 'TEACHER' && t.isActive !== false);
  const [mode, setMode] = useState<'ALL' | 'SOME'>(value.length > 0 ? 'SOME' : 'ALL');

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {([['ALL', 'Todos os professores'], ['SOME', 'Escolher professores']] as const).map(([m, l]) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); if (m === 'ALL') onChange([]); }}
            aria-pressed={mode === m}
            className={`px-4 min-h-[40px] rounded-full text-xs font-extrabold border transition ${mode === m ? 'bg-adminBlue text-white border-adminBlue' : 'bg-white text-gray-700 border-gray-300'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {mode === 'SOME' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto rounded-2xl border p-2 bg-gray-50">
          {list.length === 0 && <p className="text-xs text-gray-400 font-bold p-2">Nenhum professor cadastrado.</p>}
          {list.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-xs font-bold text-gray-800 px-2 py-1.5 rounded-xl hover:bg-white cursor-pointer">
              <input type="checkbox" checked={value.includes(t.id)} onChange={() => toggle(t.id)} className="w-4 h-4 rounded" />
              {t.name}
            </label>
          ))}
        </div>
      )}
      {mode === 'SOME' && value.length === 0 && (
        <p className="text-[11px] text-amber-700 font-bold">Marque ao menos um professor (sem nenhum marcado a pergunta vale para todos).</p>
      )}
    </div>
  );
};

export const QuestionLinkModal: React.FC<{
  question: any;
  teachers: TeacherRow[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ question, teachers, onClose, onSaved }) => {
  const initial: string[] = (() => {
    try {
      const v = JSON.parse(question.teacherIds || '[]');
      const ids = Array.isArray(v) ? v.map(String) : [];
      if (question.scopeType === 'TEACHER' && question.scopeId && !ids.includes(question.scopeId)) ids.push(question.scopeId);
      return ids;
    } catch {
      return [];
    }
  })();
  const [ids, setIds] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/questionnaire/${question.id}`, { teacherIds: ids });
      onSaved();
    } catch (e) {
      alert(apiError(e, 'Não foi possível salvar o vínculo.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Vincular pergunta" onClose={onClose} wide>
      <p className="text-sm font-bold text-gray-800">{question.title}</p>
      <TeacherPicker teachers={teachers} value={ids} onChange={setIds} />
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 min-h-[46px] rounded-full border border-gray-300 text-sm font-extrabold">Cancelar</button>
        <button type="button" onClick={save} disabled={busy} className="flex-1 min-h-[46px] rounded-full bg-charcoal text-white text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-60">
          {busy && <Loader2 size={16} className="animate-spin" />} Salvar vínculo
        </button>
      </div>
    </Modal>
  );
};

export const questionTargetLabel = (q: any, teachers: TeacherRow[]): string => {
  let ids: string[] = [];
  try { const v = JSON.parse(q.teacherIds || '[]'); if (Array.isArray(v)) ids = v.map(String); } catch { /* ignore */ }
  if (q.scopeType === 'TEACHER' && q.scopeId && !ids.includes(q.scopeId)) ids.push(q.scopeId);
  if (ids.length === 0) return 'Todos os professores';
  const names = ids.map((id) => teachers.find((t) => t.id === id)?.name).filter(Boolean) as string[];
  return names.length ? names.join(', ') : `${ids.length} professor(es)`;
};
