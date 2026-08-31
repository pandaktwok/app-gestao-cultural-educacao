import { Router } from 'express';
import { issueCertificate, verifyCertificatePublic } from '../controllers/certificateController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Private endpoint for issuing/fetching certificate
router.post('/issue', authenticateToken, issueCertificate);

// Public endpoint for QR Code verification
router.get('/verify/:hash', verifyCertificatePublic);

export default router;
