export type FocusStatus = "FOCUSED" | "NOT FOCUSED" | "PAUSED";

export interface PauseButtonRects {
  continue: DOMRect;
  end: DOMRect;
}

/* ---------- LOCK IN UI THEME ---------- */
const PIXEL_FONT = '"Press Start 2P", system-ui, sans-serif';

// Palette (taken from your UI)
const COL = {
  bgDark: "#0B1A1C",
  white: "#FFFFFF",
  white90: "rgba(255,255,255,.90)",
  white85: "rgba(255,255,255,.85)",
  white80: "rgba(255,255,255,.80)",
  borderWhite35: "rgba(255,255,255,.35)",

  // Status colors
  focused: "#2B6B6B",     // moss/teal
  paused:  "#3D7ECF",     // primary button blue
  danger:  "#E46060",     // softer red than pure #ef4444

  // Accents
  chipBg:  "rgba(0,0,0,.45)",     // for small chips over video
  dim:     "rgba(0,0,0,.45)",     // modal dimmer
};

/* ------------------------------------- */

export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  width: number,
  height: number,
  mirror = true
) {
  if (mirror) {
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, 0, 0, width, height);
    ctx.restore();
  } else {
    ctx.drawImage(videoEl, 0, 0, width, height);
  }
}

/** Big banner at the top + outer border, with pixel font */
export function drawBigFocusBannerWithAlpha(
  ctx: CanvasRenderingContext2D,
  status: FocusStatus,
  W: number,
  H: number,
  alpha: number
) {
  const color =
    status === "FOCUSED" ? COL.focused : status === "PAUSED" ? COL.paused : COL.danger;

  // Banner strip
  ctx.save();
  ctx.globalAlpha = Math.min(0.95, alpha);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, Math.round(H * 0.20));
  ctx.restore();

  // Label (pixel font)
  ctx.save();
  ctx.font = `700 28px ${PIXEL_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // subtle glow for contrast on busy video
  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = COL.white;
  ctx.fillText(status.replace("_", " "), W / 2, Math.round(H * 0.10));
  ctx.restore();

  // Outer frame
  ctx.save();
  ctx.globalAlpha = Math.min(0.75, alpha + 0.05);
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.strokeRect(3, 3, W - 6, H - 6);
  ctx.restore();
}

/** Small status chip (top-right), pixel font, translucent bg */
export function drawStatusChip(
  ctx: CanvasRenderingContext2D,
  status: FocusStatus,
  W: number
) {
  const txt = status.replace("_", " ");
  ctx.font = `12px ${PIXEL_FONT}`;
  const m = ctx.measureText(txt);
  const w = m.width + 18;
  const h = 28;
  const x = W - w - 12;
  const y = 12;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle =
    status === "FOCUSED"
      ? "rgba(43,107,107,.90)"
      : status === "PAUSED"
      ? "rgba(61,126,207,.90)"
      : "rgba(228,96,96,.90)";
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = COL.white;
  ctx.textBaseline = "middle";
  ctx.fillText(txt, x + 9, y + h / 2 + 1);
  ctx.restore();
}

/** Warnings stack (top-left). Pixel font, translucent dark plate, white text. */
export function drawWarningsTopLeft(ctx: CanvasRenderingContext2D, labels: string[]) {
  if (!labels.length) return;
  const padX = 10, padY = 8; let x = 12, y = 40;
  ctx.font = `12px ${PIXEL_FONT}`;
  for (const lab of labels) {
    const text = `⚠ ${lab}`;
    const m = ctx.measureText(text);
    const boxW = Math.max(260, m.width + padX * 2);
    const boxH = 28;

    // plate
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.restore();

    // text
    ctx.save();
    ctx.fillStyle = COL.white;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + padX, y + boxH / 2 + 1);
    ctx.restore();

    y += boxH + 8;
  }
}

/** Pause modal with two buttons, pixel font + theme colors */
export function drawPausePanelWithButtons(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number
): PauseButtonRects {
  // Dimmer
  ctx.fillStyle = COL.dim;
  ctx.fillRect(0, 0, W, H);

  const panelW = Math.floor(W * 0.75), panelH = Math.floor(H * 0.48);
  const x0 = Math.floor((W - panelW) / 2), y0 = Math.floor((H - panelH) / 2);

  // Panel
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.fillRect(x0, y0, panelW, panelH);
  ctx.strokeStyle = COL.borderWhite35;
  ctx.lineWidth = 2;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, panelW - 1, panelH - 1);
  ctx.restore();

  // Copy
  ctx.fillStyle = "#0E1B1C";
  ctx.font = `16px ${PIXEL_FONT}`;
  ctx.fillText("Session paused — not focused.", x0 + 30, y0 + 60);
  ctx.font = `12px ${PIXEL_FONT}`;
  ctx.fillText("Press CONTINUE to resume or END to finish the session.", x0 + 30, y0 + 102);

  // Buttons
  const btnW = Math.floor(panelW * 0.42), btnH = 56, gap = Math.floor(panelW * 0.05);
  const bx1 = x0 + Math.floor((panelW - (2 * btnW + gap)) / 2), by1 = y0 + panelH - btnH - 32;
  const bx2 = bx1 + btnW + gap, by2 = by1;

  // Continue (focused green)
  ctx.fillStyle = COL.focused;
  ctx.fillRect(bx1, by1, btnW, btnH);
  ctx.fillStyle = COL.white90;
  ctx.font = `12px ${PIXEL_FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText("CONTINUE", bx1 + 24, by1 + btnH / 2 + 1);

  // End (primary blue)
  ctx.fillStyle = COL.paused;
  ctx.fillRect(bx2, by2, btnW, btnH);
  ctx.fillStyle = COL.white90;
  ctx.fillText("END", bx2 + 24, by2 + btnH / 2 + 1);

  return { continue: new DOMRect(bx1, by1, btnW, btnH), end: new DOMRect(bx2, by2, btnW, btnH) };
}

