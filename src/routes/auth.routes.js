import express from 'express';
import { login, register, logout,getUserProfile, updateUserProfile, searchProperties } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { upload } from "../middlewares/upload.middleware.js"

const router = express.Router();

router.post('/register', upload.single("profilePic"),register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', protect, getUserProfile);
router.put("/update-profile", protect, updateUserProfile);
router.get("/search", protect, searchProperties);

export default router;
