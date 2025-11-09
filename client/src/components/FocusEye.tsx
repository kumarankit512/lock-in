import { useEffect, useMemo, useRef, useState } from "react";
import { useMediaStream } from "../hooks/useMediaStream";
import { useVisionModels } from "../hooks/useVisionModels";
import { useVideoFrameLoop } from "../hooks/useVideoFrameLoop";
import { createFocusEngine } from "../logic/focus";
import { HabitsEngine } from "../logic/habits";
import { paintFrame, resizeCanvasForDPR } from "../ui/painter";
import { drawFaceDebug, drawHandsDebug } from "../ui/painter.js";

type FocusStatus = "FOCUSED" | "NOT FOCUSED" | "PAUSED";

export default function FocusEye(props: {
  width?: number; height?: number; mirror?: boolean;
  notFocusedLimitSec?: number; suspended?: boolean;
  onStatusChange?: (s: FocusStatus) => void;
  onEndSession?: () => void;
  onHabitEvent?: (e: { habit: string; phase: "start" | "end" }) => void;
  onAutoBreak?: () => void; // tell parent to start a break
  showDebug: boolean;
}) {
  const {
    width = 960, height = 540, mirror = true,
    notFocusedLimitSec = 30, suspended = false,
    onStatusChange, onEndSession, onHabitEvent, onAutoBreak, showDebug = true,
  } = props;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // DPR-aware canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    ctxRef.current = resizeCanvasForDPR(canvasRef.current, width, height);
  }, [width, height]);

  // attach single shared stream
  useMediaStream(videoRef);

  // models
  const { face, hand } = useVisionModels();

  // engines
  const focus = useMemo(() => createFocusEngine({ notFocusedLimitSec }), [notFocusedLimitSec]);
  const habits = useMemo(() => new HabitsEngine(), []);

  const [status, setStatus] = useState<FocusStatus>("NOT FOCUSED");
  const statusChangedAtRef = useRef(performance.now());

  // Safari/iOS nudge
  useEffect(() => {
    if (!suspended) videoRef.current?.play().catch(() => {});
  }, [suspended]);

  const hasVideoFrame = (v: HTMLVideoElement) =>
    v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0;

  useVideoFrameLoop(videoRef, (now) => {
    const v = videoRef.current;
    const ctx = ctxRef.current;
    if (!v || !ctx) return;

    if (!hasVideoFrame(v)) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    // 1) Inference (skip state updates while suspended)
    let newStatus: FocusStatus = status;
    let faceLmForDebug: Array<{x:number;y:number}> | undefined;
     let handsForDebug: Array<Array<{x:number;y:number}>> | undefined;

    if (!suspended && face) {
      const faceRes = face.detectForVideo(v, now);
      const hasFace = !!faceRes?.faceLandmarks?.length;

      if (hasFace) {
        const faceLm = faceRes!.faceLandmarks![0];
        newStatus = focus.update(faceLm, now);

        if (hand) {
          const handRes = hand.detectForVideo(v, now);
          const hands = (handRes?.landmarks ?? []) as Array<Array<{ x: number; y: number }>>;
          const { started, ended } = habits.update({ face: faceLm, hands }, now);
          if (onHabitEvent && (started.length || ended.length)) {
            for (const h of started) onHabitEvent({ habit: h, phase: "start" });
            for (const h of ended) onHabitEvent({ habit: h, phase: "end" });
          }
          handsForDebug = hands as any;
        }
        faceLmForDebug = faceLm as any;
      } else {
        newStatus = focus.notifyNoFace(now);
      }
    }

    // 2) Auto-break (convert unfocus → parent break)
    if (!suspended && newStatus === "NOT FOCUSED") {
      const since = focus.notFocusedSince();
      if (since != null && now - since >= notFocusedLimitSec * 1000) {
        onAutoBreak?.();        // parent will set suspended=true and show overlay
        focus.resetAfterResume?.(now); // avoid immediate re-trigger after resume
        return;                 // parent overlay handles display this frame
      }
    }

    // 3) Emit status changes
    if (!suspended && newStatus !== status) {
      setStatus(newStatus);
      statusChangedAtRef.current = now;
      onStatusChange?.(newStatus);
    }

    // 4) Paint frame (show PAUSED banner only when parent says suspended)
    const t = Math.min(1, (now - statusChangedAtRef.current) / 900);
    const easeOut = 1 - Math.pow(1 - t, 3);
    const statusAlpha = 0.15 + 0.35 * easeOut;

    paintFrame(ctx, {
      video: v,
      width,
      height,
      mirror,
      status: suspended ? "PAUSED" : newStatus,
      statusAlpha,
      paused: false, // pause panel handled by parent now
      activeHabitLabels: habits.activeLabels, // getter on engine
    });

    if (showDebug) {
      if (faceLmForDebug) drawFaceDebug(ctx, width, height, mirror, faceLmForDebug);
      if (handsForDebug?.length) drawHandsDebug(ctx, width, height, mirror, handsForDebug);
    };
  });

  return (
    <div className="relative">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute opacity-0 pointer-events-none"
        style={{ width: 1, height: 1, left: -99999, top: -99999, position: "absolute" }}
      />
      {/* IMPORTANT: style width/height; bitmap size is set by resizeCanvasForDPR */}
      <canvas ref={canvasRef} className="rounded-2xl shadow" style={{ width, height }} />
    </div>
  );
}