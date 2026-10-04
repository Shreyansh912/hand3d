export interface KinematicState {
  inputRpm: number;
  inputTorqueNm: number;
  gearRatio: number;
  outputRpm: number;
  outputTorqueNm: number;
  pitchVelocityMs: number;
  tangentialForceN: number;
  rootStressMpa: number;
}

export function computeGearStress(
  inputRpm: number,
  inputTorqueNm: number,
  pinionTeeth = 20,
  gearTeeth = 30,
  moduleMm = 2.5,
  faceWidthMm = 25
): KinematicState {
  const gearRatio = gearTeeth / pinionTeeth; // 1.5
  const outputRpm = inputRpm / gearRatio;
  const outputTorqueNm = inputTorqueNm * gearRatio * 0.96; // 96% mechanical efficiency

  const pitchDiameterM = (pinionTeeth * moduleMm) / 1000.0; // 0.050 m
  const omegaRadS = (2 * Math.PI * inputRpm) / 60.0;
  const pitchVelocityMs = (omegaRadS * pitchDiameterM) / 2.0;

  // Tangential Mesh Force: Ft = 2 * T / d
  const tangentialForceN = (2.0 * inputTorqueNm) / pitchDiameterM;

  // Lewis Bending Formula approximation: sigma_b = Ft / (b * m * Y)
  const lewisY = 0.32;
  const bM = faceWidthMm / 1000.0;
  const mM = moduleMm / 1000.0;
  const rootStressPa = tangentialForceN / (bM * mM * lewisY);
  const rootStressMpa = rootStressPa / 1e6;

  return {
    inputRpm,
    inputTorqueNm,
    gearRatio,
    outputRpm: Math.round(outputRpm),
    outputTorqueNm: Math.round(outputTorqueNm * 10) / 10,
    pitchVelocityMs: Math.round(pitchVelocityMs * 100) / 100,
    tangentialForceN: Math.round(tangentialForceN),
    rootStressMpa: Math.round(rootStressMpa * 10) / 10,
  };
}