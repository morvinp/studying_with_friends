// frontend/src/pages/LeaderboardPage.jsx (updated to match your homepage style)
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOverallLeaderboard, getWeeklyLeaderboard, getMyStudyStats } from '../lib/api';
import { TrophyIcon, ClockIcon, BookOpenIcon, TargetIcon } from 'lucide-react';

const LeaderboardPage = () => {
  const [activeTab, setActiveTab] = useState('overall');

  const { data: overallLeaderboard, isLoading: loadingOverall } = useQuery({
    queryKey: ['leaderboard', 'overall'],
    queryFn: getOverallLeaderboard,
    enabled: activeTab === 'overall'
  });

  const { data: weeklyLeaderboard, isLoading: loadingWeekly } = useQuery({
    queryKey: ['leaderboard', 'weekly'],
    queryFn: getWeeklyLeaderboard,
    enabled: activeTab === 'weekly'
  });

  const { data: myStats, isLoading: loadingStats } = useQuery({
    queryKey: ['my-stats'],
    queryFn: getMyStudyStats
  });

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const currentLeaderboard = activeTab === 'overall' ? overallLeaderboard : weeklyLeaderboard;
  const isLoading = activeTab === 'overall' ? loadingOverall : loadingWeekly;

  if (loadingStats) {
    return (
      <div className='flex justify-center py-12'>
        <span className='loading loading-spinner loading-lg'/>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 lg:p-8'>
      <div className='container mx-auto space-y-10'>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">📊 Study Leaderboard</h2>
            <p className="opacity-70">Track your study progress and compete with friends!</p>
          </div>
        </div>

        {/* My Stats Section */}
        {myStats && (
          <section>
            <div className="mb-6">
              <h3 className="text-xl font-bold tracking-tight mb-4">📈 Your Study Stats</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card bg-base-200 p-4 text-center">
                <ClockIcon className="size-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary">
                  {formatTime(myStats.stats.totalStudyTime)}
                </div>
                <div className="text-sm opacity-70">Total Time</div>
              </div>
              <div className="card bg-base-200 p-4 text-center">
                <BookOpenIcon className="size-8 text-success mx-auto mb-2" />
                <div className="text-2xl font-bold text-success">
                  {myStats.stats.totalSessions}
                </div>
                <div className="text-sm opacity-70">Sessions</div>
              </div>
              <div className="card bg-base-200 p-4 text-center">
                <TargetIcon className="size-8 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-bold text-secondary">
                  {formatTime(myStats.stats.avgSessionDuration)}
                </div>
                <div className="text-sm opacity-70">Avg Session</div>
              </div>
              <div className="card bg-base-200 p-4 text-center">
                <TrophyIcon className="size-8 text-warning mx-auto mb-2" />
                <div className="text-2xl font-bold text-warning">
                  {formatTime(myStats.stats.longestSession)}
                </div>
                <div className="text-sm opacity-70">Longest</div>
              </div>
            </div>
          </section>
        )}

        {/* Leaderboard Section */}
        <section>
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight mb-4">🏆 Rankings</h3>
            
            {/* Tabs */}
            <div className="tabs tabs-boxed w-fit">
              <button
                onClick={() => setActiveTab('overall')}
                className={`tab ${activeTab === 'overall' ? 'tab-active' : ''}`}
              >
                🏆 All Time
              </button>
              <button
                onClick={() => setActiveTab('weekly')}
                className={`tab ${activeTab === 'weekly' ? 'tab-active' : ''}`}
              >
                📅 This Week
              </button>
            </div>
          </div>

          {/* Leaderboard Content */}
          {isLoading ? (
            <div className='flex justify-center py-12'>
              <span className='loading loading-spinner loading-lg'/>
            </div>
          ) : currentLeaderboard && currentLeaderboard.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {currentLeaderboard.map((user, index) => (
                <div
                  key={user._id}
                  className={`card bg-base-200 hover:shadow-lg transition-all duration-300 ${
                    index < 3 ? 'border-2 border-warning' : ''
                  }`}
                >
                  <div className="card-body p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold min-w-[3rem]">
                          {getRankIcon(index + 1)}
                        </div>
                        <div className="avatar">
                          <div className="w-12 rounded-full">
                            <img
                              src={user.userImage || '/api/placeholder/40/40'}
                              alt={user.userName}
                              onError={(e) => {
                                e.target.src = `https://avatar.iran.liara.run/public/${Math.floor(Math.random()*100)+1}.png`;
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{user.userName}</div>
                          <div className="text-sm opacity-70">
                            {user.totalSessions} sessions • Avg: {formatTime(user.avgSessionDuration)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {formatTime(user.totalStudyTime)}
                        </div>
                        {user.lastStudyDate && (
                          <div className="text-xs opacity-70">
                            Last: {new Date(user.lastStudyDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card bg-base-200 p-6 text-center">
              <h3 className="font-semibold text-lg mb-2">No study sessions yet</h3>
              <p className="opacity-70">
                📚 Start studying to appear on the leaderboard!
              </p>
            </div>
          )}
        </section>

        {/* Recent Sessions */}
        {myStats && myStats.recentSessions && myStats.recentSessions.length > 0 && (
          <section>
            <div className="mb-6">
              <h3 className="text-xl font-bold tracking-tight">📝 Your Recent Sessions</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myStats.recentSessions.map((session, index) => (
                <div key={index} className="card bg-base-200 hover:shadow-lg transition-all duration-300">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{session.groupName}</div>
                        <div className="text-sm opacity-70">
                          {new Date(session.startTime).toLocaleDateString()} • {session.sessionType}
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-primary">
                        {formatTime(session.duration)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
