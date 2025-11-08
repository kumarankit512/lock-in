import { useEffect, useRef, useState } from "react";
import{ FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

/* ---------------- Shared Camera ---------------- */
let sharedStreamPromise: Promise<MediaStream> | null = null;
async function getSharedStream() {
  if (!sharedStreamPromise) {
    sharedStreamPromise = navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    });
  }
  return sharedStreamPromise;
}

function drawBigFocusBannerWithAlpha(
  ctx: CanvasRenderingContext2D,
  status: "FOCUSED" | "NOT FOCUSED" | "PAUSED",
  W: number, H: number,
  alpha: number // 0..1
) {
  // Band color
  const color = status === "FOCUSED" ? "#10b981" : status === "PAUSED" ? "#3b82f6" : "#ef4444";

  // Background band
  ctx.save();
  ctx.globalAlpha = alpha; // animated opacity
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, Math.round(H * 0.22));
  ctx.restore();

  // Big label
  ctx.save();
  ctx.font = "700 44px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 6;
  ctx.strokeText(status, W / 2, Math.round(H * 0.11));
  ctx.fillText(status, W / 2, Math.round(H * 0.11));
  ctx.restore();

  // Optional: matching border glow
  ctx.save();
  ctx.globalAlpha = Math.min(0.7, alpha + 0.1);
  ctx.lineWidth = 8;
  ctx.strokeStyle = color;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  ctx.restore();
}



/* ---------------- Config ---------------- */
const CALIB_SECONDS = 3.0; // time to get personal thresholds
const EAR_FALLBACK_OPEN = 0.23; // fallback if calibration fails for open eyes
const EAR_MIN_CLAMP = 0.18; // min for focused(open eyes)
const EAR_MARGIN = 0.85; // margin so small fluctauations don't flip state(higher = strict)
const AVG_MARGIN = 0.88; // one more safety margin;(noisy eye or glare)(higher = strict)
const DEBOUNCE_FRAMES = 5;// frames req to flip into focus
const UNFOCUS_MISS_FRAMES = 8;//frames req to flip into unfocus
const EITHER_EYE_OK = true;
const USE_AVG_GUARD  = true;
const DEFAULT_NOT_FOCUSED_LIMIT_S = 30; // change to paused (30s)
const INFER_EVERY_N = 1; // every two frames run the model

/* ---------------- Indices ---------------- */
const L_EYE = [33, 159, 158, 133, 153, 144];
const R_EYE = [362, 386, 385, 263, 374, 373];

type Pt = { x: number; y: number };
const ear6 = (p: Pt[]) => {
  const v1 = Math.hypot(p[1].x - p[5].x, p[1].y - p[5].y);
  const v2 = Math.hypot(p[2].x - p[4].x, p[2].y - p[4].y);
  const h  = Math.hypot(p[0].x - p[3].x, p[0].y - p[3].y);
  return h > 1e-6 ? (v1 + v2) / (2 * h) : 0;
};
const median = (a: number[]) => {
  if (!a?.length) return undefined;
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

/* ---------------- HUD helpers ---------------- */
function drawStatusChip(ctx: CanvasRenderingContext2D, status: string, W: number) {
  const txt = status;
  ctx.font = "16px system-ui";
  const m = ctx.measureText(txt);
  const w = m.width + 16, h = 30, x = W - w - 12, y = 12;
  ctx.save(); ctx.globalAlpha = 0.9;
  ctx.fillStyle = status === "FOCUSED" ? "rgb(16,185,129)" : status === "PAUSED" ? "rgb(59,130,246)" : "rgb(239,68,68)";
  ctx.fillRect(x, y, w, h); ctx.restore();
  ctx.fillStyle = "#fff"; ctx.fillText(txt, x + 8, y + 20);
}
function drawPausePanelWithButtons(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0, 0, W, H);
  const panelW = Math.floor(W * 0.75), panelH = Math.floor(H * 0.48);
  const x0 = Math.floor((W - panelW) / 2), y0 = Math.floor((H - panelH) / 2);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, panelW, panelH);
  ctx.fillStyle = "#fff"; ctx.font = "24px system-ui";
  ctx.fillText("Session paused — not focused.", x0 + 30, y0 + 60);
  ctx.font = "18px system-ui";
  ctx.fillText("Click green to continue or red to end the session.", x0 + 30, y0 + 110);
  const btnW = Math.floor(panelW * 0.42), btnH = 62, gap = Math.floor(panelW * 0.05);
  const bx1 = x0 + Math.floor((panelW - (2 * btnW + gap)) / 2), by1 = y0 + panelH - btnH - 32;
  const bx2 = bx1 + btnW + gap, by2 = by1;
  ctx.fillStyle = "rgb(80,220,80)"; ctx.fillRect(bx1, by1, btnW, btnH);
  ctx.fillStyle = "rgb(20,40,20)"; ctx.font = "18px system-ui"; ctx.fillText("Continue (resume)", bx1 + 40, by1 + 40);
  ctx.fillStyle = "rgb(60,60,200)"; ctx.fillRect(bx2, by2, btnW, btnH);
  ctx.fillStyle = "rgb(240,240,255)"; ctx.fillText("End session", bx2 + 70, by2 + 40);
  return { continue: new DOMRect(bx1, by1, btnW, btnH), end: new DOMRect(bx2, by2, btnW, btnH) };
}

