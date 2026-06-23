import express from 'express';
import { getProperties, getNearbyProperties, getPropertyDetails, getFavorites, toggleFavorite, recordPropertyClick } from '../controllers/buyer.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/properties', getProperties);
router.get('/properties/nearby', getNearbyProperties);
router.get('/properties/:propertyId', getPropertyDetails);
router.get('/favorites', getFavorites);
router.post('/favorites/:propertyId', toggleFavorite);
router.post('/properties/:propertyId/click', protect, recordPropertyClick);

export default router;
