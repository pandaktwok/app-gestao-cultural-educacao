import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { ENV } from '../config/env.js';
import { getSetting, setSetting, deleteSettings } from './settingsService.js';

export type DriveMode = 'service_account' | 'oauth';

export interface DriveStatus {
  configured: boolean;
  mode: DriveMode | null;
  rootFolderId: string;
  accountEmail: string | null;
  oauthConnected: boolean;
  hasOauthClient: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastMessage: string | null;
  source: 'painel' | 'arquivo' | 'nenhum';
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** "AAAA-MM - Setembro" (ordena certo no Drive) a partir de uma data. */
export function monthFolderName(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')} - ${MONTH_NAMES[d.getMonth()]}`;
}

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Sem nome';
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl || '');
  if (!m) return null;
  const mimeType = m[1] || 'image/jpeg';
  const buffer = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]));
  return { buffer, mimeType };
}

function friendlyError(err: any): string {
  const msg: string = err?.errors?.[0]?.message || err?.message || String(err);
  if (/storage quota|storageQuotaExceeded/i.test(msg))
    return 'A conta de serviço não tem espaço próprio no Drive. Use uma pasta dentro de um Drive Compartilhado, ou conecte uma conta Google (modo "Conta Google").';
  if (/File not found|notFound/i.test(msg))
    return 'Pasta não encontrada. Confira o ID da pasta e se ela foi compartilhada com o e-mail da conta de serviço (como Editor).';
  if (/invalid_grant/i.test(msg)) return 'A autorização da conta Google expirou ou foi revogada. Conecte a conta novamente.';
  if (/invalid_client|unauthorized_client/i.test(msg)) return 'ID ou segredo do cliente OAuth inválido.';
  if (/insufficient.*permission|forbidden|403/i.test(msg)) return 'Sem permissão para gravar nessa pasta. Compartilhe-a como Editor.';
  if (/has not been used|accessNotConfigured|disabled/i.test(msg)) return 'A API do Google Drive não está ativada no projeto do Google Cloud.';
  return msg;
}

class GoogleDriveService {
  private drive: any = null;
  private cacheKey = '';
  private folderCache = new Map<string, string>();
  private accountEmail: string | null = null;

  /** Lê a configuração (painel primeiro; arquivo credentials.json como reserva) e monta o cliente. */
  private async client(): Promise<{ drive: any; rootId: string } | null> {
    const mode = (await getSetting('drive.mode')) as DriveMode | null;
    const rootId = ((await getSetting('drive.rootFolderId')) || ENV.GOOGLE_DRIVE_PARENT_FOLDER_ID || '').trim();

    let auth: any = null;
    let key = '';

    if (mode === 'oauth') {
      const id = await getSetting('drive.oauthClientId');
      const secret = await getSetting('drive.oauthClientSecret');
      const refresh = await getSetting('drive.oauthRefreshToken');
      if (id && secret && refresh) {
        const o = new google.auth.OAuth2(id, secret);
        o.setCredentials({ refresh_token: refresh });
        auth = o;
        key = `oauth:${id}:${refresh.slice(-8)}:${rootId}`;
      }
    } else {
      const json = await getSetting('drive.serviceAccountJson');
      if (json) {
        try {
          const creds = JSON.parse(json);
          auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/drive'] });
          this.accountEmail = creds.client_email || null;
          key = `sa:${creds.client_email}:${rootId}`;
        } catch {
          return null;
        }
      } else {
        const credPath = path.resolve(ENV.GOOGLE_DRIVE_CREDENTIALS_PATH);
        if (fs.existsSync(credPath)) {
          auth = new google.auth.GoogleAuth({ keyFile: credPath, scopes: ['https://www.googleapis.com/auth/drive'] });
          key = `file:${credPath}:${rootId}`;
        }
      }
    }

    if (!auth) return null;
    if (key !== this.cacheKey) {
      this.drive = google.drive({ version: 'v3', auth });
      this.cacheKey = key;
      this.folderCache.clear();
    }
    return { drive: this.drive, rootId };
  }

  /** Chamado ao salvar a configuração. */
  public reset() {
    this.cacheKey = '';
    this.drive = null;
    this.folderCache.clear();
  }

  public async isConfigured(): Promise<boolean> {
    return !!(await this.client());
  }

