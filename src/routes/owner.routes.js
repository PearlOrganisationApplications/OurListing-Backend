import express from 'express';
import { getDashboard, getListings, addProperty, initiatePayment, capturePayment } from '../controllers/owner.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

<<<<<<< HEAD
=======
// All owner routes require a valid JWT (role: owner)
>>>>>>> d091185a41545c89c55507b9d1289bb3faa39fb9
router.get('/dashboard', protect, getDashboard);
router.get('/properties', protect, getListings);

router.post('/properties/add', protect, upload.fields([
  { name: 'photos[]', maxCount: 10 },
  { name: 'documents[]', maxCount: 5 }
]), addProperty);

router.post('/properties/pay', protect, initiatePayment);
<<<<<<< HEAD
router.post('/properties/pay/capture', protect, capturePayment);
=======
>>>>>>> d091185a41545c89c55507b9d1289bb3faa39fb9

export default router;
