"""
Hand3D - Milestone 1: Signal Smoothing & Deterministic Multi-Gesture Engine
File location: hand3d/vision/gesture_engine.py
"""

import time
import math
import cv2
import numpy as np
import mediapipe as mp


class OneEuroFilter:
    """
    Adaptive low-pass filter designed for human-computer interaction.
    Dynamically adjusts cutoff frequency based on movement speed.
    """
    def __init__(self, min_cutoff: float = 1.0, beta: float = 0.007, d_cutoff: float = 1.0):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.x_prev = None
        self.dx_prev = None
        self.t_prev = None

    def _alpha(self, cutoff: float, te: float) -> float:
        tau = 1.0 / (2.0 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / te)

    def filter(self, x: np.ndarray, t: float) -> np.ndarray:
        if self.x_prev is None:
            self.x_prev = x.copy()
            self.dx_prev = np.zeros_like(x)
            self.t_prev = t
            return x

        te = t - self.t_prev
        if te <= 1e-5:
            return self.x_prev

        # Estimate velocity
        dx = (x - self.x_prev) / te
        alpha_d = self._alpha(self.d_cutoff, te)
        dx_hat = alpha_d * dx + (1.0 - alpha_d) * self.dx_prev

        # Dynamic cutoff frequency based on velocity magnitude
        speed = np.linalg.norm(dx_hat)
        fc = self.min_cutoff + self.beta * speed
        alpha = self._alpha(fc, te)

        # Filter the signal
        x_hat = alpha * x + (1.0 - alpha) * self.x_prev

        # Update historical state
        self.x_prev = x_hat.copy()
        self.dx_prev = dx_hat.copy()
        self.t_prev = t

        return x_hat


class DeterministicGestureClassifier:
    """
    Rule-based gesture recognizer using scale-invariant geometry and joint angles.
    """
    GESTURE_OPEN_PALM = "OPEN_PALM (Rotate)"
    GESTURE_PINCH     = "PINCH (Select)"
    GESTURE_FIST      = "FIST (Grab/Move)"
    GESTURE_POINT     = "POINT (Inspect)"
    GESTURE_TWO_FINGER= "TWO_FINGER (Zoom)"
    GESTURE_UNKNOWN   = "NEUTRAL"

    def __init__(self):
        self.is_pinched = False

    def _is_finger_extended(self, p_mcp: np.ndarray, p_pip: np.ndarray, p_tip: np.ndarray) -> bool:
        v1 = p_pip - p_mcp
        v2 = p_tip - p_pip
        denom = (np.linalg.norm(v1) * np.linalg.norm(v2)) + 1e-6
        cos_theta = np.dot(v1, v2) / denom
        return cos_theta > 0.45

    def classify(self, landmarks_3d: np.ndarray) -> tuple:
        """
        landmarks_3d: Shape (21, 3) representing (x, y, z)
        Returns: (gesture_name, debug_info_dict)
        """
        p0 = landmarks_3d[0]   # Wrist
        p4 = landmarks_3d[4]   # Thumb Tip
        p8 = landmarks_3d[8]   # Index Tip
        p9 = landmarks_3d[9]   # Middle MCP

        # Metric scale reference (Wrist to Middle MCP)
        palm_scale = np.linalg.norm(p9 - p0)
        if palm_scale < 1e-4:
            return self.GESTURE_UNKNOWN, {}

        # Scale-normalized pinch distance
        norm_pinch_dist = np.linalg.norm(p8 - p4) / palm_scale

        # Pinch hysteresis
        if not self.is_pinched and norm_pinch_dist < 0.35:
            self.is_pinched = True
        elif self.is_pinched and norm_pinch_dist > 0.50:
            self.is_pinched = False

        # Finger extension evaluations
        index_ext  = self._is_finger_extended(landmarks_3d[5],  landmarks_3d[6],  landmarks_3d[8])
        middle_ext = self._is_finger_extended(landmarks_3d[9],  landmarks_3d[10], landmarks_3d[12])
        ring_ext   = self._is_finger_extended(landmarks_3d[13], landmarks_3d[14], landmarks_3d[16])
        pinky_ext  = self._is_finger_extended(landmarks_3d[17], landmarks_3d[18], landmarks_3d[20])

        extended_count = sum([index_ext, middle_ext, ring_ext, pinky_ext])

        # Priority-ordered deterministic classification
        if self.is_pinched:
            gesture = self.GESTURE_PINCH
        elif extended_count == 0:
            gesture = self.GESTURE_FIST
        elif extended_count >= 3:
            gesture = self.GESTURE_OPEN_PALM
        elif index_ext and middle_ext and not ring_ext and not pinky_ext:
            gesture = self.GESTURE_TWO_FINGER
        elif index_ext and not middle_ext and not ring_ext and not pinky_ext:
            gesture = self.GESTURE_POINT
        else:
            gesture = self.GESTURE_UNKNOWN

        debug_info = {
            "pinch_dist": norm_pinch_dist,
            "ext_flags": (index_ext, middle_ext, ring_ext, pinky_ext),
            "palm_scale": palm_scale
        }
        return gesture, debug_info


