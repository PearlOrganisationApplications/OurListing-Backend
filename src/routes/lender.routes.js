import express from 'express';
import { getDashboard, getMortgages, getMortgageById } from '../controllers/lender.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/lender/dashboard  – requires Authorization: Bearer <token>
router.get('/dashboard', protect, getDashboard);

// GET /api/lender/mortgages  – requires Authorization: Bearer <token>
router.get('/mortgages', protect, getMortgages);

// GET /api/lender/mortgages/:id  – requires Authorization: Bearer <token>
router.get('/mortgages/:id', protect, getMortgageById);

export default router;
