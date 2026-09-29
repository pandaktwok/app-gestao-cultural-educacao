import app from './app.js';
import { ENV } from './config/env.js';
import { seedAdminIfEmpty } from './controllers/authController.js';
import { checkSccsEnvironment } from './services/sccsReportService.js';
import { startSnapshotScheduler } from './services/snapshotService.js';
import { syncPendingPhotos } from './services/driveSyncService.js';

app.listen(ENV.PORT, async () => {
  console.log(`🚀 Servidor Backend executando na porta ${ENV.PORT}`);
  await seedAdminIfEmpty();
  checkSccsEnvironment().catch(() => {});
  // Cópia mensal automática das estatísticas + reenvio de fotos pendentes ao Drive
  startSnapshotScheduler();
  setInterval(() => syncPendingPhotos().catch(() => {}), 10 * 60 * 1000);
});
