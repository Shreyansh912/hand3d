export interface BearingFaultFrequencies {
  shaftFreq1xHz: number;
  bpfoHz: number; // Outer race fault frequency
  bpfiHz: number; // Inner race fault frequency
  bsfHz: number;  // Rolling ball spin frequency
  ftfHz: number;  // Cage frequency
  outerRaceFaultSeverity: number; // 0.0 (clean) to 1.0 (critical spalling)
  innerRaceFaultSeverity: number;
}

export function computeBearingCharacteristicFrequencies(
  inputRpm: number,
  vibrationRms: number = 1.8,
  isShockAnomaly: boolean = false
): BearingFaultFrequencies {
  const shaftFreq1xHz = Math.round((inputRpm / 60.0) * 10) / 10;

  // Geometry for 6204 Ball Bearing:
  // Pitch diameter dm = 34.0 mm, Ball diameter db = 7.94 mm, Ball count z = 8, Contact angle alpha = 0 deg
  const db = 7.94;
  const dm = 34.0;
  const z = 8;
  const cosAlpha = 1.0;

  const bpfoHz = Math.round((z / 2.0) * shaftFreq1xHz * (1.0 - (db / dm) * cosAlpha) * 10) / 10;
  const bpfiHz = Math.round((z / 2.0) * shaftFreq1xHz * (1.0 + (db / dm) * cosAlpha) * 10) / 10;
  const bsfHz = Math.round(((dm / (2.0 * db)) * shaftFreq1xHz * (1.0 - Math.pow((db / dm) * cosAlpha, 2))) * 10) / 10;
  const ftfHz = Math.round((0.5 * shaftFreq1xHz * (1.0 - (db / dm) * cosAlpha)) * 10) / 10;

  // Fault severity estimation based on vibration RMS and anomaly injection
  const outerRaceFaultSeverity = Math.min(1.0, isShockAnomaly ? 0.88 : (vibrationRms > 3.0 ? 0.65 : 0.12));
  const innerRaceFaultSeverity = Math.min(1.0, isShockAnomaly ? 0.72 : (vibrationRms > 3.5 ? 0.52 : 0.08));

  return {
    shaftFreq1xHz,
    bpfoHz,
    bpfiHz,
    bsfHz,
    ftfHz,
    outerRaceFaultSeverity,
    innerRaceFaultSeverity,
  };
}