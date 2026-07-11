import express from 'express';
import { login, register, logout,getUserProfile, updateUserProfile, searchProperties } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', protect, getUserProfile);
router.put("/update-profile", protect, updateUserProfile);
router.get("/search", protect, searchProperties);

export default router;
