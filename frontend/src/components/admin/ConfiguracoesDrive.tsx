import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, UploadCloud, Link2, Loader2, RefreshCw, PlugZap, Copy } from 'lucide-react';
import { api } from '../../lib/api';

type Mode = 'service_account' | 'oauth';

export const ConfiguracoesDrive: React.FC = () => {
  const [st, setSt] = useState<any | null>(null);
  const [mode, setMode] = useState<Mode>('oauth');
  const [json, setJson] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [rootFolder, setRootFolder] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await api.get('/admin/settings/drive');
    setSt(r.data);
    if (r.data.mode) setMode(r.data.mode);
    if (r.data.oauthClientId) setClientId(r.data.oauthClientId);
    if (r.data.rootFolderId) setRootFolder((v) => v || r.data.rootFolderId);
  }, []);

  useEffect(() => {
    load();
    const p = new URLSearchParams(window.location.search).get('drive');
    if (p === 'ok') setMsg({ ok: true, text: 'Conta Google conectada. Agora teste a conexão.' });
    if (p === 'erro') setMsg({ ok: false, text: 'A conexão com a conta Google não foi concluída. Tente de novo.' });
  }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setMsg(null);
    try { await fn(); } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.error || e?.response?.data?.message || 'Não foi possível concluir.' });
    } finally { setBusy(null); }
  };

  const saveSA = () => run('save', async () => {
    await api.put('/admin/settings/drive/service-account', { json, rootFolder });
    setJson(''); await load(); setMsg({ ok: true, text: 'Salvo. Toque em "Testar conexão".' });
  });
  const saveOAuth = () => run('save', async () => {
    await api.put('/admin/settings/drive/oauth', { clientId, clientSecret, rootFolder });
    setClientSecret(''); await load(); setMsg({ ok: true, text: 'Salvo. Agora toque em "Conectar conta Google".' });
  });
  const connect = () => run('connect', async () => {
    const r = await api.get('/admin/settings/drive/oauth/url');
    window.location.href = r.data.url;
  });
  const test = () => run('test', async () => {
    const r = await api.post('/admin/settings/drive/test');
    setMsg({ ok: r.data.ok, text: r.data.message }); await load();
  });
  const sync = () => run('sync', async () => {
    const r = await api.post('/admin/settings/drive/sync');
    setMsg({ ok: r.data.failed === 0, text: `Enviadas: ${r.data.uploaded} · Falhas: ${r.data.failed} · Pendentes: ${r.data.pendingPhotos}` });
    await load();
  });

  if (!st) return <div className="bento-card p-12 text-center text-gray-400 font-bold">Carregando…</div>;

  const input = 'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-adminBlue/40';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bento-card p-5">
        <h3 className="text-xl font-extrabold text-gray-900">Google Drive</h3>
        <p className="text-xs text-gray-500 font-medium mt-1">
          Todas as fotos (chamadas externas, ensaios e eventos) vão para o Drive, organizadas em <b>Escola / Mês</b> e <b>Eventos</b>. Os relatórios mensais também são copiados para a pasta <b>_Relatorios_Mensais</b>.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold">
          {st.configured ? (
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${st.lastTestOk === false ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
              {st.lastTestOk === false ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
              {st.lastTestOk === false ? 'Configurado, mas com erro' : st.lastTestOk ? 'Conectado' : 'Configurado (ainda não testado)'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
              <AlertTriangle size={15} /> Não configurado — as fotos ficam guardadas no servidor
            </span>
          )}
          {st.accountEmail && <span className="text-gray-600 text-xs">{st.accountEmail}</span>}
          <span className="text-gray-600 text-xs">Fotos aguardando envio: <b>{st.pendingPhotos}</b></span>
        </div>
        {st.lastMessage && <p className="text-xs text-gray-500 mt-2">Último teste: {st.lastMessage}</p>}
      </div>

      <div className="bento-card p-5 space-y-4">
        <div className="flex gap-2 bg-gray-100 rounded-full p-1 w-fit">
          {([['oauth', 'Conta Google (recomendado)'], ['service_account', 'Conta de serviço']] as [Mode, string][]).map(([m, l]) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`px-4 min-h-[38px] rounded-full text-xs font-extrabold ${mode === m ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>{l}</button>
          ))}
        </div>

        {mode === 'oauth' ? (
          <>
            <div className="text-xs text-gray-600 font-medium bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
              <p>Use o Drive de uma conta Google comum (ex.: a do projeto). No Google Cloud Console, crie um <b>ID de cliente OAuth (aplicativo da Web)</b>, ative a <b>Google Drive API</b> e cadastre este endereço em "URIs de redirecionamento autorizados":</p>
              <div className="flex items-center gap-2">
                <code className="bg-white border rounded px-2 py-1 break-all flex-1">{st.oauthRedirectUri}</code>
                <button type="button" aria-label="Copiar" onClick={() => navigator.clipboard?.writeText(st.oauthRedirectUri)} className="h-9 w-9 rounded-lg border bg-white flex items-center justify-center"><Copy size={14} /></button>
              </div>
            </div>
            <label className="block text-xs font-extrabold text-gray-700">ID do cliente
              <input className={input + ' mt-1'} value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com" />
            </label>
            <label className="block text-xs font-extrabold text-gray-700">Chave secreta do cliente {st.hasOauthClient && <span className="text-emerald-700">(já salva — deixe vazio para manter)</span>}
              <input type="password" className={input + ' mt-1'} value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} autoComplete="off" />
            </label>
          </>
        ) : (
          <>
            <div className="text-xs text-amber-900 font-medium bg-amber-50 border border-amber-200 rounded-xl p-3">
              Contas de serviço <b>não têm espaço</b> no "Meu Drive" pessoal. Use uma <b>Unidade compartilhada</b> e adicione o e-mail da conta de serviço como membro (Gerente de conteúdo). Cole o ID/link da pasta dentro dela abaixo.
            </div>
            <label className="block text-xs font-extrabold text-gray-700">Arquivo JSON da conta de serviço
              <textarea rows={5} className={input + ' mt-1 font-mono text-xs'} value={json} onChange={(e) => setJson(e.target.value)} placeholder='{ "type": "service_account", ... }' />
            </label>
          </>
        )}

        <label className="block text-xs font-extrabold text-gray-700">Pasta raiz no Drive (link ou ID)
          <input className={input + ' mt-1'} value={rootFolder} onChange={(e) => setRootFolder(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
        </label>

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" disabled={!!busy} onClick={mode === 'oauth' ? saveOAuth : saveSA} className="min-h-[42px] px-5 rounded-full bg-adminBlue text-white text-xs font-extrabold flex items-center gap-2 disabled:opacity-60">
            {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Salvar
          </button>
          {mode === 'oauth' && st.hasOauthClient && (
            <button type="button" disabled={!!busy} onClick={connect} className="min-h-[42px] px-5 rounded-full bg-white border border-gray-300 text-xs font-extrabold flex items-center gap-2">
              <PlugZap size={15} /> {st.oauthConnected ? 'Reconectar conta Google' : 'Conectar conta Google'}
            </button>
          )}
          <button type="button" disabled={!!busy || !st.configured} onClick={test} className="min-h-[42px] px-5 rounded-full bg-white border border-gray-300 text-xs font-extrabold flex items-center gap-2 disabled:opacity-50">
            {busy === 'test' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Testar conexão
          </button>
          <button type="button" disabled={!!busy || !st.configured} onClick={sync} className="min-h-[42px] px-5 rounded-full bg-white border border-gray-300 text-xs font-extrabold flex items-center gap-2 disabled:opacity-50">
            {busy === 'sync' ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />} Sincronizar agora
          </button>
        </div>

        {msg && (
          <p role="status" className={`text-sm font-bold rounded-xl p-3 border ${msg.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>{msg.text}</p>
        )}
        {st.lastSyncAt && (
          <p className="text-xs text-gray-500 flex items-center gap-1"><RefreshCw size={12} /> Última sincronização: {new Date(st.lastSyncAt).toLocaleString('pt-BR')}{st.lastSyncResult ? ` — ${st.lastSyncResult}` : ''} (automática a cada 10 min)</p>
        )}
      </div>
    </div>
  );
};
