import express from 'express';
import { getDashboard, getMortgages } from '../controllers/lender.controller.js';

const router = express.Router();

router.get('/dashboard', getDashboard);
router.get('/mortgages', getMortgages);

export default router;
