export interface MaintenancePrediction {
  healthIndexPercent: number; // 0 - 100%
  remainingUsefulLifeHours: number;
  failureProbabilityPercent: number;
  maintenanceStatus: "HEALTHY" | "ADVISORY" | "CRITICAL_ACTION_REQUIRED";
  dominantFailureDriver: string;
}

export function computePredictiveHealth(
  vibrationRmsMms: number,
  oilTempC: number,
  bearingRatingLifeHours: number = 25000,
  isShockAnomaly: boolean = false
): MaintenancePrediction {
  // Vibration degradation component (ISO 10816 Zone C starts at 4.5 mm/s)
  const vibFactor = Math.min(1.0, vibrationRmsMms / 4.5);

  // Thermal derating component (40°C to 100°C)
  const thermFactor = Math.min(1.0, Math.max(0.0, (oilTempC - 40.0) / 60.0));

  // Bearing fatigue life penalty (sub-10,000 hrs accelerates degradation)
  const fatigueFactor = Math.min(1.0, 10000.0 / Math.max(500.0, bearingRatingLifeHours));

  // Weighted health index calculation
  const weightedDegradation = vibFactor * 0.45 + thermFactor * 0.30 + fatigueFactor * 0.25;
  const shockPenalty = isShockAnomaly ? 0.15 : 0.0;

  const rawHi = (1.0 - Math.min(1.0, weightedDegradation + shockPenalty)) * 100.0;
  const healthIndexPercent = Math.max(5.0, Math.round(rawHi * 10) / 10);

  // Weibull-based Remaining Useful Life (RUL) estimation
  // Characteristic life eta = 12,000 hrs, shape parameter beta = 2.4 (wear-out stage)
  const rulHours = Math.max(
    48,
    Math.round(12000.0 * Math.pow(healthIndexPercent / 100.0, 1.8))
  );

  const failureProb = Math.min(99.0, Math.round((100.0 - healthIndexPercent) * 1.15));

  let dominantDriver = "Vibration Harmonics (ISO 10816)";
  if (thermFactor > vibFactor && thermFactor > fatigueFactor) {
    dominantDriver = "Lube Sump Thermal Degradation (ISO/TR 14179)";
  } else if (fatigueFactor > vibFactor) {
    dominantDriver = "Rolling Element Subsurface Fatigue (ISO 281)";
  }

  let maintenanceStatus: "HEALTHY" | "ADVISORY" | "CRITICAL_ACTION_REQUIRED" = "HEALTHY";
  if (healthIndexPercent < 45.0 || vibrationRmsMms > 4.5) {
    maintenanceStatus = "CRITICAL_ACTION_REQUIRED";
  } else if (healthIndexPercent < 75.0 || vibrationRmsMms > 2.8) {
    maintenanceStatus = "ADVISORY";
  }

  return {
    healthIndexPercent,
    remainingUsefulLifeHours: rulHours,
    failureProbabilityPercent: failureProb,
    maintenanceStatus,
    dominantFailureDriver: dominantDriver,
  };
}