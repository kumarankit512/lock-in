// habits.ts
// A small engine that detects four habits from face + hand landmarks with latching.

export type HabitKind = "hair_touch" | "nose_touch" | "eye_rub" | "nail_bite";

export interface HabitsResult {
  active: Record<HabitKind, boolean>;
  /** Human-readable labels for the active habits (for warnings UI). */
  activeLabels: string[];
  /** Start events for newly active habits (diff from previous frame). */
  started: HabitKind[];
  /** End events for habits that just ended (diff from previous frame). */
  ended: HabitKind[];
}

/** MediaPipe-like 2D point */
export type Pt = { x: number; y: number };

/** One hand: 21 landmarks with normalized x,y in [0..1] (z ignored). */
export type HandLandmarks = ReadonlyArray<Pt>;

/** Engine inputs (normalized coordinates, as MediaPipe returns). */
export interface HabitsInputs {
  /** face landmarks array (MediaPipe Face Landmarker). */
  face: ReadonlyArray<Pt>;
  /** zero, one, or two hands */
  hands: ReadonlyArray<HandLandmarks>;
}

/** Tunables */
const ON_HOLD_MS = 0.30 * 1000;
const OFF_HOLD_MS = 0.25 * 1000;

// Proximity thresholds as a fraction of "face scale"
const TH_EYE_MUL = 0.18;
const TH_NOSE_MUL = 0.22;
const TH_MOUTH_MUL = 0.24;
const TH_HAIR_MUL = 0.18;
const HAIR_MAX_ABOVE_FOREHEAD_MUL = 1.6;

const HAIR_ABOVE_FOREHEAD = 0.06;
const HAIR_ABOVE_EYE = 0.02;
const HAIR_X_MARGIN_MUL = 0.09;     
const HAIR_NEAR_SCALP_MUL = 0.16; 

/** Face indices (MediaPipe) */
const L_EYE_OUTER = 33, R_EYE_OUTER = 263;
const LEFT_EYE_CENTER = 468, RIGHT_EYE_CENTER = 473;
const UPPER_LIP = 13, LOWER_LIP = 14;
const NOSE_TIP = 1, NOSE_EXTRA = [6, 197, 195, 5];
const FOREHEAD_CENTER = 10;
const LEFT_TEMPLE = 127, RIGHT_TEMPLE = 356;
const MOUTH_CORNERS = [61, 291];

/** Hands indices */
const THUMB_TIP = 4, INDEX_TIP = 8, MIDDLE_TIP = 12, RING_TIP = 16, PINKY_TIP = 20;
const ALL_TIPS = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];

class Latch {
  private on = false;
  private since: number | null = null;
  constructor(private onMs: number, private offMs: number) {}
  get active() { return this.on; }

  /** Returns true if the visible state flipped (on->off or off->on) */
  update(cond: boolean, now: number): boolean {
    if (this.on) {
      // currently active — require sustained off to turn off
      if (cond) {
        this.since = null;
      } else {
        if (this.since == null) this.since = now;
        else if (now - this.since >= this.offMs) {
          this.on = false; this.since = null; return true;
        }
      }
    } else {
      // currently inactive — require sustained on to turn on
      if (cond) {
        if (this.since == null) this.since = now;
        else if (now - this.since >= this.onMs) {
          this.on = true; this.since = null; return true;
        }
      } else {
        this.since = null;
      }
    }
    return false;
  }
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function faceScale(face: ReadonlyArray<Pt>) {
  const le = face[L_EYE_OUTER];
  const re = face[R_EYE_OUTER];
  if (!le || !re) return 1;
  return Math.max(1e-6, dist(le, re));
}

function anyNear(
  hands: ReadonlyArray<HandLandmarks>,
  fingers: number[],
  targets: Pt[],
  thr: number
) {
  for (const hand of hands) {
    for (const fi of fingers) {
      const p = hand[fi];
      if (!p) continue;
      for (const t of targets) {
        if (dist(p, t) <= thr) return true;
      }
    }
  }
  return false;
}

/** Decide if a point lies in the "hair band" above forehead/temples */
function isInHairBand(
  p: Pt,
  forehead: Pt,
  leftTemple: Pt,
  rightTemple: Pt,
  eyeLineY: number,
  scale: number
) {
  const xMin = Math.min(leftTemple.x, rightTemple.x) - HAIR_X_MARGIN_MUL * scale;
  const xMax = Math.max(leftTemple.x, rightTemple.x) + HAIR_X_MARGIN_MUL * scale;
  const withinHeadBandX = p.x >= xMin && p.x <= xMax;
  // Must be above eyes (like before)
  const aboveEye = p.y < (eyeLineY - HAIR_ABOVE_EYE * scale);
  // Must also be either (a) clearly above forehead OR (b) near scalp (forehead/temple) in distance terms
  const tooHighAboveForehead = p.y < (forehead.y - HAIR_MAX_ABOVE_FOREHEAD_MUL * scale);
  if (tooHighAboveForehead) return false;
  const aboveForehead = p.y < (forehead.y - HAIR_ABOVE_FOREHEAD * scale);
  const nearScalp =
    Math.min(
      dist(p, forehead),
      dist(p, leftTemple),
      dist(p, rightTemple)
    ) < (HAIR_NEAR_SCALP_MUL * scale);

  return withinHeadBandX && aboveEye && (aboveForehead || nearScalp);
}

export interface HabitsEngineOptions {
  /** If true, returns both labels and boolean map; default true. */
  returnLabels?: boolean;
}

/** Maps UI label <-> HabitKind (so you can show the same strings in the HUD) */
export const HABIT_LABELS: Record<HabitKind, string> = {
  hair_touch: "Hair Touching",
  nose_touch: "Nose Rubbing",
  eye_rub: "Eye Rubbing",
  nail_bite: "Nail Biting",
};

export class HabitsEngine {
  private _activeLabels: string[] = [];  // e.g., "Hair Touching", "Nose Rubbing", ...


