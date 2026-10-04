import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface HandPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HandTrackingResult {
  rawLandmarks: NormalizedLandmark[];
  smoothedLandmarks: NormalizedLandmark[];
}

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private previousLandmarks: NormalizedLandmark[] | null = null;
  private readonly smoothingAlpha = 0.65; // Exponential Moving Average smoothing factor

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  processVideoFrame(
    video: HTMLVideoElement,
    timestamp: number
  ): HandTrackingResult | null {
    if (!this.handLandmarker) return null;

    const results = this.handLandmarker.detectForVideo(video, timestamp);
    if (!results.landmarks || results.landmarks.length === 0) {
      this.previousLandmarks = null;
      return null;
    }

    const currentLandmarks = results.landmarks[0];

    // Apply temporal EMA smoothing across landmark coordinates to reduce jitter
    if (!this.previousLandmarks || this.previousLandmarks.length !== currentLandmarks.length) {
      this.previousLandmarks = currentLandmarks.map((lm) => ({ ...lm }));
      return {
        rawLandmarks: currentLandmarks,
        smoothedLandmarks: currentLandmarks,
      };
    }

    const smoothedLandmarks: NormalizedLandmark[] = currentLandmarks.map((lm, idx) => {
      const prev = this.previousLandmarks![idx];
      return {
        x: this.smoothingAlpha * lm.x + (1 - this.smoothingAlpha) * prev.x,
        y: this.smoothingAlpha * lm.y + (1 - this.smoothingAlpha) * prev.y,
        z: this.smoothingAlpha * lm.z + (1 - this.smoothingAlpha) * prev.z,
        visibility: lm.visibility,
      };
    });

    this.previousLandmarks = smoothedLandmarks.map((lm) => ({ ...lm }));

    return {
      rawLandmarks: currentLandmarks,
      smoothedLandmarks,
    };
  }

  close(): void {
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
    this.previousLandmarks = null;
  }
}