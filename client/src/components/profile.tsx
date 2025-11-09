import { useEffect, useState } from 'react';
import { Calendar, Clock, Settings, ChevronDown, ChevronUp, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import logo from '/logo.png';
const PIXEL = '"Press Start 2P", monospace';

export default function ProfileDashboard() {
  const [expandedSession, setExpandedSession] = useState<string | number | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentStatView, setCurrentStatView] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState('total_hours');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [sessionsData, setSessionsData] = useState<any[]>([]);
  const user = JSON.parse(localStorage.getItem('user') || '{"username":"","email":"","userId":""}');
  const userData = { username: user.username, email: user.email };

  const [recentSessions, setRecentSessions] = useState<any[]>([]);
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

  const [monthlyGraphData, setMonthlyGraphData] = useState<any[]>([]);

  const fetchRecentSessions = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/get-sessions/' + user.userId);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setRecentSessions(data.data.sessions);
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
    }
  };

  const createMonthlyGraphData = () => {
    const today = new Date();
    const newData: any[] = [];
    for (let i = 0; i <= 12; i++) {
      const currentDate = new Date(today);
      currentDate.setMonth(today.getMonth() - i);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthName = currentDate.toLocaleString('default', { month: 'long' });
      newData.push({
        key: `${year}-${month}`,
        month: monthName,
        year,
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

  function shortMonthLabel(label: string) {
    // "December 2024" -> "Dec ’24"
    const [m, y] = label.split(' ');
    const map: Record<string, string> = {
      January:'Jan', February:'Feb', March:'Mar', April:'Apr', May:'May', June:'Jun',
      July:'Jul', August:'Aug', September:'Sep', October:'Oct', November:'Nov', December:'Dec'
    };
    const yy = y ? `’${y.slice(-2)}` : '';
    return `${map[m] || m} ${yy}`;
  }

  const fillMonthlyGraphData = (sessionsDataParam: any[] | null = null) => {
    const dataToUse = sessionsDataParam || sessionsData;
    if (!dataToUse || dataToUse.length === 0) return;

    setMonthlyGraphData(prev => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      dataToUse.forEach((session: any) => {
        const d = new Date(session.date);
        const idx = arr.findIndex(it => it.year === d.getFullYear() && it.monthIndex === d.getMonth());
        if (idx !== -1) {
          arr[idx] = {
            ...arr[idx],
            total_hours: arr[idx].total_hours + (session.total_hours || 0),
            intervals: arr[idx].intervals + (session.intervals || 0),
            time_hair: round2(arr[idx].time_hair + ((session.time_hair || 0) / 60)),
            time_nail: round2(arr[idx].time_nail + ((session.time_nail || 0) / 60)),
            time_eye: round2(arr[idx].time_eye + ((session.time_eye || 0) / 60)),
            time_nose: round2(arr[idx].time_nose + ((session.time_nose || 0) / 60)),
            time_unfocused: round2(arr[idx].time_unfocused + ((session.time_unfocused || 0) / 60)),
            time_paused: round2(arr[idx].time_paused + ((session.time_paused || 0) / 60)),
          };
        }
      });
      return arr;
    });
  };

  const fetchRecordData = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/get-record/' + user.userId);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setRecordData({
        totalSessions: data.data.user_record.total_sessions,
        totalHours: data.data.user_record.total_hours,
        totalIntervals: data.data.user_record.total_intervals,
        hairTime: data.data.user_record.time_hair,
        nailTime: data.data.user_record.time_nail,
        eyeTime: data.data.user_record.time_eye,
        noseTime: data.data.user_record.time_nose,
        unfocusedTime: data.data.user_record.time_unfocused,
        pauseTime: data.data.user_record.time_paused,
      });
    } catch (error) {
      console.error('Error fetching user records:', error);
    }
  };

  function getDatePositionInArray(dateString: string, today: Date = new Date()): number {
    const [year, month, day] = dateString.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const diffTime = targetDate.getTime() - todayUTC.getTime();
    return 364 + Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  const generateHeatmapData = async () => {
    try {
      const today = new Date();
      const y = today.getFullYear();
      const m = (today.getMonth() + 1).toString().padStart(2, '0');
      const d = today.getDate().toString().padStart(2, '0');
      const todayIso = `${y}-${m}-${d}`;
      const lastYearIso = `${y - 1}-${m}-${d}`;

      const response = await fetch('http://localhost:5001/api/get-sessions-from-date/' + user.userId + '/' + lastYearIso + '/' + todayIso);
      if (!response.ok) return { heatmapData: [], sessionsData: [] };
      const result = await response.json();
      const sessions = result.data.sessions || [];

      setSessionsData(sessions);

      const activity = new Array(365).fill(0);
      for (let i = 0; i < sessions.length; i++) {
        activity[getDatePositionInArray(sessions[i].date)] += sessions[i].total_hours;
      }

      const hm = new Array(365);
      for (let i = 364; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        hm[364 - i] = {
          date: date.toISOString().split('T')[0],
          count: activity[364 - i]
        };
      }
      return { heatmapData: hm, sessionsData: sessions };
    } catch (e) {
      console.error('Error fetching heatmap data', e);
      return { heatmapData: [], sessionsData: [] };
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchRecentSessions();
      const { heatmapData: hm, sessionsData: sd } = await generateHeatmapData();
      setHeatmapData(hm);
      setSessionsData(sd);
      await fetchRecordData();
      createMonthlyGraphData();
      if (sd.length > 0) fillMonthlyGraphData(sd);
    };
    init();
  }, []);

  const metricsConfig: Record<string, { label: string; color: string; unit: string }> = {
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

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'rgba(226, 232, 240, 0.3)';
    if (count <= 1) return '#9be9a8';
    if (count <= 3) return '#40c463';
    if (count <= 5) return '#30a14e';
    return '#216e39';
  };

  const toggleSession = (id: string | number) => {
    setExpandedSession(expandedSession === id ? null : id);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Changing password:', passwordData);
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const nextStatView = () => setCurrentStatView((p) => (p + 1) % allTimeStatViews.length);
  const prevStatView = () => setCurrentStatView((p) => (p - 1 + allTimeStatViews.length) % allTimeStatViews.length);

  return (
    <div
      className="min-h-screen relative"
      style={{
        // Subtle pixel grid + soft tint background (keeps dashboard clean)
        backgroundImage:
          `radial-gradient(#dbe9f3 1px, transparent 1px),
           linear-gradient(180deg, #EEF6FA 0%, #F9F6EF 100%)`,
        backgroundSize: '16px 16px, 100% 100%',
        backgroundPosition: '0 0, 0 0'
      }}
    >
      {/* NAVBAR */}
      <nav className="relative z-10" style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: 'rgba(249, 246, 239, 0.92)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1
              className="inline-flex items-center gap-3 text-lg sm:text-xl md:text-2xl tracking-wider whitespace-nowrap"
              style={{ color: '#2B6B6B', fontFamily: PIXEL }}>
              <img
                src={logo}
                alt="Lock In logo"
                className="w-8 h-8 object-contain"
                draggable={false}
                decoding="async"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="uppercase">LOCK IN — DASHBOARD</span>
            </h1>
            <div className="flex items-center gap-3">
              <a
                href="/presets"
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition"
                style={{ backgroundColor: '#3D7ECF', fontFamily: PIXEL }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2C5BA8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3D7ECF'}
              >
                <Clock className="w-4 h-4" />
                SESSIONS
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition"
                style={{ backgroundColor: '#F4A261', fontFamily: PIXEL }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8935A'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F4A261'}
              >
                <LogOut className="w-4 h-4" />
                LOG OUT
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Account Info */}
          <div className="lg:col-span-2">
            <div className="backdrop-blur-xl border rounded-3xl shadow-2xl p-8" style={{ backgroundColor: 'rgba(255,255,255,0.86)', borderColor: '#E2E8F0', height: '340px' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg md:text-xl font-semibold" style={{ color: '#4A5568', fontFamily: PIXEL }}>ACCOUNT</h2>
                <Settings className="w-5 h-5" style={{ color: '#7AC7C4' }} />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm pixel-font mb-2" style={{ color: '#6B7280' }}>
                    USERNAME
                  </label>
                  <input
                    readOnly
                    value={userData.username}
                    className="pixel-input pixel-font"
                  />
                </div>

                <div>
                  <label className="block text-sm pixel-font mb-2" style={{ color: '#6B7280' }}>
                    EMAIL
                  </label>
                  <input
                    readOnly
                    value={userData.email}
                    className="pixel-input pixel-font"
                  />
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full px-4 py-3 text-white rounded-xl transition font-semibold shadow-lg"
                  style={{ background: 'linear-gradient(90deg, #7AC7C4 0%, #5BA3E1 100%)', boxShadow: '0 10px 25px rgba(91,163,225,0.25)', fontFamily: PIXEL }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(91,163,225,0.35)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(91,163,225,0.25)'; }}
                >
                  CHANGE PASSWORD
                </button>
              </div>
            </div>
          </div>

          {/* Recent Sessions */}
          <div>
            <div className="backdrop-blur-xl border rounded-3xl shadow-2xl p-6 flex flex-col" style={{ backgroundColor: 'rgba(255,255,255,0.86)', borderColor: '#E2E8F0', height: '340px' }}>
              <h2 className="text-lg md:text-xl font-semibold mb-4" style={{ color: '#4A5568', fontFamily: PIXEL }}>RECENT SESSIONS</h2>
              <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                {recentSessions.map((session, index) => (
                  <div key={session._id || index} className="border rounded-xl backdrop-blur-sm" style={{ borderColor: '#E2E8F0', backgroundColor: 'rgba(226,232,240,0.35)' }}>
                    <button
                      onClick={() => toggleSession(session._id || index)}
                      className="w-full px-3 py-2 flex items-center justify-between transition rounded-xl"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(122,199,196,0.12)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" style={{ color: '#3D7ECF' }} />
                        <div className="text-left">
                          <div className="text-xs md:text-sm font-medium" style={{ color: '#4A5568', fontFamily: PIXEL }}>
                            {session.date} • {session.time_started}
                          </div>
                          <div className="text-[10px]" style={{ color: '#4A5568', opacity: 0.7 }}>
                            {session.total_hours}h • {session.intervals} intervals
                          </div>
                        </div>
                      </div>
                      {expandedSession === (session._id || index)
                        ? <ChevronUp className="w-4 h-4" style={{ color: '#7AC7C4' }} />
                        : <ChevronDown className="w-4 h-4" style={{ color: '#7AC7C4' }} />}
                    </button>
                    {expandedSession === (session._id || index) && (
                      <div className="px-3 py-3 border-t space-y-2 text-sm rounded-b-xl" style={{ borderColor: '#E2E8F0', backgroundColor: 'rgba(226,232,240,0.5)' }}>
                        <div className="grid grid-cols-2 gap-2" style={{ fontFamily: PIXEL, fontSize: 10 }}>
                          <div>HOURS: <span style={{ color: '#4A5568' }}>{session.total_hours}</span></div>
                          <div>INTERVALS: <span style={{ color: '#4A5568' }}>{session.intervals}</span></div>
                          <div>PER INT.: <span style={{ color: '#4A5568' }}>{session.time_per_interval}m</span></div>
                          <div>STARTED: <span style={{ color: '#4A5568' }}>{session.time_started}</span></div>
                        </div>
                        <div className="pt-2" style={{ fontFamily: PIXEL, fontSize: 10 }}>
                          FOCUS (s)
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            <div className="flex justify-between"><span>HAIR</span><span>{session.time_hair}s</span></div>
                            <div className="flex justify-between"><span>NAIL</span><span>{session.time_nail}s</span></div>
                            <div className="flex justify-between"><span>EYE</span><span>{session.time_eye}s</span></div>
                            <div className="flex justify-between"><span>NOSE</span><span>{session.time_nose}s</span></div>
                          </div>
                        </div>
                        <div className="pt-2" style={{ fontFamily: PIXEL, fontSize: 10 }}>
                          OTHER (s)
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            <div className="flex justify-between"><span>UNFOCUSED</span><span>{session.time_unfocused}s</span></div>
                            <div className="flex justify-between"><span>PAUSED</span><span>{session.time_paused}s</span></div>
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

        {/* FULL WIDTH */}
        <div className="space-y-6 mt-6">
          {/* Heatmap */}
          <div className="backdrop-blur-xl border rounded-3xl shadow-2xl p-8" style={{ backgroundColor: 'rgba(255,255,255,0.86)', borderColor: '#E2E8F0' }}>
            <h2 className="text-lg md:text-xl font-semibold mb-6" style={{ color: '#4A5568', fontFamily: PIXEL }}>ACTIVITY — LAST 365 DAYS</h2>
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
                              className="w-3 h-3 rounded-[2px] border"
                              style={{
                                backgroundColor: dayData ? getHeatmapColor(dayData.count) : 'rgba(226,232,240,0.3)',
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
            <div className="flex items-center justify-center gap-4 mt-6 text-[10px]" style={{ color: '#4A5568', opacity: 0.8, fontFamily: PIXEL }}>
              <span>LESS</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 border rounded-[2px]" style={{ backgroundColor: 'rgba(226,232,240,0.3)', borderColor: '#E2E8F0' }} />
                <div className="w-3 h-3 border rounded-[2px]" style={{ backgroundColor: '#9be9a8', borderColor: '#E2E8F0' }} />
                <div className="w-3 h-3 border rounded-[2px]" style={{ backgroundColor: '#40c463', borderColor: '#E2E8F0' }} />
                <div className="w-3 h-3 border rounded-[2px]" style={{ backgroundColor: '#30a14e', borderColor: '#E2E8F0' }} />
                <div className="w-3 h-3 border rounded-[2px]" style={{ backgroundColor: '#216e39', borderColor: '#E2E8F0' }} />
              </div>
              <span>MORE</span>
            </div>
          </div>

          {/* Stats + Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Stats slider */}
            <div className="lg:col-span-3 backdrop-blur-xl border rounded-3xl shadow-2xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.86)', borderColor: '#E2E8F0' }}>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={prevStatView}
                  className="p-2 rounded-lg transition"
                  aria-label="Previous view"
                  style={{ color: '#7AC7C4' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(122,199,196,0.12)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-sm md:text-lg font-semibold text-center flex-1" style={{ color: '#4A5568', fontFamily: PIXEL }}>
                  {allTimeStatViews[currentStatView].title}
                </h3>
                <button
                  onClick={nextStatView}
                  className="p-2 rounded-lg transition"
                  aria-label="Next view"
                  style={{ color: '#7AC7C4' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(122,199,196,0.12)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {allTimeStatViews[currentStatView].stats.map((stat, idx) => (
                  <div key={idx} className="rounded-xl p-4 backdrop-blur-sm border" style={{ background: `linear-gradient(to bottom right, ${stat.color})`, borderColor: stat.borderColor }}>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl md:text-3xl font-bold" style={{ color: stat.textColor, fontFamily: PIXEL }}>{stat.value}</span>
                      <p className="text-xs font-medium mt-2 text-center" style={{ color: '#4A5568' }}>{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-2 mt-6">
                {allTimeStatViews.map((_, idx) => (
                  <div
                    key={idx}
                    className="h-2 rounded-full transition-all"
                    style={{ width: idx === currentStatView ? '32px' : '8px', backgroundColor: idx === currentStatView ? '#3D7ECF' : '#E2E8F0' }}
                  />
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="lg:col-span-7 backdrop-blur-xl border rounded-3xl shadow-2xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.86)', borderColor: '#E2E8F0' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm md:text-lg font-semibold" style={{ color: '#4A5568', fontFamily: PIXEL }}>MONTHLY STATS</h3>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="px-4 py-2 border text-xs md:text-sm font-medium rounded-xl focus:ring-2 focus:border-transparent outline-none transition"
                  style={{ backgroundColor: 'rgba(226,232,240,0.35)', borderColor: '#E2E8F0', color: '#4A5568', fontFamily: PIXEL }}
                  onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = '#7AC7C4'; (e.target as HTMLSelectElement).style.boxShadow = '0 0 0 2px rgba(122,199,196,0.2)'; }}
                  onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = '#E2E8F0'; (e.target as HTMLSelectElement).style.boxShadow = 'none'; }}
                >
                  {Object.entries(metricsConfig).map(([key, config]) => (
                    <option key={key} value={key} style={{ fontFamily: PIXEL }}>{config.label}</option>
                  ))}
                </select>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={Array.isArray(monthlyGraphData) ? monthlyGraphData : []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="monthYear"
                    stroke="#4A5568"
                    tick={{ fontSize: 10, fontFamily: '"Press Start 2P", monospace' }}
                    tickFormatter={shortMonthLabel}
                    interval="preserveStartEnd"   // let Recharts drop some ticks if needed
                    minTickGap={16}               // extra spacing between ticks
                    tickMargin={10}               // pushes labels away from axis
                    height={55}                   // room for the angled labels
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="#4A5568" tick={{ fontSize: 10, fontFamily: PIXEL }} />
                  <Tooltip
                    formatter={(value: any) => [`${value}${metricsConfig[selectedMetric]?.unit || ''}`, metricsConfig[selectedMetric]?.label || selectedMetric]}
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#4A5568', backdropFilter: 'blur(10px)', fontFamily: PIXEL, fontSize: 10 }}
                  />
                  <Legend wrapperStyle={{ fontFamily: PIXEL, fontSize: 10 }} />
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

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="backdrop-blur-xl border rounded-3xl shadow-2xl max-w-md w-full p-8" style={{ backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#E2E8F0' }}>
            <h3 className="text-lg md:text-xl font-semibold mb-6" style={{ color: '#4A5568', fontFamily: PIXEL }}>CHANGE PASSWORD</h3>
            <div className="space-y-4">
              {['currentPassword','newPassword','confirmPassword'].map((key) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-2" style={{ color: '#4A5568', fontFamily: PIXEL }}>
                    {key === 'currentPassword' ? 'CURRENT PASSWORD' : key === 'newPassword' ? 'NEW PASSWORD' : 'CONFIRM NEW PASSWORD'}
                  </label>
                  <input
                    type="password"
                    value={(passwordData as any)[key]}
                    onChange={(e) => setPasswordData({ ...passwordData, [key]: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl outline-none transition"
                    placeholder="••••••••"
                    style={{ backgroundColor: 'rgba(226,232,240,0.35)', borderColor: '#E2E8F0', color: '#4A5568' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#7AC7C4'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(122,199,196,0.2)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 text-white py-3 rounded-xl font-semibold transition shadow-lg"
                  style={{ background: 'linear-gradient(90deg, #7AC7C4 0%, #5BA3E1 100%)', boxShadow: '0 10px 25px rgba(91,163,225,0.25)', fontFamily: PIXEL }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(91,163,225,0.35)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(91,163,225,0.25)'; }}
                >
                  UPDATE
                </button>
                <button
                  onClick={() => { setShowPasswordModal(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                  className="flex-1 border py-3 rounded-xl font-semibold transition"
                  style={{ backgroundColor: 'rgba(226,232,240,0.35)', borderColor: '#E2E8F0', color: '#4A5568', fontFamily: PIXEL }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(226,232,240,0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(226,232,240,0.35)'}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------- helpers ------------------- */
function round2(n: number) { return parseFloat(n.toFixed(2)); }