  // ✅ expose as a getter (read-only)
  get activeLabels(): string[] {
    return this._activeLabels;
  }
  private latches = {
    hair_touch: new Latch(ON_HOLD_MS, OFF_HOLD_MS),
    nose_touch: new Latch(ON_HOLD_MS, OFF_HOLD_MS),
    eye_rub:   new Latch(ON_HOLD_MS, OFF_HOLD_MS),
    nail_bite: new Latch(ON_HOLD_MS, OFF_HOLD_MS),
  };

  private prevActive: Record<HabitKind, boolean> = {
    hair_touch: false, nose_touch: false, eye_rub: false, nail_bite: false,
  };

  constructor(private opts: HabitsEngineOptions = {}) {}

  update(inputs: HabitsInputs, now: number): HabitsResult {
    const face = inputs.face;
    const hands = inputs.hands ?? [];

    // If we don’t have essential face anchors, just decay (OFF) state via latches.
    const leOuter = face[L_EYE_OUTER];
    const reOuter = face[R_EYE_OUTER];
    const leCenter = face[LEFT_EYE_CENTER];
    const reCenter = face[RIGHT_EYE_CENTER];
    const upLip = face[UPPER_LIP];
    const loLip = face[LOWER_LIP];
    const noseTip = face[NOSE_TIP];
    const forehead = face[FOREHEAD_CENTER];
    const leftTemple = face[LEFT_TEMPLE];
    const rightTemple = face[RIGHT_TEMPLE];

    let eyeRub = false, noseRub = false, nailBite = false, hairTouch = false;

    if (leOuter && reOuter && leCenter && reCenter && upLip && loLip && noseTip && forehead && leftTemple && rightTemple) {
      const scale = faceScale(face);

      // Targets
      const mouthCenter = midpoint(upLip, loLip);
      const mouthTargets: Pt[] = [
        mouthCenter,
        upLip, loLip,
        face[MOUTH_CORNERS[0]], face[MOUTH_CORNERS[1]],
      ].filter(Boolean) as Pt[];

      const noseTargets: Pt[] = [
        noseTip,
        ...(NOSE_EXTRA.map(i => face[i]).filter(Boolean) as Pt[]),
      ];

      const eyeTargets = [leCenter, reCenter];
      const TH_EYE = TH_EYE_MUL * scale;
      const TH_NOSE = TH_NOSE_MUL * scale;
      const TH_MOUTH = TH_MOUTH_MUL * scale;

      // Proximity checks
      eyeRub = anyNear(hands, ALL_TIPS, eyeTargets, TH_EYE);
      noseRub = anyNear(hands, ALL_TIPS, noseTargets, TH_NOSE);
      nailBite = anyNear(hands, ALL_TIPS, mouthTargets, TH_MOUTH);

      // Hair band check for any fingertip
      const eyeLineY = Math.min(leCenter.y, reCenter.y);
      outer: for (const hand of hands) {
        for (const fi of ALL_TIPS) {
          const p = hand[fi];
          if (!p) continue;
          if (isInHairBand(p, forehead, leftTemple, rightTemple, eyeLineY, scale)) {
            hairTouch = true;
            break outer;
          }
        }
      }
    }

    // Update latches
    const changed: { k: HabitKind; nowOn: boolean }[] = [];
    if (this.latches.eye_rub.update(eyeRub, now))   changed.push({ k: "eye_rub",   nowOn: this.latches.eye_rub.active });
    if (this.latches.nose_touch.update(noseRub, now)) changed.push({ k: "nose_touch", nowOn: this.latches.nose_touch.active });
    if (this.latches.nail_bite.update(nailBite, now)) changed.push({ k: "nail_bite", nowOn: this.latches.nail_bite.active });
    if (this.latches.hair_touch.update(hairTouch, now)) changed.push({ k: "hair_touch", nowOn: this.latches.hair_touch.active });

    const active: Record<HabitKind, boolean> = {
      hair_touch: this.latches.hair_touch.active,
      nose_touch: this.latches.nose_touch.active,
      eye_rub:   this.latches.eye_rub.active,
      nail_bite: this.latches.nail_bite.active,
    };

    // Diff → started/ended
    const started: HabitKind[] = [];
    const ended: HabitKind[] = [];
    (Object.keys(active) as HabitKind[]).forEach(k => {
      const was = this.prevActive[k];
      const is = active[k];
      if (!was && is) started.push(k);
      if (was && !is) ended.push(k);
    });
    this.prevActive = active;

    const activeLabels = (Object.keys(active) as HabitKind[])
      .filter(k => active[k])
      .map(k => HABIT_LABELS[k]);

    this._activeLabels = activeLabels;

    return { active, activeLabels, started, ended };
  }
}