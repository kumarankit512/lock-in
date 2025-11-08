import { useEffect, useRef, useState } from "react";
import { FilesetResolver, FaceLandmarker, HandLandmarker } from "@mediapipe/tasks-vision";

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

/* ---------------- HUD helpers ---------------- */
function drawBigFocusBannerWithAlpha(
  ctx: CanvasRenderingContext2D,
  status: "FOCUSED" | "NOT FOCUSED" | "PAUSED",
  W: number, H: number,
  alpha: number
) {
  const color = status === "FOCUSED" ? "#10b981" : status === "PAUSED" ? "#3b82f6" : "#ef4444";
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(0, 0, W, Math.round(H * 0.22)); ctx.restore();
  ctx.save();
  ctx.font = "700 44px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 6;
  ctx.strokeText(status, W / 2, Math.round(H * 0.11)); ctx.fillText(status, W / 2, Math.round(H * 0.11));
  ctx.restore();
  ctx.save(); ctx.globalAlpha = Math.min(0.7, alpha + 0.1); ctx.lineWidth = 8; ctx.strokeStyle = color;
  ctx.strokeRect(4, 4, W - 8, H - 8); ctx.restore();
}
function drawStatusChip(ctx: CanvasRenderingContext2D, status: string, W: number) {
  const txt = status; ctx.font = "16px system-ui";
  const m = ctx.measureText(txt); const w = m.width + 16, h = 30, x = W - w - 12, y = 12;
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
function drawWarningsTopLeft(ctx: CanvasRenderingContext2D, labels: string[]) {
  if (!labels.length) return;
  const padX = 10, padY = 8; let x = 12, y = 12;
  ctx.font = "16px system-ui";
  for (const lab of labels) {
    const text = `⚠ ${lab}`, m = ctx.measureText(text);
    const textH = 18, boxW = Math.max(260, m.width + padX * 2), boxH = textH + padY * 2;
    ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = "#001030";
    ctx.fillRect(x, y, boxW, boxH); ctx.restore();
    ctx.strokeStyle = "rgba(200,210,255,0.9)"; ctx.lineWidth = 1; ctx.strokeRect(x, y, boxW, boxH);
    ctx.fillStyle = "#fff"; ctx.fillText(text, x + padX, y + padY + textH - 4);
    y += boxH + 8;
  }
}

/* ---------------- Config ---------------- */
const CALIB_SECONDS = 3.0;
const EAR_FALLBACK_OPEN = 0.23;
const EAR_MIN_CLAMP = 0.18;
const EAR_MARGIN = 0.85;
const AVG_MARGIN = 0.88;
const DEBOUNCE_FRAMES = 5;
const UNFOCUS_MISS_FRAMES = 8;
const EITHER_EYE_OK = true;
const USE_AVG_GUARD  = true;
const DEFAULT_NOT_FOCUSED_LIMIT_S = 30;
const INFER_EVERY_N = 1;

/* ---------------- Indices ---------------- */
const L_EYE = [33, 159, 158, 133, 153, 144];
const R_EYE = [362, 386, 385, 263, 374, 373];
const LEFT_EYE_OUTER = 33, RIGHT_EYE_OUTER = 263;
const LEFT_EYE_CENTER = 468, RIGHT_EYE_CENTER = 473;
const UPPER_LIP = 13, LOWER_LIP = 14;
const NOSE_TIP = 1, NOSE_EXTRA = [6, 197, 195, 5];
const FOREHEAD_CENTER = 10;
const LEFT_TEMPLE = 127, RIGHT_TEMPLE = 356;
const MOUTH_CORNERS = [61, 291];

const THUMB_TIP = 4, INDEX_TIP = 8, MIDDLE_TIP = 12, RING_TIP = 16, PINKY_TIP = 20;
const ALL_TIPS = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];

