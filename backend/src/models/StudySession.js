// backend/src/models/StudySession.js
import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupId: {
    type: String,
    required: true
  },
  groupName: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // Duration in minutes
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  sessionType: {
    type: String,
    enum: ['completed', 'left_early', 'auto_stopped'],
    default: 'completed'
  },
  participantCount: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
studySessionSchema.index({ userId: 1, createdAt: -1 });
studySessionSchema.index({ groupId: 1, createdAt: -1 });
studySessionSchema.index({ duration: -1 }); // For leaderboard sorting

const StudySession = mongoose.model('StudySession', studySessionSchema);
export default StudySession;
