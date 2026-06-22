import express from 'express';
import { getProperties, getNearbyProperties, getPropertyDetails, getFavorites, toggleFavorite } from '../controllers/buyer.controller.js';

const router = express.Router();

router.get('/properties', getProperties);
router.get('/properties/nearby', getNearbyProperties);
router.get('/properties/:propertyId', getPropertyDetails);
router.get('/favorites', getFavorites);
router.post('/favorites/:propertyId', toggleFavorite);

export default router;
