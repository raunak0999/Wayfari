import express from 'express';
import { triggerSafetyCheckin } from '../controllers/checkinController.js';
import { verifySupabaseToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifySupabaseToken, triggerSafetyCheckin);

export default router;
