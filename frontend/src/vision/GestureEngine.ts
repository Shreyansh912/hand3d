import type { HandPoint } from "./HandTracker";

export type GestureType =
  | "OPEN_PALM"
  | "PINCH"
  | "FIST"
  | "POINT"
  | "TWO_FINGER"
  | "NEUTRAL";

export interface GestureState {
  gesture: GestureType;
  pinchDistance: number;
  pointerNdc: { x: number; y: number }; // Normalized Device Coordinates for 3D raycasting [-1, 1]
  wristPosition: HandPoint;
}

export class GestureClassifier {
  private isPinched = false;
  private enterThreshold = 0.35;
  private exitThreshold = 0.50;

  private isFingerExtended(pMcp: HandPoint, pPip: HandPoint, pTip: HandPoint): boolean {
    const v1 = { x: pPip.x - pMcp.x, y: pPip.y - pMcp.y, z: pPip.z - pMcp.z };
    const v2 = { x: pTip.x - pPip.x, y: pTip.y - pPip.y, z: pTip.z - pPip.z };

    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const normV1 = Math.hypot(v1.x, v1.y, v1.z);
    const normV2 = Math.hypot(v2.x, v2.y, v2.z);
    const cosTheta = dot / (normV1 * normV2 + 1e-6);

    return cosTheta > 0.45;
  }

  public evaluate(landmarks: HandPoint[]): GestureState {
    const p0 = landmarks[0]; // Wrist
    const p4 = landmarks[4]; // Thumb Tip
    const p8 = landmarks[8]; // Index Tip
    const p9 = landmarks[9]; // Middle MCP

    // Palm scale metric: ||P9 - P0||
    const palmScale = Math.hypot(p9.x - p0.x, p9.y - p0.y, p9.z - p0.z);
    const safeScale = palmScale > 1e-4 ? palmScale : 1.0;

    // Scale-invariant pinch distance
    const rawPinchDist = Math.hypot(p8.x - p4.x, p8.y - p4.y, p8.z - p4.z);
    const normPinchDist = rawPinchDist / safeScale;

    // Pinch Hysteresis State Machine
    if (!this.isPinched && normPinchDist < this.enterThreshold) {
      this.isPinched = true;
    } else if (this.isPinched && normPinchDist > this.exitThreshold) {
      this.isPinched = false;
    }

    // Finger articulation evaluations
    const indexExt = this.isFingerExtended(landmarks[5], landmarks[6], landmarks[8]);
    const middleExt = this.isFingerExtended(landmarks[9], landmarks[10], landmarks[12]);
    const ringExt = this.isFingerExtended(landmarks[13], landmarks[14], landmarks[16]);
    const pinkyExt = this.isFingerExtended(landmarks[17], landmarks[18], landmarks[20]);

    const extendedCount = (indexExt ? 1 : 0) + (middleExt ? 1 : 0) + (ringExt ? 1 : 0) + (pinkyExt ? 1 : 0);

    let gesture: GestureType = "NEUTRAL";

    if (this.isPinched) {
      gesture = "PINCH";
    } else if (extendedCount === 0) {
      gesture = "FIST";
    } else if (extendedCount >= 3) {
      gesture = "OPEN_PALM";
    } else if (indexExt && middleExt && !ringExt && !pinkyExt) {
      gesture = "TWO_FINGER";
    } else if (indexExt && !middleExt && !ringExt && !pinkyExt) {
      gesture = "POINT";
    }

    // Convert Index Tip (p8) to WebGL Normalized Device Coordinates (NDC) [-1, 1]
    const ndcX = p8.x * 2.0 - 1.0;
    const ndcY = -(p8.y * 2.0 - 1.0);

    return {
      gesture,
      pinchDistance: normPinchDist,
      pointerNdc: { x: ndcX, y: ndcY },
      wristPosition: p0,
    };
  }
}