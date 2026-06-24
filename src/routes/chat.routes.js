import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import uploadMiddleware from '../middlewares/upload.middleware.js';
import {
  getInbox,
  getMessages,
  uploadMedia,
  sendMessage,
  markAsRead,
  reactToMessage,
  removeReaction,
  editMessage,
  deleteMessage,
  forwardMessage,
  searchUsers,
  updateFcmToken,
} from '../controllers/chat.controller.js';

const router = express.Router();

// ─── All routes protected ─────────────────────────────────────────────────────
router.use(protect);

// ─── User search ──────────────────────────────────────────────────────────────
// GET /api/chats/users?search=keyword
// Must be before /:receiverId routes to avoid conflict
router.get('/users', searchUsers);

// ─── FCM Token ────────────────────────────────────────────────────────────────
// PATCH /api/chats/fcm-token
router.patch('/fcm-token', updateFcmToken);

// ─── Inbox ────────────────────────────────────────────────────────────────────
// GET /api/chats
router.get('/', getInbox);

// ─── Media upload ─────────────────────────────────────────────────────────────
// POST /api/chats/upload
// Dedicated upload endpoint — frontend uploads first, gets url, then sends message
router.post('/upload', uploadMiddleware.single, uploadMedia);

// ─── Messages ─────────────────────────────────────────────────────────────────
// GET  /api/chats/:receiverId/messages?page=1&limit=50&search=keyword
// POST /api/chats/:receiverId/messages
router.get('/:receiverId/messages', getMessages);
router.post(
  '/:receiverId/messages',
  uploadMiddleware.optional, // optional — text messages have no file
  sendMessage
);

// ─── Read receipts ────────────────────────────────────────────────────────────
// PATCH /api/chats/:senderId/read
router.patch('/:senderId/read', markAsRead);

// ─── Message actions ──────────────────────────────────────────────────────────
// PATCH  /api/chats/messages/:messageId          → edit
// DELETE /api/chats/messages/:messageId          → delete
// POST   /api/chats/messages/:messageId/react    → add/update reaction
// DELETE /api/chats/messages/:messageId/react    → remove reaction
// POST   /api/chats/messages/:messageId/forward  → forward
router.patch('/messages/:messageId', editMessage);
router.delete('/messages/:messageId', deleteMessage);
router.post('/messages/:messageId/react', reactToMessage);
router.delete('/messages/:messageId/react', removeReaction);
router.post('/messages/:messageId/forward', forwardMessage);

export default router;