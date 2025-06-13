import express from 'express';
import propertyController from '../controllers/propertyController.js';
import { checkPropertyTables } from '../middleware/propertyTableCheck.js';

const router = express.Router();

// Get all amenities
router.get('/amenities', checkPropertyTables, propertyController.getAmenities);

// Get properties by owner ID
router.get('/properties/owner/:ownerId', checkPropertyTables, propertyController.getPropertiesByOwner);

// Get all properties
router.get('/properties', checkPropertyTables, propertyController.getAllProperties);

// Add new property
router.post('/add', checkPropertyTables, propertyController.addProperty);

export default router; 