export interface OilChemistryMetrics {
  totalAcidNumberMgKoh: number; // TAN (ASTM D664)
  oxidationRateFactor: number;
  additiveDepletionPercent: number; // 0% = fresh, 100% = depleted
  moisturePpm: number;
  hoursUntilOilDrain: number;
  lubricantHealthStatus: "NORMAL" | "DEGRADED" | "IMMEDIATE_CHANGE_REQUIRED";
}

// Baseline parameters for fresh ISO VG 220 synthetic gear oil
const BASELINE_TAN = 0.35; // mg KOH/g
const FRESH_OIL_LIFE_HOURS = 8000;

export function computeOilChemistry(
  oilTempC: number,
  runningHoursEstimate: number = 1800,
  vibrationRms: number = 1.8
): OilChemistryMetrics {
  // Arrhenius oxidation acceleration factor (baseline reference at 60°C)
  const tempDelta = Math.max(0, oilTempC - 60.0);
  const oxidationRateFactor = Math.round(Math.pow(2.0, tempDelta / 10.0) * 100) / 100;

  // Acid generation scales with thermal oxidation rate and operational exposure
  const tanAccumulation = (runningHoursEstimate / 1000.0) * 0.18 * oxidationRateFactor;
  const currentTan = Math.round((BASELINE_TAN + tanAccumulation) * 100) / 100;

  // Additive depletion (Extreme Pressure sulfur/phosphorus packages)
  const chatterFactor = Math.max(1.0, vibrationRms / 2.0);
  const depletionRate = (runningHoursEstimate / FRESH_OIL_LIFE_HOURS) * oxidationRateFactor * chatterFactor;
  const additiveDepletionPercent = Math.min(100.0, Math.round(depletionRate * 45.0 * 10) / 10);

  // Moisture ingress estimate (breather humidity + condensation)
  const moisturePpm = Math.min(950, Math.round(85 + (oilTempC > 80 ? 40 : 180) + (runningHoursEstimate * 0.04)));

  // Remaining operational hours before required oil drain/flush
  const effectiveHoursUsed = runningHoursEstimate * oxidationRateFactor;
  const remainingHours = Math.max(0, Math.round(FRESH_OIL_LIFE_HOURS - effectiveHoursUsed));

  let lubricantHealthStatus: "NORMAL" | "DEGRADED" | "IMMEDIATE_CHANGE_REQUIRED" = "NORMAL";
  if (currentTan > 2.0 || additiveDepletionPercent > 75.0 || remainingHours < 500) {
    lubricantHealthStatus = "IMMEDIATE_CHANGE_REQUIRED";
  } else if (currentTan > 1.0 || additiveDepletionPercent > 45.0 || remainingHours < 2000) {
    lubricantHealthStatus = "DEGRADED";
  }

  return {
    totalAcidNumberMgKoh: currentTan,
    oxidationRateFactor,
    additiveDepletionPercent,
    moisturePpm,
    hoursUntilOilDrain: remainingHours,
    lubricantHealthStatus,
  };
}