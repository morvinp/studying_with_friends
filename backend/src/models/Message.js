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
      required: false // Make this optional for AI messages
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
    enum: ['direct', 'group', 'ai'], // Add 'ai' type
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
  // New fields for AI support
  isAIMessage: {
    type: Boolean,
    default: false
  },
  conversationId: {
    type: String,
    required: false // For AI conversations
  }
}, {
  timestamps: true
});

// Index for efficient querying
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, createdAt: 1 }); // New index for AI conversations

const Message = mongoose.model('Message', messageSchema);
export default Message;
