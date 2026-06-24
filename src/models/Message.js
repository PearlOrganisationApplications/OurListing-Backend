import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const replyToSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  messagePreview: {
    type: String,
    default: '',
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document'],
    default: 'text',
  },
  mediaThumbnail: {
    type: String,
    default: '',
  },
});

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Content
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document'],
      default: 'text',
    },
    message: {
      type: String,
      default: '',
    },

    // Media
    mediaUrl: {
      type: String,
      default: '',
    },
    mediaName: {
      type: String,
      default: '',
    },
    mediaSize: {
      type: Number,
      default: 0,
    },
    mediaMimeType: {
      type: String,
      default: '',
    },
    mediaThumbnail: {
      type: String,
      default: '',
    },

    // Tick system
    status: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'seen'],
      default: 'sending',
    },

    // Reply/Quote
    replyTo: {
      type: replyToSchema,
      default: null,
    },

    // Reactions
    reactions: {
      type: [reactionSchema],
      default: [],
    },

    // Edit
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },

    // Forward
    isForwarded: {
      type: Boolean,
      default: false,
    },

    // Delete
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Text search index on message field
messageSchema.index({ message: 'text' });

// Compound index for fast conversation fetching + pagination
messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;