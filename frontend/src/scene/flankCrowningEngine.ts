export interface FlankCrowningMetrics {
  recommendedCrowningMicrons: number; // C_beta (typically 8 to 25 um)
  endReliefLengthMm: number;          // Lead end relief length (approx 0.1 * b)
  endReliefDepthMicrons: number;      // Depth at edge tip
  rawFaceLoadKhBeta: number;
  optimizedFaceLoadKhBeta: number;
  contactStressReductionPercent: number;
  crowningOptimizationStatus: "UNCORRECTED_EDGE_RISK" | "PARTIALLY_OPTIMIZED" | "FULLY_COMPENSATED";
}

export function computeFlankCrowningOptimization(
  faceLoadFactorKhBeta: number,
  shaftTiltMrad: number,
  faceWidthMm: number = 25.0
): FlankCrowningMetrics {
  // Transverse misalignment across active face width
  const shaftDeflectionEdgeGapMicrons = (shaftTiltMrad * faceWidthMm); // in microns

  // Recommended crowning per ISO 6336-1 Method B / ISO 21771
  // Recommended C_beta compensates ~70% of peak operational deflection
  const recommendedCrowningMicrons = Math.max(6.0, Math.round((shaftDeflectionEdgeGapMicrons * 0.72 + 4.0) * 10) / 10);

  // Progressive end relief parameters
  const endReliefLengthMm = Math.round((faceWidthMm * 0.12) * 10) / 10;
  const endReliefDepthMicrons = Math.round((recommendedCrowningMicrons * 1.35) * 10) / 10;

  // Derate K_Hbeta based on crowning compensation
  const crowningEfficiency = Math.min(0.85, (recommendedCrowningMicrons / Math.max(1.0, shaftDeflectionEdgeGapMicrons)) * 0.75);
  const rawKhBeta = faceLoadFactorKhBeta;
  const optimizedKhBeta = Math.round((1.0 + (rawKhBeta - 1.0) * (1.0 - crowningEfficiency)) * 100) / 100;

  const contactStressReductionPercent = Math.round((1.0 - Math.sqrt(optimizedKhBeta / rawKhBeta)) * 100 * 10) / 10;

  let crowningOptimizationStatus: "UNCORRECTED_EDGE_RISK" | "PARTIALLY_OPTIMIZED" | "FULLY_COMPENSATED" = "FULLY_COMPENSATED";
  if (optimizedKhBeta > 1.25) {
    crowningOptimizationStatus = "UNCORRECTED_EDGE_RISK";
  } else if (optimizedKhBeta > 1.12) {
    crowningOptimizationStatus = "PARTIALLY_OPTIMIZED";
  }

  return {
    recommendedCrowningMicrons,
    endReliefLengthMm,
    endReliefDepthMicrons,
    rawFaceLoadKhBeta: rawKhBeta,
    optimizedFaceLoadKhBeta: optimizedKhBeta,
    contactStressReductionPercent,
    crowningOptimizationStatus,
  };
}