  public async status(): Promise<DriveStatus> {
    const mode = (await getSetting('drive.mode')) as DriveMode | null;
    const c = await this.client();
    const sa = await getSetting('drive.serviceAccountJson');
    let email: string | null = null;
    if (sa) {
      try { email = JSON.parse(sa).client_email || null; } catch { /* ignore */ }
    }
    if (mode === 'oauth') email = await getSetting('drive.oauthEmail');
    const fileExists = fs.existsSync(path.resolve(ENV.GOOGLE_DRIVE_CREDENTIALS_PATH));
    return {
      configured: !!c,
      mode: mode || (sa || fileExists ? 'service_account' : null),
      rootFolderId: ((await getSetting('drive.rootFolderId')) || ENV.GOOGLE_DRIVE_PARENT_FOLDER_ID || '').trim(),
      accountEmail: email,
      oauthConnected: !!(await getSetting('drive.oauthRefreshToken')),
      hasOauthClient: !!(await getSetting('drive.oauthClientId')),
      lastTestAt: await getSetting('drive.lastTestAt'),
      lastTestOk: (await getSetting('drive.lastTestOk')) === '1' ? true : (await getSetting('drive.lastTestOk')) === '0' ? false : null,
      lastMessage: await getSetting('drive.lastMessage'),
      source: sa || mode === 'oauth' ? 'painel' : fileExists ? 'arquivo' : 'nenhum',
    };
  }

