import { useEffect, useMemo, useRef, useState } from "react";
import FocusEye from "./FocusEye";
import Chatbot from "./chatbot";

type FocusStatus = "FOCUSED" | "NOT FOCUSED" | "PAUSED";
type HabitKind = "hair_touch" | "nose_touch" | "eye_rub" | "nail_bite";

type BreakReason = "interval" | "manual" | "auto_unfocus";
type BreakEntry = {
  id: number;
  reason: BreakReason;
  startMs: number;
  endMs?: number;
};

async function postSessionResult(payload: any) {
  try {
    await fetch("https://lock-in-sable.vercel.app/api/create-session", {
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
  // ─────────────────────────────────────────────────────────────────────────────
  // read presets from URL
  const url = new URL(window.location.href);
  const rawTotal = parseInt(url.searchParams.get("total") || "60", 10);
  const rawInterval = parseInt(url.searchParams.get("interval") || "30", 10);

  const totalMin = Number.isFinite(rawTotal) ? Math.max(0, rawTotal) : 60;
  const intervalMin = Number.isFinite(rawInterval)
    ? Math.max(0, rawInterval)
    : 30;

  const totalMs = totalMin * 60_000;
  const intervalMs = intervalMin * 60_000;
  const breaksEnabled = intervalMs > 0;

  // re-mount sensor on resume/restart
  const [sessionKey, setSessionKey] = useState(1);
  const intervalMsInit = useMemo(() => Math.max(0, intervalMs), [intervalMs]);

  // timers/session state
  const [remainingMs, setRemainingMs] = useState(totalMs);
  const [intervalRemainingMs, setIntervalRemainingMs] = useState(
    breaksEnabled ? intervalMs : 0
  );
  const [onBreak, setOnBreak] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);

  // focus & habits counters
  const currentFocusRef = useRef<"FOCUSED" | "NOT FOCUSED">("NOT FOCUSED");
  const activeHabitsRef = useRef<Record<HabitKind, boolean>>({
    hair_touch: false,
    nose_touch: false,
    eye_rub: false,
    nail_bite: false,
  });

  const [counters, setCounters] = useState({
    focused_s: 0,
    not_focused_s: 0,
    hair_touch_s: 0,
    nose_touch_s: 0,
    eye_rub_s: 0,
    nail_bite_s: 0,
  });

  // payload helpers
  const USER_ID = JSON.parse(localStorage.getItem("user") || '{"userId": ""}')
    ?.userId;
  const USERNAME = JSON.parse(localStorage.getItem("user") || '{"userId": ""}')
    ?.username;

  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }
  function toYMD(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
      d.getDate()
    )}`;
  }
  function toHM(d: Date) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function buildBackendPayload() {
    const startedAt = sessionStartRef.current ?? new Date();
    return {
      user_id: USER_ID,
      username: USERNAME,
      date: toYMD(startedAt),
      time_started: toHM(startedAt),

      total_hours: parseFloat(
        (
          (counters.focused_s + counters.not_focused_s + totalBreakSeconds) /
          3600
        ).toFixed(2)
      ),
      intervals: breakCount,
      time_per_interval: intervalMin,

      // seconds
      time_hair: counters.hair_touch_s,
      time_nail: counters.nail_bite_s,
      time_eye: counters.eye_rub_s,
      time_nose: counters.nose_touch_s,
      time_unfocused: counters.not_focused_s,

      time_paused: totalBreakSeconds,
    };
  }

  // ───────────────── Unified break model ─────────────────
  const [breaks, setBreaks] = useState<BreakEntry[]>([]);
  const nextBreakIdRef = useRef(1);
  const sessionStartRef = useRef<Date | null>(null);

  const breakCount = breaks.length;
  const totalBreakSeconds = useMemo(() => {
    return breaks.reduce((sum, b) => {
      if (!b.endMs) return sum;
      return sum + Math.max(0, Math.round((b.endMs - b.startMs) / 1000));
    }, 0);
  }, [breaks]);

  function beginBreak(reason: BreakReason) {
    if (onBreak) return;
    setOnBreak(true);
    const id = nextBreakIdRef.current++;
    const startMs = Date.now();
    setBreaks((prev) => [...prev, { id, reason, startMs }]);
  }

  function finishBreak() {
    if (!onBreak) return;
    setOnBreak(false);
    const endMs = Date.now();
    setBreaks((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].endMs == null) {
          const updated = [...prev];
          updated[i] = { ...prev[i], endMs };
          return updated;
        }
      }
      return prev;
    });
    if (breaksEnabled)
      setIntervalRemainingMs(Math.min(intervalMsInit, remainingMs));
    setSessionKey((k) => k + 1);
  }

  function finalizeOpenBreakIfAny() {
    if (!onBreak) return;
    const endMs = Date.now();
    setBreaks((prev) => {
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
    sessionStartRef.current = new Date();
    setStarted(true);
    setFinished(false);
    setOnBreak(false);
    setRemainingMs(totalMs);
    setIntervalRemainingMs(Math.min(intervalMsInit, totalMs));
    if (totalMs === 0) setFinished(true);
  };

  // start immediately
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
    setIntervalRemainingMs((ms) => Math.min(ms, remainingMs));
  }, [remainingMs, started, finished, onBreak]);

  // tick
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => {
      if (finished || onBreak || paused) return;

      setRemainingMs((ms) => Math.max(0, ms - 1000));
      if (breaksEnabled) setIntervalRemainingMs((ms) => Math.max(0, ms - 1000));

      setCounters((c) => {
        const next = { ...c };
        if (currentFocusRef.current === "FOCUSED") next.focused_s += 1;
        else next.not_focused_s += 1;

        (Object.keys(activeHabitsRef.current) as HabitKind[]).forEach((k) => {
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

  // interval-based break
  useEffect(() => {
    if (!finished && breaksEnabled && !onBreak && intervalRemainingMs === 0) {
      beginBreak("interval");
    }
  }, [intervalRemainingMs, onBreak, finished, breaksEnabled]);

  // end-of-session
  useEffect(() => {
    if (!finished && remainingMs === 0) {
      finalizeOpenBreakIfAny();
      setFinished(true);
    }
  }, [remainingMs, finished]);

  // POST summary
  useEffect(() => {
    if (!finished) return;
    const payload = buildBackendPayload();
    postSessionResult(payload);
  }, [
    finished,
    totalMin,
    intervalMin,
    counters.hair_touch_s,
    counters.nail_bite_s,
    counters.eye_rub_s,
    counters.nose_touch_s,
    counters.not_focused_s,
    totalBreakSeconds,
  ]);

  // sensor callbacks
  const handleFocusChange = (s: FocusStatus) => {
    currentFocusRef.current = s === "FOCUSED" ? "FOCUSED" : "NOT FOCUSED";
  };
  const handleHabitEvent = (e: { habit: HabitKind; phase: "start" | "end" }) => {
    if (onBreak || paused) return;
    activeHabitsRef.current[e.habit] = e.phase === "start";
  };
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

  // ──────────────── Pixel UI tokens (inline, no extra CSS) ────────────────
  const font = { fontFamily: '"Press Start 2P", monospace' as const };
  const pageBg: React.CSSProperties = {
    backgroundImage: "url(/background.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
  };
  const cardStyle: React.CSSProperties = {
    borderRadius: 20,
    border: "2px solid #DCE6F2",
    background: "rgba(255,255,255,0.9)",
    boxShadow:
      "0 20px 50px rgba(61,126,207,0.12), inset 0 1px 0 #fff, inset 0 -2px 0 rgba(0,0,0,0.03)",
  };
  const chipStyle: React.CSSProperties = {
    ...font,
    fontSize: 12,
    color: "#4A5568",
    background: "#F6F8FB",
    border: "2px solid #DFE6EF",
    borderRadius: 12,
    padding: "10px 12px",
  };
  const btnPrimary: React.CSSProperties = {
    ...font,
    color: "#fff",
    background:
      "linear-gradient(90deg, #7AC7C4 0%, #5BA3E1 100%)",
    border: "2px solid #CFE4F5",
    borderRadius: 16,
    padding: "14px 18px",
    boxShadow:
      "inset 0 -3px 0 rgba(0,0,0,0.08), 0 10px 30px rgba(61,126,207,0.18)",
  };
  const btnGhost: React.CSSProperties = {
    ...font,
    color: "#2F495E",
    background: "#F6F8FB",
    border: "2px solid #DFE6EF",
    borderRadius: 16,
    padding: "12px 16px",
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen"
      style={{ ...pageBg, ...font }}
    >
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* top chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoCard label="TOTAL REMAINING" value={msToMinSec(remainingMs)} chipStyle={chipStyle} />
          <InfoCard
            label="INTERVAL REMAINING"
            value={!breaksEnabled ? "—" : onBreak ? "ON BREAK" : msToMinSec(intervalRemainingMs)}
            chipStyle={chipStyle}
          />
          <InfoCard label="BREAKS TAKEN" value={String(breakCount)} chipStyle={chipStyle} />
          <InfoCard label="TOTAL BREAK TIME" value={msToMinSec(totalBreakSeconds * 1000)} chipStyle={chipStyle} />
        </div>

        {/* sensor card */}
        {!finished && (
          <div className="relative overflow-hidden mx-auto" style={{ ...cardStyle, width: 980 }}>
            <div className="p-2" />
            <div className="mx-auto" style={{ width: 960, height: 540 }}>
              <FocusEye
                key={sessionKey}
                width={960}
                height={540}
                mirror
                suspended={onBreak}
                showDeg={true}
                onStatusChange={handleFocusChange}
                onHabitEvent={handleHabitEvent}
                onEndSession={endSessionNow}
                onAutoBreak={handleAutoBreak}
              />
            </div>

            {/* break overlay */}
            {onBreak && breaksEnabled && (
              <div className="absolute inset-0 grid place-items-center"
                   style={{ backdropFilter: "blur(4px)", background: "rgba(0,0,0,.45)" }}>
                <div className="text-center space-y-4" style={font}>
                  <div style={{ color: "#FFFFFF", fontSize: 20 }}>BREAK TIME</div>
                  <div style={{ color: "#E5E7EB", fontSize: 12 }}>Click continue when you’re ready.</div>
                  <button onClick={finishBreak} style={btnPrimary}>
                    CONTINUE
                  </button>
                </div>
              </div>
            )}

            <div className="p-3" />
          </div>
        )}

        {/* habit/focus totals */}
        {/* habit/focus totals (only during live session) */}
        {!finished && (
          <div className="grid md:grid-cols-3 gap-3">
            <Stat label="Focused" value={msToMinSec(counters.focused_s * 1000)} cardStyle={cardStyle} />
            <Stat label="Not focused" value={msToMinSec(counters.not_focused_s * 1000)} cardStyle={cardStyle} />
            <Stat label="Hair touching" value={msToMinSec(counters.hair_touch_s * 1000)} cardStyle={cardStyle} />
            <Stat label="Nose rubbing" value={msToMinSec(counters.nose_touch_s * 1000)} cardStyle={cardStyle} />
            <Stat label="Eye rubbing" value={msToMinSec(counters.eye_rub_s * 1000)} cardStyle={cardStyle} />
            <Stat label="Nail biting" value={msToMinSec(counters.nail_bite_s * 1000)} cardStyle={cardStyle} />
          </div>
        )}

        {/* controls */}
        <div className="flex flex-wrap items-center gap-3">
          {!onBreak && breaksEnabled && !finished && (
            <button onClick={() => beginBreak("manual")} style={btnGhost}>
              TAKE A BREAK NOW
            </button>
          )}
          {!finished && (
            <button onClick={endSessionNow} style={btnPrimary}>
              END SESSION
            </button>
          )}
        </div>

        <div style={{ color: "#6B7280", fontSize: 10 }}>
          Using total={totalMin} min, interval={intervalMin} min
        </div>
        
        <Chatbot/>

        {/* summary */}
        {finished && (
          <div className="space-y-4 p-5 md:p-6" style={cardStyle}>
            <h2 style={{ ...font, color: "#2F495E", fontSize: 18 }}>SESSION SUMMARY</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <Stat label="FOCUSED" value={msToMinSec(counters.focused_s * 1000)} cardStyle={cardStyle} small />
              <Stat label="NOT FOCUSED" value={msToMinSec(counters.not_focused_s * 1000)} cardStyle={cardStyle} small />
              <Stat label="HAIR TOUCHING" value={msToMinSec(counters.hair_touch_s * 1000)} cardStyle={cardStyle} small />
              <Stat label="NOSE RUBBING" value={msToMinSec(counters.nose_touch_s * 1000)} cardStyle={cardStyle} small />
              <Stat label="EYE RUBBING" value={msToMinSec(counters.eye_rub_s * 1000)} cardStyle={cardStyle} small />
              <Stat label="NAIL BITING" value={msToMinSec(counters.nail_bite_s * 1000)} cardStyle={cardStyle} small />
              <Stat label="BREAKS TAKEN" value={String(breakCount)} cardStyle={cardStyle} small />
              <Stat label="BREAK TIME" value={msToMinSec(totalBreakSeconds * 1000)} cardStyle={cardStyle} small />
            </div>
            <div className="flex gap-2">
              <a
                href={`/?total=${totalMin}&interval=${intervalMin}`}
                style={btnPrimary}
              >
                START ANOTHER SESSION
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────── Pixel subcomponents ────────────── */

function InfoCard({
  label,
  value,
  chipStyle,
}: {
  label: string;
  value: string;
  chipStyle: React.CSSProperties;
}) {
  return (
    <div style={chipStyle}>
      <div style={{ fontSize: 10, opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: 16, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  cardStyle,
  small = false,
}: {
  label: string;
  value: string;
  cardStyle: React.CSSProperties;
  small?: boolean;
}) {
  return (
    <div className="p-3" style={{ ...cardStyle, padding: 14 }}>
      <div style={{ fontSize: small ? 10 : 11, color: "#6B7280" }}>{label}</div>
      <div
        style={{
          fontSize: small ? 16 : 18,
          color: "#2F495E",
          marginTop: 6,
        }}
      >
        {value}
      </div>
    </div>
  );
}
