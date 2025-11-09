import * as React from "react";
import { useRef, useEffect } from "react";

let sharedStreamPromise: Promise<MediaStream> | null = null;

async function acquire(): Promise<MediaStream> {
  if (sharedStreamPromise) {
    const s = await sharedStreamPromise;
    const live = s.getVideoTracks().some(t => t.readyState === "live");
    if (live) return s;
    try { s.getTracks().forEach(t => t.stop()); } catch {}
    sharedStreamPromise = null;
  }

  sharedStreamPromise = navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width:  { ideal: 1280, max: 1280 },
      height: { ideal: 720,  max: 720  },
      frameRate: { ideal: 30, max: 30 },
    },
    audio: false,
  });

  return sharedStreamPromise;
}

export function useMediaStream(videoEl: React.RefObject<HTMLVideoElement>) {
  const mounted = useRef(false);
  const currentTrackCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    mounted.current = true;
    const v = videoEl.current;
    if (!v) return;

    // iOS/Safari quirks
    v.setAttribute("playsinline", "true");
    v.muted = true;
    (v as any).autoplay = true;

    let cancelled = false;

    const waitForMetadata = async () => {
      if (v.readyState >= 2 && v.videoWidth && v.videoHeight) return;
      await new Promise<void>(resolve => {
        const onMeta = () => { v.removeEventListener("loadedmetadata", onMeta); resolve(); };
        v.addEventListener("loadedmetadata", onMeta, { once: true });
        // safety timeout
        setTimeout(() => { v.removeEventListener("loadedmetadata", onMeta); resolve(); }, 1500);
      });
    };

    const bind = async () => {
      // remove previous track listeners
      if (currentTrackCleanup.current) { currentTrackCleanup.current(); currentTrackCleanup.current = null; }

      const stream = await acquire();
      if (!mounted.current || cancelled) return;

      if (v.srcObject !== stream) v.srcObject = stream;

      await waitForMetadata();
      try { await v.play(); } catch {}
      console.log("[media] attached", videoEl.current?.srcObject);

      // Reacquire on track interruptions
      const [track] = stream.getVideoTracks();
      const onEnded = () => { if (!cancelled) void bind(); };
      const onMute  = () => { if (!cancelled && track.muted) void bind(); };

      track.addEventListener("ended", onEnded);
      track.addEventListener("mute", onMute);

      currentTrackCleanup.current = () => {
        track.removeEventListener("ended", onEnded);
        track.removeEventListener("mute", onMute);
      };
    };

    void bind();

    // When tab becomes visible again, make sure the stream is alive
    const onVisibility = () => { if (!document.hidden) void bind(); };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      mounted.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      if (currentTrackCleanup.current) currentTrackCleanup.current();
      // DO NOT stop tracks here — stream is shared across components
      if (v) { try { v.pause(); } catch {} v.srcObject = null; }
    };
  }, [videoEl]);
  
}