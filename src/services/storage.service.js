import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Base upload path ────────────────────────────────────────────────────────
// MIGRATION NOTE: When switching to S3/Cloudinary, remove this and use
// their SDK instead. Everything else in this file stays the same shape.
const UPLOAD_BASE = path.join(process.cwd(), 'uploads');

// ─── Folder map by type ──────────────────────────────────────────────────────
const FOLDERS = {
  image: 'images',
  video: 'videos',
  audio: 'audio',
  document: 'documents',
};

// ─── Max sizes ───────────────────────────────────────────────────────────────
const LIMITS = {
  image: 10 * 1024 * 1024,     // 10MB
  video: 100 * 1024 * 1024,    // 100MB
  audio: 20 * 1024 * 1024,     // 20MB
  document: 25 * 1024 * 1024,  // 25MB
};

// ─── Allowed mime types ──────────────────────────────────────────────────────
const ALLOWED_MIMES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detect media type from mime type
 */
const getMediaType = (mimeType) => {
  for (const [type, mimes] of Object.entries(ALLOWED_MIMES)) {
    if (mimes.includes(mimeType)) return type;
  }
  return null;
};

/**
 * Generate a unique filename — keeps original extension
 */
const generateFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${unique}${ext}`;
};

/**
 * Ensure upload directories exist
 */
const ensureDirs = () => {
  Object.values(FOLDERS).forEach((folder) => {
    const dir = path.join(UPLOAD_BASE, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Thumbnails folder
  const thumbDir = path.join(UPLOAD_BASE, 'thumbnails');
  if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir, { recursive: true });
  }
};

// ─── Core storage functions ───────────────────────────────────────────────────
// MIGRATION NOTE: These 3 functions (save, delete, getUrl) are the only
// ones you replace when switching to S3/Cloudinary. Their signature never
// changes so nothing else in the codebase breaks.

/**
 * Save file to local storage
 * MIGRATION → Replace body of this function with S3 putObject or
 *             Cloudinary uploader.upload() — return shape stays the same
 *
 * @returns {Object} { url, thumbnailUrl, mediaType, mediaName, mediaSize, mediaMimeType }
 */
const save = async (file) => {
  console.log('=== STORAGE SERVICE SAVE START ===');
  console.log('UPLOAD_BASE:', UPLOAD_BASE);
  console.log('File:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    hasBuffer: !!file.buffer,
  });

  ensureDirs();

  const mediaType = getMediaType(file.mimetype);
  console.log('Detected mediaType:', mediaType);

  if (!mediaType) {
    throw new Error(`Unsupported file type: ${file.mimetype}`);
  }

  if (file.size > LIMITS[mediaType]) {
    const limitMB = LIMITS[mediaType] / (1024 * 1024);
    throw new Error(`File too large. Max size for ${mediaType} is ${limitMB}MB`);
  }

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const ext = mediaType === 'image'
    ? '.jpg'
    : path.extname(file.originalname).toLowerCase();
  const filename = `${unique}${ext}`;
  console.log('Generated filename:', filename);

  const folder = FOLDERS[mediaType];
  const destPath = path.join(UPLOAD_BASE, folder, filename);
  console.log('Destination path:', destPath);

  let thumbnailUrl = '';

  try {
    if (mediaType === 'image') {
      console.log('Starting Sharp compression...');

      await sharp(file.buffer)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, progressive: true })
        .toFile(destPath);

      console.log('✅ Main image saved to:', destPath);

      const thumbFilename = `thumb_${filename}`;
      const thumbPath = path.join(UPLOAD_BASE, 'thumbnails', thumbFilename);
      console.log('Thumbnail path:', thumbPath);

      await sharp(file.buffer)
        .resize(320, 320, { fit: 'cover' })
        .jpeg({ quality: 60 })
        .toFile(thumbPath);

      console.log('✅ Thumbnail saved to:', thumbPath);

      thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;

    } else {
      console.log('Saving non-image file directly...');
      fs.writeFileSync(destPath, file.buffer);
      console.log('✅ File saved to:', destPath);
    }
  } catch (sharpError) {
    console.error('❌ ERROR during file save:');
    console.error('Message:', sharpError.message);
    console.error('Stack:', sharpError.stack);
    throw sharpError;
  }

  const result = {
    url: `/uploads/${folder}/${filename}`,
    thumbnailUrl,
    mediaType,
    mediaName: file.originalname,
    mediaSize: file.size,
    mediaMimeType: file.mimetype,
  };

  console.log('=== STORAGE SERVICE SAVE RESULT ===', result);
  return result;
};

/**
 * Delete file from local storage
 * MIGRATION → Replace with S3 deleteObject or Cloudinary destroy
 */
const deleteFile = async (url) => {
  if (!url) return;

  try {
    // Convert url path back to filesystem path
    const relativePath = url.replace('/uploads/', '');
    const fullPath = path.join(UPLOAD_BASE, relativePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Delete thumbnail if exists
    if (url.includes('/images/')) {
      const filename = path.basename(url);
      const thumbFilename = `thumb_${filename.replace(path.extname(filename), '.jpg')}`;
      const thumbPath = path.join(UPLOAD_BASE, 'thumbnails', thumbFilename);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }
  } catch (error) {
    // Log but don't throw — file deletion failure shouldn't break the app
    console.error('Storage delete error:', error.message);
  }
};

/**
 * Get accessible URL for a stored file
 * MIGRATION → Return S3 signed URL or Cloudinary URL here
 *
 * For local: just return as-is (served by express static)
 * For S3: return a pre-signed URL with expiry
 */
const getUrl = (storedUrl) => {
  if (!storedUrl) return '';
  // MIGRATION → Replace this with S3 getSignedUrl() or Cloudinary url()
  return storedUrl;
};

// ─── Export ───────────────────────────────────────────────────────────────────
// MIGRATION CHECKLIST (only touch this file):
// [ ] Install AWS SDK or Cloudinary SDK
// [ ] Add credentials to .env
// [ ] Replace save() body
// [ ] Replace deleteFile() body
// [ ] Replace getUrl() body
// [ ] Done — nothing else in the codebase changes

const StorageService = {
  save,
  delete: deleteFile,
  getUrl,
  getMediaType,
  LIMITS,
  ALLOWED_MIMES,
};

export default StorageService;