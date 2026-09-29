import fs from 'fs';
import path from 'path';
import { prisma } from '../prismaClient.js';
import { buildMonthStats, currentMonthYear, monthRange, statsToMarkdown, MonthStats } from './statsService.js';
import { googleDriveService } from './googleDriveService.js';

const DIR = process.env.SNAPSHOT_DIR || path.join(process.cwd(), 'data', 'snapshots');

/** Gera (ou atualiza) a cópia de segurança do mês: banco + arquivos .json/.md + Google Drive. */
export async function generateSnapshot(monthYear: string) {
  const stats = await buildMonthStats(monthYear);
  const markdown = statsToMarkdown(stats);
  const payload = JSON.stringify(stats);

  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, `${monthYear}.json`), payload);
  fs.writeFileSync(path.join(DIR, `${monthYear}.md`), markdown);

  let driveFileId: string | null = null;
  try {
    const folder = await googleDriveService.ensureRootSubfolder('_Relatorios_Mensais');
    if (folder) {
      await googleDriveService.upsertTextFile(`${monthYear}.json`, payload, 'application/json', folder);
      driveFileId = await googleDriveService.upsertTextFile(`${monthYear}.md`, markdown, 'text/markdown', folder);
    }
  } catch (err) {
    console.error('Snapshot: não foi possível enviar ao Drive:', (err as Error).message);
  }

  return prisma.monthlySnapshot.upsert({
    where: { monthYear },
    create: { monthYear, payload, markdown, driveFileId },
    update: { payload, markdown, driveFileId: driveFileId ?? undefined, generatedAt: new Date() },
  });
}

/** Meses fechados usam a cópia gravada (mesmo que dados sejam apagados depois); o mês atual é calculado na hora. */
export async function getMonthStats(monthYear: string): Promise<MonthStats> {
  if (monthYear < currentMonthYear()) {
    const snap = await prisma.monthlySnapshot.findUnique({ where: { monthYear } });
    if (snap) return JSON.parse(snap.payload) as MonthStats;
  }
  return buildMonthStats(monthYear);
}

/** Garante cópias de todos os meses com atividade até o mês passado e atualiza a do mês atual. */
export async function ensureSnapshots() {
  try {
    const first = await prisma.attendanceSession.findFirst({ orderBy: { date: 'asc' }, select: { date: true } });
    const nowYm = currentMonthYear();
    if (first) {
      const br = new Date(first.date.getTime() - 3 * 3600 * 1000);
      let y = br.getUTCFullYear();
      let m = br.getUTCMonth() + 1;
      for (;;) {
        const ym = `${y}-${String(m).padStart(2, '0')}`;
        if (ym >= nowYm) break;
        const exists = await prisma.monthlySnapshot.findUnique({ where: { monthYear: ym }, select: { id: true } });
        if (!exists) {
          await generateSnapshot(ym);
          console.log(`📦 Cópia mensal criada: ${ym}`);
        }
        m++;
        if (m > 12) { m = 1; y++; }
      }
    }
    const cur = await prisma.monthlySnapshot.findUnique({ where: { monthYear: nowYm }, select: { generatedAt: true } });
    if (!cur || Date.now() - cur.generatedAt.getTime() > 6 * 3600 * 1000) await generateSnapshot(nowYm);
  } catch (err) {
    console.error('Erro ao garantir cópias mensais:', err);
  }
}

export function startSnapshotScheduler() {
  ensureSnapshots();
  setInterval(ensureSnapshots, 60 * 60 * 1000); // confere a cada hora
}

export { monthRange };