/** DPR-safe canvas setup (keep pixel font crisp; video can stay smoothed) */
export function resizeCanvasForDPR(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // keep smoothing on for video; pixel font renders fine at device scale
  ctx.imageSmoothingEnabled = true;
  return ctx;
}

/* ------- Debug helpers (colors tuned to theme) ------- */

export function drawPoints(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  pts: Array<{x:number; y:number}>,
  radius = 2
) {
  ctx.beginPath();
  for (const p of pts) {
    const x = p.x * W;
    const y = p.y * H;
    ctx.moveTo(x + radius, y);
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  }
  ctx.fill();
}

export function drawConnections(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  pts: Array<{x:number; y:number}>,
  edges: Array<[number, number]>
) {
  ctx.beginPath();
  for (const [a, b] of edges) {
    const pa = pts[a], pb = pts[b];
    if (!pa || !pb) continue;
    ctx.moveTo(pa.x * W, pa.y * H);
    ctx.lineTo(pb.x * W, pb.y * H);
  }
  ctx.stroke();
}

// Minimal hand skeleton (MediaPipe Hands)
export const HAND_EDGES: Array<[number, number]> = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

export function drawFaceDebug(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  mirror: boolean,
  face: ReadonlyArray<{x:number; y:number}>
) {
  ctx.save();
  if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }

  ctx.fillStyle = "rgba(255,120,120,.95)";
  drawPoints(ctx, W, H, face as any, 1.8);

  const highlightIdx = [468, 473, 13, 14, 1].filter(i => face[i]);
  const highlights = highlightIdx.map(i => face[i]!);
  ctx.fillStyle = "rgba(91,163,225,.95)";
  drawPoints(ctx, W, H, highlights, 3);

  ctx.restore();
}

export function drawHandsDebug(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  mirror: boolean,
  hands: Array<ReadonlyArray<{x:number; y:number}>>
) {
  ctx.save();
  if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }

  for (const hand of hands) {
    ctx.strokeStyle = "rgba(91,163,225,.9)";
    ctx.lineWidth = 2;
    drawConnections(ctx, W, H, hand as any, HAND_EDGES);

    ctx.fillStyle = "rgba(91,163,225,.9)";
    drawPoints(ctx, W, H, hand as any, 2.2);

    const tips = [4,8,12,16,20].map(i => hand[i]).filter(Boolean) as any[];
    ctx.fillStyle = "rgba(228,96,96,.95)";
    drawPoints(ctx, W, H, tips, 3.3);
  }

  ctx.restore();
}

/** Main paint */
export function paintFrame(
  ctx: CanvasRenderingContext2D,
  opts: {
    video: HTMLVideoElement;
    width: number;
    height: number;
    mirror?: boolean;
    status: FocusStatus;
    statusAlpha: number;
    paused: boolean;
    activeHabitLabels?: string[];
  }
): { pauseButtons: PauseButtonRects | null } {
  const { video, width: W, height: H, mirror = true, status, statusAlpha, paused, activeHabitLabels = [] } = opts;

  ctx.clearRect(0, 0, W, H);

  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    drawVideoFrame(ctx, video, W, H, mirror);
  } else {
    ctx.fillStyle = COL.bgDark;
    ctx.fillRect(0, 0, W, H);
  }

  drawBigFocusBannerWithAlpha(ctx, status, W, H, statusAlpha);
  // drawStatusChip(ctx, status, W);
  if (activeHabitLabels.length) drawWarningsTopLeft(ctx, activeHabitLabels);

  let pauseButtons: PauseButtonRects | null = null;
  if (paused) pauseButtons = drawPausePanelWithButtons(ctx, W, H);
  return { pauseButtons };
}