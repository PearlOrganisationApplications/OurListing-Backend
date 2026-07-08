import express from 'express';
import { login, register, logout,getUserProfile } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', protect, getUserProfile);

export default router;
