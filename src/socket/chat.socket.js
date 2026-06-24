import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import PresenceService from '../services/presence.service.js';
import NotificationService from '../services/notification.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET EVENTS REFERENCE
//
// Client → Server:
//   authenticate          { token }
//   join_conversation     { receiverId }
//   leave_conversation    { receiverId }
//   send_message          { receiverId, message, messageType, mediaUrl,
//                           mediaName, mediaSize, mediaMimeType,
//                           mediaThumbnail, replyTo, isForwarded }
//   message_delivered     { messageId }
//   message_seen          { conversationId, senderId }
//   typing_start          { receiverId }
//   typing_stop           { receiverId }
//   react_message         { messageId, emoji }
//   remove_reaction       { messageId }
//   edit_message          { messageId, message }
//   delete_message        { messageId, deleteFor }
//   ping                  (keep alive)
//
// Server → Client:
//   authenticated         { user }
//   auth_error            { message }
//   receive_message       { message }
//   message_status        { messageId, status }
//   messages_seen         { conversationId, seenBy }
//   user_typing           { userId, conversationId }
//   user_stop_typing      { userId, conversationId }
//   user_online           { userId }
//   user_offline          { userId, lastSeen }
//   reaction_updated      { messageId, reactions }
//   message_edited        { messageId, message, editedAt }
//   message_deleted       { messageId, deleteFor }
//   error                 { message }
//   pong                  (keep alive response)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Helper ───────────────────────────────────────────────────────────────────

const getConversationId = (userId1, userId2) => {
  return [userId1.toString(), userId2.toString()].sort().join('_');
};

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

// ─── Auth middleware for Socket.io ────────────────────────────────────────────

const socketAuthMiddleware = async (socket, next) => {
  try {
    // Check every possible place token could be
    let token = 
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.headers?.token ||
      null;

    console.log('=== SOCKET AUTH ===');
    console.log('auth.token:', socket.handshake.auth?.token ? 'EXISTS' : 'NONE');
    console.log('query.token:', socket.handshake.query?.token ? 'EXISTS' : 'NONE');
    console.log('header.auth:', socket.handshake.headers?.authorization ? 'EXISTS' : 'NONE');
    console.log('header.token:', socket.handshake.headers?.token ? 'EXISTS' : 'NONE');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    next(new Error('Invalid or expired token'));
  }
};
// ─── Main socket handler ──────────────────────────────────────────────────────

