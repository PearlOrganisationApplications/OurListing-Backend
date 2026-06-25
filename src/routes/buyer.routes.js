import express from 'express';
import { getProperties, getNearbyProperties, getPropertyDetails, getFavorites, toggleFavorite, recordPropertyClick, searchProperties, getSpecialUsers, getPropertiesByLocation } from '../controllers/buyer.controller.js';
import { protect, optionalProtect } from '../middlewares/auth.middleware.js';
const router = express.Router();

// Public browsing — optionalProtect attaches req.user if a valid token is sent,
// but never blocks the request. Guests can browse; logged-in users get accurate isFavorite.
router.get('/properties', optionalProtect, getProperties);
router.get('/properties/nearby', optionalProtect, getNearbyProperties);
router.get('/properties/:propertyId', optionalProtect, getPropertyDetails);

// Favorites require a logged-in user
router.get('/favorites', protect, getFavorites);
router.post('/favorites/:propertyId', protect, toggleFavorite);
router.post('/properties/:propertyId/click', protect, recordPropertyClick);
router.get("/get-special-users", getSpecialUsers);
router.get("/location-search", getPropertiesByLocation);

export default router;