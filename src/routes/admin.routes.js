import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  adminRegister,
  adminLogin,
  getAdminProfile,
  getDashboardStats,

  // User CRUD
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,

  // Property CRUD
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,

  // Lead CRUD
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,

  // Mortgage CRUD
  getAllMortgages,
  getMortgageById,
  createMortgage,
  updateMortgage,
  deleteMortgage,
  getAllBuyers,
  getAllOwners,
  getAllBrokers,
  getAllLenders,
  updateBuyer,
  deleteBuyer,
  updateOwner,
  deleteOwner,
  updateBroker,
  deleteBroker,
  updateLender,
  deleteLender,
  createLoan,
  getAllLoans,
  approveLoan,
  rejectLoan,
  getLoanById,
  updateLoan,
  deleteLoan,
  getMyLoans
} from '../controllers/admin.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

// Setup multer storage for property photo and document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanFieldName = file.fieldname.replace(/\[\]/g, '');
    cb(null, cleanFieldName + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Role check middleware for admin
const adminProtect = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

const router = express.Router();

// --- AUTH ROUTES (Public / Protected) ---
router.post('/register', adminRegister);
router.post('/login', adminLogin);
router.get('/profile', protect, adminProtect, getAdminProfile);

// --- DASHBOARD ROUTE ---
router.get('/dashboard/stats', protect, adminProtect, getDashboardStats);

// --- USER CRUD ROUTES ---
router.get('/users', protect, adminProtect, getAllUsers);
router.get('/users/:id', protect, adminProtect, getUserById);
router.post('/users', protect, adminProtect, createUser);
router.put('/users/:id', protect, adminProtect, updateUser);
router.delete('/users/:id', protect, adminProtect, deleteUser);

// --- PROPERTY CRUD ROUTES ---
router.get('/properties', protect, adminProtect, getAllProperties);
router.get('/properties/:id', protect, adminProtect, getPropertyById);
router.post(
  '/properties',
  protect,
  adminProtect,
  upload.fields([
    { name: 'photos[]', maxCount: 10 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents[]', maxCount: 10 },
    { name: 'documents', maxCount: 10 },
  ]),
  createProperty
);
router.put(
  '/properties/:id',
  protect,
  adminProtect,
  upload.fields([
    { name: 'photos[]', maxCount: 10 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents[]', maxCount: 10 },
    { name: 'documents', maxCount: 10 },
  ]),
  updateProperty
);
router.delete('/properties/:id', protect, adminProtect, deleteProperty);

// --- LEAD CRUD ROUTES ---
router.get('/leads', protect, adminProtect, getAllLeads);
router.get('/leads/:id', protect, adminProtect, getLeadById);
router.post('/leads', protect, adminProtect, createLead);
router.put('/leads/:id', protect, adminProtect, updateLead);
router.delete('/leads/:id', protect, adminProtect, deleteLead);

// --- MORTGAGE LISTING CRUD ROUTES ---
router.get('/mortgages', protect, adminProtect, getAllMortgages);
router.get('/mortgages/:id', protect, adminProtect, getMortgageById);
router.post('/mortgages', protect, adminProtect, createMortgage);
router.put('/mortgages/:id', protect, adminProtect, updateMortgage);
router.delete('/mortgages/:id', protect, adminProtect, deleteMortgage);


router.get("/all/buyers", protect, adminProtect, getAllBuyers);

router.get("/all/owners", protect, adminProtect, getAllOwners);

router.get("/all/brokers", protect, adminProtect, getAllBrokers);

router.get("/all/lenders", protect, adminProtect, getAllLenders);
router.put("/buyers/:id", protect, adminProtect, updateBuyer);
router.delete("/buyers/:id", protect, adminProtect, deleteBuyer);

router.put("/owners/:id", protect, adminProtect, updateOwner);
router.delete("/owners/:id", protect, adminProtect, deleteOwner);

router.put("/brokers/:id", protect, adminProtect, updateBroker);
router.delete("/brokers/:id", protect, adminProtect, deleteBroker);

router.put("/lenders/:id", protect, adminProtect, updateLender);
router.delete("/lenders/:id", protect, adminProtect, deleteLender);


//loan 
router.post("/loans", protect, adminProtect, createLoan);

router.get("/loans", protect, adminProtect, getAllLoans);

router.get("/loans/my", protect, adminProtect, getMyLoans);

router.get("/loans/:id", protect, adminProtect, getLoanById);

router.put("/loans/:id", protect, adminProtect, updateLoan);

router.delete("/loans/:id", protect, adminProtect, deleteLoan);

router.put("/loans/:id/approve", protect, adminProtect, approveLoan);

router.put("/loans/:id/reject", protect, adminProtect, rejectLoan);

export default router;