const initializeChatSocket = (io) => {
  // Apply auth middleware to all socket connections
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    const userName = socket.user.name;

    console.log(`[Socket] Connected: ${userName} (${userId})`);

    // ── On connect: mark online + notify contacts ─────────────────────────────
    PresenceService.setOnline(userId, socket.id);

    // Deliver all 'sent' messages that arrived while user was offline
    try {
      const pendingMessages = await Message.find({
        receiverId: userId,
        status: 'sent',
      });

      if (pendingMessages.length > 0) {
        // Update all to delivered
        await Message.updateMany(
          { receiverId: userId, status: 'sent' },
          { $set: { status: 'delivered' } }
        );

        // Notify each sender their messages were delivered
        const senderIds = [...new Set(
          pendingMessages.map((m) => m.senderId.toString())
        )];

        senderIds.forEach((senderId) => {
          const senderSocketId = PresenceService.getSocketId(senderId);
          if (senderSocketId) {
            // Get all messageIds for this sender
            const messageIds = pendingMessages
              .filter((m) => m.senderId.toString() === senderId)
              .map((m) => m._id);

            io.to(senderSocketId).emit('message_status', {
              messageIds,
              status: 'delivered',
            });
          }
        });
      }
    } catch (error) {
      console.error('[Socket] Pending delivery error:', error.message);
    }

    // Broadcast online status to everyone online
    // Frontend uses this to update contact's online indicator
    socket.broadcast.emit('user_online', { userId });

    // ── Join conversation room ────────────────────────────────────────────────
    socket.on('join_conversation', ({ receiverId }) => {
      if (!receiverId) return;
      const conversationId = getConversationId(userId, receiverId);
      socket.join(conversationId);
      console.log(`[Socket] ${userName} joined room: ${conversationId}`);
    });

    // ── Leave conversation room ───────────────────────────────────────────────
    socket.on('leave_conversation', ({ receiverId }) => {
      if (!receiverId) return;
      const conversationId = getConversationId(userId, receiverId);
      socket.leave(conversationId);
      console.log(`[Socket] ${userName} left room: ${conversationId}`);
    });

    // ── Send message ──────────────────────────────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const {
          receiverId,
          message,
          messageType = 'text',
          mediaUrl = '',
          mediaName = '',
          mediaSize = 0,
          mediaMimeType = '',
          mediaThumbnail = '',
          replyTo = null,
          isForwarded = false,
        } = data;

        if (!receiverId) {
          return socket.emit('error', { message: 'receiverId is required' });
        }

        if (!message && !mediaUrl) {
          return socket.emit('error', {
            message: 'Message must have text or media',
          });
        }

        // Check receiver exists
        const receiver = await User.findById(receiverId).select(
          'name fcmToken'
        );
        if (!receiver) {
          return socket.emit('error', { message: 'Receiver not found' });
        }

        const conversationId = getConversationId(userId, receiverId);
        const receiverOnline = PresenceService.isOnline(receiverId.toString());
        const initialStatus = receiverOnline ? 'delivered' : 'sent';

        // Handle replyTo snapshot
        let replyToData = null;
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

        // Save to DB
        const newMessage = await Message.create({
          conversationId,
          senderId: userId,
          receiverId,
          messageType,
          message: message || '',
          mediaUrl,
          mediaName,
          mediaSize,
          mediaMimeType,
          mediaThumbnail,
          status: initialStatus,
          replyTo: replyToData,
          isForwarded,
        });

        // Update conversation
        await Conversation.findOneAndUpdate(
          { conversationId },
          {
            $set: {
              conversationId,
              lastMessage: getLastMessagePreview(messageType, message),
              lastMessageType: messageType,
              lastMessageTime: new Date(),
              lastMessageSender: userId,
            },
            $addToSet: {
              participants: { $each: [userId, receiverId] },
            },
            $inc: {
              [`unreadCount.${receiverId.toString()}`]: 1,
            },
          },
          { upsert: true, new: true }
        );

        // Populate for emit
        const populated = await Message.findById(newMessage._id)
          .populate('senderId', 'name role')
          .populate('receiverId', 'name role')
          .lean();

        // ── Tick flow ─────────────────────────────────────────────────────────
        // 1. Emit to conversation room (receiver gets message)
        io.to(conversationId).emit('receive_message', populated);

        // 2. Confirm 'sent' back to sender
        socket.emit('message_status', {
          messageIds: [newMessage._id],
          status: 'sent',
        });

        // 3. If receiver online → immediately emit 'delivered'
        if (receiverOnline) {
          socket.emit('message_status', {
            messageIds: [newMessage._id],
            status: 'delivered',
          });
        }

        // 4. Push notification if receiver offline
        if (!receiverOnline && receiver.fcmToken) {
          await NotificationService.sendMessageNotification({
            fcmToken: receiver.fcmToken,
            senderName: userName,
            messageType,
            message: message || '',
            conversationId,
          });
        }
      } catch (error) {
        console.error('[Socket] send_message error:', error.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Message delivered ─────────────────────────────────────────────────────
    // Client emits this when they receive a message while app is open
    socket.on('message_delivered', async ({ messageId }) => {
      try {
        if (!messageId) return;

        const message = await Message.findByIdAndUpdate(
          messageId,
          { $set: { status: 'delivered' } },
          { new: true }
        );

        if (!message) return;

        // Notify sender
        const senderSocketId = PresenceService.getSocketId(
          message.senderId.toString()
        );
        if (senderSocketId) {
          io.to(senderSocketId).emit('message_status', {
            messageIds: [messageId],
            status: 'delivered',
          });
        }
      } catch (error) {
        console.error('[Socket] message_delivered error:', error.message);
      }
    });

    // ── Message seen ──────────────────────────────────────────────────────────
    // Client emits this when user opens a conversation
    // Updates all messages in conversation to 'seen'
    socket.on('message_seen', async ({ conversationId, senderId }) => {
      try {
        if (!conversationId || !senderId) return;

        // Update all delivered/sent messages to seen
        const updated = await Message.find({
          conversationId,
          receiverId: userId,
          status: { $in: ['sent', 'delivered'] },
        });

        if (updated.length === 0) return;

        await Message.updateMany(
          {
            conversationId,
            receiverId: userId,
            status: { $in: ['sent', 'delivered'] },
          },
          { $set: { status: 'seen' } }
        );

        // Reset unread count
        await Conversation.findOneAndUpdate(
          { conversationId },
          { $set: { [`unreadCount.${userId}`]: 0 } }
        );

        // Notify sender — triggers blue ticks on their end
        const senderSocketId = PresenceService.getSocketId(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages_seen', {
            conversationId,
            seenBy: userId,
            messageIds: updated.map((m) => m._id),
          });
        }
      } catch (error) {
        console.error('[Socket] message_seen error:', error.message);
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────────────
    socket.on('typing_start', ({ receiverId }) => {
      if (!receiverId) return;
      const conversationId = getConversationId(userId, receiverId);
      const receiverSocketId = PresenceService.getSocketId(
        receiverId.toString()
      );

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user_typing', {
          userId,
          conversationId,
        });
      }
    });

    socket.on('typing_stop', ({ receiverId }) => {
      if (!receiverId) return;
      const conversationId = getConversationId(userId, receiverId);
      const receiverSocketId = PresenceService.getSocketId(
        receiverId.toString()
      );

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user_stop_typing', {
          userId,
          conversationId,
        });
      }
    });

    // ── React to message ──────────────────────────────────────────────────────
    socket.on('react_message', async ({ messageId, emoji }) => {
      try {
        if (!messageId || !emoji) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        // Remove existing reaction from this user + add new
        message.reactions = message.reactions.filter(
          (r) => r.userId.toString() !== userId
        );
        message.reactions.push({ userId, emoji });
        await message.save();

        // Emit to conversation room — both users see update
        const conversationId = message.conversationId;
        io.to(conversationId).emit('reaction_updated', {
          messageId,
          reactions: message.reactions,
        });

        // Notify message owner if offline
        if (message.senderId.toString() !== userId) {
          const sender = await User.findById(message.senderId).select(
            'fcmToken'
          );
          if (
            sender?.fcmToken &&
            !PresenceService.isOnline(message.senderId.toString())
          ) {
            await NotificationService.sendReactionNotification({
              fcmToken: sender.fcmToken,
              senderName: userName,
              emoji,
            });
          }
        }
      } catch (error) {
        console.error('[Socket] react_message error:', error.message);
      }
    });

    // ── Remove reaction ───────────────────────────────────────────────────────
    socket.on('remove_reaction', async ({ messageId }) => {
      try {
        if (!messageId) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        message.reactions = message.reactions.filter(
          (r) => r.userId.toString() !== userId
        );
        await message.save();

        io.to(message.conversationId).emit('reaction_updated', {
          messageId,
          reactions: message.reactions,
        });
      } catch (error) {
        console.error('[Socket] remove_reaction error:', error.message);
      }
    });

    // ── Edit message ──────────────────────────────────────────────────────────
    socket.on('edit_message', async ({ messageId, message }) => {
      try {
        if (!messageId || !message?.trim()) return;

        const existing = await Message.findById(messageId);
        if (!existing) return;

        // Only sender can edit
        if (existing.senderId.toString() !== userId) {
          return socket.emit('error', {
            message: 'You can only edit your own messages',
          });
        }

        // Only text messages
        if (existing.messageType !== 'text') {
          return socket.emit('error', {
            message: 'Only text messages can be edited',
          });
        }

        existing.message = message.trim();
        existing.isEdited = true;
        existing.editedAt = new Date();
        await existing.save();

        // Emit to room — both users see edit instantly
        io.to(existing.conversationId).emit('message_edited', {
          messageId,
          message: existing.message,
          editedAt: existing.editedAt,
        });
      } catch (error) {
        console.error('[Socket] edit_message error:', error.message);
      }
    });

    // ── Delete message ────────────────────────────────────────────────────────
    socket.on('delete_message', async ({ messageId, deleteFor = 'me' }) => {
      try {
        if (!messageId) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        if (
          deleteFor === 'everyone' &&
          message.senderId.toString() !== userId
        ) {
          return socket.emit('error', {
            message: 'You can only delete your own messages for everyone',
          });
        }

        if (deleteFor === 'everyone') {
          message.deletedForEveryone = true;
          message.message = '';
          message.mediaUrl = '';
          message.mediaThumbnail = '';
        } else {
          if (!message.deletedFor.includes(userId)) {
            message.deletedFor.push(userId);
          }
        }

        await message.save();

        if (deleteFor === 'everyone') {
          // Both users see deletion
          io.to(message.conversationId).emit('message_deleted', {
            messageId,
            deleteFor: 'everyone',
          });
        } else {
          // Only this user's socket sees it
          socket.emit('message_deleted', {
            messageId,
            deleteFor: 'me',
          });
        }
      } catch (error) {
        console.error('[Socket] delete_message error:', error.message);
      }
    });

    // ── Keep alive ping/pong ──────────────────────────────────────────────────
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      try {
        const disconnectedUserId = PresenceService.setOffline(socket.id);

        if (disconnectedUserId) {
          // Update lastSeen in DB
          const lastSeen = new Date();
          await User.findByIdAndUpdate(disconnectedUserId, { lastSeen });

          // Broadcast offline to everyone online
          socket.broadcast.emit('user_offline', {
            userId: disconnectedUserId,
            lastSeen,
          });

          console.log(`[Socket] Disconnected: ${userName} (${disconnectedUserId})`);
        }
      } catch (error) {
        console.error('[Socket] disconnect error:', error.message);
      }
    });
  });
};

export default initializeChatSocket;