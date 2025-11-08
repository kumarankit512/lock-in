import cv2
import time
import math
import numpy as np
import mediapipe as mp
from collections import deque

# ------------------------------
# CONFIG
# ------------------------------
FLIP = True                   # toggle with 'f'
CALIB_SECONDS = 3.0           # EAR self-calibration time
DEBOUNCE_FRAMES = 5           # frames to declare FOCUSED
UNFOCUS_MISS_FRAMES = 8       # frames to declare NOT FOCUSED
EAR_FALLBACK_OPEN = 0.23
EAR_MIN_CLAMP = 0.18
EAR_MARGIN = 0.85             # eyes-open threshold = median(EAR) * margin

NOT_FOCUSED_LIMIT = 30.0      # seconds not-focused before showing pause overlay
WINDOW_NAME = "Eyes Focus (Pause on Unfocused)"

# ------------------------------
# MEDIAPIPE FACEMESH
# ------------------------------
mp_face = mp.solutions.face_mesh
L_EYE = [33, 159, 158, 133, 153, 144]     # 6 landmarks per eye
R_EYE = [362, 386, 385, 263, 374, 373]

def dist(a, b): return math.dist(a, b)

def ear6(pts):
    """ EAR = (v1 + v2) / (2*h) """
    v1 = dist(pts[1], pts[5])
    v2 = dist(pts[2], pts[4])
    h  = dist(pts[0], pts[3])
    return (v1 + v2) / (2.0 * h) if h > 1e-6 else 0.0

def median(values):
    if not values: return None
    s = sorted(values); n = len(s)
    return s[n//2] if n % 2 else 0.5*(s[n//2-1] + s[n//2])

# ------------------------------
# UI: PAUSE OVERLAY WITH BUTTONS
# ------------------------------
BTN_CONTINUE = None
BTN_END = None
USER_CLICK = None

def draw_pause_overlay(frame, header, sub):
    """ Dark overlay + two buttons: Continue / End """
    h, w = frame.shape[:2]
    overlay = frame.copy()
    cv2.rectangle(overlay, (0,0), (w,h), (0,0,0), -1)
    frame[:] = cv2.addWeighted(overlay, 0.45, frame, 0.55, 0)

    panel_w, panel_h = int(w*0.75), int(h*0.48)
    x0 = (w - panel_w)//2
    y0 = (h - panel_h)//2
    cv2.rectangle(frame, (x0, y0), (x0+panel_w, y0+panel_h), (255,255,255), 2)

    cv2.putText(frame, header, (x0+30, y0+60), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255,255,255), 2)
    cv2.putText(frame, sub,    (x0+30, y0+110), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)

    global BTN_CONTINUE, BTN_END
    btn_w, btn_h = int(panel_w*0.42), 62
    gap = int(panel_w*0.05)
    bx1 = x0 + int((panel_w - (2*btn_w + gap)) / 2)
    by1 = y0 + panel_h - btn_h - 32
    BTN_CONTINUE = (bx1, by1, bx1+btn_w, by1+btn_h)

    bx2 = BTN_CONTINUE[2] + gap
    by2 = by1
    BTN_END = (bx2, by2, bx2+btn_w, by2+btn_h)

    cv2.rectangle(frame, (BTN_CONTINUE[0], BTN_CONTINUE[1]), (BTN_CONTINUE[2], BTN_CONTINUE[3]), (80,220,80), -1)
    cv2.putText(frame, "Continue (resume)", (BTN_CONTINUE[0]+40, BTN_CONTINUE[1]+40),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20,40,20), 2)

    cv2.rectangle(frame, (BTN_END[0], BTN_END[1]), (BTN_END[2], BTN_END[3]), (60,60,200), -1)
    cv2.putText(frame, "End session", (BTN_END[0]+70, BTN_END[1]+40),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (240,240,255), 2)

def on_mouse(event, x, y, flags, param):
    global USER_CLICK
    if event == cv2.EVENT_LBUTTONDOWN:
        if BTN_CONTINUE and (BTN_CONTINUE[0] <= x <= BTN_CONTINUE[2]) and (BTN_CONTINUE[1] <= y <= BTN_CONTINUE[3]):
            USER_CLICK = "continue"
        elif BTN_END and (BTN_END[0] <= x <= BTN_END[2]) and (BTN_END[1] <= y <= BTN_END[3]):
            USER_CLICK = "end"

# ------------------------------
# STATES
# ------------------------------
STATE_TRACK = "track"   # normal tracking
STATE_PAUSE = "pause"   # paused overlay up (session paused)
STATE_END   = "end"

