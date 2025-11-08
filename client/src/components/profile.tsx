import { useEffect, useState } from 'react';
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
  const [heatmapData, setHeatmapData] = useState([]);
  const [sessionsData, setSessionsData] = useState([]);

  // Mock user data
  const userData = {
    username: '',
    email: ''
  };

    const [recordData, setRecordData] = useState({
    totalSessions: 0,
    totalHours: 0,
    totalIntervals: 0,
    hairTime: 0,
    nailTime: 0,
    eyeTime: 0,
    noseTime: 0,
    unfocusedTime: 0,
    pauseTime: 0
  });


  const [monthlyGraphData, setMonthlyGraphData] = useState([]);

// Create monthly graph data as array
const createMonthlyGraphData = () => {
  const today = new Date();
  const newData = [];

  for (let i = 0; i <= 12; i++) {
    const currentDate = new Date(today);
    currentDate.setMonth(today.getMonth() - i);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    newData.push({
      key: `${year}-${month}`,
      month: monthName,
      year: year,
      monthIndex: month,
      monthYear: `${monthName} ${year}`,
      displayOrder: i,
      total_hours: 0,
      intervals: 0,
      time_hair: 0,
      time_nail: 0,
      time_eye: 0,
      time_nose: 0,
      time_unfocused: 0,
      time_paused: 0
    });
  }
  // Reverse to get chronological order
  setMonthlyGraphData(newData?.reverse());
};

// Fill data with array approach
const fillMonthlyGraphData = (sessionsDataParam = null) => {
  const dataToUse = sessionsDataParam || sessionsData;

  if (!dataToUse || dataToUse.length === 0) {
    console.warn('No sessions data available');
    return;
  }

setMonthlyGraphData(prevData => {
    const prevDataArray = Array.isArray(prevData) ? prevData : 
                         prevData instanceof Map ? Array.from(prevData.values()) : [];

    // Create a copy of the previous data to avoid mutations
    const updatedData = [...prevDataArray];

    dataToUse.forEach(session => {
      const sessionDate = new Date(session.date);
      const sessionYear = sessionDate.getFullYear();
      const sessionMonth = sessionDate.getMonth();

      // Find existing month data in the array
      const existingIndex = updatedData.findIndex(item => 
        item.year === sessionYear && item.monthIndex === sessionMonth
      );

      if (existingIndex !== -1) {
        // Update existing month data
        updatedData[existingIndex] = {
          ...updatedData[existingIndex],
          total_hours: updatedData[existingIndex].total_hours + (session.total_hours || 0),
          intervals: updatedData[existingIndex].intervals + (session.intervals || 0),
          time_hair: updatedData[existingIndex].time_hair + parseFloat(((session.time_hair || 0) / 60).toFixed(2)), // seconds to minutes
          time_nail: updatedData[existingIndex].time_nail + parseFloat(((session.time_nail || 0) / 60).toFixed(2)), // seconds to minutes
          time_eye: updatedData[existingIndex].time_eye + parseFloat(((session.time_eye || 0) / 60).toFixed(2)), // seconds to minutes
          time_nose: updatedData[existingIndex].time_nose + parseFloat(((session.time_nose || 0) / 60).toFixed(2)), // seconds to minutes
          time_unfocused: updatedData[existingIndex].time_unfocused + parseFloat(((session.time_unfocused || 0) / 60).toFixed(2)), // seconds to minutes
          time_paused: updatedData[existingIndex].time_paused + parseFloat(((session.time_paused || 0) / 60).toFixed(2)) // seconds to minutes
        };
      }
    });

    return updatedData;
  });
};

   //useEffect(() => {
    const fetchRecordData = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/get-record/' + JSON.parse(localStorage.getItem('user')).userId);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        recordData.totalSessions = data.data.user_record.total_sessions;
        setRecordData({
          totalSessions: data.data.user_record.total_sessions,
          totalHours: data.data.user_record.total_hours,
          totalIntervals: data.data.user_record.total_intervals,
          hairTime: data.data.user_record.time_hair,
          nailTime: data.data.user_record.time_nail,
          eyeTime: data.data.user_record.time_eye,
          noseTime: data.data.user_record.time_nose,
          unfocusedTime: data.data.user_record.time_unfocused,
          pauseTime: data.data.user_record.time_paused
        });
      } catch (error) {
        console.error('Error fetching user records:', error);
      }
    };
    //fetchRecordData();
  //}, []);
  
function getDatePositionInArray(dateString: string, today: Date = new Date()): number {
    // Parse the date string manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));

    // Validate dates
    if (isNaN(targetDate.getTime())) {
        throw new Error('Invalid target date');
    }
    if (isNaN(today.getTime())) {
        throw new Error('Invalid today date');
    }

    // Set both dates to start of day for accurate comparison
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    const diffTime = targetDate.getTime() - todayUTC.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Position in array (today is index 364)
    const position = 364 + diffDays;

    return position;
}

  // Generate heatmap data
