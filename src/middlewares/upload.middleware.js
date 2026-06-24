import multer from 'multer';
import StorageService from '../services/storage.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD MIDDLEWARE
// Uses memory storage — file lives in buffer, Sharp processes it,
// then storage.service.js writes to disk (or S3/Cloudinary after migration)
//
// MIGRATION NOTE:
// This file never changes on migration. It only validates and passes
// file.buffer to StorageService.save() — storage destination is
// StorageService's concern, not this file's.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Memory storage ───────────────────────────────────────────────────────────
// We use memoryStorage so Sharp can process the buffer before writing
// No temp files written to disk — cleaner and faster
const storage = multer.memoryStorage();

// ─── File filter ─────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allAllowedMimes = Object.values(StorageService.ALLOWED_MIMES).flat();

  if (allAllowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Allowed types: images, videos, audio, documents.`
      ),
      false
    );
  }
};

// ─── Multer instance ─────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB hard cap — per-type limits handled in StorageService
    files: 1,                     // one file per request
  },
});

// ─── Middleware wrappers ──────────────────────────────────────────────────────
// Wrapping multer in a promise so we can catch errors cleanly in controller
// instead of multer's default error handling which bypasses express error flow

/**
 * Single file upload middleware
 * Field name: 'file'
 * Usage: router.post('/upload', uploadMiddleware.single, controller)
 */
const single = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      const messages = {
        LIMIT_FILE_SIZE: 'File too large. Maximum allowed size is 100MB.',
        LIMIT_FILE_COUNT: 'Only one file allowed per upload.',
        LIMIT_UNEXPECTED_FILE: 'Unexpected field name. Use "file" as field name.',
      };

      return res.status(400).json({
        success: false,
        message: messages[err.code] || `Upload error: ${err.message}`,
      });
    }

    if (err) {
      // fileFilter rejections and other errors
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // No file attached
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided. Please attach a file.',
      });
    }

    next();
  });
};

/**
 * Optional single file — doesn't error if no file attached
 * Used for message send endpoint where file is optional (text messages)
 * Usage: router.post('/send', uploadMiddleware.optional, controller)
 */
const optional = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: 'File too large. Maximum allowed size is 100MB.',
        LIMIT_FILE_COUNT: 'Only one file allowed per upload.',
        LIMIT_UNEXPECTED_FILE: 'Unexpected field name. Use "file" as field name.',
      };

      return res.status(400).json({
        success: false,
        message: messages[err.code] || `Upload error: ${err.message}`,
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // No file is fine — text message
    next();
  });
};

// ─── Export ───────────────────────────────────────────────────────────────────
const uploadMiddleware = {
  single,
  optional,
};

export default uploadMiddleware;
import path from 'path';

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Initialize upload
export const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB limit
});
