import express from 'express';
import { getDashboard, getListings, addProperty, initiatePayment } from '../controllers/owner.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All owner routes require a valid JWT (role: owner)
router.get('/dashboard', protect, getDashboard);
router.get('/properties', protect, getListings);

router.post('/properties/add', protect, upload.fields([
  { name: 'photos[]', maxCount: 10 },
  { name: 'documents[]', maxCount: 5 }
]), addProperty);

router.post('/properties/pay', protect, initiatePayment);

export default router;