/* ---------------- Component ---------------- */
export type FocusStatus = "FOCUSED" | "NOT FOCUSED" | "PAUSED";



export default function FocusEyeCalibrated({
  width = 960,
  height = 540,
  mirror = true,
  notFocusedLimitSec = DEFAULT_NOT_FOCUSED_LIMIT_S,
  showDebug = false,
  onStatusChange,
  onPaused,
  onResume,
  onEndSession
}: {
  width?: number;
  height?: number;
  mirror?: boolean;
  notFocusedLimitSec?: number;
  showDebug?: boolean;
  onStatusChange?: (s: FocusStatus) => void;
  onPaused?: () => void;
  onResume?: () => void;
  onEndSession?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null); // now rendered in DOM
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLmRef  = useRef<any | null>(null);   


  // Focus state
  const calibStartRef = useRef<number | null>(null);
  const earThrRef = useRef<{ l_thr: number; r_thr: number; avg_thr: number } | null>(null);
  const focusedRef = useRef(false);
  const okCntRef = useRef(0), missCntRef = useRef(0);
  const notFocusedSinceRef = useRef<number | null>(null);
  const lastStatusRef = useRef<FocusStatus>("NOT FOCUSED");
  const statusChangeTsRef = useRef<number>(performance.now());

  // UI state
  const [status, setStatus] = useState<FocusStatus>("NOT FOCUSED");
  const [paused, setPaused] = useState(false);
  const btnRectsRef = useRef<{ continue: DOMRect; end: DOMRect } | null>(null);

  // click handler
  useEffect(() => {
    const c = canvasRef.current!;
    const onClick = (e: MouseEvent) => {
      if (!paused || !btnRectsRef.current) return;
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) * (c.width / r.width);
      const y = (e.clientY - r.top) * (c.height / r.height);
      const { continue: cont, end } = btnRectsRef.current;
      const hit = (d: DOMRect) => x >= d.x && x <= d.x + d.width && y >= d.y && y <= d.y + d.height;
      if (hit(cont)) {
        notFocusedSinceRef.current = null; okCntRef.current = 0; missCntRef.current = 0;
        setPaused(false); setStatus("NOT FOCUSED"); onResume?.();
      } else if (hit(end)) {
        endedRef.current = true;
        // stop model
        try { faceLmRef.current?.close?.(); } catch {}
        faceLmRef.current = null;

        // stop camera
        const s = streamRef.current;
        if (s) {
          s.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          const vv = videoRef.current;
          try { vv.pause(); } catch {}
          vv.srcObject = null;
          vv.removeAttribute("src");
          vv.load();
        }

        onEndSession?.();
      }
    };
    c.addEventListener("click", onClick);
    return () => c.removeEventListener("click", onClick);
  }, [paused, onEndSession, onResume]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "r") { // recalibrate
        calibStartRef.current = performance.now();
        earThrRef.current = null;
        (window as any).__earCalibStore = { L: [], R: [], AVG: [] };
        focusedRef.current = false;
        okCntRef.current = missCntRef.current = 0;
        notFocusedSinceRef.current = null;
        setStatus("NOT FOCUSED");
        onStatusChange?.("NOT FOCUSED");
      } else if (k === "f") { // flip
        if (videoRef.current) (videoRef.current as any).__mirror = !(videoRef.current as any).__mirror;
      } else if (k === "q" || e.key === "Escape") {
        endedRef.current = true; 
        onEndSession?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEndSession, onStatusChange]);

  // main
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    let faceLm: any | null = null;
    let frameId = 0;

    (async () => {
      const v = videoRef.current!;
      v.setAttribute("playsinline", "true");
      v.muted = true;
      v.autoplay = true;
      (v as any).__mirror = mirror;

      // attach stream robustly
      const stream = await getSharedStream();
      if (cancelled) return;
      streamRef.current = stream;
      v.srcObject = stream;
      faceLmRef.current = faceLm;

      // wait for metadata or readyState
      await new Promise<void>((resolve) => {
        if (v.readyState >= 2 && v.videoWidth && v.videoHeight) return resolve();
        const onMeta = () => { resolve(); cleanup(); };
        const to = setTimeout(() => { resolve(); cleanup(); }, 1500);
        const cleanup = () => {
          v.removeEventListener("loadedmetadata", onMeta);
          clearTimeout(to);
        };
        v.addEventListener("loadedmetadata", onMeta, { once: true });
      });

      // attempt to play & wait for 'playing'
      try { await v.play(); } catch { /* autoplay might be blocked; user gesture later */ }
      await new Promise<void>((resolve) => {
        if (!v.paused && !v.ended) return resolve();
        const onPlay = () => { resolve(); cleanup(); };
        const to = setTimeout(() => { resolve(); cleanup(); }, 1200);
        const cleanup = () => {
          v.removeEventListener("playing", onPlay);
          clearTimeout(to);
        };
        v.addEventListener("playing", onPlay, { once: true });
      });

      const c = canvasRef.current!;
      c.width = width; c.height = height;
      const ctx = c.getContext("2d")!;

      // Pin versions; avoid @latest flakiness
      let resolver: any | null = null;
      try {
        resolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.11/wasm"
        );
        faceLm = await FaceLandmarker.createFromOptions(resolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });
      } catch (err) {
        console.warn("FaceLandmarker init failed — continuing with video only", err);
        faceLm = null; // keep UI alive
      }

      // start calibration
      calibStartRef.current = performance.now();
      (window as any).__earCalibStore = { L: [], R: [], AVG: [] };

      const schedule = (fn: FrameRequestCallback) => {
        // prefer rVFC
        const anyVid = v as any;
        if (typeof anyVid.requestVideoFrameCallback === "function") {
          anyVid.requestVideoFrameCallback(fn);
        } else if (typeof window.requestAnimationFrame === "function") {
          requestAnimationFrame(fn);
        } else {
          setTimeout(() => fn(performance.now()), 33);
        }
      };
      const step = (now: number) => {
        // 1) Early abort if component got unmounted/cancelled.
        if (cancelled) return;
        // stop drawing/rescheduling if user ended the session
        if (endedRef.current) {
          // optional: draw a final "session ended" card
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = "#fff";
          ctx.font = "24px system-ui";
          ctx.textAlign = "center";
          ctx.fillText("Session ended", width / 2, height / 2);
          return; // IMPORTANT: do not schedule next frame
        }

      
        try {
          // 2) Clear the canvas for a fresh frame.
          ctx.clearRect(0, 0, width, height);
      
          // 3) Read current mirror setting (either toggled on <video> or prop).
          const mirrored = (videoRef.current as any)?.__mirror ?? mirror;
      
          // 4-8) Draw the live camera frame (mirrored if needed).
          if (mirrored) {
            ctx.save();                  // 4) Save state since we’ll transform it.
            ctx.translate(width, 0);     // 5) Move origin to the right side…
            ctx.scale(-1, 1);            // 6) …flip X to mirror image.
            ctx.drawImage(v, 0, 0, width, height); // 7) Draw the video into canvas.
            ctx.restore();               // 8) Restore transform state.
          } else {
            ctx.drawImage(v, 0, 0, width, height); // Draw unflipped.
          }
      
          // 9-11) Compute mapping from video’s intrinsic size to canvas size.
          const vw = v.videoWidth || width;   // 9) source width (fallback to canvas)
          const vh = v.videoHeight || height; // 10) source height (fallback to canvas)
          const sx = width / vw, sy = height / vh; // 11) scale factors
      
          // 12-14) Frame counter + cadence control (run model every Nth frame).
          frameId++;                                      // 12) advance frame counter
          const runNow = (frameId % INFER_EVERY_N) === 0; // 13) should we infer?
          let gotFace = false;                            // 14) track if we saw a face
      
          // 15-45) Single detect block: run Face Landmarker once, handle eyes-open/closed.
          if (runNow && faceLm) {                         // 15) only infer when scheduled
            const face = faceLm.detectForVideo(v, now);   // 16) run model on current frame
            if (face?.faceLandmarks?.length) {            // 17) landmarks found?
              gotFace = true;                             // 18) mark that we saw a face
      
              const lm = face.faceLandmarks[0];           // 19) take the first face
              // 20-21) Helper to convert normalized landmark to canvas pixels.
              const px = (i: number): Pt => ({
                x: lm[i].x * vw * sx,
                y: lm[i].y * vh * sy
              });
              // 22-23) Gather the 6 points for left & right eye.
              const L: Pt[] = L_EYE.map(px), R: Pt[] = R_EYE.map(px);
      
              // 24-25) Compute Eye-Aspect Ratio (EAR) for each eye.
              const lEAR = ear6(L), rEAR = ear6(R);
      
              // 26-29) Access/initialize in-window calibration buffers.
              type Calib = { L: number[]; R: number[]; AVG: number[] };
              const store: Calib =
                (window as any).__earCalibStore ?? ({ L: [], R: [], AVG: [] } as Calib);
              (window as any).__earCalibStore = store;
      
              // 30-35) During first CALIB_SECONDS, collect EAR samples for medians.
              if (calibStartRef.current && (now - calibStartRef.current) <= CALIB_SECONDS * 1000) {
                store.L.push(lEAR);                          // 31) left EAR sample
                store.R.push(rEAR);                          // 32) right EAR sample
                store.AVG.push((lEAR + rEAR) / 2);           // 33) average EAR sample
              } else if (earThrRef.current == null) {        // 34) first tick after calibration → compute thresholds
                const medL = (median(store.L) ?? EAR_FALLBACK_OPEN);   // 35) robust baseline
                const medR = (median(store.R) ?? EAR_FALLBACK_OPEN);
                const medAVG = (median(store.AVG) ?? EAR_FALLBACK_OPEN);
                // 36-38) Apply safety clamp + margin to form per-eye and average thresholds.
                const l_thr = Math.max(EAR_MIN_CLAMP, medL * EAR_MARGIN);
                const r_thr = Math.max(EAR_MIN_CLAMP, medR * EAR_MARGIN);
                const avg_thr = Math.max(EAR_MIN_CLAMP, medAVG * AVG_MARGIN);
                earThrRef.current = { l_thr, r_thr, avg_thr };         // 39) save thresholds
              }
      
              // 40) Read thresholds or fallback if not ready.
              const { l_thr, r_thr, avg_thr } =
                earThrRef.current ?? { l_thr: EAR_FALLBACK_OPEN, r_thr: EAR_FALLBACK_OPEN, avg_thr: EAR_FALLBACK_OPEN };
      
              // 41-44) Decide eyes-open using per-eye and average guards.
              const avgEAR = (lEAR + rEAR) / 2;                           // 41) mean EAR
              const perEyePass = EITHER_EYE_OK
                ? (lEAR > l_thr || rEAR > r_thr)                          // 42) either eye open OK
                : (lEAR > l_thr && rEAR > r_thr);                         //     or both eyes required
              const avgPass = USE_AVG_GUARD ? (avgEAR > avg_thr) : false; // 43) average guard
              const eyesOpen = perEyePass || avgPass;                     // 44) final eyes-open flag
      
              // 45-56) Debounced focus state (eyes-open only).
              if (eyesOpen) {                               // 45) if open this frame
                okCntRef.current++;                         // 46) increment open streak
                missCntRef.current = 0;                     // 47) reset miss streak
                if (!focusedRef.current && okCntRef.current >= DEBOUNCE_FRAMES) {
                  focusedRef.current = true;                // 48) enter FOCUSED after N good frames
                }
                notFocusedSinceRef.current = null;          // 49) clear unfocused timer
              } else {                                      // 50) eyes closed this frame
                missCntRef.current++;                       // 51) increment miss streak
                okCntRef.current = 0;                       // 52) reset open streak
                if (focusedRef.current && missCntRef.current >= UNFOCUS_MISS_FRAMES) {
                  focusedRef.current = false;               // 53) leave FOCUSED after M misses
                  if (notFocusedSinceRef.current == null) notFocusedSinceRef.current = now; // 54) start unfocused timer
                } else if (!focusedRef.current && notFocusedSinceRef.current == null) {
                  notFocusedSinceRef.current = now;         // 55) (if already unfocused) ensure timer is running
                }
              }
            }
          }
      
          // 57-63) If NO face was seen this cycle, treat as a “miss” (eyes closed/out of frame).
          if (!gotFace) {
            missCntRef.current++;                           // 58) accumulate misses
            okCntRef.current = 0;                           // 59) reset opens
            if (focusedRef.current && missCntRef.current >= UNFOCUS_MISS_FRAMES) {
              focusedRef.current = false;                   // 60) drop to NOT FOCUSED after enough misses
              if (notFocusedSinceRef.current == null) notFocusedSinceRef.current = now; // 61) start timer if needed
            } else if (!focusedRef.current && notFocusedSinceRef.current == null) {
              notFocusedSinceRef.current = now;             // 62) keep timer for pause logic
            }
          }
      
          let newStatus: FocusStatus = focusedRef.current ? "FOCUSED" : "NOT FOCUSED";
          if(!paused && !focusedRef.current && notFocusedSinceRef.current && (now - notFocusedSinceRef.current) >= notFocusedLimitSec * 1000){
            setPaused(true);
            newStatus = "PAUSED";
            onPaused?.();
          }

          if (newStatus !== lastStatusRef.current) {
            lastStatusRef.current = newStatus;
            statusChangeTsRef.current = now;     // mark the moment of change
          }

          if (newStatus !== status) {
            setStatus(newStatus);
            onStatusChange?.(newStatus);
          }
          const TRANSITION_MS = 900;
          const t = Math.min(1, (now - statusChangeTsRef.current) / TRANSITION_MS);

          // Small ease-out for the banner opacity
          const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
          const alpha = 0.15 + 0.35 * easeOut(t); // goes 0.15→0.50 over 300ms

          drawStatusChip(ctx, newStatus, width);
          drawBigFocusBannerWithAlpha(ctx, newStatus, width, height, alpha);

          const isPausedNow = newStatus == "PAUSED";
          if(isPausedNow){
            btnRectsRef.current = drawPausePanelWithButtons(ctx, width, height);
          }else{
            btnRectsRef.current = null;
          }

          if (showDebug && earThrRef.current) {
            ctx.font = "14px system-ui"; ctx.fillStyle = "#fff";
            ctx.fillText(
              `thr L:${earThrRef.current.l_thr.toFixed(2)}  R:${earThrRef.current.r_thr.toFixed(2)}  AVG:${earThrRef.current.avg_thr.toFixed(2)}`,
              12, 48
            );
          }
        } catch (e) {
          // 83) Never kill the loop on errors; just log and continue.
          console.error("focus frame error", e);
        } finally {
          // 84) Reschedule next frame using the best available driver.
          if (!endedRef.current) schedule(step);
        }
      };
      schedule(step);
    })();

    return () => { 
      cancelled = true; 
      try { faceLmRef.current?.close?.(); } catch {}
      faceLmRef.current = null;

      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        const vv = videoRef.current;
        try { vv.pause(); } catch {}
        vv.srcObject = null;
        vv.removeAttribute("src");
        vv.load();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, mirror, notFocusedLimitSec, showDebug]);

  return (
    <div className="relative">
      {/* keep video in DOM (can be visually hidden) */}
      <video
        ref={videoRef}
        className="absolute opacity-0 pointer-events-none"
        width={width}
        height={height}
        playsInline
        muted
        autoPlay
        style={{
          position: "absolute",
          left: "-99999px",
          top: "-99999px",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <canvas ref={canvasRef} width={width} height={height} className="rounded-2xl shadow" />
    </div>
  );
}