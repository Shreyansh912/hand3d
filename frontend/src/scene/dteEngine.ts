export interface DTEMetrics {
  peakToPeakTeMicrons: number;
  rmsTeMicrons: number;
  stiffnessTransitionPhaseRad: number;
  gearWhineDbaEstimate: number;
  meshQualityGradeISO: "GRADE_4_PRECISION" | "GRADE_6_COMMERCIAL" | "GRADE_8_COARSE";
  teWaveform: number[]; // Rolling 32-sample cyclical tooth mesh TE trace
}

export function computeDynamicTransmissionError(
  inputTorqueNm: number,
  inputRpm: number,
  latestRunoutMicrons: number = 0.0
): DTEMetrics {
  // Tooth mesh stiffness variations fluctuate with load and runout
  const baseDeflectionMicrons = (inputTorqueNm / 200.0) * 4.2;
  const runoutModulation = Math.abs(latestRunoutMicrons) * 0.35;
  const peakToPeakTeMicrons = Math.round((baseDeflectionMicrons + runoutModulation + 1.2) * 10) / 10;
  const rmsTeMicrons = Math.round((peakToPeakTeMicrons / Math.SQRT2) * 10) / 10;

  // Approximate noise radiation level (AGMA 915 correlation)
  const pitchLineVelocity = ((2.0 * Math.PI * inputRpm) / 60.0) * 0.025;
  const gearWhineDbaEstimate = Math.min(
    105,
    Math.round(52.0 + 12.0 * Math.log10(Math.max(1.0, pitchLineVelocity)) + peakToPeakTeMicrons * 2.2)
  );

  let meshQualityGradeISO: "GRADE_4_PRECISION" | "GRADE_6_COMMERCIAL" | "GRADE_8_COARSE" = "GRADE_4_PRECISION";
  if (peakToPeakTeMicrons > 6.5) {
    meshQualityGradeISO = "GRADE_8_COARSE";
  } else if (peakToPeakTeMicrons > 3.5) {
    meshQualityGradeISO = "GRADE_6_COMMERCIAL";
  }

  // Generate a 32-point rolling cyclical mesh stiffness TE profile
  const teWaveform: number[] = [];
  const samples = 32;
  for (let i = 0; i < samples; i++) {
    const phi = (i / samples) * 2 * Math.PI;
    // Fundamental tooth meshing frequency ripple + 2nd harmonic
    const sampleVal =
      (peakToPeakTeMicrons / 2.0) *
      (Math.sin(phi) + 0.35 * Math.sin(2.0 * phi + 0.4) + 0.15 * Math.sin(4.0 * phi));
    teWaveform.push(Math.round(sampleVal * 100) / 100);
  }

  return {
    peakToPeakTeMicrons,
    rmsTeMicrons,
    stiffnessTransitionPhaseRad: Math.PI / 4,
    gearWhineDbaEstimate,
    meshQualityGradeISO,
    teWaveform,
  };
}