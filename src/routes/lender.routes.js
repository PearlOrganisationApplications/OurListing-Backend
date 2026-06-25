import express from 'express';
import {
  getDashboard,
  getHotLeads,
  getPendingApprovals,
  getPipeline,
  getMortgages,
  createMortgageListing,
  createApplication,
  updateApplicationStatus,
  createPipelineEntry,
  updatePipelineStage,
} from '../controllers/lender.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ── Dashboard ──────────────────────────────────────────────────────────────
// GET /api/lender/dashboard
router.get('/dashboard', protect, getDashboard);

// ── Hot Leads ──────────────────────────────────────────────────────────────
// GET /api/lender/hot-leads
router.get('/hot-leads', protect, getHotLeads);

// ── Pending Approvals ──────────────────────────────────────────────────────
// GET /api/lender/pending-approvals
router.get('/pending-approvals', protect, getPendingApprovals);

// ── Active Pipeline ────────────────────────────────────────────────────────
// GET /api/lender/pipeline?status=Active|Approved|Draft
router.get('/pipeline', protect, getPipeline);

// ── Mortgages / Market ─────────────────────────────────────────────────────
// GET /api/lender/mortgages
router.get('/mortgages', protect, getMortgages);

// POST /api/lender/mortgages  ← seed a marketplace listing for testing
router.post('/mortgages', protect, createMortgageListing);

// ── Applications CRUD ──────────────────────────────────────────────────────
// POST /api/lender/applications
router.post('/applications', protect, createApplication);

// PATCH /api/lender/applications/:id/status
router.patch('/applications/:id/status', protect, updateApplicationStatus);

// ── Pipeline CRUD ──────────────────────────────────────────────────────────
// POST /api/lender/pipeline
router.post('/pipeline', protect, createPipelineEntry);

// PATCH /api/lender/pipeline/:id/stage
router.patch('/pipeline/:id/stage', protect, updatePipelineStage);

export default router;
