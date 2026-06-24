import express from 'express';
<<<<<<< HEAD
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
=======
import { getProperties, getNearbyProperties, getPropertyDetails, getFavorites, toggleFavorite, recordPropertyClick } from '../controllers/buyer.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/properties', getProperties);
router.get('/properties/nearby', getNearbyProperties);
router.get('/properties/:propertyId', getPropertyDetails);
router.get('/favorites', getFavorites);
router.post('/favorites/:propertyId', toggleFavorite);
router.post('/properties/:propertyId/click', protect, recordPropertyClick);
>>>>>>> 97e0578f7fb3691377732259bb7aedd288649f68

export default router;