const generateHeatmapData = async () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    console.log(user);

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const todayIsoDateString = `${year}-${month}-${day}`;

    const lastYear = today.getFullYear() - 1;
    const lastYearIsoDateString = `${lastYear}-${month}-${day}`;

    const response = await fetch('http://localhost:5001/api/get-sessions-from-date/' + user.userId + '/' + lastYearIsoDateString + '/' + todayIsoDateString);

    if (!response.ok) {
      console.error('Server error:', response.status, response.statusText);
      return { heatmapData: [], sessionsData: [] };
    }

    const result = await response.json();
    const sessionsDataFromAPI = result.data.sessions || [];

    // Set sessionsData state
    setSessionsData(sessionsDataFromAPI);

    // Use the data directly from the API response, not from state
    const activity = new Array(365).fill(0);
    for (let i = 0; i < sessionsDataFromAPI.length; i++) {
      activity[getDatePositionInArray(sessionsDataFromAPI[i].date)] += sessionsDataFromAPI[i].total_hours;
    }

    const heatmapData = new Array(365);
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      heatmapData[364 - i] = {
        date: date.toISOString().split('T')[0],
        count: activity[364 - i]
      };
    }

    return { heatmapData, sessionsData: sessionsDataFromAPI };
  } catch (error) {
    console.error('Error fetching the session data for the heatmap', error);
    return { heatmapData: [], sessionsData: [] };
  }
};

// Updated useEffect
useEffect(() => {
  const initializeData = async () => {
    try {
      // Get both datasets from generateHeatmapData
      const { heatmapData: newHeatmapData, sessionsData: newSessionsData } = await generateHeatmapData();

      // Set states
      setHeatmapData(newHeatmapData);
      setSessionsData(newSessionsData);

      // Fetch other data
      await fetchRecordData();

      // Initialize monthly graph
      createMonthlyGraphData();

      // Fill monthly graph with the sessions data we just received
      if (newSessionsData.length > 0) {
      fillMonthlyGraphData(newSessionsData);
      }

    } catch (error) {
      console.error('Error initializing application data:', error);
    }
  };

  initializeData();
}, []);

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

  // Metrics configuration
  const metricsConfig = {
    total_hours: { label: 'Total Hours', color: '#3b82f6', unit: 'h' },
    intervals: { label: 'Intervals', color: '#8b5cf6', unit: '' },
    time_hair: { label: 'Hair Time', color: '#ec4899', unit: 'm' },
    time_nail: { label: 'Nail Time', color: '#f59e0b', unit: 'm' },
    time_eye: { label: 'Eye Time', color: '#10b981', unit: 'm' },
    time_nose: { label: 'Nose Time', color: '#06b6d4', unit: 'm' },
    time_unfocused: { label: 'Unfocused Time', color: '#ef4444', unit: 'm' },
    time_paused: { label: 'Paused Time', color: '#6366f1', unit: 'm' },
  };

  // All Time Statistics - different views with 4 stats each
  const allTimeStatViews = [
    {
      title: 'All Time Metrics',
      stats: [
        { label: 'Total Sessions', value: recordData.totalSessions, color: 'from-blue-50 to-blue-100', textColor: 'text-blue-600' },
        { label: 'Total Hours', value: recordData.totalHours, color: 'from-purple-50 to-purple-100', textColor: 'text-purple-600' },
        { label: 'Total Intervals', value: recordData.totalIntervals, color: 'from-indigo-50 to-indigo-100', textColor: 'text-indigo-600' },
        { label: 'Hair Time (h)', value: recordData.hairTime, color: 'from-pink-50 to-pink-100', textColor: 'text-pink-600' },
        { label: 'Nail Time (h)', value: recordData.nailTime, color: 'from-orange-50 to-orange-100', textColor: 'text-orange-600' },
      ]
    },
    {
      title: 'All Time Metrics',
      stats: [
        { label: 'Eye Time (h)', value: recordData.eyeTime, color: 'from-orange-50 to-orange-100', textColor: 'text-orange-600' },
        { label: 'Nose Time (h)', value: recordData.noseTime, color: 'from-green-50 to-green-100', textColor: 'text-green-600' },
        { label: 'Unfocused Time (h)', value: recordData.unfocusedTime, color: 'from-cyan-50 to-cyan-100', textColor: 'text-cyan-600' },
        { label: 'Pause Time (h)', value: recordData.pauseTime, color: 'from-red-50 to-red-100', textColor: 'text-red-600' },
      ]
    },
  ];

  const getHeatmapColor = (count) => {
    if (count === 0) return 'bg-gray-100';
    if (count <= 1) return 'bg-green-200';
    if (count <= 3) return 'bg-green-400';
    if (count <= 5) return 'bg-green-600';
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('Logging out...');
    window.location.href = '/login';
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
                              title={dayData ? `${dayData.date}: ${dayData.count} hours` : ''}
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
                <LineChart data={
                  Array.isArray(monthlyGraphData) ? monthlyGraphData : 
                  monthlyGraphData instanceof Map ? Array.from(monthlyGraphData.values()) :
                  monthlyGraphData && typeof monthlyGraphData === 'object' ? Object.values(monthlyGraphData) :
                  []
                }>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthYear" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [
                      `${value}${metricsConfig[selectedMetric]?.unit || ''}`, 
                      metricsConfig[selectedMetric]?.label || selectedMetric
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey={selectedMetric} 
                    stroke={metricsConfig[selectedMetric]?.color || '#8884d8'} 
                    strokeWidth={3}
                    name={metricsConfig[selectedMetric]?.label || selectedMetric}
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