import express from 'express';
import { getProperties, getNearbyProperties, getPropertyDetails, getFavorites, toggleFavorite } from '../controllers/buyer.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/properties', getProperties);
router.get('/properties/nearby', getNearbyProperties);
router.get('/properties/:propertyId', getPropertyDetails);
router.get('/favorites', protect, getFavorites);
router.post('/favorites/:propertyId', protect, toggleFavorite);

export default router;
