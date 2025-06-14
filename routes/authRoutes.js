import express from 'express';
import authController from '../controllers/authController.js';
import { checkAuthTables } from '../middleware/authTableCheck.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register route
router.post('/register', checkAuthTables, authController.register);

// Login route
router.post('/login', checkAuthTables, authController.login);

// Get user data route
router.get('/me', authenticateToken, authController.getUserFromToken);

// Update user profile route
router.put('/update', authenticateToken, authController.updateUser);

export default router; 