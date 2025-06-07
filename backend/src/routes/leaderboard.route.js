// backend/src/routes/leaderboard.route.js
import express from 'express';
import StudySession from '../models/StudySession.js';
import User from '../models/User.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get overall leaderboard
router.get('/overall', protectRoute, async (req, res) => {
  try {
    const leaderboard = await StudySession.aggregate([
      {
        $group: {
          _id: '$userId',
          totalStudyTime: { $sum: '$duration' },
          totalSessions: { $count: {} },
          avgSessionDuration: { $avg: '$duration' },
          lastStudyDate: { $max: '$endTime' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          totalStudyTime: 1,
          totalSessions: 1,
          avgSessionDuration: { $round: ['$avgSessionDuration', 1] },
          lastStudyDate: 1,
          userName: '$user.fullName',
          userImage: '$user.profilePic'
        }
      },
      {
        $sort: { totalStudyTime: -1 }
      },
      {
        $limit: 50
      }
    ]);

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
});

// Get weekly leaderboard
router.get('/weekly', protectRoute, async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const leaderboard = await StudySession.aggregate([
      {
        $match: {
          createdAt: { $gte: oneWeekAgo }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalStudyTime: { $sum: '$duration' },
          totalSessions: { $count: {} },
          avgSessionDuration: { $avg: '$duration' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          totalStudyTime: 1,
          totalSessions: 1,
          avgSessionDuration: { $round: ['$avgSessionDuration', 1] },
          userName: '$user.fullName',
          userImage: '$user.profilePic'
        }
      },
      {
        $sort: { totalStudyTime: -1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch weekly leaderboard' });
  }
});

// Get user's study stats
router.get('/my-stats', protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await StudySession.aggregate([
      {
        $match: { userId: userId }
      },
      {
        $group: {
          _id: null,
          totalStudyTime: { $sum: '$duration' },
          totalSessions: { $count: {} },
          avgSessionDuration: { $avg: '$duration' },
          longestSession: { $max: '$duration' },
          lastStudyDate: { $max: '$endTime' }
        }
      }
    ]);

    const userStats = stats[0] || {
      totalStudyTime: 0,
      totalSessions: 0,
      avgSessionDuration: 0,
      longestSession: 0,
      lastStudyDate: null
    };

    // Get recent sessions
    const recentSessions = await StudySession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('duration startTime endTime groupName sessionType');

    res.json({ 
      success: true, 
      stats: {
        ...userStats,
        avgSessionDuration: Math.round(userStats.avgSessionDuration * 10) / 10
      },
      recentSessions 
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user stats' });
  }
});

export default router;
