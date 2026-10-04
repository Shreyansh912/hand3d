export interface ClearanceStatus {
  hasViolation: boolean;
  minClearanceMm: number;
  interferingPartA?: string;
  interferingPartB?: string;
}

export function evaluateClearances(
  inputTorqueNm: number,
  explodedProgress: number
): ClearanceStatus {
  // When exploded, physical clearances increase proportionally with translation
  if (explodedProgress > 0.05) {
    return {
      hasViolation: false,
      minClearanceMm: parseFloat((1.2 + explodedProgress * 15.0).toFixed(2)),
    };
  }

  // Nominal housing-to-gear tip clearance = 1.20 mm
  // Structural deflection under torque load: delta = (Torque / 200) * 1.18 mm
  const deflectionMm = (inputTorqueNm / 200.0) * 1.18;
  const currentClearanceMm = Math.max(0.01, 1.20 - deflectionMm);

  // Clearance < 0.08 mm (80 microns) represents unacceptable rubbing/binding contact
  const hasViolation = currentClearanceMm < 0.08;

  return {
    hasViolation,
    minClearanceMm: parseFloat(currentClearanceMm.toFixed(2)),
    interferingPartA: hasViolation ? "Driven_Gear_30T" : undefined,
    interferingPartB: hasViolation ? "Housing_Base" : undefined,
  };
}