import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  
  // Calculate session stats
  const breakCount = Math.floor(totalMin / clampedIntervalMin);

  const start = () => {
    const qs = new URLSearchParams({
      total: String(totalMin),
      interval: String(clampedIntervalMin),
    });
    nav(`/session?${qs.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -top-48 -right-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-48 -left-48 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-3xl">🎯</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400">
            Start Your Focus Session
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Customize your study session with proven Pomodoro techniques. Let's build momentum together.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 md:p-10 shadow-2xl">
          {/* Total Time Section */}
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <span className="text-xl">⏱️</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Total Session Time</h2>
                <p className="text-sm text-slate-400">How long do you want to Study today?</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["30","60","120","custom"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setTotalPreset(v)}
                  className={`group relative px-4 py-4 rounded-xl border-2 transition-all duration-300 ${
                    totalPreset === v
                      ? "border-emerald-400 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 shadow-lg shadow-emerald-500/20"
                      : "border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50"
                  }`}
                >
                  <div className={`text-2xl font-bold mb-1 ${
                    totalPreset === v ? "text-emerald-300" : "text-slate-300"
                  }`}>
                    {v === "30" ? "30" : v === "60" ? "60" : v === "120" ? "120" : "✏️"}
                  </div>
                  <div className={`text-xs font-medium ${
                    totalPreset === v ? "text-emerald-200" : "text-slate-400"
                  }`}>
                    {v === "30" ? "minutes" : v === "60" ? "minutes" : v === "120" ? "minutes" : "Custom"}
                  </div>
                  {totalPreset === v && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {totalPreset === "custom" && (
              <div className="mt-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Custom duration
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={30}
                    step={5}
                    value={customTotal}
                    onChange={e => setCustomTotal(Number(e.target.value))}
                    className="bg-slate-900 border-2 border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 w-32 text-slate-100 font-semibold text-lg transition-colors outline-none"
                  />
                  <span className="text-slate-400 text-sm">minutes (minimum 30)</span>
                </div>
              </div>
            )}
          </div>

          {/* Interval Section */}
          <div className="space-y-4 mb-10 pt-8 border-t border-slate-800/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                <span className="text-xl">🔔</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Work Interval Length</h2>
                <p className="text-sm text-slate-400">Each study session duration before rest period</p>
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
                    className={`group relative px-4 py-4 rounded-xl border-2 transition-all duration-300 ${
                      tooLarge
                        ? "opacity-40 cursor-not-allowed border-slate-800/50 bg-slate-900/30"
                        : intervalPreset === v
                        ? "border-sky-400 bg-gradient-to-br from-sky-500/20 to-sky-600/10 shadow-lg shadow-sky-500/20"
                        : "border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50"
                    }`}
                    title={tooLarge ? "Interval cannot exceed total time" : undefined}
                  >
                    <div className={`text-2xl font-bold mb-1 ${
                      tooLarge ? "text-slate-600" : intervalPreset === v ? "text-sky-300" : "text-slate-300"
                    }`}>
                      {v === "custom" ? "✏️" : v}
                    </div>
                    <div className={`text-xs font-medium ${
                      tooLarge ? "text-slate-600" : intervalPreset === v ? "text-sky-200" : "text-slate-400"
                    }`}>
                      {v === "custom" ? "Custom" : "minutes"}
                    </div>
                    {intervalPreset === v && !tooLarge && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {intervalPreset === "custom" && (
              <div className="mt-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Custom interval
                </label>
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
                    className="bg-slate-900 border-2 border-slate-700 focus:border-sky-500 rounded-xl px-4 py-3 w-32 text-slate-100 font-semibold text-lg transition-colors outline-none"
                  />
                  <span className="text-slate-400 text-sm">minutes (15–{totalMin})</span>
                </div>
              </div>
            )}
          </div>

          {/* Session Summary */}
          <div className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📊</span>
              <h3 className="text-sm font-semibold text-slate-300">Session Preview</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">{totalMin}</div>
                <div className="text-xs text-slate-400 mt-1">Total Minutes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-sky-400">{breakCount}</div>
                <div className="text-xs text-slate-400 mt-1">Break Intervals</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={start}
            className="group w-full py-5 px-6 rounded -2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-lg shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/40 flex items-center justify-center gap-3"
          >
            <span>🚀</span>
            <span>Start Your Focus Session</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          {/* Tips */}
          <div className="mt-6 p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-blue-300">Pro tip:</strong> Research shows 25-30 minute focus intervals with 5-minute breaks maximize productivity and prevent burnout.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}