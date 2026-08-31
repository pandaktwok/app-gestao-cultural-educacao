import { Router } from 'express';
import {
  createSchool,
  getSchools,
  updateSchool,
  deleteSchool,
  endVisit,
  getSchoolDetails,
  getAlertsSummary,
} from '../controllers/schoolController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticateToken, getSchools);
router.get('/alerts/summary', authenticateToken, requireAdmin, getAlertsSummary);
router.get('/:id/details', authenticateToken, getSchoolDetails);
router.post('/', authenticateToken, requireAdmin, createSchool);
router.post('/:id/end-visit', authenticateToken, endVisit);
router.put('/:id', authenticateToken, requireAdmin, updateSchool);
router.delete('/:id', authenticateToken, requireAdmin, deleteSchool);

export default router;
