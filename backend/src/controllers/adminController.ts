import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../prismaClient.js';
import { ENV } from '../config/env.js';
import { googleDriveService } from '../services/googleDriveService.js';
import { getSetting } from '../services/settingsService.js';
import { pendingPhotoCount, syncPendingPhotos } from '../services/driveSyncService.js';
import { generateSnapshot, getMonthStats } from '../services/snapshotService.js';
import { currentMonthYear, statsToMarkdown } from '../services/statsService.js';
import { buildAnnual, annualToMarkdown } from '../services/annualService.js';
import { generateSpecPdf, SccsReportError } from '../services/sccsReportService.js';
import { buildMonthlyNetworkSpec, buildAnnualNetworkSpec } from '../services/networkReportSpec.js';

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;
const fail = (res: Response, err: any, msg: string, code = 500) => {
  console.error(msg, err);
  return res.status(code).json({ error: err?.message && code !== 500 ? err.message : msg });
};

const publicApiBase = (req: AuthRequest) => process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
const redirectUri = (req: AuthRequest) => `${publicApiBase(req)}/api/admin/settings/drive/oauth/callback`;

// ---------- Estatísticas ----------
export const monthlyStats = async (req: AuthRequest, res: Response) => {
  const month = String(req.query.month || currentMonthYear());
  if (!YM.test(month)) return res.status(400).json({ error: 'Mês inválido (use AAAA-MM)' });
  try {
    return res.json(await getMonthStats(month));
  } catch (e) {
    return fail(res, e, 'Erro ao calcular as estatísticas do mês');
  }
};

export const annualStats = async (req: AuthRequest, res: Response) => {
  const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);
  try {
    return res.json(await buildAnnual(year));
  } catch (e) {
    return fail(res, e, 'Erro ao consolidar o ano');
  }
};

export const annualMarkdown = async (req: AuthRequest, res: Response) => {
  const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);
  try {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-anual-${year}.md"`);
    return res.send(annualToMarkdown(await buildAnnual(year)));
  } catch (e) {
    return fail(res, e, 'Erro ao gerar o arquivo anual');
  }
};

export const listSnapshots = async (_req: AuthRequest, res: Response) => {
  const rows = await prisma.monthlySnapshot.findMany({
    orderBy: { monthYear: 'desc' },
    select: { monthYear: true, generatedAt: true, driveFileId: true },
  });
  return res.json(rows);
};

export const regenerateSnapshot = async (req: AuthRequest, res: Response) => {
  const { month } = req.params;
  if (!YM.test(month)) return res.status(400).json({ error: 'Mês inválido (use AAAA-MM)' });
  try {
    const snap = await generateSnapshot(month);
    return res.json({ monthYear: snap.monthYear, generatedAt: snap.generatedAt, driveFileId: snap.driveFileId });
  } catch (e) {
    return fail(res, e, 'Erro ao gerar a cópia do mês');
  }
};

export const snapshotMarkdown = async (req: AuthRequest, res: Response) => {
  const { month } = req.params;
  if (!YM.test(month)) return res.status(400).json({ error: 'Mês inválido (use AAAA-MM)' });
  const stats = await getMonthStats(month);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-geral-${month}.md"`);
  return res.send(statsToMarkdown(stats));
};

// ---------- Configuração do Google Drive ----------
export const getDriveSettings = async (req: AuthRequest, res: Response) => {
  try {
    return res.json({
      ...(await googleDriveService.status()),
      pendingPhotos: await pendingPhotoCount(),
      lastSyncAt: await getSetting('drive.lastSyncAt'),
      lastSyncResult: await getSetting('drive.lastSyncResult'),
      oauthRedirectUri: redirectUri(req),
      oauthClientId: await getSetting('drive.oauthClientId'),
    });
  } catch (e) {
    return fail(res, e, 'Erro ao ler a configuração do Drive');
  }
};

export const saveServiceAccount = async (req: AuthRequest, res: Response) => {
  const { json, rootFolder } = req.body || {};
  try {
    await googleDriveService.saveServiceAccount(String(json || ''), String(rootFolder || ''));
    return res.json({ ok: true });
  } catch (e) {
    return fail(res, e, 'Erro ao salvar', 400);
  }
};

export const saveOauthClient = async (req: AuthRequest, res: Response) => {
  const { clientId, clientSecret, rootFolder } = req.body || {};
  if (!clientId) return res.status(400).json({ error: 'Informe o ID do cliente OAuth.' });
  try {
    await googleDriveService.saveOauthClient(String(clientId), String(clientSecret || ''), String(rootFolder || ''));
    return res.json({ ok: true });
  } catch (e) {
    return fail(res, e, 'Erro ao salvar', 400);
  }
};

export const oauthStart = async (req: AuthRequest, res: Response) => {
  try {
    const state = jwt.sign({ purpose: 'drive-oauth', uid: req.user?.id }, ENV.JWT_SECRET, { expiresIn: '10m' });
    return res.json({ url: await googleDriveService.oauthUrl(redirectUri(req), state) });
  } catch (e) {
    return fail(res, e, 'Erro ao iniciar a conexão', 400);
  }
};

/** Rota pública: o Google redireciona o navegador para cá. A segurança vem do "state" assinado. */
export const oauthCallback = async (req: any, res: Response) => {
  const front = process.env.FRONTEND_URL || 'http://localhost:3000';
  try {
    const { code, state, error } = req.query;
    if (error) throw new Error(String(error));
    const decoded: any = jwt.verify(String(state), ENV.JWT_SECRET);
    if (decoded.purpose !== 'drive-oauth') throw new Error('estado inválido');
    await googleDriveService.oauthFinish(String(code), redirectUri(req));
    return res.redirect(`${front}/?drive=ok`);
  } catch (e) {
    return res.redirect(`${front}/?drive=erro&msg=${encodeURIComponent((e as Error).message)}`);
  }
};

export const testDrive = async (_req: AuthRequest, res: Response) => res.json(await googleDriveService.testConnection());

export const syncDrive = async (_req: AuthRequest, res: Response) => {
  const r = await syncPendingPhotos();
  return res.json({ ...r, pendingPhotos: await pendingPhotoCount() });
};

export const disconnectDrive = async (_req: AuthRequest, res: Response) => {
  await googleDriveService.disconnect();
  return res.json({ ok: true });
};

// ---------- PDFs oficiais da rede (padrão SCCS) ----------
const sendPdf = (res: Response, pdf: Buffer, name: string) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  return res.send(pdf);
};

export const monthlyPdf = async (req: AuthRequest, res: Response) => {
  const month = String(req.query.month || currentMonthYear());
  if (!YM.test(month)) return res.status(400).json({ error: 'Mês inválido (use AAAA-MM)' });
  try {
    return sendPdf(res, await generateSpecPdf(buildMonthlyNetworkSpec(await getMonthStats(month))), `relatorio-geral-${month}.pdf`);
  } catch (e) {
    const code = e instanceof SccsReportError ? e.status : 500;
    return fail(res, e, 'Erro ao gerar o PDF do mês', code === 500 ? 500 : code);
  }
};

export const annualPdf = async (req: AuthRequest, res: Response) => {
  const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);
  try {
    return sendPdf(res, await generateSpecPdf(buildAnnualNetworkSpec(await buildAnnual(year))), `relatorio-anual-${year}.pdf`);
  } catch (e) {
    const code = e instanceof SccsReportError ? e.status : 500;
    return fail(res, e, 'Erro ao gerar o PDF do ano', code === 500 ? 500 : code);
  }
};