type Pt = { x: number; y: number };
const ear6 = (p: Pt[]) => {
  const v1 = Math.hypot(p[1].x - p[5].x, p[1].y - p[5].y);
  const v2 = Math.hypot(p[2].x - p[4].x, p[2].y - p[4].y);
  const h  = Math.hypot(p[0].x - p[3].x, p[0].y - p[3].y);
  return h > 1e-6 ? (v1 + v2) / (2 * h) : 0;
};
const median = (a: number[]) => {
  if (!a?.length) return undefined;
  const s = [...a].sort((x, y) => x - y); const n = s.length;
  return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

/* ---------------- Habit latches ---------------- */
class Latch {
  private on = false; private since: number | null = null;
  constructor(private onMs: number, private offMs: number) {}
  get active() { return this.on; }
  update(cond: boolean, now: number) {
    if (this.on) {
      if (cond) this.since = null;
      else {
        if (this.since == null) this.since = now;
        else if (now - this.since >= this.offMs) { this.on = false; this.since = null; return true; }
      }
    } else {
      if (cond) {
        if (this.since == null) this.since = now;
        else if (now - this.since >= this.onMs) { this.on = true; this.since = null; return true; }
      } else this.since = null;
    }
    return false;
  }
}
const ON_HOLD_SEC = 0.30, OFF_HOLD_SEC = 0.25;
const TH_EYE_MUL = 0.18, TH_NOSE_MUL = 0.22, TH_MOUTH_MUL = 0.24, TH_HAIR_MUL = 0.22;
const HAIR_ABOVE_FOREHEAD = 0.06, HAIR_ABOVE_EYE = 0.02;

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLmRef  = useRef<FaceLandmarker | null>(null);
  const handLmRef  = useRef<HandLandmarker | null>(null);

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

  // Habit state
  const latchesRef = useRef({
    "Nail Biting": new Latch(ON_HOLD_SEC * 1000, OFF_HOLD_SEC * 1000),
    "Nose Rubbing": new Latch(ON_HOLD_SEC * 1000, OFF_HOLD_SEC * 1000),
    "Eye Rubbing": new Latch(ON_HOLD_SEC * 1000, OFF_HOLD_SEC * 1000),
    "Hair Touching": new Latch(ON_HOLD_SEC * 1000, OFF_HOLD_SEC * 1000),
  });
  const activeHabitLabelsRef = useRef<string[]>([]);

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
        try { faceLmRef.current?.close?.(); } catch {}
        try { handLmRef.current?.close?.(); } catch {}
        faceLmRef.current = null; handLmRef.current = null;

        const s = streamRef.current;
        if (s) { s.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (videoRef.current) {
          const vv = videoRef.current; try { vv.pause(); } catch {}
          vv.srcObject = null; vv.removeAttribute("src"); vv.load();
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
      if (k === "r") {
        calibStartRef.current = performance.now();
        earThrRef.current = null;
        (window as any).__earCalibStore = { L: [], R: [], AVG: [] };
        focusedRef.current = false;
        okCntRef.current = missCntRef.current = 0;
        notFocusedSinceRef.current = null;
        setStatus("NOT FOCUSED");
        onStatusChange?.("NOT FOCUSED");
      } else if (k === "f") {
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
    let faceLm: FaceLandmarker | null = null;
    let handLm: HandLandmarker | null = null;
    let frameId = 0;

    (async () => {
      const v = videoRef.current!;
      v.setAttribute("playsinline", "true");
      v.muted = true;
      v.autoplay = true;
      (v as any).__mirror = mirror;

      // attach stream
      const stream = await getSharedStream();
      if (cancelled) return;
      streamRef.current = stream;
      v.srcObject = stream;

      // wait for metadata or playing
      await new Promise<void>((resolve) => {
        if (v.readyState >= 2 && v.videoWidth && v.videoHeight) return resolve();
        const onMeta = () => { resolve(); cleanup(); };
        const to = setTimeout(() => { resolve(); cleanup(); }, 1500);
        const cleanup = () => { v.removeEventListener("loadedmetadata", onMeta); clearTimeout(to); };
        v.addEventListener("loadedmetadata", onMeta, { once: true });
      });
      try { await v.play(); } catch {}

      const c = canvasRef.current!;
      c.width = width; c.height = height;
      const ctx = c.getContext("2d")!;

      // models
      let resolver: any | null = null;
      try {
        resolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.11/wasm");
        faceLm = await FaceLandmarker.createFromOptions(resolver, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
          runningMode: "VIDEO", numFaces: 1,
        });
        handLm = await HandLandmarker.createFromOptions(resolver, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" },
          runningMode: "VIDEO", numHands: 2,
        });
      } catch (err) {
        console.warn("Landmarker init failed — continuing with video only", err);
      }
      faceLmRef.current = faceLm; handLmRef.current = handLm;

      // start calibration
      calibStartRef.current = performance.now();
      (window as any).__earCalibStore = { L: [], R: [], AVG: [] };

      const schedule = (fn: FrameRequestCallback) => {
        const anyVid = v as any;
        if (typeof anyVid.requestVideoFrameCallback === "function") {
          anyVid.requestVideoFrameCallback(fn);
        } else {
          requestAnimationFrame(fn);
        }
      };

      const step = (now: number) => {
        if (cancelled) return;
        if (endedRef.current) {
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = "#fff"; ctx.font = "24px system-ui"; ctx.textAlign = "center";
          ctx.fillText("Session ended", width / 2, height / 2);
          return;
        }

        try {
          ctx.clearRect(0, 0, width, height);
          const mirrored = (videoRef.current as any)?.__mirror ?? mirror;
          if (mirrored) { ctx.save(); ctx.translate(width, 0); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0, width, height); ctx.restore(); }
          else { ctx.drawImage(v, 0, 0, width, height); }

          const vw = v.videoWidth || width;
          const vh = v.videoHeight || height;
          const sx = width / vw, sy = height / vh;

          frameId++;
          const runNow = (frameId % INFER_EVERY_N) === 0;
          let gotFace = false;

          // -------- detect + focus --------
          if (runNow && faceLm) {
            const face = faceLm.detectForVideo(v, now);

            if (face?.faceLandmarks?.length) {
              gotFace = true;
              const lm = face.faceLandmarks[0];
              const px = (i: number): Pt => ({ x: lm[i].x * vw * sx, y: lm[i].y * vh * sy });

              const L: Pt[] = L_EYE.map(px), R: Pt[] = R_EYE.map(px);
              const le_o = px(LEFT_EYE_OUTER), re_o = px(RIGHT_EYE_OUTER);
              const le_c = px(LEFT_EYE_CENTER), re_c = px(RIGHT_EYE_CENTER);
              const up = px(UPPER_LIP), lo = px(LOWER_LIP);
              const nose_tip = px(NOSE_TIP), forehead = px(FOREHEAD_CENTER);
              const l_tem = px(LEFT_TEMPLE), r_tem = px(RIGHT_TEMPLE);
              const mouth_c: Pt = { x: (up.x + lo.x) / 2, y: (up.y + lo.y) / 2 };
              const nose_targets: Pt[] = [nose_tip, ...NOSE_EXTRA.map(px)];
              const mouth_targets: Pt[] = [up, lo, ...MOUTH_CORNERS.map(px)];

              const faceScale = Math.max(1, Math.hypot(le_o.x - re_o.x, le_o.y - re_o.y));

              // EAR calibration → thresholds
              const lEAR = ear6(L), rEAR = ear6(R);
              type Calib = { L: number[]; R: number[]; AVG: number[] };
              const store: Calib = (window as any).__earCalibStore ?? ({ L: [], R: [], AVG: [] } as Calib);
              (window as any).__earCalibStore = store;

              if (calibStartRef.current && (now - calibStartRef.current) <= CALIB_SECONDS * 1000) {
                store.L.push(lEAR); store.R.push(rEAR); store.AVG.push((lEAR + rEAR) / 2);
              } else if (earThrRef.current == null) {
                const medL = (median(store.L) ?? EAR_FALLBACK_OPEN);
                const medR = (median(store.R) ?? EAR_FALLBACK_OPEN);
                const medAVG = (median(store.AVG) ?? EAR_FALLBACK_OPEN);
                const l_thr = Math.max(EAR_MIN_CLAMP, medL * EAR_MARGIN);
                const r_thr = Math.max(EAR_MIN_CLAMP, medR * EAR_MARGIN);
                const avg_thr = Math.max(EAR_MIN_CLAMP, medAVG * AVG_MARGIN);
                earThrRef.current = { l_thr, r_thr, avg_thr };
              }

              const { l_thr, r_thr, avg_thr } =
                earThrRef.current ?? { l_thr: EAR_FALLBACK_OPEN, r_thr: EAR_FALLBACK_OPEN, avg_thr: EAR_FALLBACK_OPEN };

              const avgEAR = (lEAR + rEAR) / 2;
              const perEyePass = EITHER_EYE_OK ? (lEAR > l_thr || rEAR > r_thr) : (lEAR > l_thr && rEAR > r_thr);
              const avgPass = USE_AVG_GUARD ? (avgEAR > avg_thr) : false;
              const eyesOpen = perEyePass || avgPass;

              if (eyesOpen) {
                okCntRef.current++; missCntRef.current = 0;
                if (!focusedRef.current && okCntRef.current >= DEBOUNCE_FRAMES) focusedRef.current = true;
                notFocusedSinceRef.current = null;
              } else {
                missCntRef.current++; okCntRef.current = 0;
                if (focusedRef.current && missCntRef.current >= UNFOCUS_MISS_FRAMES) {
                  focusedRef.current = false;
                  if (notFocusedSinceRef.current == null) notFocusedSinceRef.current = now;
                } else if (!focusedRef.current && notFocusedSinceRef.current == null) {
                  notFocusedSinceRef.current = now;
                }
              }

              // -------- habits (needs hands too) --------
              activeHabitLabelsRef.current = [];
              if (handLm) {
                const hands = handLm.detectForVideo(v, now);

                const TH_EYE = TH_EYE_MUL * faceScale, TH_NOSE = TH_NOSE_MUL * faceScale,
                      TH_MOUTH = TH_MOUTH_MUL * faceScale, TH_HAIR = TH_HAIR_MUL * faceScale;

                const eyeLineY = Math.min(le_c.y, re_c.y);
                const hairLineY = forehead.y;
                const isInHairBand = (p: Pt) => {
                  const aboveForehead = p.y < (hairLineY - HAIR_ABOVE_FOREHEAD * faceScale);
                  const nearTemples = (Math.hypot(p.x - l_tem.x, p.y - l_tem.y) < TH_HAIR) ||
                                      (Math.hypot(p.x - r_tem.x, p.y - r_tem.y) < TH_HAIR);
                  const aboveEye = p.y < (eyeLineY - HAIR_ABOVE_EYE * faceScale);
                  return (aboveForehead || nearTemples) && aboveEye;
                };

                const tipPts: Record<number, Pt[]> = { [THUMB_TIP]: [], [INDEX_TIP]: [], [MIDDLE_TIP]: [], [RING_TIP]: [], [PINKY_TIP]: [] };
                (hands as any)?.landmarks?.forEach((hand: any) => {
                  [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP].forEach(fi => {
                    tipPts[fi].push({ x: hand[fi].x * vw * sx, y: hand[fi].y * vh * sy });
                  });
                });

                const anyNear = (fingers: number[], targets: Pt[], thr: number) => {
                  for (const fi of fingers) for (const p of tipPts[fi]) for (const t of targets) if (Math.hypot(p.x - t.x, p.y - t.y) <= thr) return true;
                  return false;
                };

                const eyeRub = anyNear(ALL_TIPS, [le_c, re_c], TH_EYE);
                const noseRub = anyNear([INDEX_TIP, MIDDLE_TIP], [nose_tip, ...NOSE_EXTRA.map(i => ({ x: lm[i].x * vw * sx, y: lm[i].y * vh * sy }))], TH_NOSE);
                const nailBite = anyNear([THUMB_TIP], [mouth_c, { x: up.x, y: up.y }, { x: lo.x, y: lo.y }, ...MOUTH_CORNERS.map(i => ({ x: lm[i].x * vw * sx, y: lm[i].y * vh * sy }))], TH_MOUTH);
                let hairTouch = false;
                outer: for (const fi of ALL_TIPS) for (const p of tipPts[fi]) { if (isInHairBand(p)) { hairTouch = true; break outer; } }

                const t = now, L = latchesRef.current;
                L["Eye Rubbing"].update(eyeRub, t);
                L["Nose Rubbing"].update(noseRub, t);
                L["Nail Biting"].update(nailBite, t);
                L["Hair Touching"].update(hairTouch, t);

                activeHabitLabelsRef.current = Object.entries(L).filter(([, lt]) => lt.active).map(([name]) => name);
              }

            } // end face found
          } // end runNow

          // treat no-face as miss
          if (!gotFace) {
            missCntRef.current++; okCntRef.current = 0;
            if (focusedRef.current && missCntRef.current >= UNFOCUS_MISS_FRAMES) {
              focusedRef.current = false;
              if (notFocusedSinceRef.current == null) notFocusedSinceRef.current = now;
            } else if (!focusedRef.current && notFocusedSinceRef.current == null) {
              notFocusedSinceRef.current = now;
            }
          }

          // publish status + pause
          let newStatus: FocusStatus = focusedRef.current ? "FOCUSED" : "NOT FOCUSED";
          if (!paused && !focusedRef.current && notFocusedSinceRef.current &&
              (now - notFocusedSinceRef.current) >= notFocusedLimitSec * 1000) {
            setPaused(true); newStatus = "PAUSED"; onPaused?.();
          }
          if (newStatus !== lastStatusRef.current) { lastStatusRef.current = newStatus; statusChangeTsRef.current = now; }
          if (newStatus !== status) { setStatus(newStatus); onStatusChange?.(newStatus); }

          // overlays
          drawWarningsTopLeft(ctx, activeHabitLabelsRef.current);
          drawStatusChip(ctx, newStatus, width);
          const TRANSITION_MS = 900;
          const t = Math.min(1, (now - statusChangeTsRef.current) / TRANSITION_MS);
          const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
          const alpha = 0.15 + 0.35 * easeOut(t);
          drawBigFocusBannerWithAlpha(ctx, newStatus, width, height, alpha);
          btnRectsRef.current = (newStatus === "PAUSED") ? drawPausePanelWithButtons(ctx, width, height) : null;

        } catch (e) {
          console.error("focus frame error", e);
        } finally {
          if (!endedRef.current) schedule(step);
        }
      };
      schedule(step);
    })();

    return () => {
      cancelled = true;
      try { faceLmRef.current?.close?.(); } catch {}
      try { handLmRef.current?.close?.(); } catch {}
      faceLmRef.current = null; handLmRef.current = null;

      const s = streamRef.current;
      if (s) { s.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      if (videoRef.current) {
        const vv = videoRef.current; try { vv.pause(); } catch {}
        vv.srcObject = null; vv.removeAttribute("src"); vv.load();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, mirror, notFocusedLimitSec, showDebug]);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="absolute opacity-0 pointer-events-none"
        width={width}
        height={height}
        playsInline
        muted
        autoPlay
        style={{ position: "absolute", left: "-99999px", top: "-99999px", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
      <canvas ref={canvasRef} width={width} height={height} className="rounded-2xl shadow" />
    </div>
  );
}