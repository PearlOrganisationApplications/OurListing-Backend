import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import StorageService from '../services/storage.service.js';
import NotificationService from '../services/notification.service.js';
import PresenceService from '../services/presence.service.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Generate consistent conversationId from two user IDs
 * Sorted so A↔B and B↔A always produce the same key
 */
const getConversationId = (userId1, userId2) => {
  return [userId1.toString(), userId2.toString()].sort().join('_');
};

/**
 * Build last message preview text for conversation
 */
const getLastMessagePreview = (messageType, message) => {
  const previewMap = {
    text: message?.slice(0, 100) || '',
    image: '📷 Image',
    video: '🎥 Video',
    audio: '🎵 Audio message',
    document: '📄 Document',
  };
  return previewMap[messageType] || '';
};

// ─── SECTION 1: INBOX ────────────────────────────────────────────────────────

/**
 * GET /api/chats
 * Get all conversations for logged-in user (inbox)
 */
export const getInbox = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ lastMessageTime: -1 })
      .populate('participants', 'name email role lastSeen')
      .lean();

    // Add online status + unread count for each conversation
    const enriched = conversations.map((conv) => {
      const other = conv.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );

      return {
        ...conv,
        otherUser: {
          ...other,
          isOnline: PresenceService.isOnline(other._id.toString()),
        },
        unreadCount: conv.unreadCount?.[userId.toString()] || 0,
      };
    });

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SECTION 2: MESSAGE HISTORY ──────────────────────────────────────────────

/**
 * GET /api/chats/:receiverId/messages?page=1&limit=50&search=keyword
 * Get paginated message history between two users
 */
export const getMessages = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';

    const conversationId = getConversationId(senderId, receiverId);

    // Base query
   const query = {
  conversationId,
  deletedFor: { $nin: [senderId] },
  deletedForEveryone: { $ne: true },
};
    // Add text search if keyword provided
    if (search) {
      query.$text = { $search: search };
    }

    const total = await Message.countDocuments(query);

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('senderId', 'name role')
      .populate('receiverId', 'name role')
      .populate('replyTo.senderId', 'name')
      .lean();

    // Return in ascending order for chat UI (oldest first)
    messages.reverse();

    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SECTION 3: MEDIA UPLOAD ─────────────────────────────────────────────────

/**
 * POST /api/chats/upload
 * Upload media file — returns url before message is sent
 * Frontend uploads file first, then sends message with returned url
 */
export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    const result = await StorageService.save(req.file);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SECTION 4: SEND MESSAGE ─────────────────────────────────────────────────

