export interface ShaftDeflectionMetrics {
  tangentialForceN: number;
  radialForceN: number;
  resultantForceN: number;
  midspanDeflectionMicrons: number;
  bearingTiltMrad: number;
  isAngularTiltCritical: boolean;
  maxAllowableTiltMrad: number;
}

export function computeShaftDeflection(
  inputTorqueNm: number
): ShaftDeflectionMetrics {
  // Pinion radius = 0.025 m (d = 50 mm)
  const tangentialForceN = (inputTorqueNm / 0.025);
  // Pressure angle alpha = 20 deg
  const radialForceN = tangentialForceN * Math.tan((20.0 * Math.PI) / 180.0);
  const resultantForceN = Math.sqrt(tangentialForceN ** 2 + radialForceN ** 2);

  // Shaft material: AISI 4140, E = 210 GPa = 210,000 N/mm^2
  // Shaft diameter d = 25 mm, Span between bearings L = 220 mm
  // Second moment of area I = (pi * d^4) / 64
  const dMm = 25.0;
  const lMm = 220.0;
  const eMpa = 210000.0;
  const momentOfInertiaI = (Math.PI * Math.pow(dMm, 4)) / 64.0;

  // Simply supported center load midspan deflection: delta = (F * L^3) / (48 * E * I)
  // Yields deflection in millimeters
  const deflectionMm = (resultantForceN * Math.pow(lMm, 3)) / (48.0 * eMpa * momentOfInertiaI);
  const midspanDeflectionMicrons = Math.round(deflectionMm * 1000.0 * 10.0) / 10.0;

  // Slope / Angular tilt at bearing support: theta = (F * L^2) / (16 * E * I) radians
  const tiltRadians = (resultantForceN * Math.pow(lMm, 2)) / (16.0 * eMpa * momentOfInertiaI);
  const bearingTiltMrad = Math.round(tiltRadians * 1000.0 * 100.0) / 100.0;

  // Max allowable angular misalignment for standard deep-groove ball bearings (10 arcminutes ~ 2.9 mrad)
  const maxAllowableTiltMrad = 2.9;
  const isAngularTiltCritical = bearingTiltMrad > maxAllowableTiltMrad;

  return {
    tangentialForceN: Math.round(tangentialForceN),
    radialForceN: Math.round(radialForceN),
    resultantForceN: Math.round(resultantForceN),
    midspanDeflectionMicrons,
    bearingTiltMrad,
    isAngularTiltCritical,
    maxAllowableTiltMrad,
  };
}