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
      required: true
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
    enum: ['direct', 'group'],
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
  }]
}, {
  timestamps: true
});

// Index for efficient querying
messageSchema.index({ chatId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
