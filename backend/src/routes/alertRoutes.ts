import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import { listAlerts, createAlert, deleteAlert, myAlerts, ackAlert } from '../controllers/alertController.js';

const router = Router();
router.use(authenticateToken);

router.get('/mine', myAlerts);
router.post('/:id/ack', ackAlert);
router.get('/', requireAdmin, listAlerts);
router.post('/', requireAdmin, createAlert);
router.delete('/:id', requireAdmin, deleteAlert);

export default router;
