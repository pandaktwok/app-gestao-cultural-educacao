import { Router } from 'express';
import {
  createStudent,
  getStudentsBySchool,
  getStudentHistory,
  markDropout,
  deleteStudent,
} from '../controllers/studentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/school/:schoolId', authenticateToken, getStudentsBySchool);
router.get('/:id/history', authenticateToken, getStudentHistory);
router.post('/', authenticateToken, createStudent);
router.patch('/:id/dropout', authenticateToken, markDropout);
router.delete('/:id', authenticateToken, deleteStudent);

export default router;
