import express from 'express';
import { getStats, getListings, addProperty, getLeads, updateLeadTag } from '../controllers/broker.controller.js';

const router = express.Router();

router.get('/stats', getStats);
router.get('/listings', getListings);
router.post('/properties/add', addProperty);
router.get('/leads', getLeads);
router.patch('/leads/:leadId/tag', updateLeadTag);

export default router;
