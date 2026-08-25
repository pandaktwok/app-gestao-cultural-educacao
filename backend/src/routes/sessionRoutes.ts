import { Router } from 'express';
import {
  createAttendanceSession,
  addRehearsalPhotos,
  createEventSession,
  addEventPhotos,
  getSchoolSessionHistory,
  getAllEvents,
} from '../controllers/sessionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/attendance', authenticateToken, createAttendanceSession);
router.post('/rehearsals', authenticateToken, addRehearsalPhotos);
router.post('/events', authenticateToken, createEventSession);
router.post('/events/:eventId/photos', authenticateToken, addEventPhotos);
router.get('/events/all', authenticateToken, getAllEvents);
router.get('/school/:schoolId', authenticateToken, getSchoolSessionHistory);

export default router;
