import express from 'express';
import { calculateServerMatchScore } from '../controllers/matchingController.js';
import { verifySupabaseToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/score', verifySupabaseToken, calculateServerMatchScore);

export default router;
