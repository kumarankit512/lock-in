import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from '/logo.png';
export default function PresetsPage() {
  const nav = useNavigate();

  // presets
  const [totalPreset, setTotalPreset] = useState<"30"|"60"|"120"|"custom">("60");
  const [customTotal, setCustomTotal] = useState(30);
  const [intervalPreset, setIntervalPreset] = useState<"15"|"30"|"45"|"60"|"custom">("30");
  const [customInterval, setCustomInterval] = useState(15);

  const totalMin = useMemo(
    () => (totalPreset === "custom" ? Math.max(30, Math.floor(customTotal || 0)) : parseInt(totalPreset, 10)),
    [totalPreset, customTotal]
  );
  const intervalMin = useMemo(
    () => (intervalPreset === "custom" ? Math.max(15, Math.floor(customInterval || 0)) : parseInt(intervalPreset, 10)),
    [intervalPreset, customInterval]
  );

  const clampedIntervalMin = Math.min(intervalMin, totalMin);
  const breakCount = Math.floor(totalMin / clampedIntervalMin);

  const start = () => {
    const qs = new URLSearchParams({
      total: String(totalMin),
      interval: String(clampedIntervalMin),
    });
    nav(`/session?${qs.toString()}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: '#0B1A1C', fontFamily: '"Press Start 2P", monospace' }}
    >
      {/* FULL-BLEED BACKGROUND (fills viewport, may crop to keep edges flush) */}
      <img
        src={`${import.meta.env.BASE_URL}background.png`} // /public/background.png
        alt=""
        className="absolute inset-0 z-0 w-full h-full object-cover select-none"
        draggable={false}
        style={{ imageRendering: 'pixelated' as any }}
      />

      {/* Navbar */}
      <nav
        className="relative z-10"
        style={{
          borderBottom: '1px solid rgba(255,255,255,.2)',
          backgroundColor: 'rgba(255,255,255,0.10)', // subtle glass; keeps the art visible
          backdropFilter: 'blur(6px)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="inline-flex items-center gap-3 text-xl md:text-2xl tracking-wider text-[rgb(122,199,196)]">
              <img
                src={logo}
                alt="Lock In logo"
                className="w-8 h-8 object-contain"
                draggable={false}
                decoding="async"
                style={{ imageRendering: 'pixelated' }}
              />
              <span>LOCK IN</span>
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => nav('/profile')}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition"
                style={{ backgroundColor: 'rgba(61, 126, 207, .9)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(44, 91, 168, .95)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(61, 126, 207, .9)'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition"
                style={{ backgroundColor: 'rgba(244, 162, 97, .95)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(232, 147, 90, .98)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(244, 162, 97, .95)'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-3xl md:text-4xl text-white">START YOUR FOCUS SESSION</h1>
          <p className="text-xs md:text-sm max-w-2xl mx-auto text-white/80">
            Customize your study session with pomodoro-style intervals. Lock in, then take breaks guilt-free.
          </p>
        </div>

        {/* Main Card */}
        <div
          className="backdrop-blur-xl border rounded-3xl p-8 md:p-10 shadow-2xl"
          style={{
            backgroundColor: 'rgba(255,255,255,0.85)',
            borderColor: 'rgba(255,255,255,0.35)'
          }}
        >
          {/* Total Time Section */}
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(122, 199, 196, 0.15)' }}>
                <span className="text-xl">⏱️</span>
              </div>
              <div>
                <h2 className="text-sm md:text-base text-black">Total Session Time</h2>
                <p className="text-[10px] md:text-xs text-black/70">How long do you want to study today?</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["30","60","120","custom"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setTotalPreset(v)}
                  className="group relative px-4 py-4 rounded-xl border-2 transition-all duration-300"
                  style={totalPreset === v ? {
                    borderColor: '#7AC7C4',
                    background: 'linear-gradient(135deg, rgba(122,199,196,.2) 0%, rgba(122,199,196,.1) 100%)',
                    boxShadow: '0 4px 6px rgba(122,199,196,.2)'
                  } : {
                    borderColor: 'rgba(0,0,0,.1)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (totalPreset !== v) {
                      e.currentTarget.style.borderColor = '#7AC7C4';
                      e.currentTarget.style.backgroundColor = 'rgba(122,199,196,.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (totalPreset !== v) {
                      e.currentTarget.style.borderColor = 'rgba(0,0,0,.1)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div className="text-xl md:text-2xl mb-1" style={{ color: totalPreset === v ? '#2B6B6B' : '#1F2937' }}>
                    {v === "30" ? "30" : v === "60" ? "60" : v === "120" ? "120" : "✏️"}
                  </div>
                  <div className="text-[10px] md:text-xs" style={{ color: totalPreset === v ? '#2B6B6B' : '#1F2937', opacity: totalPreset === v ? 1 : .75 }}>
                    {v === "custom" ? "Custom" : "minutes"}
                  </div>
                  {totalPreset === v && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#7AC7C4' }} />
                  )}
                </button>
              ))}
            </div>

            {totalPreset === "custom" && (
              <div className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(226,232,240,.3)', borderColor: 'rgba(0,0,0,.1)' }}>
                <label className="block text-xs mb-2 text-black">Custom duration</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={30}
                    step={5}
                    value={customTotal}
                    onChange={e => setCustomTotal(Number(e.target.value))}
                    className="border-2 rounded-xl px-4 py-3 w-32 font-semibold text-lg transition-colors outline-none"
                    style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,.1)', color: '#1F2937' }}
                    onFocus={(e) => e.target.style.borderColor = '#7AC7C4'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(0,0,0,.1)'}
                  />
                  <span className="text-[10px] md:text-xs text-black/70">minutes (minimum 30)</span>
                </div>
              </div>
            )}
          </div>

          {/* Interval Section */}
          <div className="space-y-4 mb-10 pt-8" style={{ borderTop: '1px solid rgba(0,0,0,.1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(91,163,225,.15)' }}>
                <span className="text-xl">🔔</span>
              </div>
              <div>
                <h2 className="text-sm md:text-base text-black">Work Interval Length</h2>
                <p className="text-[10px] md:text-xs text-black/70">Each study session duration before rest period</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(["15","30","45","60","custom"] as const).map(v => {
                const asNum = v === "custom" ? null : parseInt(v, 10);
                const tooLarge = asNum !== null && asNum > totalMin;
                return (
                  <button
                    key={v}
                    onClick={() => !tooLarge && setIntervalPreset(v)}
                    disabled={tooLarge}
                    className="group relative px-4 py-4 rounded-xl border-2 transition-all duration-300"
                    style={tooLarge ? {
                      opacity: .4,
                      cursor: 'not-allowed',
                      borderColor: 'rgba(0,0,0,.1)',
                      backgroundColor: 'rgba(226,232,240,.2)'
                    } : intervalPreset === v ? {
                      borderColor: '#5BA3E1',
                      background: 'linear-gradient(135deg, rgba(91,163,225,.2) 0%, rgba(61,126,207,.1) 100%)',
                      boxShadow: '0 4px 6px rgba(91,163,225,.2)'
                    } : {
                      borderColor: 'rgba(0,0,0,.1)',
                      backgroundColor: 'transparent'
                    }}
                    title={tooLarge ? "Interval cannot exceed total time" : undefined}
                    onMouseEnter={(e) => {
                      if (!tooLarge && intervalPreset !== v) {
                        e.currentTarget.style.borderColor = '#5BA3E1';
                        e.currentTarget.style.backgroundColor = 'rgba(91,163,225,.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!tooLarge && intervalPreset !== v) {
                        e.currentTarget.style.borderColor = 'rgba(0,0,0,.1)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div className="text-xl md:text-2xl mb-1" style={{ color: tooLarge ? '#1F2937' : intervalPreset === v ? '#1B4F91' : '#1F2937', opacity: tooLarge ? .4 : 1 }}>
                      {v === "custom" ? "✏️" : v}
                    </div>
                    <div className="text-[10px] md:text-xs" style={{ color: tooLarge ? '#1F2937' : intervalPreset === v ? '#1B4F91' : '#1F2937', opacity: tooLarge ? .4 : intervalPreset === v ? 1 : .75 }}>
                      {v === "custom" ? "Custom" : "minutes"}
                    </div>
                    {intervalPreset === v && !tooLarge && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#5BA3E1' }} />
                    )}
                  </button>
                );
              })}
            </div>

            {intervalPreset === "custom" && (
              <div className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(226,232,240,.3)', borderColor: 'rgba(0,0,0,.1)' }}>
                <label className="block text-xs mb-2 text-black">Custom interval</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={15}
                    step={5}
                    value={customInterval}
                    onChange={e => {
                      const n = Number(e.target.value);
                      setCustomInterval(Math.min(totalMin, Math.max(15, Math.floor(n || 0))));
                    }}
                    className="border-2 rounded-xl px-4 py-3 w-32 font-semibold text-lg transition-colors outline-none"
                    style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,.1)', color: '#1F2937' }}
                    onFocus={(e) => e.target.style.borderColor = '#5BA3E1'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(0,0,0,.1)'}
                  />
                  <span className="text-[10px] md:text-xs text-black/70">minutes (15–{totalMin})</span>
                </div>
              </div>
            )}
          </div>

          {/* Session Summary */}
          <div className="p-6 rounded-2xl border mb-8" style={{ background: 'linear-gradient(135deg, rgba(226,232,240,.5) 0%, rgba(226,232,240,.3) 100%)', borderColor: 'rgba(0,0,0,.1)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📊</span>
              <h3 className="text-xs md:text-sm text-black">Session Preview</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl md:text-3xl text-[#2B6B6B]">{totalMin}</div>
                <div className="text-[10px] md:text-xs mt-1 text-black/70">Total Minutes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl text-[#1B4F91]">{breakCount}</div>
                <div className="text-[10px] md:text-xs mt-1 text-black/70">Break Intervals</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={start}
            className="group w-full py-5 px-6 rounded-2xl text-white font-bold text-lg shadow-xl transition-all duration-300 flex items-center justify-center gap-3"
            style={{ background: 'linear-gradient(90deg, #7AC7C4 0%, #5BA3E1 100%)', boxShadow: '0 10px 25px rgba(91,163,225,.3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(91,163,225,.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(91,163,225,.3)'; }}
          >
            <span>🚀</span>
            <span>Start Your Focus Session</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>



          {/* Tips */}
          <div className="mt-6 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(91,163,225,.05)', borderColor: 'rgba(91,163,225,.2)' }}>
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div className="text-xs leading-relaxed text-black/80">
                <strong style={{ color: '#1B4F91' }}>Pro tip:</strong> Research shows 25–30 minute focus intervals with 5-minute breaks maximize productivity and prevent burnout.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}