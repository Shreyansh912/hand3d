"""Hand3D - Milestone 0: Multi-Hand Vision & Kinematic Geometry Baseline

File location: hand3d/vision/vision_baseline.py
"""

import time
import cv2
import mediapipe as mp
import numpy as np


class PinchStateMachine:
  """Finite State Machine for scale-invariant pinch detection with hysteresis."""

  STATE_RELEASED = "RELEASED"
  STATE_PINCHED = "PINCHED"

  def __init__(
      self, enter_threshold: float = 0.35, exit_threshold: float = 0.50
  ):
    self.enter_threshold = enter_threshold
    self.exit_threshold = exit_threshold
    self.state = self.STATE_RELEASED

  def update(self, normalized_distance: float) -> str:
    if self.state == self.STATE_RELEASED:
      if normalized_distance < self.enter_threshold:
        self.state = self.STATE_PINCHED
    elif self.state == self.STATE_PINCHED:
      if normalized_distance > self.exit_threshold:
        self.state = self.STATE_RELEASED
    return self.state


def main():
  cap = cv2.VideoCapture(0)
  cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
  cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

  if not cap.isOpened():
    raise RuntimeError("Could not open video stream.")

  mp_hands = mp.solutions.hands
  mp_drawing = mp.solutions.drawing_utils
  mp_drawing_styles = mp.solutions.drawing_styles

  # 1. Allow up to 2 hands simultaneously
  hands = mp_hands.Hands(
      static_image_mode=False,
      max_num_hands=2,
      min_detection_confidence=0.7,
      min_tracking_confidence=0.7,
  )

  # Maintain independent state machines for each hand
  fsm_left = PinchStateMachine(enter_threshold=0.35, exit_threshold=0.50)
  fsm_right = PinchStateMachine(enter_threshold=0.35, exit_threshold=0.50)

  prev_time = time.perf_counter()
  fps = 0.0

  print("[Hand3D Dual-Hand Baseline] Running. Press 'q' or 'ESC' to exit.")

  while True:
    success, frame = cap.read()
    if not success:
      continue

    # Flip horizontally for intuitive mirror view
    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    rgb_frame.flags.writeable = False
    results = hands.process(rgb_frame)
    rgb_frame.flags.writeable = True

    # Performance calculation
    curr_time = time.perf_counter()
    delta = curr_time - prev_time
    prev_time = curr_time
    if delta > 0:
      fps = 0.9 * fps + 0.1 * (1.0 / delta)

    cv2.putText(
        frame,
        f"FPS: {fps:.1f}",
        (20, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 0),
        2,
    )

    if results.multi_hand_landmarks and results.multi_handedness:
      # Iterate over all detected hands
      for hand_landmarks, handedness_info in zip(
          results.multi_hand_landmarks, results.multi_handedness
      ):
        # Determine hand label ('Left' or 'Right')
        # Note: Because the frame was flipped with cv2.flip(frame, 1), MediaPipe's
        # internal classification is inverted relative to the mirror view.
        raw_label = handedness_info.classification[0].label
        hand_label = "Right" if raw_label == "Left" else "Left"

        # Select corresponding FSM
        fsm = fsm_left if hand_label == "Left" else fsm_right

        # Draw hand skeleton
        mp_drawing.draw_landmarks(
            frame,
            hand_landmarks,
            mp_hands.HAND_CONNECTIONS,
            mp_drawing_styles.get_default_hand_landmarks_style(),
            mp_drawing_styles.get_default_hand_connections_style(),
        )

        def get_coord(idx):
          lm = hand_landmarks.landmark[idx]
          return np.array([lm.x, lm.y, lm.z], dtype=np.float32)

        p_wrist = get_coord(0)
        p_thumb_tip = get_coord(4)
        p_index_tip = get_coord(8)
        p_middle_mcp = get_coord(9)

        # Scale metric: Palm size s = ||P_9 - P_0||
        scale_palm = float(np.linalg.norm(p_middle_mcp - p_wrist))

        if scale_palm > 1e-4:
          raw_dist = float(np.linalg.norm(p_thumb_tip - p_index_tip))
          norm_pinch_dist = raw_dist / scale_palm
          current_state = fsm.update(norm_pinch_dist)

          # Draw indicator between thumb tip and index tip
          x8, y8 = int(p_index_tip[0] * w), int(p_index_tip[1] * h)
          x4, y4 = int(p_thumb_tip[0] * w), int(p_thumb_tip[1] * h)

          line_color = (
              (0, 255, 0)
              if current_state == PinchStateMachine.STATE_PINCHED
              else (0, 0, 255)
          )
          cv2.line(frame, (x8, y8), (x4, y4), line_color, 2)
          cv2.circle(frame, (x8, y8), 5, line_color, -1)
          cv2.circle(frame, (x4, y4), 5, line_color, -1)

          # Display state directly above the wrist landmark
          wrist_x, wrist_y = int(p_wrist[0] * w), int(p_wrist[1] * h)
          tag_text = f"{hand_label}: {current_state} ({norm_pinch_dist:.2f})"
          cv2.putText(
              frame,
              tag_text,
              (wrist_x - 40, max(20, wrist_y - 20)),
              cv2.FONT_HERSHEY_SIMPLEX,
              0.55,
              line_color,
              2,
          )

    cv2.imshow("Hand3D - Milestone 0 Baseline", frame)
    key = cv2.waitKey(1) & 0xFF
    if key == 27 or key == ord("q"):
      break

  cap.release()
  cv2.destroyAllWindows()


if __name__ == "__main__":
  main()