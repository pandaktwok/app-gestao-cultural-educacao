import { prisma } from '../prismaClient.js';
import { googleDriveService } from './googleDriveService.js';
import { setSetting } from './settingsService.js';

let running = false;

const pendingWhere = {
  photoUrl: { startsWith: 'data:' },
  googleDriveFileId: null,
};

const stamp = (d: Date) => d.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');

export async function pendingPhotoCount(): Promise<number> {
  const [a, b] = await Promise.all([
    prisma.rehearsalPhoto.count({ where: pendingWhere }),
    prisma.eventPhoto.count({ where: pendingWhere }),
  ]);
  return a + b;
}

/** Envia ao Drive todas as fotos que ainda não foram (ensaios e eventos). Seguro para chamar várias vezes. */
export async function syncPendingPhotos(limit = 300): Promise<{ uploaded: number; failed: number; skipped: boolean }> {
  if (running) return { uploaded: 0, failed: 0, skipped: true };
  if (!(await googleDriveService.isConfigured())) return { uploaded: 0, failed: 0, skipped: true };
  running = true;
  let uploaded = 0;
  let failed = 0;
  try {
    const rehearsals = await prisma.rehearsalPhoto.findMany({
      where: pendingWhere,
      include: { school: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    for (const p of rehearsals) {
      const folder = await googleDriveService.ensureFolder(p.school.name, p.date, 'Ensaios').catch(() => null);
      if (!folder) { failed++; continue; }
      const id = await googleDriveService.uploadDataUrl(p.photoUrl, `Ensaio_${stamp(p.originalTimestamp || p.date)}_${p.id.slice(0, 6)}.jpg`, folder);
      if (id) {
        await prisma.rehearsalPhoto.update({ where: { id: p.id }, data: { googleDriveFileId: id } });
        uploaded++;
      } else failed++;
    }

    const eventPhotos = await prisma.eventPhoto.findMany({
      where: pendingWhere,
      include: { eventSession: { include: { school: { select: { name: true } } } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    for (const p of eventPhotos) {
      const ev = p.eventSession;
      const folder = await googleDriveService.ensureFolder(ev.school.name, ev.date, 'Eventos').catch(() => null);
      if (!folder) { failed++; continue; }
      const clean = ev.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
      const id = await googleDriveService.uploadDataUrl(p.photoUrl, `Evento_${clean}_${stamp(ev.date)}_${p.id.slice(0, 6)}.jpg`, folder);
      if (id) {
        await prisma.eventPhoto.update({ where: { id: p.id }, data: { googleDriveFileId: id } });
        uploaded++;
      } else failed++;
    }

    await setSetting('drive.lastSyncAt', new Date().toISOString());
    await setSetting('drive.lastSyncResult', `${uploaded} enviada(s), ${failed} com falha`);
  } catch (err) {
    console.error('Drive sync error:', err);
  } finally {
    running = false;
  }
  return { uploaded, failed, skipped: false };
}

/** Dispara o envio em segundo plano sem atrasar a resposta ao professor. */
export function triggerSync() {
  setTimeout(() => {
    syncPendingPhotos().catch((e) => console.error('Drive sync (background):', e));
  }, 50);
}
