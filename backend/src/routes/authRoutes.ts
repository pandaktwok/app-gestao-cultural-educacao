import { Router } from 'express';
import {
  login,
  changePassword,
  createUser,
  getUsers,
  updateUserSchools,
  updateUser,
  deleteUser,
  resetUserPassword,
  setUserActive,
  getUserImpact,
} from '../controllers/authController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);

// Admin user management
router.post('/users', authenticateToken, requireAdmin, createUser);
router.get('/users', authenticateToken, requireAdmin, getUsers);
router.put('/users/:id/schools', authenticateToken, requireAdmin, updateUserSchools);

router.put('/users/:id', authenticateToken, requireAdmin, updateUser);
router.delete('/users/:id', authenticateToken, requireAdmin, deleteUser);
router.get('/users/:id/impact', authenticateToken, requireAdmin, getUserImpact);
router.post('/users/:id/reset-password', authenticateToken, requireAdmin, resetUserPassword);
router.patch('/users/:id/active', authenticateToken, requireAdmin, setUserActive);

export default router;