/**
 * POST /api/chats/:receiverId/messages
 * Send a message (text or media)
 * If file attached → uploads and saves in one step
 * If mediaUrl provided → use pre-uploaded url
 */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.params;
    const {
      message,
      messageType = 'text',
      mediaUrl,
      mediaName,
      mediaSize,
      mediaMimeType,
      mediaThumbnail,
      replyTo,
      isForwarded = false,
    } = req.body;

    // ✅ ALL let declarations at top — no temporal dead zone
    let finalMediaUrl = mediaUrl || '';
    let finalMediaName = mediaName || '';
    let finalMediaSize = mediaSize || 0;
    let finalMediaMimeType = mediaMimeType || '';
    let finalMediaThumbnail = mediaThumbnail || '';
    let finalMessageType = messageType;
    let replyToData = null;

    // Validate receiver exists
    const receiver = await User.findById(receiverId).select(
      'name fcmToken lastSeen'
    );
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found',
      });
    }

    // Validate — must have text or media
    if (!message && !mediaUrl && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Message must have text or media',
      });
    }

    // Validate media type consistency
    if (finalMessageType !== 'text' && !finalMediaUrl && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Media message requires a file or mediaUrl',
      });
    }

    const conversationId = getConversationId(senderId, receiverId);

    // If file attached directly — upload now
    if (req.file) {
      const uploaded = await StorageService.save(req.file);
      finalMediaUrl = uploaded.url;
      finalMediaName = uploaded.mediaName;
      finalMediaSize = uploaded.mediaSize;
      finalMediaMimeType = uploaded.mediaMimeType;
      finalMediaThumbnail = uploaded.thumbnailUrl;
      finalMessageType = uploaded.mediaType;
    }

    // Handle replyTo snapshot
    if (replyTo?.messageId) {
      const originalMsg = await Message.findById(replyTo.messageId).lean();
      if (originalMsg) {
        replyToData = {
          messageId: originalMsg._id,
          senderId: originalMsg.senderId,
          messagePreview: originalMsg.message?.slice(0, 100) || '',
          messageType: originalMsg.messageType,
          mediaThumbnail: originalMsg.mediaThumbnail || '',
        };
      }
    }

    // Determine initial status based on receiver online status
    const receiverOnline = PresenceService.isOnline(receiverId.toString());
    const initialStatus = receiverOnline ? 'delivered' : 'sent';

    // Create message
    const newMessage = await Message.create({
      conversationId,
      senderId,
      receiverId,
      messageType: finalMessageType,
      message: message || '',
      mediaUrl: finalMediaUrl,
      mediaName: finalMediaName,
      mediaSize: finalMediaSize,
      mediaMimeType: finalMediaMimeType,
      mediaThumbnail: finalMediaThumbnail,
      status: initialStatus,
      replyTo: replyToData,
      isForwarded,
    });

    // Upsert conversation
    await Conversation.findOneAndUpdate(
  { conversationId },
  {
    $set: {
      conversationId,
      lastMessage: getLastMessagePreview(finalMessageType, message),
      lastMessageType: finalMessageType,
      lastMessageTime: new Date(),
      lastMessageSender: senderId,
    },
    $addToSet: {
      participants: { $each: [senderId, receiverId] },
    },
    $inc: {
      [`unreadCount.${receiverId.toString()}`]: 1,
    },
  },
  { upsert: true, returnDocument: 'after' }
);

    // Populate for response
    const populated = await Message.findById(newMessage._id)
      .populate('senderId', 'name role')
      .populate('receiverId', 'name role')
      .lean();

    // Send push notification if receiver is offline
    if (!receiverOnline && receiver.fcmToken) {
      await NotificationService.sendMessageNotification({
        fcmToken: receiver.fcmToken,
        senderName: req.user.name,
        messageType: finalMessageType,
        message: message || '',
        conversationId,
      });
    }

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// ─── SECTION 5: READ RECEIPTS ────────────────────────────────────────────────

/**
 * PATCH /api/chats/:senderId/read
 * Mark all messages from senderId as seen
 * Called when user opens a conversation
 */
