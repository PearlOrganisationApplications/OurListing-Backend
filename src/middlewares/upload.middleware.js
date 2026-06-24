import multer from 'multer';
import path from 'path';
import StorageService from '../services/storage.service.js';

// ─── 1. DISK STORAGE — named export { upload } ────────────────────────────────
// Used by: owner.routes.js, broker.routes.js (property photo/doc upload)
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ─── 2. MEMORY STORAGE — default export uploadMiddleware ──────────────────────
// Used by: chat.routes.js (file messages via StorageService)
const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allAllowedMimes = Object.values(StorageService.ALLOWED_MIMES).flat();
  if (allAllowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}.`), false);
  }
};

const memoryUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
});

const single = (req, res, next) => {
  memoryUpload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const msgs = {
        LIMIT_FILE_SIZE: 'File too large. Max 100MB.',
        LIMIT_FILE_COUNT: 'Only one file per upload.',
        LIMIT_UNEXPECTED_FILE: 'Use "file" as the field name.',
      };
      return res.status(400).json({ success: false, message: msgs[err.code] || err.message });
    }
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided.' });
    next();
  });
};

const optional = (req, res, next) => {
  memoryUpload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const msgs = {
        LIMIT_FILE_SIZE: 'File too large. Max 100MB.',
        LIMIT_FILE_COUNT: 'Only one file per upload.',
        LIMIT_UNEXPECTED_FILE: 'Use "file" as the field name.',
      };
      return res.status(400).json({ success: false, message: msgs[err.code] || err.message });
    }
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
};

const uploadMiddleware = { single, optional };
export default uploadMiddleware;
