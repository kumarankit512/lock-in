# bad_habits_persistent.py
import cv2
import mediapipe as mp
import math
import time

# -------------------------
# Config
# -------------------------
FLIP = True
SHOW_DEBUG_DOTS = True

# Debounce/hysteresis: on/off hold times (seconds)
ON_HOLD_SEC  = 0.30   # how long a contact must persist to turn warning ON
OFF_HOLD_SEC = 0.25   # how long it must be absent to turn warning OFF

# Scale-aware thresholds (× face_scale = distance between outer eye corners)
TH_EYE_MUL   = 0.18   # eye rubbing
TH_NOSE_MUL  = 0.22   # nose rubbing (wider to improve recall)
TH_MOUTH_MUL = 0.24   # nail biting
TH_HAIR_MUL  = 0.22   # hair touching

# Hair band vertical buffers (× face_scale above reference lines)
HAIR_ABOVE_FOREHEAD = 0.06
HAIR_ABOVE_EYE      = 0.02

# Optional: require slight mouth opening for nail biting
REQUIRE_MOUTH_OPEN = False
LIP_GAP_MIN_MUL = 0.05

WINDOW_NAME = "Bad Habit Detection — Persistent Warnings"

# -------------------------
# Helpers
# -------------------------
def L2(a, b): return math.hypot(a[0]-b[0], a[1]-b[1])
def to_px(lm, w, h, idx): p = lm[idx]; return (p.x*w, p.y*h)

# FaceMesh indices
LEFT_EYE_CENTER, RIGHT_EYE_CENTER = 468, 473
LEFT_EYE_OUTER,  RIGHT_EYE_OUTER  = 33, 263
UPPER_LIP, LOWER_LIP             = 13, 14
NOSE_TIP                         = 1
NOSE_EXTRA = [6, 197, 195, 5]   # bridge/dorsum points
FOREHEAD_CENTER                  = 10
LEFT_TEMPLE, RIGHT_TEMPLE        = 127, 356
MOUTH_CORNERS = [61, 291]

# Hand tips
THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP = 4, 8, 12, 16, 20
ALL_TIPS = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]

# -------------------------
# Latched warning with hysteresis
# -------------------------
class Latch:
    """Turns ON after condition holds for ON_HOLD_SEC; turns OFF after condition is false for OFF_HOLD_SEC."""
    def __init__(self, on_hold=0.2, off_hold=0.15):
        self.on_hold = on_hold
        self.off_hold = off_hold
        self._state = False
        self._since = None  # timestamp of current (on/off) hold start

    @property
    def active(self) -> bool:
        return self._state

    def update(self, cond: bool, now: float) -> bool:
        """
        Feed the instantaneous condition each frame.
        Returns True if state changed (edge), False otherwise.
        self.active is the current latched state (for drawing).
        """
        changed = False
        if self._state:  # currently ON → wait for 'cond == False' to persist OFF_HOLD_SEC
            if cond:
                self._since = None  # reset off timer
            else:
                if self._since is None:
                    self._since = now
                elif (now - self._since) >= self.off_hold:
                    self._state = False
                    self._since = None
                    changed = True
        else:           # currently OFF → wait for 'cond == True' to persist ON_HOLD_SEC
            if cond:
                if self._since is None:
                    self._since = now
                elif (now - self._since) >= self.on_hold:
                    self._state = True
                    self._since = None
                    changed = True
            else:
                self._since = None
        return changed

