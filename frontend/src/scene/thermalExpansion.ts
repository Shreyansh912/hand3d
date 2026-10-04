export interface ThermalExpansionMetrics {
  gearExpansionMicrons: number;
  casingExpansionMicrons: number;
  netCenterDistanceGrowthMm: number;
  tipClearanceMarginMm: number;
  tipReliefRequiredMicrons: number;
  isTipInterferenceRisk: boolean;
}

export function computeThermalExpansion(
  sumpTempC: number,
  inputTorqueNm: number,
  ambientTempC: number = 20.0
): ThermalExpansionMetrics {
  const deltaT = Math.max(0, sumpTempC - ambientTempC);

  // Center distance a = (50 + 75) / 2 = 62.5 mm
  const centerDistanceMm = 62.5;

  // Linear thermal expansion coefficients (1/K)
  const alphaSteel = 12.0e-6; // Carburized 8620 gear steel
  const alphaCastIron = 10.5e-6; // Class 30 Gray Cast Iron casing

  // Radial expansion of gears vs. casing bearing centers
  const gearExpansionMm = centerDistanceMm * alphaSteel * deltaT;
  const casingExpansionMm = centerDistanceMm * alphaCastIron * deltaT;
  const netGrowthMm = casingExpansionMm - gearExpansionMm;

  // Standard bottom tooth clearance c = 0.25 * m = 0.25 * 2.5 = 0.625 mm
  const nominalClearanceMm = 0.625;
  const tipClearanceMarginMm = Math.round((nominalClearanceMm + netGrowthMm) * 1000) / 1000;

  // Tip relief requirement scales with tooth bending load (ISO 21771 / DIN 3960)
  const loadBendingMicrons = (inputTorqueNm / 200.0) * 18.0;
  const thermalTipGrowthMicrons = (25.0 * alphaSteel * deltaT) * 1000.0;
  const tipReliefRequiredMicrons = Math.round((loadBendingMicrons + thermalTipGrowthMicrons) * 10) / 10;

  // Risk triggers if required tip relief exceeds standard 22 microns or clearance drops below 0.60 mm
  const isTipInterferenceRisk = tipReliefRequiredMicrons > 22.0 || tipClearanceMarginMm < 0.60;

  return {
    gearExpansionMicrons: Math.round(gearExpansionMm * 1000.0 * 10) / 10,
    casingExpansionMicrons: Math.round(casingExpansionMm * 1000.0 * 10) / 10,
    netCenterDistanceGrowthMm: Math.round(netGrowthMm * 1000) / 1000,
    tipClearanceMarginMm,
    tipReliefRequiredMicrons,
    isTipInterferenceRisk,
  };
}