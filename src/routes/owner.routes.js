import express from 'express';
import { getDashboard, getListings, addProperty, initiatePayment } from '../controllers/owner.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
// import { protect } from '../middlewares/auth.middleware.js'; // Uncomment to enforce auth

const router = express.Router();

router.get('/dashboard', getDashboard);
router.get('/properties', getListings);

router.post('/properties/add', upload.fields([
  { name: 'photos[]', maxCount: 10 },
  { name: 'documents[]', maxCount: 5 }
]), addProperty);

router.post('/properties/pay', initiatePayment);

export default router;
