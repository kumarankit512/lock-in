export type FocusStatus = "FOCUSED" | "NOT FOCUSED" | "PAUSED";

export interface PauseButtonRects {
  continue: DOMRect;
  end: DOMRect;
}

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

export function drawBigFocusBannerWithAlpha(
  ctx: CanvasRenderingContext2D,
  status: FocusStatus,
  W: number,
  H: number,
  alpha: number
) {
  const color =
    status === "FOCUSED" ? "#10b981" : status === "PAUSED" ? "#3b82f6" : "#ef4444";

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, Math.round(H * 0.22));
  ctx.restore();

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

  ctx.save();
  ctx.globalAlpha = Math.min(0.7, alpha + 0.1);
  ctx.lineWidth = 8;
  ctx.strokeStyle = color;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  ctx.restore();
}

export function drawStatusChip(
  ctx: CanvasRenderingContext2D,
  status: FocusStatus,
  W: number
) {
  const txt = status;
  ctx.font = "16px system-ui";
  const m = ctx.measureText(txt);
  const w = m.width + 16;
  const h = 30;
  const x = W - w - 12;
  const y = 12;

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle =
    status === "FOCUSED" ? "rgb(16,185,129)" : status === "PAUSED" ? "rgb(59,130,246)" : "rgb(239,68,68)";
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  ctx.fillStyle = "#fff";
  ctx.fillText(txt, x + 8, y + 20);
}

export function drawWarningsTopLeft(ctx: CanvasRenderingContext2D, labels: string[]) {
  if (!labels.length) return;
  const padX = 10, padY = 8; let x = 12, y = 12;
  ctx.font = "16px system-ui";
  for (const lab of labels) {
    const text = `⚠ ${lab}`, m = ctx.measureText(text);
    const textH = 18, boxW = Math.max(260, m.width + padX * 2), boxH = textH + padY * 2;
    ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = "#001030"; ctx.fillRect(x, y, boxW, boxH); ctx.restore();
    ctx.strokeStyle = "rgba(200,210,255,0.9)"; ctx.lineWidth = 1; ctx.strokeRect(x, y, boxW, boxH);
    ctx.fillStyle = "#fff"; ctx.fillText(text, x + padX, y + padY + textH - 4);
    y += boxH + 8;
  }
}

export function drawPausePanelWithButtons(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number
): PauseButtonRects {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, H);

  const panelW = Math.floor(W * 0.75), panelH = Math.floor(H * 0.48);
  const x0 = Math.floor((W - panelW) / 2), y0 = Math.floor((H - panelH) / 2);

  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, panelW, panelH);
  ctx.fillStyle = "#fff"; ctx.font = "24px system-ui";
  ctx.fillText("Session paused — not focused.", x0 + 30, y0 + 60);
  ctx.font = "18px system-ui";
  ctx.fillText("Click green to continue or blue to end the session.", x0 + 30, y0 + 110);

  const btnW = Math.floor(panelW * 0.42), btnH = 62, gap = Math.floor(panelW * 0.05);
  const bx1 = x0 + Math.floor((panelW - (2 * btnW + gap)) / 2), by1 = y0 + panelH - btnH - 32;
  const bx2 = bx1 + btnW + gap, by2 = by1;

  ctx.fillStyle = "rgb(80,220,80)"; ctx.fillRect(bx1, by1, btnW, btnH);
  ctx.fillStyle = "rgb(20,40,20)"; ctx.font = "18px system-ui"; ctx.fillText("Continue (resume)", bx1 + 40, by1 + 40);

  ctx.fillStyle = "rgb(60,60,200)"; ctx.fillRect(bx2, by2, btnW, btnH);
  ctx.fillStyle = "rgb(240,240,255)"; ctx.fillText("End session", bx2 + 70, by2 + 40);

  return { continue: new DOMRect(bx1, by1, btnW, btnH), end: new DOMRect(bx2, by2, btnW, btnH) };
}

export function resizeCanvasForDPR(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  return ctx;
}
// --- DEBUG LANDMARK DRAWING ---

// Draw small circles for a set of normalized points (0..1) with the same mirroring
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

// Lines between pairs of indices (e.g., hand skeleton).
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
  // palm
  [0,1],[1,2],[2,3],[3,4],      // thumb
  [0,5],[5,6],[6,7],[7,8],      // index
  [5,9],[9,10],[10,11],[11,12], // middle
  [9,13],[13,14],[14,15],[15,16], // ring
  [13,17],[17,18],[18,19],[19,20], // pinky
  [0,17] // side
];

// Convenience wrappers that apply the same mirror transform used for the video
export function drawFaceDebug(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  mirror: boolean,
  face: ReadonlyArray<{x:number; y:number}>
) {
  ctx.save();
  if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }

  // points
  ctx.fillStyle = "rgba(255,0,0,0.85)";
  drawPoints(ctx, W, H, face as any, 1.8);

  // highlight some indices (eye centers, lips, nose tip)
  const highlightIdx = [468, 473, 13, 14, 1].filter(i => face[i]);
  const highlights = highlightIdx.map(i => face[i]!);
  ctx.fillStyle = "rgba(0,255,0,0.85)";
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
    // skeleton
    ctx.strokeStyle = "rgba(0,180,255,0.9)";
    ctx.lineWidth = 2;
    drawConnections(ctx, W, H, hand as any, HAND_EDGES);

    // joints
    ctx.fillStyle = "rgba(0,180,255,0.9)";
    drawPoints(ctx, W, H, hand as any, 2.2);

    // fingertips a bit larger: 4, 8, 12, 16, 20
    const tips = [4,8,12,16,20].map(i => hand[i]).filter(Boolean) as any[];
    ctx.fillStyle = "rgba(255,100,0,0.95)";
    drawPoints(ctx, W, H, tips, 3.3);
  }

  ctx.restore();
}

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
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, H);
  }

  drawBigFocusBannerWithAlpha(ctx, status, W, H, statusAlpha);
//   drawStatusChip(ctx, status, W);
  if (activeHabitLabels.length) drawWarningsTopLeft(ctx, activeHabitLabels);
  

  let pauseButtons: PauseButtonRects | null = null;
  if (paused) pauseButtons = drawPausePanelWithButtons(ctx, W, H);
  return { pauseButtons };
}