import { useEffect, useState } from 'react';
import { Calendar, Clock, Settings, ChevronDown, ChevronUp, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const userData = {
    username: JSON.parse(localStorage.getItem('user')).username,
    email: JSON.parse(localStorage.getItem('user')).email,
  };
  const [recentSessions, setRecentSessions] = useState([]);
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

  const fetchRecentSessions = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/get-sessions/' + JSON.parse(localStorage.getItem('user')).userId);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setRecentSessions(data.data.sessions);
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
    }
  };

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
    setMonthlyGraphData(newData.reverse());
  };

  const fillMonthlyGraphData = (sessionsDataParam = null) => {
    const dataToUse = sessionsDataParam || sessionsData;
    
    if (!dataToUse || dataToUse.length === 0) {
      console.warn('No sessions data available');
      return;
    }

    setMonthlyGraphData(prevData => {
      const prevDataArray = Array.isArray(prevData) ? prevData : 
                           prevData instanceof Map ? Array.from(prevData.values()) : [];
      
      const updatedData = [...prevDataArray];
      
      dataToUse.forEach(session => {
        const sessionDate = new Date(session.date);
        const sessionYear = sessionDate.getFullYear();
        const sessionMonth = sessionDate.getMonth();
        
        const existingIndex = updatedData.findIndex(item => 
          item.year === sessionYear && item.monthIndex === sessionMonth
        );
        if (existingIndex !== -1) {
          updatedData[existingIndex] = {
            ...updatedData[existingIndex],
            total_hours: updatedData[existingIndex].total_hours + (session.total_hours || 0),
            intervals: updatedData[existingIndex].intervals + (session.intervals || 0),
            time_hair: parseFloat((updatedData[existingIndex].time_hair + ((session.time_hair || 0) / 60)).toFixed(2)),
            time_nail: parseFloat((updatedData[existingIndex].time_nail + ((session.time_nail || 0) / 60)).toFixed(2)),
            time_eye: parseFloat((updatedData[existingIndex].time_eye + ((session.time_eye || 0) / 60)).toFixed(2)),
            time_nose: parseFloat((updatedData[existingIndex].time_nose + ((session.time_nose || 0) / 60)).toFixed(2)),
            time_unfocused: parseFloat((updatedData[existingIndex].time_unfocused + ((session.time_unfocused || 0) / 60)).toFixed(2)),
            time_paused: parseFloat((updatedData[existingIndex].time_paused + ((session.time_paused || 0) / 60)).toFixed(2))
          };
        }
      });
      
      return updatedData;
    });
  };

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

  function getDatePositionInArray(dateString: string, today: Date = new Date()): number {
    const [year, month, day] = dateString.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));
    
    if (isNaN(targetDate.getTime())) {
      throw new Error('Invalid target date');
    }
    if (isNaN(today.getTime())) {
      throw new Error('Invalid today date');
    }
    
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    
    const diffTime = targetDate.getTime() - todayUTC.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const position = 364 + diffDays;
    
    return position;
  }

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
      
      setSessionsData(sessionsDataFromAPI);
      
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

  useEffect(() => {
    const initializeData = async () => {
      try {
        await fetchRecentSessions();
        const { heatmapData: newHeatmapData, sessionsData: newSessionsData } = await generateHeatmapData();
        
        setHeatmapData(newHeatmapData);
        setSessionsData(newSessionsData);
        
        await fetchRecordData();
        createMonthlyGraphData();
        
        if (newSessionsData.length > 0) {
          fillMonthlyGraphData(newSessionsData);
        }
      } catch (error) {
        console.error('Error initializing application data:', error);
      }
    };

    initializeData();
  }, []);

  const metricsConfig = {
    total_hours: { label: 'Total Hours Studied', color: '#3D7ECF', unit: 'h' },
    intervals: { label: 'Intervals', color: '#7AC7C4', unit: '' },
    time_hair: { label: 'Hair Touch', color: '#F4A261', unit: 'm' },
    time_nail: { label: 'Nail Bite', color: '#E76F51', unit: 'm' },
    time_eye: { label: 'Eye Rub', color: '#5BA3E1', unit: 'm' },
    time_nose: { label: 'Nose Touch', color: '#7AC7C4', unit: 'm' },
    time_unfocused: { label: 'Unfocused Time', color: '#F4A261', unit: 'm' },
    time_paused: { label: 'Paused Time', color: '#3D7ECF', unit: 'm' },
  };

  const allTimeStatViews = [
    {
      title: 'All Time Metrics',
      stats: [
        { label: 'Total Sessions', value: recordData.totalSessions, color: 'from-blue-500/20 to-blue-400/10', textColor: '#3D7ECF', borderColor: 'rgba(61, 126, 207, 0.3)' },
        { label: 'Total Hours Studied', value: recordData.totalHours, color: 'from-teal-500/20 to-teal-400/10', textColor: '#7AC7C4', borderColor: 'rgba(122, 199, 196, 0.3)' },
        { label: 'Total Intervals', value: recordData.totalIntervals, color: 'from-cyan-500/20 to-cyan-400/10', textColor: '#5BA3E1', borderColor: 'rgba(91, 163, 225, 0.3)' },
        { label: 'Hair Touch (h)', value: recordData.hairTime, color: 'from-orange-500/20 to-orange-400/10', textColor: '#F4A261', borderColor: 'rgba(244, 162, 97, 0.3)' },
        { label: 'Nail Bite (h)', value: recordData.nailTime, color: 'from-red-500/20 to-red-400/10', textColor: '#E76F51', borderColor: 'rgba(231, 111, 81, 0.3)' },
      ]
    },
    {
      title: 'All Time Metrics',
      stats: [
        { label: 'Eye Rub (h)', value: recordData.eyeTime, color: 'from-sky-500/20 to-sky-400/10', textColor: '#5BA3E1', borderColor: 'rgba(91, 163, 225, 0.3)' },
        { label: 'Nose Touch (h)', value: recordData.noseTime, color: 'from-teal-500/20 to-teal-400/10', textColor: '#7AC7C4', borderColor: 'rgba(122, 199, 196, 0.3)' },
        { label: 'Unfocused Time (h)', value: recordData.unfocusedTime, color: 'from-orange-500/20 to-orange-400/10', textColor: '#F4A261', borderColor: 'rgba(244, 162, 97, 0.3)' },
        { label: 'Pause Time (h)', value: recordData.pauseTime, color: 'from-blue-500/20 to-blue-400/10', textColor: '#3D7ECF', borderColor: 'rgba(61, 126, 207, 0.3)' },
      ]
    },
  ];

  const getHeatmapColor = (count) => {
    if (count === 0) return 'rgba(226, 232, 240, 0.3)';
    if (count <= 1) return '#9be9a8';
    if (count <= 3) return '#40c463';
    if (count <= 5) return '#30a14e';
    return '#216e39';
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
    <div className="min-h-screen" style={{ backgroundColor: '#F9F6EF' }}>
      {/* Navbar */}
      <nav className="relative z-10 backdrop-blur-xl" style={{ 
        borderBottom: '1px solid #E2E8F0',
        backgroundColor: 'rgba(249, 246, 239, 0.95)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ color: '#3D7ECF' }}>
              Dashboard
            </h1>
            <div className="flex items-center gap-3">
              <a
                href="/presets"
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition"
                style={{ backgroundColor: '#3D7ECF' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2C5BA8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3D7ECF'}
              >
                <Clock className="w-4 h-4" />
                Sessions
              </a>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition"
                style={{ backgroundColor: '#F4A261' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8935A'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F4A261'}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 rounded-full blur-3xl -top-48 -right-48 animate-pulse" style={{ backgroundColor: 'rgba(91, 163, 225, 0.1)' }} />
        <div className="absolute w-96 h-96 rounded-full blur-3xl -bottom-48 -left-48 animate-pulse" style={{ backgroundColor: 'rgba(122, 199, 196, 0.1)', animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column - Account Info */}
          <div className="lg:col-span-2">
            <div className="backdrop-blur-xl border rounded-3xl shadow-2xl p-8" style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderColor: '#E2E8F0',
              height: '340px'
            }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold" style={{ color: '#4A5568' }}>Account Info</h2>
                <Settings className="w-5 h-5" style={{ color: '#7AC7C4' }} />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#4A5568', opacity: 0.7 }}>Username</label>
                  <div className="px-4 py-3 border rounded-xl font-medium" style={{ 
                    backgroundColor: 'rgba(226, 232, 240, 0.3)',
                    borderColor: '#E2E8F0',
                    color: '#4A5568'
                  }}>
                    {userData.username}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#4A5568', opacity: 0.7 }}>Email</label>
                  <div className="px-4 py-3 border rounded-xl" style={{ 
                    backgroundColor: 'rgba(226, 232, 240, 0.3)',
                    borderColor: '#E2E8F0',
                    color: '#4A5568'
                  }}>
                    {userData.email}
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full px-4 py-3 text-white rounded-xl transition font-medium shadow-lg"
                  style={{ 
                    background: 'linear-gradient(90deg, #7AC7C4 0%, #5BA3E1 100%)',
                    boxShadow: '0 10px 25px rgba(91, 163, 225, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 15px 30px rgba(91, 163, 225, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(91, 163, 225, 0.2)';
                  }}
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Recent Sessions */}
          <div>
            <div className="backdrop-blur-xl border rounded-3xl shadow-2xl p-6 flex flex-col" style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderColor: '#E2E8F0',
              height: '340px'
            }}>
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#4A5568' }}>Most Recent Sessions</h2>
              <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                {recentSessions.map((session, index) => (
                  <div key={session._id || index} className="border rounded-xl backdrop-blur-sm" style={{ 
                    borderColor: '#E2E8F0',
                    backgroundColor: 'rgba(226, 232, 240, 0.3)'
                  }}>
                    <button
                      onClick={() => toggleSession(session._id || index)}
                      className="w-full px-3 py-2 flex items-center justify-between transition rounded-xl"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(122, 199, 196, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" style={{ color: '#3D7ECF' }} />
                        <div className="text-left">
                          <div className="text-sm font-medium" style={{ color: '#4A5568' }}>
                            {session.date} at {session.time_started}
                          </div>
                          <div className="text-xs" style={{ color: '#4A5568', opacity: 0.7 }}>
                            {session.total_hours} hours • {session.intervals} intervals
                          </div>
                        </div>
                      </div>
                      {expandedSession === (session._id || index) ? (
                        <ChevronUp className="w-4 h-4" style={{ color: '#7AC7C4' }} />
                      ) : (
                        <ChevronDown className="w-4 h-4" style={{ color: '#7AC7C4' }} />
                      )}
                    </button>
                    {expandedSession === (session._id || index) && (
                      <div className="px-3 py-3 border-t space-y-2 text-sm rounded-b-xl" style={{ 
                        borderColor: '#E2E8F0',
                        backgroundColor: 'rgba(226, 232, 240, 0.5)'
                      }}>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="font-medium" style={{ color: '#4A5568', opacity: 0.7 }}>Total Hours: </span>
                            <span style={{ color: '#4A5568' }}>{session.total_hours}</span>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: '#4A5568', opacity: 0.7 }}>Intervals: </span>
                            <span style={{ color: '#4A5568' }}>{session.intervals}</span>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: '#4A5568', opacity: 0.7 }}>Time per Interval: </span>
                            <span style={{ color: '#4A5568' }}>{session.time_per_interval} min</span>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: '#4A5568', opacity: 0.7 }}>Started: </span>
                            <span style={{ color: '#4A5568' }}>{session.time_started}</span>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <span className="font-medium" style={{ color: '#4A5568', opacity: 0.7 }}>Focus Time Breakdown (seconds): </span>
                          <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                            <div className="flex justify-between">
                              <span style={{ color: '#4A5568', opacity: 0.7 }}>Hair:</span>
                              <span style={{ color: '#4A5568' }}>{session.time_hair}s</span>
                            </div>
                            <div className="flex justify-between">
                              <span style={{ color: '#4A5568', opacity: 0.7 }}>Nail:</span>
                              <span style={{ color: '#4A5568' }}>{session.time_nail}s</span>
                            </div>
                            <div className="flex justify-between">
                              <span style={{ color: '#4A5568', opacity: 0.7 }}>Eye:</span>
                              <span style={{ color: '#4A5568' }}>{session.time_eye}s</span>
                            </div>
                            <div className="flex justify-between">
                              <span style={{ color: '#4A5568', opacity: 0.7 }}>Nose:</span>
                              <span style={{ color: '#4A5568' }}>{session.time_nose}s</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <span className="font-medium" style={{ color: '#4A5568', opacity: 0.7 }}>Other Time (seconds): </span>
                          <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                            <div className="flex justify-between">
                              <span style={{ color: '#4A5568', opacity: 0.7 }}>Unfocused:</span>
                              <span style={{ color: '#4A5568' }}>{session.time_unfocused}s</span>
                            </div>
                            <div className="flex justify-between">
                              <span style={{ color: '#4A5568', opacity: 0.7 }}>Paused:</span>
                              <span style={{ color: '#4A5568' }}>{session.time_paused}s</span>
                            </div>
                          </div>
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
          {/* GitHub Heatmap */}
          <div className="backdrop-blur-xl border rounded-3xl shadow-2xl p-8" style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderColor: '#E2E8F0'
          }}>
            <h2 className="text-xl font-semibold mb-6" style={{ color: '#4A5568' }}>Activity Over the Past Year</h2>
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
                              className="w-3 h-3 rounded-sm border"
                              style={{ 
                                backgroundColor: dayData ? getHeatmapColor(dayData.count) : 'rgba(226, 232, 240, 0.3)',
                                borderColor: '#E2E8F0'
                              }}
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
            <div className="flex items-center justify-center gap-4 mt-6 text-sm" style={{ color: '#4A5568', opacity: 0.7 }}>
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 border rounded-sm" style={{ backgroundColor: 'rgba(226, 232, 240, 0.3)', borderColor: '#E2E8F0' }} />
                <div className="w-3 h-3 border rounded-sm" style={{ backgroundColor: '#9be9a8', borderColor: '#E2E8F0' }} />
                <div className="w-3 h-3 border rounded-sm" style={{ backgroundColor: '#40c463', borderColor: '#E2E8F0' }} />
                <div className="w-3 h-3 border rounded-sm" style={{ backgroundColor: '#30a14e', borderColor: '#E2E8F0' }} />
                <div className="w-3 h-3 border rounded-sm" style={{ backgroundColor: '#216e39', borderColor: '#E2E8F0' }} />
              </div>
              <span>More</span>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* All Time Statistics */}
            <div className="lg:col-span-3 backdrop-blur-xl border rounded-3xl shadow-2xl p-6" style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderColor: '#E2E8F0'
            }}>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={prevStatView}
                  className="p-2 rounded-lg transition"
                  aria-label="Previous view"
                  style={{ color: '#7AC7C4' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(122, 199, 196, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-semibold text-center flex-1" style={{ color: '#4A5568' }}>
                  {allTimeStatViews[currentStatView].title}
                </h3>
                <button
                  onClick={nextStatView}
                  className="p-2 rounded-lg transition"
                  aria-label="Next view"
                  style={{ color: '#7AC7C4' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(122, 199, 196, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {allTimeStatViews[currentStatView].stats.map((stat, idx) => (
                  <div key={idx} className="rounded-xl p-4 backdrop-blur-sm border" style={{ 
                    background: `linear-gradient(to bottom right, ${stat.color})`,
                    borderColor: stat.borderColor
                  }}>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-bold" style={{ color: stat.textColor }}>{stat.value}</span>
                      <p className="text-sm font-medium mt-2 text-center" style={{ color: '#4A5568' }}>{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-2 mt-6">
                {allTimeStatViews.map((_, idx) => (
                  <div
                    key={idx}
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: idx === currentStatView ? '32px' : '8px',
                      backgroundColor: idx === currentStatView ? '#3D7ECF' : '#E2E8F0'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Monthly Statistics with Graph */}
            <div className="lg:col-span-7 backdrop-blur-xl border rounded-3xl shadow-2xl p-6" style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderColor: '#E2E8F0'
            }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ color: '#4A5568' }}>Monthly Statistics</h3>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="px-4 py-2 border text-sm font-medium rounded-xl focus:ring-2 focus:border-transparent outline-none transition"
                  style={{ 
                    backgroundColor: 'rgba(226, 232, 240, 0.3)',
                    borderColor: '#E2E8F0',
                    color: '#4A5568'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7AC7C4';
                    e.target.style.boxShadow = '0 0 0 2px rgba(122, 199, 196, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="monthYear" stroke="#4A5568" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#4A5568" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    formatter={(value) => [
                      `${value}${metricsConfig[selectedMetric]?.unit || ''}`, 
                      metricsConfig[selectedMetric]?.label || selectedMetric
                    ]}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      color: '#4A5568',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey={selectedMetric} 
                    stroke={metricsConfig[selectedMetric]?.color || '#3D7ECF'} 
                    strokeWidth={3}
                    name={metricsConfig[selectedMetric]?.label || selectedMetric}
                    dot={{ r: 4, fill: metricsConfig[selectedMetric]?.color || '#3D7ECF' }}
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
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="backdrop-blur-xl border rounded-3xl shadow-2xl max-w-md w-full p-8" style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E2E8F0'
          }}>
            <h3 className="text-xl font-semibold mb-6" style={{ color: '#4A5568' }}>Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#4A5568' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-xl outline-none transition"
                  placeholder="Enter current password"
                  style={{ 
                    backgroundColor: 'rgba(226, 232, 240, 0.3)',
                    borderColor: '#E2E8F0',
                    color: '#4A5568'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7AC7C4';
                    e.target.style.boxShadow = '0 0 0 2px rgba(122, 199, 196, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#4A5568' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-xl outline-none transition"
                  placeholder="Enter new password"
                  style={{ 
                    backgroundColor: 'rgba(226, 232, 240, 0.3)',
                    borderColor: '#E2E8F0',
                    color: '#4A5568'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7AC7C4';
                    e.target.style.boxShadow = '0 0 0 2px rgba(122, 199, 196, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#4A5568' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-xl outline-none transition"
                  placeholder="Confirm new password"
                  style={{ 
                    backgroundColor: 'rgba(226, 232, 240, 0.3)',
                    borderColor: '#E2E8F0',
                    color: '#4A5568'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7AC7C4';
                    e.target.style.boxShadow = '0 0 0 2px rgba(122, 199, 196, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 text-white py-3 rounded-xl font-semibold transition shadow-lg"
                  style={{ 
                    background: 'linear-gradient(90deg, #7AC7C4 0%, #5BA3E1 100%)',
                    boxShadow: '0 10px 25px rgba(91, 163, 225, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 15px 30px rgba(91, 163, 225, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(91, 163, 225, 0.2)';
                  }}
                >
                  Update Password
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 border py-3 rounded-xl font-semibold transition"
                  style={{ 
                    backgroundColor: 'rgba(226, 232, 240, 0.3)',
                    borderColor: '#E2E8F0',
                    color: '#4A5568'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(226, 232, 240, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(226, 232, 240, 0.3)'}
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