  private async findOrCreateFolder(drive: any, name: string, parentId?: string): Promise<string> {
    const cacheKey = `${parentId || 'root'}/${name}`;
    const cached = this.folderCache.get(cacheKey);
    if (cached) return cached;

    let q = `name = '${esc(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) q += ` and '${parentId}' in parents`;
    const res = await drive.files.list({
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    let id: string = res.data.files?.[0]?.id;
    if (!id) {
      const created = await drive.files.create({
        requestBody: { name, mimeType: 'application/vnd.google-apps.folder', ...(parentId ? { parents: [parentId] } : {}) },
        fields: 'id',
        supportsAllDrives: true,
      });
      id = created.data.id!;
    }
    this.folderCache.set(cacheKey, id);
    return id;
  }

  /** Raiz / [Escola] / [AAAA-MM - Mês] / [Ensaios | Eventos | Listas] */
  public async ensureFolder(schoolName: string, date: Date, kind: 'Ensaios' | 'Eventos' | 'Listas'): Promise<string | null> {
    const c = await this.client();
    if (!c) return null;
    const school = await this.findOrCreateFolder(c.drive, safeName(schoolName), c.rootId || undefined);
    const month = await this.findOrCreateFolder(c.drive, monthFolderName(date), school);
    return this.findOrCreateFolder(c.drive, kind, month);
  }

  /** Pasta de relatórios/cópias mensais na raiz. */
  public async ensureRootSubfolder(name: string): Promise<string | null> {
    const c = await this.client();
    if (!c) return null;
    return this.findOrCreateFolder(c.drive, name, c.rootId || undefined);
  }

  public async uploadBuffer(buffer: Buffer, fileName: string, mimeType: string, parentFolderId: string): Promise<string> {
    const c = await this.client();
    if (!c) throw new Error('Google Drive não configurado');
    const file = await c.drive.files.create({
      requestBody: { name: fileName, parents: [parentFolderId] },
      media: { mimeType, body: Readable.from(buffer) },
      fields: 'id',
      supportsAllDrives: true,
    });
    return file.data.id!;
  }

  /** Atualiza um arquivo existente (usado nas cópias mensais) ou cria se não existir. */
  public async upsertTextFile(name: string, content: string, mimeType: string, parentFolderId: string): Promise<string> {
    const c = await this.client();
    if (!c) throw new Error('Google Drive não configurado');
    const found = await c.drive.files.list({
      q: `name = '${esc(name)}' and '${parentFolderId}' in parents and trashed = false`,
      fields: 'files(id)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const existing = found.data.files?.[0]?.id;
    const media = { mimeType, body: Readable.from(Buffer.from(content, 'utf8')) };
    if (existing) {
      await c.drive.files.update({ fileId: existing, media, supportsAllDrives: true });
      return existing;
    }
    const created = await c.drive.files.create({
      requestBody: { name, parents: [parentFolderId] },
      media,
      fields: 'id',
      supportsAllDrives: true,
    });
    return created.data.id!;
  }

  /** Envia uma foto em data-URL (base64). Retorna o ID do arquivo no Drive ou null se não configurado/erro. */
  public async uploadDataUrl(dataUrl: string, fileName: string, parentFolderId: string): Promise<string | null> {
    const parsed = dataUrlToBuffer(dataUrl);
    if (!parsed) return null;
    try {
      return await this.uploadBuffer(parsed.buffer, fileName, parsed.mimeType, parentFolderId);
    } catch (err) {
      console.error(`Drive: falha ao enviar ${fileName}:`, friendlyError(err));
      await setSetting('drive.lastMessage', friendlyError(err));
      return null;
    }
  }

  // ---------- Configuração pelo painel ----------

  public async saveServiceAccount(json: string, rootFolderId: string) {
    let creds: any;
    try {
      creds = JSON.parse(json);
    } catch {
      throw new Error('O arquivo de chave não é um JSON válido.');
    }
    if (!creds.client_email || !creds.private_key) throw new Error('Esse JSON não parece uma chave de conta de serviço (faltam client_email/private_key).');
    await setSetting('drive.mode', 'service_account');
    await setSetting('drive.serviceAccountJson', JSON.stringify(creds), true);
    await setSetting('drive.rootFolderId', extractFolderId(rootFolderId));
    this.reset();
  }

  public async saveOauthClient(clientId: string, clientSecret: string, rootFolderId: string) {
    await setSetting('drive.mode', 'oauth');
    await setSetting('drive.oauthClientId', clientId.trim());
    if (clientSecret) await setSetting('drive.oauthClientSecret', clientSecret.trim(), true);
    await setSetting('drive.rootFolderId', extractFolderId(rootFolderId));
    this.reset();
  }

  public async oauthUrl(redirectUri: string, state: string): Promise<string> {
    const id = await getSetting('drive.oauthClientId');
    const secret = await getSetting('drive.oauthClientSecret');
    if (!id || !secret) throw new Error('Salve o ID e o segredo do cliente OAuth antes de conectar.');
    const o = new google.auth.OAuth2(id, secret, redirectUri);
    return o.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/userinfo.email'],
      state,
    });
  }

  public async oauthFinish(code: string, redirectUri: string) {
    const id = (await getSetting('drive.oauthClientId'))!;
    const secret = (await getSetting('drive.oauthClientSecret'))!;
    const o = new google.auth.OAuth2(id, secret, redirectUri);
    const { tokens } = await o.getToken(code);
    if (!tokens.refresh_token) throw new Error('O Google não devolveu a autorização permanente. Remova o acesso do app em myaccount.google.com/permissions e conecte de novo.');
    await setSetting('drive.oauthRefreshToken', tokens.refresh_token, true);
    o.setCredentials(tokens);
    try {
      const info = await google.oauth2({ version: 'v2', auth: o }).userinfo.get();
      if (info.data.email) await setSetting('drive.oauthEmail', info.data.email);
    } catch { /* e-mail é opcional */ }
    this.reset();
  }

  public async disconnect() {
    await deleteSettings([
      'drive.mode', 'drive.serviceAccountJson', 'drive.oauthClientId', 'drive.oauthClientSecret',
      'drive.oauthRefreshToken', 'drive.oauthEmail', 'drive.lastTestAt', 'drive.lastTestOk', 'drive.lastMessage',
    ]);
    this.reset();
  }

  /** Teste real: cria uma pasta e um arquivo de teste e apaga em seguida. */
  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    const record = async (ok: boolean, message: string) => {
      await setSetting('drive.lastTestAt', new Date().toISOString());
      await setSetting('drive.lastTestOk', ok ? '1' : '0');
      await setSetting('drive.lastMessage', message);
      return { ok, message };
    };
    const c = await this.client();
    if (!c) return record(false, 'Google Drive ainda não configurado.');
    if (!c.rootId) return record(false, 'Informe o ID (ou o link) da pasta raiz no Drive.');
    try {
      const root = await c.drive.files.get({ fileId: c.rootId, fields: 'id,name,mimeType', supportsAllDrives: true });
      if (root.data.mimeType !== 'application/vnd.google-apps.folder') return record(false, 'O ID informado não é de uma pasta.');
      const id = await this.uploadBuffer(Buffer.from('teste de conexão'), '_teste_conexao.txt', 'text/plain', c.rootId);
      await c.drive.files.delete({ fileId: id, supportsAllDrives: true });
      return record(true, `Conexão OK. As fotos serão salvas dentro de "${root.data.name}".`);
    } catch (err) {
      return record(false, friendlyError(err));
    }
  }
}

/** Aceita o link completo da pasta ou só o ID. */
export function extractFolderId(input: string): string {
  const s = (input || '').trim();
  const m = /folders\/([a-zA-Z0-9_-]+)/.exec(s) || /[?&]id=([a-zA-Z0-9_-]+)/.exec(s);
  return m ? m[1] : s;
}

export const googleDriveService = new GoogleDriveService();
