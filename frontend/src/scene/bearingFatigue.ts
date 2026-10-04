export interface BearingLifeMetrics {
  bearingId: string;
  equivalentLoadKn: number;
  ratingLifeHours: number;
  wearRiskLevel: "OPTIMAL" | "CAUTION" | "CRITICAL";
  viscosityRatioKappa: number;
}

// C: Basic Dynamic Load Rating (kN) per bearing catalog
const BEARING_RATINGS: Record<string, number> = {
  Bearing_Input_A: 12.8,  // 6204
  Bearing_Input_B: 12.8,  // 6204
  Bearing_Output_A: 14.8, // 6205
  Bearing_Output_B: 14.8, // 6205
};

export function computeBearingFatigue(
  bearingId: string,
  inputTorqueNm: number,
  inputRpm: number
): BearingLifeMetrics {
  const dynamicRatingC = BEARING_RATINGS[bearingId] || 13.0;

  // Reaction radial load is proportional to mesh tangential force Ft / 2
  // Ft = 2 * T / d_pinion (d = 0.05m)
  const tangentialForceKn = (2.0 * inputTorqueNm) / 0.05 / 1000.0;
  
  // Radial force component (pressure angle 20 deg): Fr = Ft * tan(20°)
  const radialForceKn = tangentialForceKn * Math.tan((20.0 * Math.PI) / 180.0);
  
  // Equivalent dynamic load P on the individual bearing journal
  const equivalentLoadP = Math.max(0.4, (tangentialForceKn * 0.6) + (radialForceKn * 0.5));

  // Determine shaft speed for input vs output shaft
  const shaftRpm = bearingId.includes("Output") ? (inputRpm / 1.5) : inputRpm;

  // L10 life in revolutions: L10 = (C / P)^3 * 10^6
  // L10h in hours = (10^6 / (60 * n)) * (C / P)^3
  const lifeRatio = dynamicRatingC / equivalentLoadP;
  const ratingLifeHours = Math.round(
    (1000000.0 / (60.0 * Math.max(50, shaftRpm))) * Math.pow(lifeRatio, 3)
  );

  // Viscosity ratio kappa (synthetic ISO VG 220 oil at 70°C)
  const kappa = Math.round((1.2 * (shaftRpm / 1200.0)) * 100) / 100;

  let wearRiskLevel: "OPTIMAL" | "CAUTION" | "CRITICAL" = "OPTIMAL";
  if (ratingLifeHours < 8000) {
    wearRiskLevel = "CRITICAL";
  } else if (ratingLifeHours < 25000) {
    wearRiskLevel = "CAUTION";
  }

  return {
    bearingId,
    equivalentLoadKn: Math.round(equivalentLoadP * 100) / 100,
    ratingLifeHours,
    wearRiskLevel,
    viscosityRatioKappa: Math.max(0.2, kappa),
  };
}