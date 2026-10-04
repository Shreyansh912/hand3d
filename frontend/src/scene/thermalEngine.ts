export interface ThermalMetrics {
  powerInKw: number;
  powerLossKw: number;
  oilTempC: number;
  ambientTempC: number;
  operatingViscosityCSt: number;
  thermalStatus: "NOMINAL" | "ELEVATED" | "CRITICAL";
  filmAdequacyRatio: number;
}

export function computeThermalState(
  inputTorqueNm: number,
  inputRpm: number,
  ambientTempC: number = 25.0
): ThermalMetrics {
  // Input mechanical power (kW): P = (T * omega) / 1000
  const omega = (2.0 * Math.PI * inputRpm) / 60.0;
  const powerInKw = (inputTorqueNm * omega) / 1000.0;

  // Mechanical efficiency ~ 96.5% - 98%
  // Mesh sliding loss + bearing churn + seal drag
  const lossFactor = 0.022 + (inputTorqueNm / 200.0) * 0.015;
  const powerLossKw = Math.max(0.05, powerInKw * lossFactor);

  // Housing convective + radiative heat transfer coefficient (W/m^2*K)
  // Surface area of compact housing ~ 0.28 m^2
  const heatTransferArea = 0.28;
  const heatCoeff = 18.0; // natural convection cooling

  // Steady-state thermal delta: deltaT = (PowerLoss in Watts) / (A * h)
  const deltaTemp = (powerLossKw * 1000.0) / (heatTransferArea * heatCoeff);
  const equilibriumTempC = Math.round((ambientTempC + deltaTemp * 0.42) * 10) / 10;

  // Baseline oil: ISO VG 220 (220 cSt at 40°C, ~19.4 cSt at 100°C)
  // Approximate dynamic viscosity (cSt) at operating equilibriumTempC
  const viscosityCSt = Math.max(
    8.5,
    Math.round(220.0 * Math.exp(-0.038 * (equilibriumTempC - 40.0)) * 10) / 10
  );

  // Minimum required film viscosity ~ 12.0 cSt
  const filmAdequacy = Math.round((viscosityCSt / 12.0) * 100) / 100;

  let thermalStatus: "NOMINAL" | "ELEVATED" | "CRITICAL" = "NOMINAL";
  if (equilibriumTempC > 95.0 || filmAdequacy < 0.9) {
    thermalStatus = "CRITICAL";
  } else if (equilibriumTempC > 75.0 || filmAdequacy < 1.3) {
    thermalStatus = "ELEVATED";
  }

  return {
    powerInKw: Math.round(powerInKw * 10) / 10,
    powerLossKw: Math.round(powerLossKw * 100) / 100,
    oilTempC: equilibriumTempC,
    ambientTempC,
    operatingViscosityCSt: viscosityCSt,
    thermalStatus,
    filmAdequacyRatio: filmAdequacy,
  };
}