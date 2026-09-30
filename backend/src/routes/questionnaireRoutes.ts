import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  toggleQuestionActive,
  getMyQuestions,
} from '../controllers/questionnaireController.js';

const router = Router();

router.use(authenticateToken);

router.get('/mine', getMyQuestions);
router.get('/', requireAdmin, getQuestions);
router.post('/', requireAdmin, createQuestion);
router.put('/reorder', requireAdmin, reorderQuestions);
router.patch('/:id/toggle', requireAdmin, toggleQuestionActive);
router.put('/:id', requireAdmin, updateQuestion);
router.delete('/:id', requireAdmin, deleteQuestion);

export default router;
