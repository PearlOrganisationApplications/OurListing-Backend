import express from 'express';
import { getDashboard, getListings, addProperty, initiatePayment, capturePayment,updateOwnerProperty, deleteOwnerProperty, getOwnerPerformance} from '../controllers/owner.controller.js';
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
router.patch('/properties/update/:id', protect, upload.fields([
  { name: 'photos[]', maxCount: 10 },
  { name: 'documents[]', maxCount: 5 }
]), updateOwnerProperty);

router.delete('/properties/delete/:id', protect, deleteOwnerProperty);
router.post('/properties/pay', protect, initiatePayment);
router.post('/properties/pay/capture', protect, capturePayment);
router.get("/performance-stats", protect, getOwnerPerformance);

export default router;
