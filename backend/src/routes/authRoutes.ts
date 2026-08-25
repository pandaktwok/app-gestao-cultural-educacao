import { Router } from 'express';
import {
  login,
  changePassword,
  createUser,
  getUsers,
  updateUserSchools,
} from '../controllers/authController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);

// Admin user management
router.post('/users', authenticateToken, requireAdmin, createUser);
router.get('/users', authenticateToken, requireAdmin, getUsers);
router.put('/users/:id/schools', authenticateToken, requireAdmin, updateUserSchools);

export default router;
