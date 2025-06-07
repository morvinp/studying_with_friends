// backend/src/models/Message.js (updated to support both AI and bot messages)
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  user: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Make this optional for AI and bot messages
    },
    name: String,
    image: String
  },
  chatId: {
    type: String,
    required: true
  },
  chatType: {
    type: String,
    enum: ['direct', 'group', 'ai'], // Keep your existing types
    required: true
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Existing AI support
  isAIMessage: {
    type: Boolean,
    default: false
  },
  conversationId: {
    type: String,
    required: false // For AI conversations
  },
  // New fields for bot support (study bot, etc.)
  isBot: {
    type: Boolean,
    default: false
  },
  botType: {
    type: String,
    enum: ['study', 'coding', 'general'],
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient querying
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, createdAt: 1 }); // For AI conversations
messageSchema.index({ isBot: 1, botType: 1 }); // For bot messages

const Message = mongoose.model('Message', messageSchema);
export default Message;