def main():
    mp_face = mp.solutions.face_mesh
    mp_hands = mp.solutions.hands

    face_mesh = mp_face.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True,
                                 min_detection_confidence=0.5, min_tracking_confidence=0.5)
    hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.5, min_tracking_confidence=0.5)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Camera not detected.")
        return

    # Latches for persistent warnings
    latches = {
        "Nail Biting": Latch(ON_HOLD_SEC, OFF_HOLD_SEC),
        "Nose Rubbing": Latch(ON_HOLD_SEC, OFF_HOLD_SEC),
        "Eye Rubbing": Latch(ON_HOLD_SEC, OFF_HOLD_SEC),
        "Hair Touching": Latch(ON_HOLD_SEC, OFF_HOLD_SEC),
    }

    prev_time = time.time()

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if FLIP:
            frame = cv2.flip(frame, 1)

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        face_res = face_mesh.process(rgb)
        hand_res = hands.process(rgb)

        face_scale = None
        # face keypoints
        le_c = re_c = mouth_c = nose_tip = forehead = l_tem = r_tem = None
        nose_targets = []; mouth_targets = []

        if face_res.multi_face_landmarks:
            lm = face_res.multi_face_landmarks[0].landmark
            try:
                le_c = to_px(lm, w, h, LEFT_EYE_CENTER)
                re_c = to_px(lm, w, h, RIGHT_EYE_CENTER)
                le_o = to_px(lm, w, h, LEFT_EYE_OUTER)
                re_o = to_px(lm, w, h, RIGHT_EYE_OUTER)
                up_lip = to_px(lm, w, h, UPPER_LIP)
                lo_lip = to_px(lm, w, h, LOWER_LIP)
                mouth_c = ((up_lip[0]+lo_lip[0])/2, (up_lip[1]+lo_lip[1])/2)
                nose_tip = to_px(lm, w, h, NOSE_TIP)
                nose_targets = [nose_tip] + [to_px(lm, w, h, i) for i in NOSE_EXTRA]
                mouth_targets = [up_lip, lo_lip] + [to_px(lm, w, h, i) for i in MOUTH_CORNERS]
                forehead = to_px(lm, w, h, FOREHEAD_CENTER)
                l_tem = to_px(lm, w, h, LEFT_TEMPLE)
                r_tem = to_px(lm, w, h, RIGHT_TEMPLE)
                face_scale = max(1.0, L2(le_o, re_o))
            except IndexError:
                pass

            if SHOW_DEBUG_DOTS and face_scale:
                for pt in [le_c, re_c, mouth_c, nose_tip, forehead, l_tem, r_tem]:
                    if pt:
                        cv2.circle(frame, (int(pt[0]), int(pt[1])), 3, (0, 255, 255), -1)

        # If no face or no hands → just show FPS
        if (not face_scale) or (not hand_res.multi_hand_landmarks):
            now = time.time()
            fps = 1.0 / max(1e-6, (now - prev_time)); prev_time = now
            cv2.putText(frame, f"FPS: {int(fps)}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)
            cv2.imshow(WINDOW_NAME, frame)
            if cv2.waitKey(1) & 0xFF == 27: break
            continue

        # Thresholds in pixels
        TH_EYE   = TH_EYE_MUL   * face_scale
        TH_NOSE  = TH_NOSE_MUL  * face_scale
        TH_MOUTH = TH_MOUTH_MUL * face_scale
        TH_HAIR  = TH_HAIR_MUL  * face_scale
        LIP_GAP_MIN = LIP_GAP_MIN_MUL * face_scale

        # Hair band function (temples or above forehead & eyes)
        hair_line_y = forehead[1]
        eye_line_y  = min(le_c[1], re_c[1]) if le_c and re_c else hair_line_y
        def is_in_hair_band(pt):
            if pt is None: return False
            above_forehead = pt[1] < (hair_line_y - HAIR_ABOVE_FOREHEAD*face_scale)
            near_temples = (L2(pt, l_tem) < TH_HAIR) or (L2(pt, r_tem) < TH_HAIR)
            above_eye = pt[1] < (eye_line_y - HAIR_ABOVE_EYE*face_scale)
            return (above_forehead or near_temples) and above_eye

        # Gather finger tips
        tips = {idx: [] for idx in ALL_TIPS}
        for hand_lm in hand_res.multi_hand_landmarks:
            for idx in ALL_TIPS:
                p = hand_lm.landmark[idx]
                tips[idx].append((p.x*w, p.y*h))

        # Utilities
        def min_dist_to_targets(pt, targets):
            if not targets or pt is None: return float("inf")
            return min(L2(pt, t) for t in targets)

        def any_finger_near(finger_idxs, targets, thr):
            for fi in finger_idxs:
                for pt in tips.get(fi, []):
                    if min_dist_to_targets(pt, targets) <= thr:
                        return True
            return False

        # ---- Instantaneous conditions (per frame) ----
        # Eye rubbing: any fingertip near either iris center
        eye_rub_cond = (
            any_finger_near(ALL_TIPS, [le_c], TH_EYE) or
            any_finger_near(ALL_TIPS, [re_c], TH_EYE)
        )

        # Nose rubbing: index or middle near nose zone
        nose_rub_cond = any_finger_near([INDEX_TIP, MIDDLE_TIP], nose_targets, TH_NOSE)

        # Nail biting: thumb near mouth zone; mouth-open optional
        if REQUIRE_MOUTH_OPEN:
            lip_gap = abs((to_px(face_res.multi_face_landmarks[0].landmark, w, h, LOWER_LIP)[1] -
                           to_px(face_res.multi_face_landmarks[0].landmark, w, h, UPPER_LIP)[1]))
            mouth_ok = (lip_gap >= LIP_GAP_MIN)
        else:
            mouth_ok = True
        thumb_near_mouth = any_finger_near([THUMB_TIP], mouth_targets + [mouth_c], TH_MOUTH)
        nail_bite_cond = thumb_near_mouth and mouth_ok

        # Hair touching: any fingertip in hair band region
        hair_touch_cond = any(is_in_hair_band(pt) for idx in ALL_TIPS for pt in tips[idx])

        # ---- Update latches (persistent warnings) ----
        now = time.time()
        latches["Eye Rubbing"].update(eye_rub_cond, now)
        latches["Nose Rubbing"].update(nose_rub_cond, now)
        latches["Nail Biting"].update(nail_bite_cond, now)
        latches["Hair Touching"].update(hair_touch_cond, now)

        # ---- Draw persistent warnings ----
        # Collect active labels (could be multiple)
        active_labels = [name for name, lt in latches.items() if lt.active]

        # Draw stacked translucent banners (top-right)
        if active_labels:
            panel_w = int(0.46 * w)
            x1 = w - panel_w - 16
            y = 18
            for lab in active_labels:
                txt = f"⚠ {lab}"
                (tw, th), _ = cv2.getTextSize(txt, cv2.FONT_HERSHEY_SIMPLEX, 0.75, 2)
                ph = th + 20
                overlay = frame.copy()
                cv2.rectangle(overlay, (x1, y-6), (x1 + panel_w, y + ph), (0, 0, 80), -1)
                frame[:] = cv2.addWeighted(overlay, 0.45, frame, 0.55, 0)
                cv2.rectangle(frame, (x1, y-6), (x1 + panel_w, y + ph), (180, 180, 255), 1)
                cv2.putText(frame, txt, (x1 + 12, y + th + 2), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
                y += ph + 8

        # FPS
        now2 = time.time()
        fps = 1.0 / max(1e-6, (now2 - prev_time)); prev_time = now2
        cv2.putText(frame, f"FPS: {int(fps)}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)

        cv2.imshow(WINDOW_NAME, frame)
        k = cv2.waitKey(1) & 0xFF
        if k == 27 or k == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()