import express from 'express';
import { 
  getUserLocation, 
  saveUserLocation, 
  updateLocation, 
deleteUserLocation 
} from '../controllers/addressController.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/get-location', getUserLocation);
router.post('/save-location', saveUserLocation);
router.put('/update-location', updateLocation);
router.delete('/delete-location', deleteUserLocation);

export default router;