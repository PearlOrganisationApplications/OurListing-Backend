import express from 'express';
import { getProperties, getNearbyProperties, getPropertyDetails, getFavorites, toggleFavorite, recordPropertyClick, searchProperties, getSpecialUsers, getPropertiesByLocation } from '../controllers/buyer.controller.js';
import { protect, optionalProtect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes — optionalProtect sets req.user if token sent, lets guests through
router.get('/properties', optionalProtect, getProperties);
router.get('/properties/nearby', optionalProtect, getNearbyProperties);
router.get('/properties/:propertyId', optionalProtect, getPropertyDetails);

// Protected routes — require valid JWT
router.get('/favorites', protect, getFavorites);
router.get("/search-properties", searchProperties)
router.post('/favorites/:propertyId', protect, toggleFavorite);
router.post('/properties/:propertyId/click', protect, recordPropertyClick);
router.get("/get-special-users", getSpecialUsers);
router.get("/location-search", getPropertiesByLocation);

export default router;
