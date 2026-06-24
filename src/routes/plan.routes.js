import express from 'express';
import { getPlans } from '../controllers/plan.controller.js';

const router = express.Router();

// Public endpoint – returns all enabled subscription plans
router.get('/', getPlans);

export default router;
