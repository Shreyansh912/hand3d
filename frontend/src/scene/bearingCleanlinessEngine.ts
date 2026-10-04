export interface BearingCleanlinessMetrics {
  iso4406Code: string; // e.g. "18/16/13"
  solidParticlePpm: number;
  contaminationFactorEc: number; // e_C: 0.10 (severe) to 0.80 (extreme cleanliness)
  viscosityRatioKappa: number;
  fatigueLimitLoadCuKn: number;
  aIsoFactor: number;
  modifiedRatingLifeLnmh: number;
  cleanlinessStatus: "CLEAN_SUMP" | "DEGRADED_PARTICULATES" | "CRITICAL_CONTAMINATION";
}

export function computeAdvancedBearingLife(
  nominalL10h: number,
  oilTempC: number,
  runningHours: number = 2100,
  vibrationRms: number = 1.8
): BearingCleanlinessMetrics {
  // Fatigue load limit for Deep Groove Ball Bearing 6204 (C_u ≈ 0.65 kN)
  const fatigueLimitLoadCuKn = 0.65;

  // Solid particulate accumulation scales with runtime and gear chatter vibration
  const particulateAccumulation = Math.round(45 + (runningHours * 0.035) + Math.max(0, (vibrationRms - 2.0) * 80));
  const solidParticlePpm = Math.min(650, particulateAccumulation);

  // Derive ISO 4406 Cleanliness Code (>4 µm / >6 µm / >14 µm)
  let iso4406Code = "17/15/12";
  let contaminationFactorEc = 0.65;
  let cleanlinessStatus: "CLEAN_SUMP" | "DEGRADED_PARTICULATES" | "CRITICAL_CONTAMINATION" = "CLEAN_SUMP";

  if (solidParticlePpm > 300) {
    iso4406Code = "22/19/16";
    contaminationFactorEc = 0.18;
    cleanlinessStatus = "CRITICAL_CONTAMINATION";
  } else if (solidParticlePpm > 140) {
    iso4406Code = "19/17/14";
    contaminationFactorEc = 0.38;
    cleanlinessStatus = "DEGRADED_PARTICULATES";
  }

  // Operating viscosity ratio kappa (κ = ν / ν_1)
  const operatingViscosity = Math.max(15, 220 * Math.exp(-0.032 * (oilTempC - 40)));
  const ratedViscosity = 28.0; // Required viscosity at operating speed
  const viscosityRatioKappa = Math.round((operatingViscosity / ratedViscosity) * 100) / 100;

  // ISO 281 life modification factor a_ISO
  // Approximated ISO 281 formula based on e_C * (C_u / P) and kappa
  const stressRatio = contaminationFactorEc * (fatigueLimitLoadCuKn / 1.45);
  const aIsoFactor = Math.round(
    Math.max(0.12, Math.min(3.8, 0.1 + Math.pow(stressRatio * Math.min(2.0, viscosityRatioKappa), 0.68) * 2.4)) * 100
  ) / 100;

  // Modified life L_nmh = a_1 * a_ISO * L_10h (with a_1 = 1.0 for 90% reliability)
  const modifiedRatingLifeLnmh = Math.round(nominalL10h * aIsoFactor);

  return {
    iso4406Code,
    solidParticlePpm,
    contaminationFactorEc,
    viscosityRatioKappa,
    fatigueLimitLoadCuKn,
    aIsoFactor,
    modifiedRatingLifeLnmh,
    cleanlinessStatus,
  };
}