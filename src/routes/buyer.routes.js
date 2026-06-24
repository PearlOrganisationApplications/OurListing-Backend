import express from 'express';
import { getProperties, getNearbyProperties, getPropertyDetails, getFavorites, toggleFavorite } from '../controllers/buyer.controller.js';
import { protect, optionalProtect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes — optionalProtect sets req.user if token is sent, lets guests through
router.get('/properties', optionalProtect, getProperties);
router.get('/properties/nearby', optionalProtect, getNearbyProperties);
router.get('/properties/:propertyId', optionalProtect, getPropertyDetails);

// Protected routes — require valid JWT
router.get('/favorites', protect, getFavorites);
router.post('/favorites/:propertyId', protect, toggleFavorite);

export default router;
