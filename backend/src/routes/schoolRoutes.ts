import { Router } from 'express';
import {
  createSchool,
  getSchools,
  updateSchool,
  deleteSchool,
  endVisit,
} from '../controllers/schoolController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticateToken, getSchools);
router.post('/', authenticateToken, requireAdmin, createSchool);
router.post('/:id/end-visit', authenticateToken, endVisit);
router.put('/:id', authenticateToken, requireAdmin, updateSchool);
router.delete('/:id', authenticateToken, requireAdmin, deleteSchool);

export default router;
