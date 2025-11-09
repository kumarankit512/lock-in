import * as React from "react";
import { useEffect, useRef } from "react";

type StepFn = (now: number) => void;

export function useVideoFrameLoop(
  video: React.RefObject<HTMLVideoElement>,
  step: StepFn
) {
  const stopRef = useRef(false);
  const stepRef = useRef<StepFn>(step);
  stepRef.current = step; // always use latest step without restarting effect

  useEffect(() => {
    stopRef.current = false;
    const v = video.current;
    console.log("[loop] readyState=%d vw=%d vh=%d", v.readyState, v.videoWidth, v.videoHeight);
    if (!v) return;

    // Prefer requestVideoFrameCallback when available (smoother, tied to video decode)
    const schedule = (fn: FrameRequestCallback) => {
      const anyVid = v as any;
      if (typeof anyVid.requestVideoFrameCallback === "function") {
        anyVid.requestVideoFrameCallback(fn);
      } else {
        requestAnimationFrame(fn as any);
      }
    };

    const tick: FrameRequestCallback = (now /*, meta*/) => {
      if (stopRef.current) return;

      // --- guard: only run step when the video actually has frames ---
      // HAVE_CURRENT_DATA (2) is enough and also check for nonzero dimensions
      if (v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
        // call the latest step
        stepRef.current(now);
      }

      // keep the loop going
      schedule(tick);
    };

    schedule(tick);

    return () => {
      stopRef.current = true;
    };
    // only depend on the video ref object; step changes are handled via stepRef
  }, [video]);
}