import express from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';

const router = express.Router();

// GET /recommendations/:propertyId
router.get('/:propertyId', getRecommendations);

export default router; 