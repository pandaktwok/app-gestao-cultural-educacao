import { Router } from 'express';
import {
  getOrCreateMonthlyReport,
  saveMonthlyReport,
  getAnnualConsolidatedReport,
  questionReportField,
  resetReportStatus,
  getPendingFeedbackReports,
  deletePhotoAudit,
} from '../controllers/reportController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/monthly', authenticateToken, getOrCreateMonthlyReport);
router.post('/monthly', authenticateToken, saveMonthlyReport);
router.get('/monthly/pending-feedback', authenticateToken, getPendingFeedbackReports);
router.post('/monthly/:id/question', authenticateToken, requireAdmin, questionReportField);
router.post('/monthly/:id/reset', authenticateToken, requireAdmin, resetReportStatus);
router.get('/annual', authenticateToken, requireAdmin, getAnnualConsolidatedReport);
router.delete('/photos/:type/:id', authenticateToken, requireAdmin, deletePhotoAudit);

export default router;
