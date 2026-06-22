import express from 'express';
import { getDashboard, getListings, addProperty } from '../controllers/owner.controller.js';

const router = express.Router();

router.get('/dashboard', getDashboard);
router.get('/properties', getListings);
router.post('/properties/add', addProperty); // Note: also uses /properties/pay

export default router;
