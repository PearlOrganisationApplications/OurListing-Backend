import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    // Unique key — sorted userId1_userId2
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],

    // Inbox preview
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document'],
      default: 'text',
    },
    lastMessageTime: {
      type: Date,
      default: Date.now,
    },
    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Unread badge count per user
    // { "userId1": 3, "userId2": 0 }
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Fast inbox query — find all conversations a user is part of
conversationSchema.index({ participants: 1, lastMessageTime: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;