export const markAsRead = async (req, res) => {
  try {
    const receiverId = req.user._id;
    const { senderId } = req.params;

    const conversationId = getConversationId(receiverId, senderId);

    // Mark all unread messages as seen
    await Message.updateMany(
      {
        conversationId,
        receiverId,
        status: { $in: ['sent', 'delivered'] },
      },
      {
        $set: { status: 'seen' },
      }
    );

    // Reset unread count for this user
   await Conversation.findOneAndUpdate(
  { conversationId },
  {
    $set: {
      [`unreadCount.${receiverId.toString()}`]: 0,
    },
  },
  { returnDocument: 'after' }
);

    res.status(200).json({
      success: true,
      message: 'Messages marked as seen',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SECTION 6: REACTIONS ────────────────────────────────────────────────────

/**
 * POST /api/chats/messages/:messageId/react
 * Add or update reaction on a message
 */
export const reactToMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required',
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Remove existing reaction from this user if any, then add new
    message.reactions = message.reactions.filter(
      (r) => r.userId.toString() !== userId.toString()
    );
    message.reactions.push({ userId, emoji });

    await message.save();

    // Notify message owner if they're not the reactor
    if (message.senderId.toString() !== userId.toString()) {
      const sender = await User.findById(message.senderId).select('fcmToken');
      if (sender?.fcmToken && !PresenceService.isOnline(message.senderId.toString())) {
        await NotificationService.sendReactionNotification({
          fcmToken: sender.fcmToken,
          senderName: req.user.name,
          emoji,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: message.reactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/chats/messages/:messageId/react
 * Remove reaction from a message
 */
export const removeReaction = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    message.reactions = message.reactions.filter(
      (r) => r.userId.toString() !== userId.toString()
    );

    await message.save();

    res.status(200).json({
      success: true,
      data: message.reactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SECTION 7: EDIT MESSAGE ─────────────────────────────────────────────────

/**
 * PATCH /api/chats/messages/:messageId
 * Edit a text message — only sender can edit, only text messages
 */
export const editMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required',
      });
    }

    const existingMessage = await Message.findById(messageId);

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Only sender can edit
    if (existingMessage.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages',
      });
    }

    // Only text messages can be edited
    if (existingMessage.messageType !== 'text') {
      return res.status(400).json({
        success: false,
        message: 'Only text messages can be edited',
      });
    }

    existingMessage.message = message.trim();
    existingMessage.isEdited = true;
    existingMessage.editedAt = new Date();

    await existingMessage.save();

    res.status(200).json({
      success: true,
      data: existingMessage,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SECTION 8: DELETE MESSAGE ───────────────────────────────────────────────

/**
 * DELETE /api/chats/messages/:messageId
 * Delete message
 * Body: { deleteFor: 'me' | 'everyone' }
 */
export const deleteMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const { deleteFor = 'me' } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Only sender can delete for everyone
    if (
      deleteFor === 'everyone' &&
      message.senderId.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages for everyone',
      });
    }

    if (deleteFor === 'everyone') {
      // Delete for both sides — mark flag, clear content
      message.deletedForEveryone = true;
      message.message = '';
      message.mediaUrl = '';
      message.mediaThumbnail = '';

      // Clean up file from storage
      if (message.mediaUrl) {
        await StorageService.delete(message.mediaUrl);
      }
    } else {
      // Delete only for the requesting user
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
      }
    }

    await message.save();

    res.status(200).json({
      success: true,
      message:
        deleteFor === 'everyone'
          ? 'Message deleted for everyone'
          : 'Message deleted for you',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SECTION 9: FORWARD MESSAGE ──────────────────────────────────────────────

/**
 * POST /api/chats/messages/:messageId/forward
 * Forward a message to another user
 * Body: { receiverId }
 */
export const forwardMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { messageId } = req.params;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'receiverId is required',
      });
    }

    const original = await Message.findById(messageId);
    if (!original) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    const receiver = await User.findById(receiverId).select('name fcmToken');
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found',
      });
    }

    const conversationId = getConversationId(senderId, receiverId);
    const receiverOnline = PresenceService.isOnline(receiverId.toString());

    // Create new message — copy content, mark as forwarded
    const forwarded = await Message.create({
      conversationId,
      senderId,
      receiverId,
      messageType: original.messageType,
      message: original.message,
      mediaUrl: original.mediaUrl,
      mediaName: original.mediaName,
      mediaSize: original.mediaSize,
      mediaMimeType: original.mediaMimeType,
      mediaThumbnail: original.mediaThumbnail,
      isForwarded: true,
      status: receiverOnline ? 'delivered' : 'sent',
    });

    // Update conversation
   await Conversation.findOneAndUpdate(
  { conversationId },
  {
    $set: {
      conversationId,
      lastMessage: getLastMessagePreview(original.messageType, original.message),
      lastMessageType: original.messageType,
      lastMessageTime: new Date(),
      lastMessageSender: senderId,
    },
    $addToSet: { participants: { $each: [senderId, receiverId] } },
    $inc: {
      [`unreadCount.${receiverId.toString()}`]: 1,
    },
  },
  { upsert: true, returnDocument: 'after' }
);

    // Push notification if offline
    if (!receiverOnline && receiver.fcmToken) {
      await NotificationService.sendMessageNotification({
        fcmToken: receiver.fcmToken,
        senderName: req.user.name,
        messageType: original.messageType,
        message: original.message || '',
        conversationId,
      });
    }

    const populated = await Message.findById(forwarded._id)
      .populate('senderId', 'name role')
      .populate('receiverId', 'name role')
      .lean();

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SECTION 10: USER SEARCH ─────────────────────────────────────────────────

/**
 * GET /api/chats/users?search=keyword
 * Search users to start a new conversation with
 */
export const searchUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    const { search } = req.query;

    if (!search?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search keyword is required',
      });
    }

    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    })
      .select('name email role lastSeen')
      .limit(20)
      .lean();

    // Add online status
    const enriched = users.map((user) => ({
      ...user,
      isOnline: PresenceService.isOnline(user._id.toString()),
    }));

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SECTION 11: FCM TOKEN ───────────────────────────────────────────────────

/**
 * PATCH /api/chats/fcm-token
 * Save or update FCM token for push notifications
 * Called from frontend after user grants notification permission
 */
export const updateFcmToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required',
      });
    }

    await User.findByIdAndUpdate(userId, { fcmToken });

    res.status(200).json({
      success: true,
      message: 'FCM token updated',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};