def main():
    global USER_CLICK
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Camera not found.")
        return

    cv2.namedWindow(WINDOW_NAME)
    cv2.setMouseCallback(WINDOW_NAME, on_mouse)

    # Calibration
    calib_start = time.time()
    calib_ear_samples = deque(maxlen=5*30)
    calibrated_ear_open = None

    # Focus state
    focused = False
    focus_counter = 0
    not_focus_counter = 0
    not_focused_since = None

    # State machine
    state = STATE_TRACK

    with mp_face.FaceMesh(static_image_mode=False, refine_landmarks=True, max_num_faces=1,
                          min_detection_confidence=0.5, min_tracking_confidence=0.5) as face_mesh:

        print("[i] Controls: 'r' recalibrate  | 'q' or 'Esc' quit")

        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if FLIP:
                frame = cv2.flip(frame, 1)

            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = face_mesh.process(rgb)

            # Detect eyes + EAR (only used while tracking)
            left_ear = right_ear = None
            both_eyes_detected = False

            if res.multi_face_landmarks:
                lm = res.multi_face_landmarks[0].landmark
                L = [(lm[i].x*w, lm[i].y*h) for i in L_EYE]
                R = [(lm[i].x*w, lm[i].y*h) for i in R_EYE]
                if all(0 <= x < w and 0 <= y < h for (x,y) in L+R):
                    both_eyes_detected = True
                    left_ear = ear6(L); right_ear = ear6(R)
                    # draw eye points
                    for (x,y) in L+R: cv2.circle(frame, (int(x),int(y)), 2, (0,255,255), -1)

            # ---- Calibration (first few seconds) ----
            if (time.time() - calib_start) <= CALIB_SECONDS and left_ear and right_ear:
                calib_ear_samples.append((left_ear + right_ear)/2.0)
            elif calibrated_ear_open is None and (time.time() - calib_start) > CALIB_SECONDS:
                m = median(list(calib_ear_samples))
                calibrated_ear_open = max(EAR_MIN_CLAMP, (m if m else EAR_FALLBACK_OPEN) * EAR_MARGIN)

            ear_thr = calibrated_ear_open if calibrated_ear_open is not None else EAR_FALLBACK_OPEN
            eyes_open = (left_ear is not None and right_ear is not None and
                         left_ear > ear_thr and right_ear > ear_thr)

            # --------------------------
            # STATE: TRACK
            # --------------------------
            if state == STATE_TRACK:
                # Debounce focus/not-focus
                if both_eyes_detected and eyes_open:
                    focus_counter += 1
                    not_focus_counter = 0
                    if not focused and focus_counter >= DEBOUNCE_FRAMES:
                        focused = True
                    # reset not-focused timer
                    not_focused_since = None
                else:
                    not_focus_counter += 1
                    focus_counter = 0
                    if focused and not_focus_counter >= UNFOCUS_MISS_FRAMES:
                        focused = False
                        not_focused_since = time.time()
                    elif not focused:
                        if not_focused_since is None:
                            not_focused_since = time.time()

                # Pause if unfocused for > limit
                if not_focused_since is not None and (time.time() - not_focused_since) >= NOT_FOCUSED_LIMIT:
                    state = STATE_PAUSE
                    USER_CLICK = None

            # --------------------------
            # STATE: PAUSE (session paused)
            # --------------------------
            if state == STATE_PAUSE:
                draw_pause_overlay(
                    frame,
                    "Session paused — not focused.",
                    "Click green to continue or red to end the session."
                )
                # ignore tracking state while paused
                focused = False
                focus_counter = not_focus_counter = 0
                not_focused_since = None

                # Handle clicks
                if USER_CLICK == "continue":
                    USER_CLICK = None
                    state = STATE_TRACK   # resume immediately
                elif USER_CLICK == "end":
                    state = STATE_END

            # --------------------------
            # HUD / STATUS
            # --------------------------
            status = "FOCUSED" if (state == STATE_TRACK and focused) else ("PAUSED" if state == STATE_PAUSE else "NOT FOCUSED")
            col = (40,220,40) if (state == STATE_TRACK and focused) else ((60,60,200) if state == STATE_PAUSE else (30,60,220))

            cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, col, 2)
            cv2.putText(frame, f"L-EAR: {left_ear:.2f}" if left_ear is not None else "L-EAR: --",
                        (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (220, 220, 220), 2)
            cv2.putText(frame, f"R-EAR: {right_ear:.2f}" if right_ear is not None else "R-EAR: --",
                        (10, 85), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (220, 220, 220), 2)
            cv2.putText(frame, f"EAR-thr: {ear_thr:.2f}", (10, 110),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (220, 220, 220), 2)

            if state == STATE_TRACK and not_focused_since is not None:
                nf = time.time() - not_focused_since
                cv2.putText(frame, f"Unfocused: {int(nf)}s / {int(NOT_FOCUSED_LIMIT)}s",
                            (10, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,210,90), 2)

            if calibrated_ear_open is None:
                rem = max(0, int(CALIB_SECONDS - (time.time() - calib_start)))
                cv2.putText(frame, f"Calibrating... look at screen: {rem}s",
                            (10, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,210,90), 2)
            else:
                cv2.putText(frame, "Calib: DONE  ('r' recalibrate, 'f' flip, 'q' quit)",
                            (10, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180,180,180), 2)

            cv2.imshow(WINDOW_NAME, frame)
            key = cv2.waitKey(1) & 0xFF
            if key in (27, ord('q')) or state == STATE_END:
                break
            if key == ord('r'):
                # reset calibration
                calib_start = time.time()
                calib_ear_samples.clear()
                calibrated_ear_open = None
                focused = False
                focus_counter = not_focus_counter = 0
                not_focused_since = None
                if state != STATE_PAUSE:
                    state = STATE_TRACK

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()