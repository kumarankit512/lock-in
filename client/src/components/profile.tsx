import { useState } from 'react';
import { Calendar, Clock, Code, TrendingUp, Settings, ChevronDown, ChevronUp, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ProfileDashboard() {
  const [expandedSession, setExpandedSession] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentStatView, setCurrentStatView] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState('total_hours');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Mock user data
  const userData = {
    username: 'john_doe',
    email: 'john.doe@example.com',
    joinDate: 'January 2024',
    totalSessions: 156,
    totalHours: 234,
    currentStreak: 12,
    longestStreak: 28
  };

  // Generate heatmap data
  const generateHeatmapData = () => {
    const data = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const activity = Math.floor(Math.random() * 5);
      data.push({
        date: date.toISOString().split('T')[0],
        count: activity
      });
    }
    return data;
  };

  const heatmapData = generateHeatmapData();

  // Recent sessions
  const recentSessions = [
    {
      id: 1,
      date: '2024-11-02',
      duration: '2h 30m',
      problemsSolved: 5,
      topics: ['Arrays', 'Dynamic Programming'],
      difficulty: 'Medium',
      notes: 'Focused on DP patterns'
    },
    {
      id: 2,
      date: '2024-11-01',
      duration: '1h 45m',
      problemsSolved: 3,
      topics: ['Trees', 'Recursion'],
      difficulty: 'Hard',
      notes: 'Binary tree traversal'
    },
    {
      id: 3,
      date: '2024-10-31',
      duration: '3h 15m',
      problemsSolved: 7,
      topics: ['Graphs', 'BFS'],
      difficulty: 'Medium',
      notes: 'Graph algorithms practice'
    },
    {
      id: 4,
      date: '2024-10-30',
      duration: '2h 00m',
      problemsSolved: 4,
      topics: ['Strings', 'Hash Maps'],
      difficulty: 'Easy',
      notes: 'Interview prep'
    },
    {
      id: 5,
      date: '2024-10-29',
      duration: '1h 30m',
      problemsSolved: 2,
      topics: ['Linked Lists'],
      difficulty: 'Medium',
      notes: 'Two-pointer technique'
    },
    {
      id: 6,
      date: '2024-10-28',
      duration: '2h 15m',
      problemsSolved: 6,
      topics: ['Backtracking', 'Recursion'],
      difficulty: 'Hard',
      notes: 'Permutations and combinations'
    },
    {
      id: 7,
      date: '2024-10-27',
      duration: '1h 20m',
      problemsSolved: 3,
      topics: ['Sorting', 'Arrays'],
      difficulty: 'Easy',
      notes: 'Quick sort implementation'
    },
    {
      id: 8,
      date: '2024-10-26',
      duration: '2h 45m',
      problemsSolved: 5,
      topics: ['Dynamic Programming', 'Strings'],
      difficulty: 'Medium',
      notes: 'Longest common subsequence'
    },
    {
      id: 9,
      date: '2024-10-25',
      duration: '1h 55m',
      problemsSolved: 4,
      topics: ['Binary Search', 'Arrays'],
      difficulty: 'Medium',
      notes: 'Search in rotated array'
    },
    {
      id: 10,
      date: '2024-10-24',
      duration: '3h 00m',
      problemsSolved: 8,
      topics: ['Graphs', 'DFS', 'BFS'],
      difficulty: 'Hard',
      notes: 'Complex graph traversal problems'
    },
  ];

  // Monthly graph data
  const monthlyGraphData = [
    { month: 'Jan', total_hours: 24, intervals: 45, time_hair: 3.2, time_nail: 2.1, time_eye: 4.5, time_nose: 1.8, time_unfocused: 5.2, time_paused: 3.2 },
    { month: 'Feb', total_hours: 28, intervals: 52, time_hair: 3.8, time_nail: 2.5, time_eye: 5.1, time_nose: 2.2, time_unfocused: 6.1, time_paused: 4.3 },
    { month: 'Mar', total_hours: 32, intervals: 58, time_hair: 4.2, time_nail: 2.8, time_eye: 5.8, time_nose: 2.5, time_unfocused: 6.8, time_paused: 5.1 },
    { month: 'Apr', total_hours: 30, intervals: 55, time_hair: 3.9, time_nail: 2.6, time_eye: 5.4, time_nose: 2.3, time_unfocused: 6.4, time_paused: 4.5 },
    { month: 'May', total_hours: 35, intervals: 62, time_hair: 4.5, time_nail: 3.1, time_eye: 6.2, time_nose: 2.8, time_unfocused: 7.2, time_paused: 5.7 },
    { month: 'Jun', total_hours: 38, intervals: 68, time_hair: 4.8, time_nail: 3.4, time_eye: 6.8, time_nose: 3.1, time_unfocused: 7.8, time_paused: 6.1 },
    { month: 'Jul', total_hours: 36, intervals: 64, time_hair: 4.6, time_nail: 3.2, time_eye: 6.4, time_nose: 2.9, time_unfocused: 7.4, time_paused: 5.9 },
    { month: 'Aug', total_hours: 40, intervals: 72, time_hair: 5.1, time_nail: 3.6, time_eye: 7.2, time_nose: 3.3, time_unfocused: 8.2, time_paused: 6.6 },
    { month: 'Sep', total_hours: 42, intervals: 75, time_hair: 5.3, time_nail: 3.8, time_eye: 7.5, time_nose: 3.5, time_unfocused: 8.5, time_paused: 6.9 },
    { month: 'Oct', total_hours: 39, intervals: 70, time_hair: 5.0, time_nail: 3.5, time_eye: 7.0, time_nose: 3.2, time_unfocused: 8.0, time_paused: 6.3 },
    { month: 'Nov', total_hours: 41, intervals: 73, time_hair: 5.2, time_nail: 3.7, time_eye: 7.3, time_nose: 3.4, time_unfocused: 8.3, time_paused: 6.7 },
    { month: 'Dec', total_hours: 37, intervals: 66, time_hair: 4.7, time_nail: 3.3, time_eye: 6.6, time_nose: 3.0, time_unfocused: 7.6, time_paused: 6.0 },
  ];

  // Metrics configuration
  const metricsConfig = {
    total_hours: { label: 'Total Hours', color: '#3b82f6', unit: 'h' },
    intervals: { label: 'Intervals', color: '#8b5cf6', unit: '' },
    time_hair: { label: 'Hair Time', color: '#ec4899', unit: 'h' },
    time_nail: { label: 'Nail Time', color: '#f59e0b', unit: 'h' },
    time_eye: { label: 'Eye Time', color: '#10b981', unit: 'h' },
    time_nose: { label: 'Nose Time', color: '#06b6d4', unit: 'h' },
    time_unfocused: { label: 'Unfocused Time', color: '#ef4444', unit: 'h' },
    time_paused: { label: 'Paused Time', color: '#6366f1', unit: 'h' },
  };

  // All Time Statistics - different views with 4 stats each
  const allTimeStatViews = [
    {
      title: 'All Time Metrics',
      stats: [
        { label: 'Total Sessions', value: '156', color: 'from-blue-50 to-blue-100', textColor: 'text-blue-600' },
        { label: 'Total Hours', value: '234h', color: 'from-purple-50 to-purple-100', textColor: 'text-purple-600' },
        { label: 'Total Intervals', value: '842', color: 'from-indigo-50 to-indigo-100', textColor: 'text-indigo-600' },
        { label: 'Hair Time', value: '52.3h', color: 'from-pink-50 to-pink-100', textColor: 'text-pink-600' },
        { label: 'Nail Time', value: '38.7h', color: 'from-orange-50 to-orange-100', textColor: 'text-orange-600' },
      ]
    },
    {
      title: 'All Time Metrics',
      stats: [
        { label: 'Eye Time', value: '38.7h', color: 'from-orange-50 to-orange-100', textColor: 'text-orange-600' },
        { label: 'Nose Time', value: '74.8h', color: 'from-green-50 to-green-100', textColor: 'text-green-600' },
        { label: 'Unfocused Time', value: '32.5h', color: 'from-cyan-50 to-cyan-100', textColor: 'text-cyan-600' },
        { label: 'Pause Time', value: '87.2h', color: 'from-red-50 to-red-100', textColor: 'text-red-600' },
      ]
    },
  ];

  const getHeatmapColor = (count) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count === 2) return 'bg-green-400';
    if (count === 3) return 'bg-green-600';
    return 'bg-green-800';
  };

  const toggleSession = (id) => {
    setExpandedSession(expandedSession === id ? null : id);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    console.log('Changing password:', passwordData);
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleLogout = () => {
    console.log('Logging out...');
  };

  const nextStatView = () => {
    setCurrentStatView((prev) => (prev + 1) % allTimeStatViews.length);
  };

  const prevStatView = () => {
    setCurrentStatView((prev) => (prev - 1 + allTimeStatViews.length) % allTimeStatViews.length);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column - Account Info */}
          <div className="lg:col-span-2">
            {/* Account Info */}
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col" style={{ height: '452px' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Account Info</h2>
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 font-medium">
                    {userData.username}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                    {userData.email}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Member Since</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                    {userData.joinDate}
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Top 10 Sessions */}
          <div>
            {/* Top 10 Recent Sessions */}
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col" style={{ height: '452px' }}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 10 Sessions</h2>
              <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                {recentSessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleSession(session.id)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-900">{session.date}</div>
                          <div className="text-xs text-gray-600">{session.duration}</div>
                        </div>
                      </div>
                      {expandedSession === session.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {expandedSession === session.id && (
                      <div className="px-3 py-3 border-t border-gray-200 bg-gray-50 space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Problems: </span>
                          <span className="text-gray-900">{session.problemsSolved}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Difficulty: </span>
                          <span className="text-gray-900">{session.difficulty}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Topics: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {session.topics.map((topic, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Notes: </span>
                          <p className="text-gray-900 text-xs mt-1">{session.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="space-y-6 mt-6">
          {/* GitHub Heatmap - Full Width */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Over the Past Year</h2>
            <div className="overflow-x-auto">
              <div className="w-full flex justify-center">
                <div className="inline-flex flex-col gap-1">
                  <div className="flex gap-1">
                    {Array.from({ length: 53 }, (_, weekIndex) => (
                      <div key={weekIndex} className="flex flex-col gap-1">
                        {Array.from({ length: 7 }, (_, dayIndex) => {
                          const dataIndex = weekIndex * 7 + dayIndex;
                          const dayData = heatmapData[dataIndex];
                          return (
                            <div
                              key={dayIndex}
                              className={`w-3 h-3 rounded-sm ${dayData ? getHeatmapColor(dayData.count) : 'bg-gray-100'}`}
                              title={dayData ? `${dayData.date}: ${dayData.count} sessions` : ''}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-600">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-gray-100 rounded-sm" />
                <div className="w-3 h-3 bg-green-200 rounded-sm" />
                <div className="w-3 h-3 bg-green-400 rounded-sm" />
                <div className="w-3 h-3 bg-green-600 rounded-sm" />
                <div className="w-3 h-3 bg-green-800 rounded-sm" />
              </div>
              <span>More</span>
            </div>
          </div>

          {/* Statistics - 30% / 70% Split */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* All Time Statistics - 30% with Slider */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={prevStatView}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  aria-label="Previous view"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h3 className="text-lg font-semibold text-gray-900 text-center flex-1">
                  {allTimeStatViews[currentStatView].title}
                </h3>
                <button
                  onClick={nextStatView}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  aria-label="Next view"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              <div className="space-y-4">
                {allTimeStatViews[currentStatView].stats.map((stat, idx) => (
                  <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-lg p-4`}>
                    <div className="flex flex-col items-center">
                      <span className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</span>
                      <p className="text-sm text-gray-700 font-medium mt-2 text-center">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-2 mt-6">
                {allTimeStatViews.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentStatView ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Monthly Statistics with Graph - 70% */}
            <div className="lg:col-span-7 bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Monthly Statistics</h3>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium"
                >
                  {Object.entries(metricsConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyGraphData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [
                      `${value}${metricsConfig[selectedMetric].unit}`, 
                      metricsConfig[selectedMetric].label
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey={selectedMetric} 
                    stroke={metricsConfig[selectedMetric].color} 
                    strokeWidth={3}
                    name={metricsConfig[selectedMetric].label}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Update Password
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}