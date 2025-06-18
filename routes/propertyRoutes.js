import express from 'express';
import propertyController from '../controllers/propertyController.js';
import { checkPropertyTables } from '../middleware/propertyTableCheck.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all amenities
router.get('/amenities', authenticateToken, checkPropertyTables, propertyController.getAmenities);

// Get properties by owner ID
router.get('/properties_owner', authenticateToken, checkPropertyTables, propertyController.getPropertiesByOwner);

// Get all properties
router.get('/properties', authenticateToken, checkPropertyTables, propertyController.getAllProperties);

// Add new property
router.post('/add', authenticateToken, checkPropertyTables, propertyController.addProperty);

// Update property
router.put('/update/:apn', authenticateToken, checkPropertyTables, propertyController.updateProperty);

// Wishlist routes
router.post('/wish', authenticateToken, checkPropertyTables, propertyController.addToWishlist);
router.delete('/unwish/:propertyId', authenticateToken, checkPropertyTables, propertyController.removeFromWishlist);

export default router; 