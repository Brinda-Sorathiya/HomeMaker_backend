import express from 'express';
import reviewController from '../controllers/reviewController.js';
import { checkReviewTables } from '../middleware/reviewTableCheck.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/:apn', authenticateToken, checkReviewTables, reviewController.getMessage);
router.post('/send', authenticateToken, checkReviewTables, reviewController.sendMessage);
router.put('/edit', authenticateToken, checkReviewTables, reviewController.editMessage);

export default router; 