import express from 'express';
import propertyController from '../controllers/propertyController.js';
import { checkPropertyTables } from '../middleware/propertyTableCheck.js';

const router = express.Router();

// Get all amenities
router.get('/amenities', checkPropertyTables, propertyController.getAmenities);

// Get properties by owner ID
router.get('/properties/owner/:ownerId', checkPropertyTables, propertyController.getPropertiesByOwner);

// Get all properties
router.get('/properties/:userId', checkPropertyTables, propertyController.getAllProperties);

// Add new property
router.post('/add', checkPropertyTables, propertyController.addProperty);

// Update property
router.put('/update/:apn', checkPropertyTables, propertyController.updateProperty);

// Wishlist routes
router.post('/wish', checkPropertyTables, propertyController.addToWishlist);
router.delete('/unwish/:propertyId/:userId', checkPropertyTables, propertyController.removeFromWishlist);
router.get('/wishlist/:userId', checkPropertyTables, propertyController.getWishlist);

export default router; 