import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import * as c from '../controllers/adminController.js';

const router = Router();

// Público: retorno do login do Google (protegido pelo "state" assinado)
router.get('/settings/drive/oauth/callback', c.oauthCallback);

router.use(authenticateToken, requireAdmin);

router.get('/stats/monthly', c.monthlyStats);
router.get('/stats/annual', c.annualStats);
router.get('/stats/annual/markdown', c.annualMarkdown);
router.get('/stats/monthly/pdf', c.monthlyPdf);
router.get('/stats/annual/pdf', c.annualPdf);
router.get('/snapshots', c.listSnapshots);
router.post('/snapshots/:month/generate', c.regenerateSnapshot);
router.get('/snapshots/:month/markdown', c.snapshotMarkdown);

router.get('/settings/drive', c.getDriveSettings);
router.put('/settings/drive/service-account', c.saveServiceAccount);
router.put('/settings/drive/oauth', c.saveOauthClient);
router.get('/settings/drive/oauth/url', c.oauthStart);
router.post('/settings/drive/test', c.testDrive);
router.post('/settings/drive/sync', c.syncDrive);
router.delete('/settings/drive', c.disconnectDrive);

export default router;
