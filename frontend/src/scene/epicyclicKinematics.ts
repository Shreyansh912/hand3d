export interface EpicyclicMetrics {
  sunTeeth: number;
  planetTeeth: number;
  ringTeeth: number;
  planetCount: number;
  overallRatio: number;
  carrierRpm: number;
  planetSpinRpm: number;
  meshSharingFactorKGamma: number;
  torquePerPlanetNm: number;
  meshStatus: "BALANCED" | "ECCENTRIC_UNBALANCE";
}

export function computeEpicyclicKinematics(
  inputShaftRpm: number,
  transmittedTorqueNm: number,
  carrierEccentricityMicrons: number = 0
): EpicyclicMetrics {
  // Epicyclic stage geometry
  const sunTeeth = 18;
  const planetTeeth = 27;
  const ringTeeth = 72; // Valid meshing condition: z_r = z_s + 2 * z_p = 18 + 54 = 72
  const planetCount = 3;

  // Kinematic ratio with fixed ring gear: i = 1 + z_r / z_s = 1 + 72/18 = 5.0
  const overallRatio = 1.0 + ringTeeth / sunTeeth;
  const carrierRpm = Math.round((inputShaftRpm / overallRatio) * 10) / 10;

  // Relative planet spin speed about its own pin axis
  const planetSpinRpm = Math.round((carrierRpm * (ringTeeth / planetTeeth)) * 10) / 10;

  // ISO 6336-1 Load sharing factor K_gamma
  // Carrier hole positional runout introduces load splitting imbalance
  const eccentricityPenalty = (carrierEccentricityMicrons / 20.0) * 0.12;
  const meshSharingFactorKGamma = Math.round((1.12 + eccentricityPenalty) * 100) / 100;

  // Individual planet torque distribution with sharing factor
  const nominalPlanetTorque = transmittedTorqueNm / planetCount;
  const peakPlanetTorque = Math.round((nominalPlanetTorque * meshSharingFactorKGamma) * 10) / 10;

  const meshStatus = meshSharingFactorKGamma > 1.25 ? "ECCENTRIC_UNBALANCE" : "BALANCED";

  return {
    sunTeeth,
    planetTeeth,
    ringTeeth,
    planetCount,
    overallRatio,
    carrierRpm,
    planetSpinRpm,
    meshSharingFactorKGamma,
    torquePerPlanetNm: peakPlanetTorque,
    meshStatus,
  };
}