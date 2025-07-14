import StudySession from '../models/StudySession.js';
import User from '../models/User.js';
import Group from '../models/Group.js';

class PowerBIService {
  // Get formatted data for PowerBI - Daily Study Sessions
  async getDailyStudyData(startDate, endDate) {
    try {
      const pipeline = [
        {
          $match: {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'groups',
            localField: 'groupId',
            foreignField: '_id',
            as: 'group'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $unwind: '$group'
        },
        {
          $project: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            userId: '$user._id',
            username: '$user.username',
            fullName: '$user.fullName',
            email: '$user.email',
            technologies: '$user.technologies',
            groupId: '$group._id',
            groupName: '$group.name',
            groupDescription: '$group.description',
            duration: '$duration',
            startTime: '$startTime',
            endTime: '$endTime',
            dayOfWeek: {
              $dayOfWeek: '$createdAt'
            },
            weekNumber: {
              $week: '$createdAt'
            },
            month: {
              $month: '$createdAt'
            },
            year: {
              $year: '$createdAt'
            },
            hour: {
              $hour: '$startTime'
            },
            studyEfficiency: {
              $cond: {
                if: { $gte: ['$duration', 3600000] }, // 1 hour in milliseconds
                then: 'High',
                else: {
                  $cond: {
                    if: { $gte: ['$duration', 1800000] }, // 30 minutes
                    then: 'Medium',
                    else: 'Low'
                  }
                }
              }
            }
          }
        },
        {
          $sort: { date: -1, startTime: -1 }
        }
      ];

      const data = await StudySession.aggregate(pipeline);
      return data;
    } catch (error) {
      throw new Error(`Error fetching daily study data: ${error.message}`);
    }
  }

  // Get aggregated weekly summary for PowerBI
  async getWeeklySummary(startDate, endDate) {
    try {
      const pipeline = [
        {
          $match: {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $group: {
            _id: {
              userId: '$user._id',
              username: '$user.username',
              week: { $week: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            totalDuration: { $sum: '$duration' },
            sessionCount: { $sum: 1 },
            averageSessionDuration: { $avg: '$duration' },
            technologies: { $first: '$user.technologies' },
            fullName: { $first: '$user.fullName' },
            email: { $first: '$user.email' }
          }
        },
        {
          $project: {
            userId: '$_id.userId',
            username: '$_id.username',
            fullName: 1,
            email: 1,
            technologies: 1,
            week: '$_id.week',
            year: '$_id.year',
            totalDurationHours: {
              $round: [{ $divide: ['$totalDuration', 3600000] }, 2]
            },
            sessionCount: 1,
            averageSessionDurationMinutes: {
              $round: [{ $divide: ['$averageSessionDuration', 60000] }, 2]
            },
            studyFrequency: {
              $cond: {
                if: { $gte: ['$sessionCount', 7] },
                then: 'Daily',
                else: {
                  $cond: {
                    if: { $gte: ['$sessionCount', 3] },
                    then: 'Regular',
                    else: 'Occasional'
                  }
                }
              }
            }
          }
        },
        {
          $sort: { year: -1, week: -1, totalDurationHours: -1 }
        }
      ];

      const data = await StudySession.aggregate(pipeline);
      return data;
    } catch (error) {
      throw new Error(`Error fetching weekly summary: ${error.message}`);
    }
  }

  // Format data for PowerBI with proper structure
  formatForPowerBI(data, dataType) {
    const formattedData = {
      metadata: {
        exportDate: new Date().toISOString(),
        dataType: dataType,
        recordCount: data.length,
        version: '1.0'
      },
      data: data
    };

    return formattedData;
  }

  // Get user performance metrics for PowerBI
  async getUserPerformanceMetrics(userId = null) {
    try {
      const matchStage = userId ? { userId: userId } : {};
      
      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $group: {
            _id: '$userId',
            username: { $first: '$user.username' },
            fullName: { $first: '$user.fullName' },
            email: { $first: '$user.email' },
            technologies: { $first: '$user.technologies' },
            totalStudyTime: { $sum: '$duration' },
            totalSessions: { $sum: 1 },
            averageSessionDuration: { $avg: '$duration' },
            longestSession: { $max: '$duration' },
            shortestSession: { $min: '$duration' },
            firstStudyDate: { $min: '$createdAt' },
            lastStudyDate: { $max: '$createdAt' },
            studyDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }
          }
        },
        {
          $project: {
            userId: '$_id',
            username: 1,
            fullName: 1,
            email: 1,
            technologies: 1,
            totalStudyTimeHours: {
              $round: [{ $divide: ['$totalStudyTime', 3600000] }, 2]
            },
            totalSessions: 1,
            averageSessionDurationMinutes: {
              $round: [{ $divide: ['$averageSessionDuration', 60000] }, 2]
            },
            longestSessionMinutes: {
              $round: [{ $divide: ['$longestSession', 60000] }, 2]
            },
            shortestSessionMinutes: {
              $round: [{ $divide: ['$shortestSession', 60000] }, 2]
            },
            firstStudyDate: 1,
            lastStudyDate: 1,
            uniqueStudyDays: { $size: '$studyDays' },
            studyConsistency: {
              $round: [
                {
                  $divide: [
                    { $size: '$studyDays' },
                    {
                      $add: [
                        {
                          $divide: [
                            { $subtract: ['$lastStudyDate', '$firstStudyDate'] },
                            86400000
                          ]
                        },
                        1
                      ]
                    }
                  ]
                },
                2
              ]
            }
          }
        },
        {
          $sort: { totalStudyTimeHours: -1 }
        }
      ];

      const data = await StudySession.aggregate(pipeline);
      return data;
    } catch (error) {
      throw new Error(`Error fetching user performance metrics: ${error.message}`);
    }
  }
}

export default new PowerBIService();
