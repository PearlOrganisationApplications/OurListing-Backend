import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getStats,
  getListings,
  addProperty,
  getLeads,
  updateLeadTag,
  deleteProperty,
  updateProperty,
} from '../controllers/broker.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

// Setup multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Replace brackets in fieldname for cleaner filename
    const cleanFieldName = file.fieldname.replace(/\[\]/g, '');
    cb(null, cleanFieldName + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Role check middleware for broker
const brokerProtect = (req, res, next) => {
  if (req.user && req.user.role === 'broker') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Broker role required.' });
  }
};

const router = express.Router();

// Apply auth protection & role check to all routes
router.get('/stats', protect, brokerProtect, getStats);
router.get('/listings', protect, brokerProtect, getListings);

router.post(
  '/properties/add',
  protect,
  brokerProtect,
  upload.fields([
    { name: 'photos[]', maxCount: 10 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents[]', maxCount: 10 },
    { name: 'documents', maxCount: 10 },
  ]),
  addProperty
);


router.put("/update/:id", protect, upload.fields([
    { name: 'photos[]', maxCount: 10 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents[]', maxCount: 10 },
    { name: 'documents', maxCount: 10 },
  ]), updateProperty)

router.get('/leads', protect, brokerProtect, getLeads);
router.patch('/leads/:leadId/tag', protect, brokerProtect, updateLeadTag);
router.delete("/delete/:id", protect, deleteProperty);

export default router;
