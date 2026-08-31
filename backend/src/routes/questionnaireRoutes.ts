import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  toggleQuestionActive,
} from '../controllers/questionnaireController.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getQuestions);
router.post('/', createQuestion);
router.put('/reorder', reorderQuestions);
router.patch('/:id/toggle', toggleQuestionActive);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);

export default router;
