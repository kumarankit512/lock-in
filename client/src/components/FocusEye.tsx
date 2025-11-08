import { useEffect, useMemo, useRef, useState } from "react";
import FocusEye from "./FocusEye";

type FocusStatus = "FOCUSED" | "NOT FOCUSED" | "PAUSED";
type HabitKind = "hair_touch" | "nose_touch" | "eye_rub" | "nail_bite";

type BreakReason = "interval" | "manual" | "auto_unfocus";
type BreakEntry = {
  id: number;
  reason: BreakReason;
  startMs: number;   // Date.now()
  endMs?: number;    // Date.now() on finish
};

async function postSessionResult(payload: any) {
  try {
    await fetch("http://127.0.0.1:5001//api/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("Failed to POST study_session", e);
  }
}

export default function StudySessionPage() {
  // read presets from URL (or replace with your own source of truth)
  const url = new URL(window.location.href);
  const rawTotal = parseInt(url.searchParams.get("total") || "60", 10);
  const rawInterval = parseInt(url.searchParams.get("interval") || "30", 10);

  const totalMin = Number.isFinite(rawTotal) ? Math.max(0, rawTotal) : 60;
  const intervalMin = Number.isFinite(rawInterval) ? Math.max(0, rawInterval) : 30;

  const totalMs = totalMin * 60_000;
  const intervalMs = intervalMin * 60_000;
  const breaksEnabled = intervalMs > 0;

  // Force re-mount of sensor on resume/restart
  const [sessionKey, setSessionKey] = useState(1);

  const intervalMsInit = useMemo(() => Math.max(0, intervalMs), [intervalMs]);

  // timers/session state
  const [remainingMs, setRemainingMs] = useState(totalMs);
  const [intervalRemainingMs, setIntervalRemainingMs] = useState(breaksEnabled ? intervalMs : 0);
  const [onBreak, setOnBreak] = useState(false);
  const [paused, setPaused] = useState(false);      // if you need external pauses later
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);

  // focus & habits counters
  const currentFocusRef = useRef<"FOCUSED" | "NOT FOCUSED">("NOT FOCUSED");
  const activeHabitsRef = useRef<Record<HabitKind, boolean>>({
    hair_touch: false, nose_touch: false, eye_rub: false, nail_bite: false,
  });

  const [counters, setCounters] = useState({
    focused_s: 0,
    not_focused_s: 0,
    hair_touch_s: 0,
    nose_touch_s: 0,
    eye_rub_s: 0,
    nail_bite_s: 0,
  });

  // --- payload helpers ---
  const USER_ID = "690bca9eab4d0306fbe1c0f1";   // TODO: wire real values
  const USERNAME = "Bobby";

  function pad2(n: number) { return String(n).padStart(2, "0"); }
  function toYMD(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function toHM(d: Date) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  function buildBackendPayload() {
    const startedAt = sessionStartRef.current ?? new Date();
    // const intervalsPlanned = intervalMin > 0 ? Math.ceil(totalMin / intervalMin) : 0;
  
    return {
      user_id: USER_ID,
      username: USERNAME,
      date: toYMD(startedAt),
      time_started: toHM(startedAt),
  
      total_hours: Number((totalMin / 60).toFixed(2)),
      intervals: breakCount,
      time_per_interval: intervalMin,
  
      // habits + focus (all seconds)
      time_hair: counters.hair_touch_s,
      time_nail: counters.nail_bite_s,
      time_eye:  counters.eye_rub_s,
      time_nose: counters.nose_touch_s,
      time_unfocused: counters.not_focused_s,
  
      // total paused/break time (seconds)
      time_paused: totalBreakSeconds,
    };
  }
  

  // ---------- Unified break model ----------
  const [breaks, setBreaks] = useState<BreakEntry[]>([]);
  const nextBreakIdRef = useRef(1);
  const sessionStartRef = useRef<Date | null>(null);

  const breakCount = breaks.length;
  const totalBreakSeconds = useMemo(() => {
    return breaks.reduce((sum, b) => {
      if (!b.endMs) return sum; // only finished breaks
      return sum + Math.max(0, Math.round((b.endMs - b.startMs) / 1000));
    }, 0);
  }, [breaks]);

  function beginBreak(reason: BreakReason) {
    if (onBreak) return;
    setOnBreak(true);
    const id = nextBreakIdRef.current++;
    const startMs = Date.now();
    setBreaks(prev => [...prev, { id, reason, startMs }]);
  }

  function finishBreak() {
    if (!onBreak) return;
    setOnBreak(false);
    const endMs = Date.now();
    setBreaks(prev => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].endMs == null) {
          const updated = [...prev];
          updated[i] = { ...prev[i], endMs };
          return updated;
        }
      }
      return prev;
    });
    // Reset interval chunk and nudge sensor re-mount on resume
    if (breaksEnabled) setIntervalRemainingMs(Math.min(intervalMsInit, remainingMs));
    setSessionKey(k => k + 1);
  }

  function finalizeOpenBreakIfAny() {
    if (!onBreak) return;
    const endMs = Date.now();
    setBreaks(prev => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].endMs == null) {
          const updated = [...prev];
          updated[i] = { ...prev[i], endMs };
          return updated;
        }
      }
      return prev;
    });
  }

  const onStart = () => {
    sessionStartRef.current = new Date();   // <— capture start timestamp
    setStarted(true);
    setFinished(false);
    setOnBreak(false);
    setRemainingMs(totalMs);
    setIntervalRemainingMs(Math.min(intervalMsInit, totalMs));
    if (totalMs === 0) setFinished(true);
  };
  
  // ----------------------------------------

  // start the session immediately
  useEffect(() => {
    setStarted(true);
    setFinished(false);
    setOnBreak(false);
    setRemainingMs(totalMs);
    setIntervalRemainingMs(Math.min(intervalMsInit, totalMs));
    if (totalMs === 0) setFinished(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep interval timer bounded by total remaining
  useEffect(() => {
    if (!started || finished || onBreak) return;
    setIntervalRemainingMs(ms => Math.min(ms, remainingMs));
  }, [remainingMs, started, finished, onBreak]);

  // tick once per second (skip during break or paused)
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => {
      if (finished || onBreak || paused) return;

      setRemainingMs(ms => Math.max(0, ms - 1000));
      if (breaksEnabled) setIntervalRemainingMs(ms => Math.max(0, ms - 1000));

      setCounters(c => {
        const next = { ...c };
        if (currentFocusRef.current === "FOCUSED") next.focused_s += 1;
        else next.not_focused_s += 1;

        (Object.keys(activeHabitsRef.current) as HabitKind[]).forEach(k => {
          if (activeHabitsRef.current[k]) {
            if (k === "hair_touch") next.hair_touch_s += 1;
            if (k === "nose_touch") next.nose_touch_s += 1;
            if (k === "eye_rub") next.eye_rub_s += 1;
            if (k === "nail_bite") next.nail_bite_s += 1;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [finished, onBreak, paused, breaksEnabled]);

  // interval-based break trigger
  useEffect(() => {
    if (!finished && breaksEnabled && !onBreak && intervalRemainingMs === 0) {
      beginBreak("interval");
    }
  }, [intervalRemainingMs, onBreak, finished, breaksEnabled]);

  // end-of-session trigger
  useEffect(() => {
    if (!finished && remainingMs === 0) {
      finalizeOpenBreakIfAny();
      setFinished(true);
    }
  }, [remainingMs, finished]);

  // POST summary when finished
  useEffect(() => {
    if (!finished) return;
    const payload = buildBackendPayload();
    console.log("Study session payload:", payload);
    postSessionResult(payload);
  }, [
    finished,
    // dependencies that affect the payload:
    totalMin, intervalMin,
    counters.hair_touch_s, counters.nail_bite_s, counters.eye_rub_s,
    counters.nose_touch_s, counters.not_focused_s,
    totalBreakSeconds,
  ]);
  

  // sensor callbacks
  const handleFocusChange = (s: FocusStatus) => {
    currentFocusRef.current = s === "FOCUSED" ? "FOCUSED" : "NOT FOCUSED";
  };

  const handleHabitEvent = (e: { habit: HabitKind; phase: "start" | "end" }) => {
    if (onBreak || paused) return; // don't count during break/pause
    activeHabitsRef.current[e.habit] = e.phase === "start";
  };

  // FocusEye asks to auto-break when unfocused long enough
  const handleAutoBreak = () => beginBreak("auto_unfocus");

  const endSessionNow = () => {
    finalizeOpenBreakIfAny();
    setFinished(true);
  };

  const msToMinSec = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {totalMs === 0 && (
        <div className="rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 px-3 py-2 text-sm">
          Total time is 0 — session ended immediately.
        </div>
      )}
      {!finished && !breaksEnabled && (
        <div className="rounded-xl bg-zinc-900/40 border border-zinc-700 text-zinc-300 px-3 py-2 text-sm">
          Breaks disabled (interval = 0).
        </div>
      )}

      {/* timers / live info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard label="Total remaining" value={msToMinSec(remainingMs)} />
        <InfoCard
          label="Interval remaining"
          value={!breaksEnabled ? "—" : (onBreak ? "On break" : msToMinSec(intervalRemainingMs))}
        />
        <InfoCard label="Breaks taken" value={String(breakCount)} />
        <InfoCard label="Total break time" value={msToMinSec(totalBreakSeconds * 1000)} />
      </div>

      {/* sensor */}
      {!finished && (
        <div className="relative"
        style={{ width: 960, height: 540 }} >
          <FocusEye
            key={sessionKey}
            width={960}
            height={540}
            mirror
            suspended={onBreak}
            showDeg = {true}
            onStatusChange={handleFocusChange}
            onHabitEvent={handleHabitEvent}
            onEndSession={endSessionNow}
            onAutoBreak={handleAutoBreak}
          />

          {onBreak && breaksEnabled && (
            <div className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm grid place-items-center">
              <div className="text-center space-y-4">
                <div className="text-2xl font-semibold text-white">Break time</div>
                <div className="text-zinc-300">Click continue when you’re ready.</div>
                <button
                  onClick={finishBreak}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* habit/focus totals */}
      <div className="grid md:grid-cols-3 gap-3">
        <Stat label="Focused" value={msToMinSec(counters.focused_s * 1000)} />
        <Stat label="Not focused" value={msToMinSec(counters.not_focused_s * 1000)} />
        <Stat label="Hair touching" value={msToMinSec(counters.hair_touch_s * 1000)} />
        <Stat label="Nose rubbing" value={msToMinSec(counters.nose_touch_s * 1000)} />
        <Stat label="Eye rubbing" value={msToMinSec(counters.eye_rub_s * 1000)} />
        <Stat label="Nail biting" value={msToMinSec(counters.nail_bite_s * 1000)} />
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        {!onBreak && breaksEnabled && !finished && (
          <button
            onClick={() => beginBreak("manual")}
            className="px-3 py-2 rounded-xl border border-zinc-700 text-black hover:border-zinc-500"
          >
            Take a break now
          </button>
        )}
        {!finished && (
          <button
            onClick={endSessionNow}
            className="px-3 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white"
          >
            End session
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-400">Using total={totalMin} min, interval={intervalMin} min</p>

      {/* summary */}
      {finished && (
        <div className="rounded-2xl border border-zinc-700 p-4 md:p-6 bg-zinc-900/50 space-y-4">
          <h2 className="text-xl font-semibold text-zinc-100">Session summary</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Stat label="Focused" value={msToMinSec(counters.focused_s * 1000)} />
            <Stat label="Not focused" value={msToMinSec(counters.not_focused_s * 1000)} />
            <Stat label="Hair touching" value={msToMinSec(counters.hair_touch_s * 1000)} />
            <Stat label="Nose rubbing" value={msToMinSec(counters.nose_touch_s * 1000)} />
            <Stat label="Eye rubbing" value={msToMinSec(counters.eye_rub_s * 1000)} />
            <Stat label="Nail biting" value={msToMinSec(counters.nail_bite_s * 1000)} />
            <Stat label="Breaks taken" value={String(breakCount)} />
            <Stat label="Break time" value={msToMinSec(totalBreakSeconds * 1000)} />
          </div>
          <div className="flex gap-2">
            <a
              href={`/?total=${totalMin}&interval=${intervalMin}`}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Start another session
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-700 p-3 bg-zinc-900/40">
      <div className="text-xs text-black">{label}</div>   {/* <- was text-zinc-400 */}
      <div className="text-lg font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-700 p-3 bg-zinc-900/40">
      <div className="text-xs text-black">{label}</div>   {/* <- was text-zinc-400 */}
      <div className="text-lg font-semibold text-emerald-300">{value}</div>
    </div>
  );
}
