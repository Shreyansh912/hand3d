export interface ContactPatternMetrics {
  normalBacklashMm: number;
  backlashCompliance: "NOMINAL" | "TOO_TIGHT" | "EXCESSIVE";
  contactPatchCenterPercent: number; // 50% is centered
  faceLoadFactorKhBeta: number; // ISO 6336 face load distribution factor
  edgeLoadingRisk: boolean;
}

export function computeContactPattern(
  inputTorqueNm: number,
  meshRunoutMicrons: number = 0
): ContactPatternMetrics {
  // Nominal normal backlash j_n = 0.120 mm
  // Dynamic runout and torque deflection modulate actual clearance
  const runoutDeltaMm = (meshRunoutMicrons / 1000.0) * 0.5;
  const torqueShiftMm = (inputTorqueNm / 200.0) * 0.035;
  const currentBacklashMm = Math.max(0.02, 0.12 - torqueShiftMm + runoutDeltaMm);

  let backlashCompliance: "NOMINAL" | "TOO_TIGHT" | "EXCESSIVE" = "NOMINAL";
  if (currentBacklashMm < 0.06) {
    backlashCompliance = "TOO_TIGHT";
  } else if (currentBacklashMm > 0.18) {
    backlashCompliance = "EXCESSIVE";
  }

  // Contact patch center migration: shifts toward tooth heel/edge under torque deflection
  const tiltShiftPercent = (inputTorqueNm / 200.0) * 32.0;
  const contactPatchCenter = Math.min(88.0, 50.0 + tiltShiftPercent);

  // ISO 6336 KH_beta factor increases with edge loading (1.0 = ideal, > 1.35 = critical)
  const khBeta = 1.05 + (tiltShiftPercent / 32.0) * 0.38;
  const edgeLoadingRisk = contactPatchCenter > 72.0;

  return {
    normalBacklashMm: Math.round(currentBacklashMm * 1000) / 1000,
    backlashCompliance,
    contactPatchCenterPercent: Math.round(contactPatchCenter),
    faceLoadFactorKhBeta: Math.round(khBeta * 100) / 100,
    edgeLoadingRisk,
  };
}