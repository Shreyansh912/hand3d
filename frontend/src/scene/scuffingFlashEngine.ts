export interface ScuffingMetrics {
  slidingVelocityMs: number;
  meshFrictionCoefficient: number;
  bulkGearTempC: number;
  flashTempRiseC: number;
  contactTotalTempC: number;
  scuffingSafetyFactor: number;
  scuffingRiskLevel: "OPTIMAL" | "ELEVATED" | "CRITICAL_SCUFFING";
}

export function computeScuffingFlashTemp(
  inputTorqueNm: number,
  inputRpm: number,
  sumpTempC: number
): ScuffingMetrics {
  // Pitch linear speed
  const pitchVelocityMs = ((2.0 * Math.PI * inputRpm) / 60.0) * 0.025;

  // Approximate relative tooth flank sliding speed at tip engagement zone
  const slidingVelocityMs = Math.round((pitchVelocityMs * 0.28) * 100) / 100;

  // Dynamic friction coefficient (EHL regime with thermal thinning)
  const baseMu = 0.045;
  const tempThinningFactor = Math.max(1.0, sumpTempC / 70.0);
  const meshFrictionCoefficient = Math.round((baseMu * tempThinningFactor) * 1000) / 1000;

  // Blok's flash temperature rise calculation (simplified ISO/TS 6336-21)
  const unitToothLoadNmm = (inputTorqueNm / 0.025) / 25.0; // Tangential force divided by 25mm face width
  const flashTempRiseC = Math.round(
    1.11 * meshFrictionCoefficient * Math.pow(Math.max(10, unitToothLoadNmm), 0.75) * Math.sqrt(Math.max(0.1, slidingVelocityMs)) * 0.85
  );

  // Bulk gear temperature runs ~15°C above oil sump temperature
  const bulkGearTempC = Math.round(sumpTempC + 15.0);
  const contactTotalTempC = bulkGearTempC + flashTempRiseC;

  // Permissible scuffing limit for Carburized 8620 Alloy Steel (ISO VG 220 oil)
  const scuffingLimitTempC = 380.0;
  const scuffingSafetyFactor = Math.round((scuffingLimitTempC / contactTotalTempC) * 100) / 100;

  let scuffingRiskLevel: "OPTIMAL" | "ELEVATED" | "CRITICAL_SCUFFING" = "OPTIMAL";
  if (scuffingSafetyFactor < 1.25 || contactTotalTempC > 280) {
    scuffingRiskLevel = "CRITICAL_SCUFFING";
  } else if (scuffingSafetyFactor < 1.65 || contactTotalTempC > 200) {
    scuffingRiskLevel = "ELEVATED";
  }

  return {
    slidingVelocityMs,
    meshFrictionCoefficient,
    bulkGearTempC,
    flashTempRiseC,
    contactTotalTempC,
    scuffingSafetyFactor,
    scuffingRiskLevel,
  };
}