def main():
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    if not cap.isOpened():
        raise RuntimeError("Camera not available.")

    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles

    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.7
    )

    classifier = DeterministicGestureClassifier()
    # 21 filters for the 21 3D landmarks
    landmark_filters = [OneEuroFilter(min_cutoff=1.2, beta=0.005) for _ in range(21)]

    prev_time = time.perf_counter()
    fps = 0.0

    print("[Hand3D Gesture Engine] Initialized. Press 'q' or 'ESC' to exit.")

    while True:
        success, frame = cap.read()
        if not success:
            continue

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        curr_t = time.perf_counter()
        delta = curr_t - prev_time
        prev_time = curr_t
        if delta > 0:
            fps = 0.9 * fps + 0.1 * (1.0 / delta)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        results = hands.process(rgb)
        rgb.flags.writeable = True

        gesture_text = "SEARCHING"
        debug_text = ""

        if results.multi_hand_landmarks:
            raw_landmarks = results.multi_hand_landmarks[0]

            # 1. Array conversion: (21, 3)
            coords = np.array([[lm.x, lm.y, lm.z] for lm in raw_landmarks.landmark], dtype=np.float32)

            # 2. Smooth every landmark via One-Euro filtering
            smoothed_coords = np.zeros_like(coords)
            for i in range(21):
                smoothed_coords[i] = landmark_filters[i].filter(coords[i], curr_t)

            # 3. Classify gesture using smoothed coordinates
            gesture_text, debug_data = classifier.classify(smoothed_coords)
            debug_text = f"Pinch: {debug_data.get('pinch_dist', 0.0):.2f}"

            # Draw skeleton
            mp_drawing.draw_landmarks(
                frame,
                raw_landmarks,
                mp_hands.HAND_CONNECTIONS,
                mp_drawing_styles.get_default_hand_landmarks_style(),
                mp_drawing_styles.get_default_hand_connections_style()
            )

            # Draw stabilized tracking crosshair on Index Tip (smoothed)
            smooth_ix = int(smoothed_coords[8][0] * w)
            smooth_iy = int(smoothed_coords[8][1] * h)
            cv2.drawMarker(frame, (smooth_ix, smooth_iy), (0, 255, 255), cv2.MARKER_CROSS, 16, 2)

        # Render HUD
        cv2.rectangle(frame, (10, 10), (380, 110), (20, 20, 20), -1)
        cv2.putText(frame, f"FPS: {fps:.1f}", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        cv2.putText(frame, f"Gesture: {gesture_text}", (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 128), 2)
        cv2.putText(frame, debug_text, (20, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)

        cv2.imshow("Hand3D - Milestone 1: Gesture Engine", frame)
        key = cv2.waitKey(1) & 0xFF
        if key == 27 or key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()