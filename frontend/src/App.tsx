import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { HandTracker } from "./vision/HandTracker";
import { GestureClassifier, type GestureState, type GestureType } from "./vision/GestureEngine";
import { MechanicalGearbox, type ComponentMetadata } from "./scene/MechanicalGearbox";
import { SpatialCursor } from "./scene/SpatialCursor";
import { SpatialAnnotation } from "./scene/SpatialAnnotation";
import { SpatialCaliper } from "./scene/SpatialCaliper";
import { MeshRunoutGauge } from "./scene/MeshRunoutGauge";
import { RunoutOscilloscope } from "./scene/RunoutOscilloscope";
import { BearingWhirlOrbit } from "./scene/BearingWhirlOrbit";
import { computeBearingFatigue } from "./scene/bearingFatigue";
import { evaluateClearances } from "./scene/InterferenceEngine";
import { computeThermalState } from "./scene/thermalEngine";
import { computeContactPattern } from "./scene/MeshBacklashAnalyzer";
import { ContactPatternOverlay } from "./scene/ContactPatternOverlay";
import { NominalGhostOverlay } from "./scene/NominalGhostOverlay";
import { computeShaftDeflection } from "./scene/shaftDeflection";
import { ShaftDeflectionOverlay } from "./scene/ShaftDeflectionOverlay";
import { computeEpicyclicKinematics } from "./scene/epicyclicKinematics";
import { PlanetCarrierVisualizer } from "./scene/PlanetCarrierVisualizer";
import { MeshFlankGapOverlay } from "./scene/MeshFlankGapOverlay";
import { computeFlankCrowningOptimization } from "./scene/flankCrowningEngine";
import { FlankCrowningHUD } from "./scene/FlankCrowningHUD";
import { computeThermalExpansion } from "./scene/thermalExpansion";
import { ThermalExpansionHUD } from "./scene/ThermalExpansionHUD";
import { computeScuffingFlashTemp } from "./scene/scuffingFlashEngine";
import { ScuffingFlashHUD } from "./scene/ScuffingFlashHUD";
import { computeDynamicTransmissionError } from "./scene/dteEngine";
import { DTEOscilloscopeHUD } from "./scene/DTEOscilloscopeHUD";
import { RainflowEngine } from "./scene/rainflowFatigueEngine";
import { RainflowFatigueHUD } from "./scene/RainflowFatigueHUD";
import { computeAdvancedBearingLife } from "./scene/bearingCleanlinessEngine";
import { BearingCleanlinessHUD } from "./scene/BearingCleanlinessHUD";
import { computeBearingCharacteristicFrequencies } from "./audio/envelopeDemodulator";
import { EnvelopeSpectrumHUD } from "./scene/EnvelopeSpectrumHUD";
import { AcousticEngine } from "./audio/AcousticEngine";
import { AcousticSpectrumHUD } from "./scene/AcousticSpectrumHUD";
import { useSensorStream } from "./telemetry/useSensorStream";
import { computePredictiveHealth } from "./telemetry/predictiveMaintenance";
import { MaintenanceAlertModal } from "./scene/MaintenanceAlertModal";

// --- Inline ASTM D664 / D7418 Oil Chemistry Engine ---
export interface OilChemistryMetrics {
  totalAcidNumberMgKoh: number;
  oxidationRateFactor: number;
  additiveDepletionPercent: number;
  moisturePpm: number;
  hoursUntilOilDrain: number;
  lubricantHealthStatus: "NORMAL" | "DEGRADED" | "IMMEDIATE_CHANGE_REQUIRED";
}

const BASELINE_TAN = 0.35;
const FRESH_OIL_LIFE_HOURS = 8000;

export function computeOilChemistry(
  oilTempC: number,
  runningHoursEstimate: number = 1800,
  vibrationRms: number = 1.8
): OilChemistryMetrics {
  const tempDelta = Math.max(0, oilTempC - 60.0);
  const oxidationRateFactor = Math.round(Math.pow(2.0, tempDelta / 10.0) * 100) / 100;
  const tanAccumulation = (runningHoursEstimate / 1000.0) * 0.18 * oxidationRateFactor;
  const currentTan = Math.round((BASELINE_TAN + tanAccumulation) * 100) / 100;
  const chatterFactor = Math.max(1.0, vibrationRms / 2.0);
  const depletionRate = (runningHoursEstimate / FRESH_OIL_LIFE_HOURS) * oxidationRateFactor * chatterFactor;
  const additiveDepletionPercent = Math.min(100.0, Math.round(depletionRate * 45.0 * 10) / 10);
  const moisturePpm = Math.min(950, Math.round(85 + (oilTempC > 80 ? 40 : 180) + (runningHoursEstimate * 0.04)));
  const effectiveHoursUsed = runningHoursEstimate * oxidationRateFactor;
  const remainingHours = Math.max(0, Math.round(FRESH_OIL_LIFE_HOURS - effectiveHoursUsed));

  let lubricantHealthStatus: "NORMAL" | "DEGRADED" | "IMMEDIATE_CHANGE_REQUIRED" = "NORMAL";
  if (currentTan > 2.0 || additiveDepletionPercent > 75.0 || remainingHours < 500) {
    lubricantHealthStatus = "IMMEDIATE_CHANGE_REQUIRED";
  } else if (currentTan > 1.0 || additiveDepletionPercent > 45.0 || remainingHours < 2000) {
    lubricantHealthStatus = "DEGRADED";
  }

  return {
    totalAcidNumberMgKoh: currentTan,
    oxidationRateFactor,
    additiveDepletionPercent,
    moisturePpm,
    hoursUntilOilDrain: remainingHours,
    lubricantHealthStatus,
  };
}

const OilChemistryHUD: React.FC<{ metrics: OilChemistryMetrics; oilTempC: number }> = ({ metrics, oilTempC }) => {
  const statusBg =
    metrics.lubricantHealthStatus === "NORMAL"
      ? "#064e3b"
      : metrics.lubricantHealthStatus === "DEGRADED"
      ? "#78350f"
      : "#7f1d1d";

  const statusColor =
    metrics.lubricantHealthStatus === "NORMAL"
      ? "#6ee7b7"
      : metrics.lubricantHealthStatus === "DEGRADED"
      ? "#fde68a"
      : "#fca5a5";

  return (
    <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "#38bdf8",
          marginBottom: 8,
          borderBottom: "1px solid #334155",
          paddingBottom: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Lube Oxidation (ASTM D664)</span>
        <span
          style={{
            fontSize: 9,
            padding: "2px 6px",
            borderRadius: 4,
            background: statusBg,
            color: statusColor,
            fontWeight: "bold",
          }}
        >
          {metrics.lubricantHealthStatus}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Total Acid Number (TAN):</span>
          <b style={{ color: metrics.totalAcidNumberMgKoh > 1.5 ? "#ef4444" : "#f8fafc" }}>
            {metrics.totalAcidNumberMgKoh} mg KOH/g (Limit: 2.0)
          </b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Oxidation Rate (Arrhenius):</span>
          <span style={{ color: metrics.oxidationRateFactor > 2.5 ? "#ef4444" : "#38bdf8" }}>
            {metrics.oxidationRateFactor}x @ {oilTempC}°C
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>EP Additive Depletion:</span>
          <span style={{ color: metrics.additiveDepletionPercent > 70 ? "#ef4444" : "#fbbf24" }}>
            {metrics.additiveDepletionPercent}% Depleted
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Service Hours Remaining:</span>
          <b style={{ color: metrics.hoursUntilOilDrain < 1000 ? "#ef4444" : "#4ade80" }}>
            {metrics.hoursUntilOilDrain.toLocaleString()} hrs
          </b>
        </div>
      </div>
    </div>
  );
};

interface CitedStandard {
  title: string;
  standard_codes: string[];
  relevance_score: number;
}

interface DiagnosticsResponse {
  component_id: string;
  answer: string;
  key_factors: string[];
  failure_risks: string[];
  suggested_inspections: string[];
  cited_standards?: CitedStandard[];
}

const COMPONENT_ANCHORS: Record<string, [number, number, number]> = {
  Driver_Pinion_20T: [0.2, -0.9, 0.6],
  Driven_Gear_30T: [0.2, 1.05, 0.6],
  Input_Shaft: [0.0, -0.9, 0.3],
  Output_Shaft: [0.0, 1.05, 0.3],
  Bearing_Input_A: [-1.1, -0.9, 0.5],
  Bearing_Input_B: [1.1, -0.9, 0.5],
  Bearing_Output_A: [-1.1, 1.05, 0.5],
  Bearing_Output_B: [1.1, 1.05, 0.5],
  Housing_Base: [0.0, 0.075, 1.2],
};

export const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fpsTextRef = useRef<HTMLSpanElement>(null);
  const gestureLabelRef = useRef<HTMLDivElement>(null);
  const pinchMetricRef = useRef<HTMLDivElement>(null);

  const trackerRef = useRef<HandTracker | null>(null);
  const classifierRef = useRef<GestureClassifier>(new GestureClassifier());
  const activeGestureRef = useRef<GestureState | null>(null);

  const audioRef = useRef<AcousticEngine>(new AcousticEngine());
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);

  const rainflowEngineRef = useRef<RainflowEngine>(new RainflowEngine());

  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [explodedProgress, setExplodedProgress] = useState<number>(0);
  const [selectedComponent, setSelectedComponent] = useState<ComponentMetadata | null>(null);

  const [isIsolated, setIsIsolated] = useState<boolean>(false);
  const [sectionCut, setSectionCut] = useState<boolean>(false);
  const [isCaliperMode, setIsCaliperMode] = useState<boolean>(false);
  const [caliperPoints, setCaliperPoints] = useState<[THREE.Vector3 | null, THREE.Vector3 | null]>([null, null]);
  const [showNominalGhost, setShowNominalGhost] = useState<boolean>(false);
  const [showDeflectionVectors, setShowDeflectionVectors] = useState<boolean>(true);
  const [showCarrierVisualizer, setShowCarrierVisualizer] = useState<boolean>(true);
  const [showFlankGap, setShowFlankGap] = useState<boolean>(true);
  const [isCrowningApplied, setIsCrowningApplied] = useState<boolean>(false);
  const [useStressShader, setUseStressShader] = useState<boolean>(false);

  const [isRunoutActive, setIsRunoutActive] = useState<boolean>(false);
  const [runoutHistory, setRunoutHistory] = useState<number[]>([]);

  const [inputTorqueNm, setInputTorqueNm] = useState<number>(60);
  const [inputRpm, setInputRpm] = useState<number>(1200);

  const [isLiveSensorMode, setIsLiveSensorMode] = useState<boolean>(false);
  const { telemetry: liveSensorPacket, isConnected: isSensorConnected } = useSensorStream(isLiveSensorMode);

  useEffect(() => {
    if (isLiveSensorMode && liveSensorPacket) {
      setInputRpm(liveSensorPacket.sensor_rpm);
      setInputTorqueNm(liveSensorPacket.sensor_torque_nm);
    }
  }, [isLiveSensorMode, liveSensorPacket]);

  const [inspectedComponents, setInspectedComponents] = useState<string[]>([]);
  const [diagnosticsHistory, setDiagnosticsHistory] = useState<DiagnosticsResponse[]>([]);
  const [maxObservedStress, setMaxObservedStress] = useState<number>(0);

  const [aiResponse, setAiResponse] = useState<DiagnosticsResponse | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [customQuery, setCustomQuery] = useState<string>("");

  const [isAlertDismissed, setIsAlertDismissed] = useState<boolean>(false);

  useEffect(() => {
    audioRef.current.updateAcoustics(inputRpm, inputTorqueNm);
  }, [inputRpm, inputTorqueNm]);

  const toggleAudio = () => {
    if (isAudioMuted) {
      audioRef.current.init();
      audioRef.current.setMute(false);
      setIsAudioMuted(false);
    } else {
      audioRef.current.setMute(true);
      setIsAudioMuted(true);
    }
  };

  const handleCaliperPointSelect = (pt: THREE.Vector3) => {
    setCaliperPoints((prev) => {
      if (!prev[0] || (prev[0] && prev[1])) {
        return [pt, null];
      }
      return [prev[0], pt];
    });
  };

  const handleSampleDeviation = (val: number) => {
    setRunoutHistory((prev) => {
      const next = [...prev, val];
      if (next.length > 50) next.shift();
      return next;
    });
  };

  useEffect(() => {
    const tracker = new HandTracker();
    trackerRef.current = tracker;

    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastVideoTime = -1;
    let currentGesture: GestureType = "NEUTRAL";

    const startPipeline = async () => {
      try {
        await tracker.init();
        setIsModelReady(true);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const loop = (timestamp: number) => {
          const video = videoRef.current;

          if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;

            const result = tracker.processVideoFrame(video, timestamp);

            frameCount++;
            if (timestamp - lastTime >= 1000) {
              if (fpsTextRef.current) {
                fpsTextRef.current.textContent = frameCount.toString();
              }
              frameCount = 0;
              lastTime = timestamp;
            }

            if (result && result.smoothedLandmarks.length > 0) {
              const state = classifierRef.current.evaluate(result.smoothedLandmarks);
              activeGestureRef.current = state;

              if (gestureLabelRef.current && state.gesture !== currentGesture) {
                currentGesture = state.gesture;
                gestureLabelRef.current.textContent = state.gesture;
                gestureLabelRef.current.style.color = state.gesture === "PINCH" ? "#4ade80" : "#38bdf8";
              }

              if (pinchMetricRef.current) {
                pinchMetricRef.current.textContent = `Pinch: ${state.pinchDistance.toFixed(2)}`;
              }

              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext("2d");
                if (ctx) {
                  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                  const p8 = result.smoothedLandmarks[8];
                  const p4 = result.smoothedLandmarks[4];

                  ctx.fillStyle = state.gesture === "PINCH" ? "#22c55e" : "#eab308";
                  ctx.beginPath();
                  ctx.arc(p8.x * canvasRef.current.width, p8.y * canvasRef.current.height, 6, 0, 2 * Math.PI);
                  ctx.fill();

                  if (state.gesture === "PINCH") {
                    ctx.strokeStyle = "#22c55e";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(p8.x * canvasRef.current.width, p8.y * canvasRef.current.height);
                    ctx.lineTo(p4.x * canvasRef.current.width, p4.y * canvasRef.current.height);
                    ctx.stroke();
                  }
                }
              }
            } else {
              activeGestureRef.current = null;
              if (gestureLabelRef.current) {
                gestureLabelRef.current.textContent = "SEARCHING...";
                gestureLabelRef.current.style.color = "#94a3b8";
              }
            }
          }

          animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
      } catch (err) {
        console.error("Camera pipeline initialization failed:", err);
      }
    };

    startPipeline();

    return () => {
      cancelAnimationFrame(animationFrameId);
      audioRef.current.close();
    };
  }, []);

  const handleSelectComponent = (meta: ComponentMetadata | null) => {
    setSelectedComponent(meta);
    setAiResponse(null);
  };

  const handleAskAi = async (questionText: string) => {
    if (!selectedComponent) return;
    setIsLoadingAi(true);

    try {
      const metaRes = await fetch("http://localhost:8000/components/" + selectedComponent.id);
      if (!metaRes.ok) throw new Error("Component not found in backend registry");
      const compData = await metaRes.json();

      const diagRes = await fetch("http://localhost:8000/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component_id: selectedComponent.id,
          query: questionText,
          component_context: compData,
        }),
      });

      if (!diagRes.ok) throw new Error("Diagnostic engine returned an error");
      const data: DiagnosticsResponse = await diagRes.json();
      setAiResponse(data);
      setDiagnosticsHistory((prev) => [...prev, data]);
      setInspectedComponents((prev) => Array.from(new Set([...prev, selectedComponent.id])));
    } catch (err) {
      console.error("AI Assistant connection error:", err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const ftValue = Math.round((2.0 * inputTorqueNm) / 0.05);
  const vtValue = (((2 * Math.PI * inputRpm) / 60.0) * 0.025).toFixed(2);
  const sigmaValue = Math.round((ftValue / (0.025 * 0.0025 * 0.32)) / 1e6);
  const isStressHigh = sigmaValue > 180;

  // Real-time Rainflow Cycle Counting & Fatigue Accumulation
  useEffect(() => {
    rainflowEngineRef.current.sampleStress(sigmaValue);
  }, [sigmaValue]);

  const rainflowMetrics = rainflowEngineRef.current.getMetrics();

  const clearanceStatus = evaluateClearances(inputTorqueNm, explodedProgress);
  const thermalData = computeThermalState(inputTorqueNm, inputRpm);

  const latestRunout = runoutHistory[runoutHistory.length - 1] ?? 0;
  const contactData = computeContactPattern(inputTorqueNm, latestRunout);
  const deflectionData = computeShaftDeflection(inputTorqueNm);

  // Micro-geometry Flank Crowning & Lead Optimization
  const crowningData = computeFlankCrowningOptimization(
    contactData.faceLoadFactorKhBeta,
    deflectionData.bearingTiltMrad
  );

  const isBearingSelected = selectedComponent?.type.includes("Bearing") ?? false;
  const bearingFatigueData =
    isBearingSelected && selectedComponent
      ? computeBearingFatigue(selectedComponent.id, inputTorqueNm, inputRpm)
      : null;

  const currentVibe = liveSensorPacket?.vibration_rms_mms ?? (1.4 + (inputTorqueNm / 200) * 1.8);
  const nominalBearingLife = bearingFatigueData?.ratingLifeHours ?? 25000;

  // ISO 281 Appendix A Advanced Rating Life & Contamination Factor (e_C)
  const bearingCleanlinessData = computeAdvancedBearingLife(
    nominalBearingLife,
    thermalData.oilTempC,
    2100,
    currentVibe
  );

  const prediction = computePredictiveHealth(
    currentVibe,
    thermalData.oilTempC,
    bearingCleanlinessData.modifiedRatingLifeLnmh,
    liveSensorPacket?.is_shock_anomaly ?? false
  );

  const oilChemistryData = computeOilChemistry(
    thermalData.oilTempC,
    2100,
    currentVibe
  );

  const epicyclicData = computeEpicyclicKinematics(
    inputRpm,
    inputTorqueNm,
    latestRunout
  );

  const thermalExpansionData = computeThermalExpansion(
    thermalData.oilTempC,
    inputTorqueNm
  );

  const scuffingData = computeScuffingFlashTemp(
    inputTorqueNm,
    inputRpm,
    thermalData.oilTempC
  );

  const dteData = computeDynamicTransmissionError(
    inputTorqueNm,
    inputRpm,
    latestRunout
  );

  const envelopeData = computeBearingCharacteristicFrequencies(
    inputRpm,
    currentVibe,
    liveSensorPacket?.is_shock_anomaly ?? false
  );

  const showAlertModal = !isAlertDismissed && prediction.maintenanceStatus === "CRITICAL_ACTION_REQUIRED";

  useEffect(() => {
    if (sigmaValue > maxObservedStress) {
      setMaxObservedStress(sigmaValue);
    }
  }, [sigmaValue, maxObservedStress]);

  const handleExportReport = async () => {
    try {
      let measuredMm: number | null = null;
      if (caliperPoints[0] && caliperPoints[1]) {
        measuredMm = parseFloat((caliperPoints[0].distanceTo(caliperPoints[1]) * 50.0).toFixed(2));
      }

      const peakRunout =
        runoutHistory.length > 0 ? Math.max(...runoutHistory.map(Math.abs)) : null;

      const payload = {
        selected_components: inspectedComponents,
        max_torque_nm: inputTorqueNm,
        max_stress_mpa: Math.max(maxObservedStress, sigmaValue),
        operating_speed_rpm: inputRpm,
        diagnostics_history: diagnosticsHistory,
        metrology: {
          caliper_distance_mm: measuredMm,
          max_runout_microns: peakRunout,
          runout_din_grade_compliant: peakRunout !== null ? peakRunout <= 15.0 : null,
          normal_backlash_mm: contactData.normalBacklashMm,
          face_load_kh_beta: contactData.faceLoadFactorKhBeta,
          flank_crowning_c_beta_microns: crowningData.recommendedCrowningMicrons,
          flank_crowning_applied: isCrowningApplied,
          optimized_face_load_kh_beta: isCrowningApplied ? crowningData.optimizedFaceLoadKhBeta : crowningData.rawFaceLoadKhBeta,
          sump_temperature_c: thermalData.oilTempC,
          clearance_margin_mm: clearanceStatus.minClearanceMm,
          oil_tan_mg_koh: oilChemistryData.totalAcidNumberMgKoh,
          oil_oxidation_factor: oilChemistryData.oxidationRateFactor,
          oil_health_status: oilChemistryData.lubricantHealthStatus,
          tip_relief_required_microns: thermalExpansionData.tipReliefRequiredMicrons,
          net_center_growth_mm: thermalExpansionData.netCenterDistanceGrowthMm,
          contact_peak_temp_c: scuffingData.contactTotalTempC,
          scuffing_safety_factor: scuffingData.scuffingSafetyFactor,
          scuffing_risk_level: scuffingData.scuffingRiskLevel,
          dynamic_transmission_error_pk_pk_um: dteData.peakToPeakTeMicrons,
          iso_mesh_quality_grade: dteData.meshQualityGradeISO,
          palmgren_miner_damage_d: rainflowMetrics.cumulativeMinerDamage,
          fatigue_life_consumed_percent: rainflowMetrics.fatigueLifeConsumedPercent,
          total_counted_stress_cycles: rainflowMetrics.totalCountedCycles,
          iso_4406_cleanliness_code: bearingCleanlinessData.iso4406Code,
          contamination_factor_ec: bearingCleanlinessData.contaminationFactorEc,
          iso_281_a_iso_factor: bearingCleanlinessData.aIsoFactor,
          modified_bearing_life_lnmh: bearingCleanlinessData.modifiedRatingLifeLnmh,
          bpfo_fault_frequency_hz: envelopeData.bpfoHz,
          outer_race_fault_severity: envelopeData.outerRaceFaultSeverity,
        },
      };

      const res = await fetch("http://localhost:8000/inspection/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to compile inspection dispatch");
      const report = await res.json();

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const jsonUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = jsonUrl;
      link.download = report.report_id + ".json";
      link.click();
      URL.revokeObjectURL(jsonUrl);

      const printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${report.report_id} - Inspection Certificate</title>
              <style>
                body { font-family: monospace; background: #0f172a; color: #f8fafc; padding: 24px; }
                h1 { color: #38bdf8; font-size: 20px; border-bottom: 2px solid #334155; padding-bottom: 8px; }
                .badge { padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 13px; display: inline-block; }
                .pass { background: #064e3b; color: #6ee7b7; border: 1px solid #10b981; }
                .fail { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                th, td { border: 1px solid #334155; padding: 8px 12px; font-size: 12px; text-align: left; }
                th { background: #1e293b; color: #94a3b8; }
                .section-title { font-size: 14px; color: #fbbf24; margin-top: 18px; text-transform: uppercase; }
              </style>
            </head>
            <body>
              <h1>⚙️ HAND3D QUALITY AUDIT CERTIFICATE</h1>
              <p><b>Report ID:</b> ${report.report_id} &nbsp;|&nbsp; <b>Timestamp:</b> ${report.generation_time}</p>
              <div class="badge ${report.overall_status === "CERTIFIED_PASS" ? "pass" : "fail"}">
                FINAL AUDIT STATUS: ${report.overall_status}
              </div>

              <div class="section-title">Standard Compliance Scorecard</div>
              <table>
                <tr><th>Standard</th><th>Observed Value</th><th>Limit / Threshold</th><th>Audit Result</th></tr>
                ${Object.entries(report.compliance_scorecard).map(([k, v]: [string, any]) => `
                  <tr>
                    <td><b>${k}</b></td>
                    <td>${v.metric}</td>
                    <td>${v.threshold}</td>
                    <td style="color: ${v.passed ? '#4ade80' : '#ef4444'}; font-weight: bold;">
                      ${v.passed ? '✓ COMPLIANT' : '✗ VIOLATION'}
                    </td>
                  </tr>
                `).join('')}
              </table>

              <div class="section-title">Operating Kinematics & Metrology</div>
              <table>
                <tr><th>Parameter</th><th>Value</th></tr>
                <tr><td>Input Speed / Torque</td><td>${report.operating_kinematics.operating_rpm} RPM / ${report.operating_kinematics.input_torque_nm} Nm</td></tr>
                <tr><td>Max Tooth Root Stress</td><td>${report.operating_kinematics.max_root_bending_stress_mpa} MPa</td></tr>
                <tr><td>Palmgren-Miner Fatigue (D)</td><td>${report.metrology_summary.palmgren_miner_damage_d ?? 'N/A'}</td></tr>
                <tr><td>Modified Bearing Life (Lnmh)</td><td>${report.metrology_summary.modified_bearing_life_lnmh?.toLocaleString() ?? 'N/A'} hrs</td></tr>
                <tr><td>Lube Cleanliness Code</td><td>ISO ${report.metrology_summary.iso_4406_cleanliness_code ?? 'N/A'}</td></tr>
                <tr><td>Contamination Factor (eC)</td><td>${report.metrology_summary.contamination_factor_ec ?? 'N/A'}</td></tr>
                <tr><td>Normal Backlash (jn)</td><td>${report.metrology_summary.normal_backlash_mm ?? 'N/A'} mm</td></tr>
                <tr><td>Face Load Factor (KHβ)</td><td>${report.metrology_summary.face_load_kh_beta ?? 'N/A'}</td></tr>
                <tr><td>Optimized KHβ (Crowned)</td><td>${report.metrology_summary.optimized_face_load_kh_beta ?? 'N/A'}</td></tr>
                <tr><td>Peak Mesh Runout (Fr)</td><td>${report.metrology_summary.peak_runout_microns ?? 'N/A'} µm</td></tr>
                <tr><td>Lube Total Acid Number (TAN)</td><td>${report.metrology_summary.oil_tan_mg_koh ?? 'N/A'} mg KOH/g</td></tr>
                <tr><td>Dynamic Transmission Error</td><td>${report.metrology_summary.dynamic_transmission_error_pk_pk_um ?? 'N/A'} µm</td></tr>
                <tr><td>Scuffing Safety Factor (S_intS)</td><td>${report.metrology_summary.scuffing_safety_factor ?? 'N/A'}</td></tr>
                <tr><td>Peak Contact Temp (θ_B)</td><td>${report.metrology_summary.contact_peak_temp_c ?? 'N/A'} °C</td></tr>
                <tr><td>BPFO Fault Characteristic</td><td>${report.metrology_summary.bpfo_fault_frequency_hz ?? 'N/A'} Hz</td></tr>
              </table>

              <p style="font-size: 10px; color: #64748b; margin-top: 24px;">Generated by Hand3D Digital Twin Engine. Conforms to DIN 3962, ISO 6336, ISO 21771, ASTM D664, DIN 3960, ISO/TS 6336-21, ISO/TR 10064, ISO 6336-6, ASTM E1049, ISO 281 App A, ISO 4406, ISO 13373, and ISO/TR 14179 testing specifications.</p>
            </body>
          </html>
        `);
        printWin.document.close();
      }
    } catch (err) {
      console.error("Export failure:", err);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        backgroundColor: "#0b0f19",
        color: "#f8fafc",
        fontFamily: "monospace",
        overflow: "hidden",
      }}
    >
      <MaintenanceAlertModal
        prediction={prediction}
        isOpen={showAlertModal}
        onDismiss={() => setIsAlertDismissed(true)}
        inputRpm={inputRpm}
        inputTorqueNm={inputTorqueNm}
        oilTempC={thermalData.oilTempC}
        vibrationRms={currentVibe}
        selectedComponentId={selectedComponent?.id}
      />

      <div style={{ flex: 1, position: "relative", height: "100%" }}>
        <Canvas camera={{ position: [5, 3, 6], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 15, 8]} intensity={1.8} />
          <directionalLight position={[-10, -5, -8]} intensity={0.4} />

          <NominalGhostOverlay visible={showNominalGhost} />

          <MechanicalGearbox
            gestureStateRef={activeGestureRef}
            explodedProgress={explodedProgress}
            selectedId={selectedComponent?.id ?? null}
            isIsolated={isIsolated}
            sectionCut={sectionCut}
            inputTorqueNm={inputTorqueNm}
            inputRpm={inputRpm}
            isCaliperMode={isCaliperMode}
            useStressShader={useStressShader}
            onSelectComponent={handleSelectComponent}
            onCaliperPointSelect={handleCaliperPointSelect}
          />

          <ContactPatternOverlay
            visible={explodedProgress < 0.05}
            inputTorqueNm={inputTorqueNm}
            contactPatchCenterPercent={contactData.contactPatchCenterPercent}
          />

          <ShaftDeflectionOverlay
            visible={showDeflectionVectors && explodedProgress < 0.05}
            midspanDeflectionMicrons={deflectionData.midspanDeflectionMicrons}
            bearingTiltMrad={deflectionData.bearingTiltMrad}
            isTiltCritical={deflectionData.isAngularTiltCritical}
          />

          <PlanetCarrierVisualizer
            visible={showCarrierVisualizer && explodedProgress < 0.05}
            carrierRpm={epicyclicData.carrierRpm}
            planetCount={epicyclicData.planetCount}
            torquePerPlanetNm={epicyclicData.torquePerPlanetNm}
          />

          <MeshFlankGapOverlay
            visible={showFlankGap && explodedProgress < 0.05}
            normalBacklashMm={contactData.normalBacklashMm}
          />

          {isBearingSelected && selectedComponent && COMPONENT_ANCHORS[selectedComponent.id] && (
            <BearingWhirlOrbit
              anchorPosition={COMPONENT_ANCHORS[selectedComponent.id]}
              inputRpm={inputRpm}
              inputTorqueNm={inputTorqueNm}
              visible={isBearingSelected}
            />
          )}

          <SpatialCaliper pointA={caliperPoints[0]} pointB={caliperPoints[1]} />

          <MeshRunoutGauge
            isActive={isRunoutActive}
            inputRpm={inputRpm}
            inputTorqueNm={inputTorqueNm}
            onSampleDeviation={handleSampleDeviation}
          />

          <SpatialCursor gestureStateRef={activeGestureRef} />

          {selectedComponent && COMPONENT_ANCHORS[selectedComponent.id] && (
            <SpatialAnnotation
              position={COMPONENT_ANCHORS[selectedComponent.id]}
              componentName={selectedComponent.name}
              standardCode={aiResponse?.cited_standards?.[0]?.standard_codes?.[0]}
              riskSummary={aiResponse?.failure_risks?.[0]}
              onDismiss={() => setSelectedComponent(null)}
            />
          )}

          <OrbitControls makeDefault />
        </Canvas>

        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(15, 23, 42, 0.85)",
            padding: "12px 20px",
            borderRadius: 8,
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, color: "#38bdf8" }}>Hand3D Mechanical Explorer</h2>
            <div style={{ fontSize: 12, marginTop: 4, color: "#94a3b8" }}>
              Status: {isModelReady ? "WASM Pipeline Ready" : "Initializing..."} | FPS:{" "}
              <span ref={fpsTextRef} style={{ color: "#38bdf8", fontWeight: "bold" }}>
                0
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "4px 8px",
              background: clearanceStatus.hasViolation ? "#7f1d1d" : "#064e3b",
              border: `1px solid ${clearanceStatus.hasViolation ? "#ef4444" : "#10b981"}`,
              borderRadius: 4,
              fontSize: 11,
              fontWeight: "bold",
              color: clearanceStatus.hasViolation ? "#fca5a5" : "#6ee7b7",
            }}
          >
            {clearanceStatus.hasViolation
              ? `⚠ CLEARANCE VIOLATION (${clearanceStatus.minClearanceMm} mm)`
              : `✓ CLEARANCE SAFE (${clearanceStatus.minClearanceMm} mm)`}
          </div>

          <button
            onClick={toggleAudio}
            style={{
              padding: "6px 12px",
              background: isAudioMuted ? "#1e293b" : "#0284c7",
              color: isAudioMuted ? "#94a3b8" : "#ffffff",
              border: `1px solid ${isAudioMuted ? "#475569" : "#38bdf8"}`,
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: "bold",
            }}
          >
            {isAudioMuted ? "🔇 Unmute Gear Audio" : "🔊 Audio Active (GMF)"}
          </button>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 24,
            right: 400,
            display: "flex",
            gap: 12,
            alignItems: "center",
            background: "rgba(15, 23, 42, 0.85)",
            padding: "12px 20px",
            borderRadius: 8,
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span style={{ fontSize: 12, color: "#94a3b8" }}>EXPLOSION:</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explodedProgress}
            onChange={(e) => setExplodedProgress(parseFloat(e.target.value))}
            style={{ width: 140, accentColor: "#38bdf8", cursor: "pointer" }}
          />
          <span style={{ fontSize: 12, minWidth: 35, textAlign: "right" }}>
            {Math.round(explodedProgress * 100)}%
          </span>

          <div style={{ height: 20, width: 1, backgroundColor: "#334155", margin: "0 6px" }} />

          <button
            onClick={() => setIsIsolated((prev) => !prev)}
            disabled={!selectedComponent}
            style={{
              padding: "6px 12px",
              background: isIsolated ? "#0284c7" : "#1e293b",
              border: `1px solid ${isIsolated ? "#38bdf8" : "#475569"}`,
              color: isIsolated ? "#ffffff" : selectedComponent ? "#38bdf8" : "#64748b",
              borderRadius: 4,
              cursor: selectedComponent ? "pointer" : "not-allowed",
              fontSize: 12,
            }}
          >
            {isIsolated ? "Exit Isolation" : "Isolate Part"}
          </button>

          <button
            onClick={() => setSectionCut((prev) => !prev)}
            style={{
              padding: "6px 12px",
              background: sectionCut ? "#f59e0b" : "#1e293b",
              border: `1px solid ${sectionCut ? "#fbbf24" : "#475569"}`,
              color: sectionCut ? "#000000" : "#fbbf24",
              fontWeight: sectionCut ? "bold" : "normal",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {sectionCut ? "Clear Section" : "Section Cut (Z-Plane)"}
          </button>

          <button
            onClick={() => {
              setIsCaliperMode((prev) => !prev);
              setCaliperPoints([null, null]);
            }}
            style={{
              padding: "6px 12px",
              background: isCaliperMode ? "#0d9488" : "#1e293b",
              border: `1px solid ${isCaliperMode ? "#2dd4bf" : "#475569"}`,
              color: isCaliperMode ? "#ffffff" : "#2dd4bf",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: isCaliperMode ? "bold" : "normal",
            }}
          >
            {isCaliperMode ? "Exit Caliper" : "📏 Caliper"}
          </button>

          <button
            onClick={() => setShowNominalGhost((prev) => !prev)}
            style={{
              padding: "6px 12px",
              background: showNominalGhost ? "#0369a1" : "#1e293b",
              border: `1px solid ${showNominalGhost ? "#38bdf8" : "#475569"}`,
              color: showNominalGhost ? "#ffffff" : "#38bdf8",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: showNominalGhost ? "bold" : "normal",
            }}
          >
            {showNominalGhost ? "👻 Hide Ghost" : "👻 CAD Ghost"}
          </button>

          <button
            onClick={() => setShowDeflectionVectors((prev) => !prev)}
            style={{
              padding: "6px 12px",
              background: showDeflectionVectors ? "#0369a1" : "#1e293b",
              border: `1px solid ${showDeflectionVectors ? "#38bdf8" : "#475569"}`,
              color: showDeflectionVectors ? "#ffffff" : "#38bdf8",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: showDeflectionVectors ? "bold" : "normal",
            }}
          >
            {showDeflectionVectors ? "⚡ Deflection On" : "⚡ Deflection Off"}
          </button>

          <button
            onClick={() => setShowCarrierVisualizer((prev) => !prev)}
            style={{
              padding: "6px 12px",
              background: showCarrierVisualizer ? "#0369a1" : "#1e293b",
              border: `1px solid ${showCarrierVisualizer ? "#38bdf8" : "#475569"}`,
              color: showCarrierVisualizer ? "#ffffff" : "#38bdf8",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: showCarrierVisualizer ? "bold" : "normal",
            }}
          >
            {showCarrierVisualizer ? "🪐 Carrier On" : "🪐 Carrier Off"}
          </button>

          <button
            onClick={() => setShowFlankGap((prev) => !prev)}
            style={{
              padding: "6px 12px",
              background: showFlankGap ? "#0369a1" : "#1e293b",
              border: `1px solid ${showFlankGap ? "#38bdf8" : "#475569"}`,
              color: showFlankGap ? "#ffffff" : "#38bdf8",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: showFlankGap ? "bold" : "normal",
            }}
          >
            {showFlankGap ? "🔍 Flank Gap On" : "🔍 Flank Gap Off"}
          </button>

          <button
            onClick={() => setUseStressShader((prev) => !prev)}
            style={{
              padding: "6px 12px",
              background: useStressShader ? "#b91c1c" : "#1e293b",
              border: `1px solid ${useStressShader ? "#ef4444" : "#475569"}`,
              color: useStressShader ? "#ffffff" : "#ef4444",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: useStressShader ? "bold" : "normal",
            }}
          >
            {useStressShader ? "🔥 FEA Stress Shader" : "FEA Stress Shader"}
          </button>

          <button
            onClick={() => {
              setIsRunoutActive((prev) => !prev);
              setRunoutHistory([]);
            }}
            style={{
              padding: "6px 12px",
              background: isRunoutActive ? "#b45309" : "#1e293b",
              border: `1px solid ${isRunoutActive ? "#f59e0b" : "#475569"}`,
              color: isRunoutActive ? "#ffffff" : "#f59e0b",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: isRunoutActive ? "bold" : "normal",
            }}
          >
            {isRunoutActive ? "Exit Runout" : "🎯 Runout Probe"}
          </button>

          <button
            onClick={() => setIsLiveSensorMode((prev) => !prev)}
            style={{
              padding: "6px 12px",
              background: isLiveSensorMode ? "#15803d" : "#1e293b",
              border: `1px solid ${isLiveSensorMode ? "#22c55e" : "#475569"}`,
              color: isLiveSensorMode ? "#ffffff" : "#4ade80",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: isLiveSensorMode ? "bold" : "normal",
            }}
          >
            {isLiveSensorMode ? "📡 Live IoT Active" : "Manual Mode"}
          </button>

          <button
            onClick={() => {
              setExplodedProgress(0);
              setIsIsolated(false);
              setSectionCut(false);
              setIsRunoutActive(false);
              setIsLiveSensorMode(false);
              setShowNominalGhost(false);
              setShowDeflectionVectors(true);
              setShowCarrierVisualizer(true);
              setShowFlankGap(true);
              setIsCrowningApplied(false);
              setUseStressShader(false);
            }}
            style={{
              padding: "6px 12px",
              background: "#1e293b",
              border: "1px solid #475569",
              color: "#e2e8f0",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Reset CAD
          </button>

          <button
            onClick={handleExportReport}
            style={{
              padding: "6px 12px",
              background: "#0369a1",
              border: "1px solid #38bdf8",
              color: "#ffffff",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: "bold",
              marginLeft: "auto",
            }}
          >
            Export Dispatch Log
          </button>
        </div>
      </div>

      <div
        style={{
          width: 380,
          backgroundColor: "#0f172a",
          borderLeft: "1px solid #1e293b",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflowY: "auto",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            Camera Sensor
          </div>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 180,
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid #334155",
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
            />
            <canvas
              ref={canvasRef}
              width={380}
              height={180}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                transform: "scaleX(-1)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        <div
          style={{
            background: "#1e293b",
            borderRadius: 6,
            padding: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>ACTIVE GESTURE</div>
            <div
              ref={gestureLabelRef}
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#38bdf8",
              }}
            >
              SEARCHING...
            </div>
          </div>
          <div ref={pinchMetricRef} style={{ textAlign: "right", fontSize: 11, color: "#cbd5e1" }}>
            Pinch: 0.00
          </div>
        </div>

        {isLiveSensorMode && (
          <div
            style={{
              background: liveSensorPacket?.is_shock_anomaly ? "#450a0a" : "#022c22",
              border: `1px solid ${liveSensorPacket?.is_shock_anomaly ? "#ef4444" : "#10b981"}`,
              borderRadius: 8,
              padding: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: "bold", color: liveSensorPacket?.is_shock_anomaly ? "#fca5a5" : "#6ee7b7" }}>
                {liveSensorPacket?.is_shock_anomaly ? "⚠ TRANSIENT SHOCK ANOMALY" : "📡 IOT STREAM ONLINE (10 Hz)"}
              </span>
              <span style={{ fontSize: 9, color: "#94a3b8" }}>{isSensorConnected ? "CONNECTED" : "CONNECTING..."}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#cbd5e1" }}>
              <span>Vib RMS: <b>{liveSensorPacket?.vibration_rms_mms ?? 0} mm/s</b></span>
              <span>Speed: <b>{liveSensorPacket?.sensor_rpm ?? 0} RPM</b></span>
              <span>Torque: <b>{liveSensorPacket?.sensor_torque_nm ?? 0} Nm</b></span>
            </div>
          </div>
        )}

        <RunoutOscilloscope samples={runoutHistory} isActive={isRunoutActive} />

        <AcousticSpectrumHUD
          audioEngine={audioRef.current}
          inputRpm={inputRpm}
          inputTorqueNm={inputTorqueNm}
          isAudioMuted={isAudioMuted}
        />

        <EnvelopeSpectrumHUD metrics={envelopeData} vibrationRms={currentVibe} />

        <DTEOscilloscopeHUD metrics={dteData} />

        <RainflowFatigueHUD metrics={rainflowMetrics} />

        <BearingCleanlinessHUD metrics={bearingCleanlinessData} nominalL10h={nominalBearingLife} />

        <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#38bdf8",
              marginBottom: 8,
              borderBottom: "1px solid #334155",
              paddingBottom: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Flank Contact & Backlash</span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 6px",
                borderRadius: 4,
                background: contactData.edgeLoadingRisk ? "#7f1d1d" : "#064e3b",
                color: contactData.edgeLoadingRisk ? "#fca5a5" : "#6ee7b7",
                fontWeight: "bold",
              }}
            >
              {contactData.edgeLoadingRisk ? "EDGE LOADING" : "CENTERED"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Normal Backlash (j_n):</span>
              <b
                style={{
                  color:
                    contactData.backlashCompliance === "NOMINAL"
                      ? "#4ade80"
                      : contactData.backlashCompliance === "TOO_TIGHT"
                      ? "#ef4444"
                      : "#fbbf24",
                }}
              >
                {contactData.normalBacklashMm} mm ({contactData.backlashCompliance})
              </b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Patch Center:</span>
              <span style={{ color: "#f8fafc" }}>
                {contactData.contactPatchCenterPercent}% face width
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Face Load Factor (K_Hβ):</span>
              <b style={{ color: contactData.faceLoadFactorKhBeta > 1.3 ? "#ef4444" : "#38bdf8" }}>
                {contactData.faceLoadFactorKhBeta}
              </b>
            </div>
          </div>
        </div>

        <FlankCrowningHUD
          metrics={crowningData}
          isCrowningApplied={isCrowningApplied}
          onToggleCrowning={() => setIsCrowningApplied((prev) => !prev)}
        />

        <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#38bdf8",
              marginBottom: 8,
              borderBottom: "1px solid #334155",
              paddingBottom: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Shaft Deflection (DIN 743)</span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 6px",
                borderRadius: 4,
                background: deflectionData.isAngularTiltCritical ? "#7f1d1d" : "#064e3b",
                color: deflectionData.isAngularTiltCritical ? "#fca5a5" : "#6ee7b7",
                fontWeight: "bold",
              }}
            >
              {deflectionData.isAngularTiltCritical ? "TILT WARNING" : "ALIGNMENT NOMINAL"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Midspan Deflection:</span>
              <b style={{ color: deflectionData.midspanDeflectionMicrons > 40 ? "#ef4444" : "#f8fafc" }}>
                {deflectionData.midspanDeflectionMicrons} µm
              </b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Bearing Journal Tilt:</span>
              <b style={{ color: deflectionData.isAngularTiltCritical ? "#ef4444" : "#38bdf8" }}>
                {deflectionData.bearingTiltMrad} mrad (Limit: {deflectionData.maxAllowableTiltMrad})
              </b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Resultant Mesh Force:</span>
              <span style={{ color: "#f8fafc" }}>{deflectionData.resultantForceN} N</span>
            </div>
          </div>
        </div>

        <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#38bdf8",
              marginBottom: 8,
              borderBottom: "1px solid #334155",
              paddingBottom: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Epicyclic Stage (i = {epicyclicData.overallRatio}:1)</span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 6px",
                borderRadius: 4,
                background: epicyclicData.meshStatus === "BALANCED" ? "#064e3b" : "#7f1d1d",
                color: epicyclicData.meshStatus === "BALANCED" ? "#6ee7b7" : "#fca5a5",
                fontWeight: "bold",
              }}
            >
              {epicyclicData.meshStatus}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Carrier Output Speed:</span>
              <b style={{ color: "#f8fafc" }}>{epicyclicData.carrierRpm} RPM</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Planet Spin Speed:</span>
              <span style={{ color: "#38bdf8" }}>{epicyclicData.planetSpinRpm} RPM</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Load Sharing Factor (Kγ):</span>
              <b style={{ color: epicyclicData.meshSharingFactorKGamma > 1.25 ? "#ef4444" : "#4ade80" }}>
                {epicyclicData.meshSharingFactorKGamma} (ISO 6336)
              </b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Peak Planet Pin Load:</span>
              <span style={{ color: "#fbbf24" }}>{epicyclicData.torquePerPlanetNm} Nm</span>
            </div>
          </div>
        </div>

        <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#38bdf8",
              marginBottom: 8,
              borderBottom: "1px solid #334155",
              paddingBottom: 4,
            }}
          >
            Component Telemetry
          </div>

          {selectedComponent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              <div>
                <span style={{ color: "#94a3b8" }}>Name: </span>
                <b style={{ color: "#f8fafc" }}>{selectedComponent.name}</b>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>Type: </span>
                <span>{selectedComponent.type}</span>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>Material: </span>
                <span style={{ color: "#fbbf24" }}>{selectedComponent.material}</span>
              </div>
              <div style={{ marginTop: 2 }}>
                <span style={{ color: "#94a3b8" }}>Function:</span>
                <p style={{ margin: "2px 0 0 0", color: "#cbd5e1", lineHeight: 1.4 }}>
                  {selectedComponent.role}
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: "#64748b",
                fontStyle: "italic",
                padding: "10px 0",
                textAlign: "center",
              }}
            >
              Aim and Pinch at any component to inspect telemetry.
            </div>
          )}
        </div>

        {bearingFatigueData && (
          <div style={{ background: "#1e293b", borderRadius: 8, padding: 12, border: "1px solid #0284c7" }}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#38bdf8",
                marginBottom: 6,
                fontWeight: "bold",
              }}
            >
              ISO 281 Bearing Life Rating (L10h)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Equivalent Load (P):</span>
                <b style={{ color: "#f8fafc" }}>{bearingFatigueData.equivalentLoadKn} kN</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Nominal Life (L10h):</span>
                <b
                  style={{
                    color:
                      bearingFatigueData.wearRiskLevel === "OPTIMAL"
                        ? "#4ade80"
                        : bearingFatigueData.wearRiskLevel === "CAUTION"
                        ? "#fbbf24"
                        : "#ef4444",
                  }}
                >
                  {bearingFatigueData.ratingLifeHours.toLocaleString()} hrs
                </b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Lubrication Index (κ):</span>
                <b style={{ color: "#38bdf8" }}>{bearingFatigueData.viscosityRatioKappa}</b>
              </div>
              <div
                style={{
                  marginTop: 4,
                  padding: "3px 6px",
                  borderRadius: 4,
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: 10,
                  background: bearingFatigueData.wearRiskLevel === "OPTIMAL" ? "#064e3b" : "#7f1d1d",
                  color: bearingFatigueData.wearRiskLevel === "OPTIMAL" ? "#6ee7b7" : "#fca5a5",
                }}
              >
                FATIGUE STATUS: {bearingFatigueData.wearRiskLevel}
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            background: "#1e293b",
            borderRadius: 8,
            padding: 12,
            border: `1px solid ${prediction.maintenanceStatus === "CRITICAL_ACTION_REQUIRED" ? "#ef4444" : "#334155"}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#38bdf8",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>RUL & Health Index</span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 6px",
                borderRadius: 4,
                background:
                  prediction.maintenanceStatus === "HEALTHY"
                    ? "#064e3b"
                    : prediction.maintenanceStatus === "ADVISORY"
                    ? "#78350f"
                    : "#7f1d1d",
                color:
                  prediction.maintenanceStatus === "HEALTHY"
                    ? "#6ee7b7"
                    : prediction.maintenanceStatus === "ADVISORY"
                    ? "#fde68a"
                    : "#fca5a5",
                fontWeight: "bold",
              }}
            >
              {prediction.maintenanceStatus}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Health Index (HI):</span>
              <b
                style={{
                  color:
                    prediction.healthIndexPercent < 50
                      ? "#ef4444"
                      : prediction.healthIndexPercent < 75
                      ? "#fbbf24"
                      : "#4ade80",
                }}
              >
                {prediction.healthIndexPercent}%
              </b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Predicted RUL:</span>
              <b style={{ color: "#f8fafc" }}>
                {prediction.remainingUsefulLifeHours.toLocaleString()} hrs
              </b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Failure Driver:</span>
              <span
                style={{
                  color: "#cbd5e1",
                  fontSize: 10,
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  maxWidth: 190,
                }}
              >
                {prediction.dominantFailureDriver}
              </span>
            </div>
          </div>
        </div>

        <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#38bdf8",
              marginBottom: 8,
              borderBottom: "1px solid #334155",
              paddingBottom: 4,
            }}
          >
            Kinematic Stress Telemetry
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "#94a3b8" }}>Input Torque:</span>
                <b style={{ color: "#fbbf24" }}>{inputTorqueNm} Nm</b>
              </div>
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={inputTorqueNm}
                disabled={isLiveSensorMode}
                onChange={(e) => setInputTorqueNm(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "#fbbf24",
                  cursor: isLiveSensorMode ? "not-allowed" : "pointer",
                  opacity: isLiveSensorMode ? 0.6 : 1.0,
                }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "#94a3b8" }}>Input Speed:</span>
                <b style={{ color: "#38bdf8" }}>{inputRpm} RPM</b>
              </div>
              <input
                type="range"
                min={200}
                max={3000}
                step={50}
                value={inputRpm}
                disabled={isLiveSensorMode}
                onChange={(e) => setInputRpm(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "#38bdf8",
                  cursor: isLiveSensorMode ? "not-allowed" : "pointer",
                  opacity: isLiveSensorMode ? 0.6 : 1.0,
                }}
              />
            </div>

            <div
              style={{
                borderTop: "1px solid #334155",
                paddingTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#94a3b8" }}>Tangential Force (Ft):</span>
                <span style={{ color: "#f8fafc", fontWeight: "bold", fontFamily: "monospace" }}>
                  {ftValue} N
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#94a3b8" }}>Pitch Velocity (vt):</span>
                <span style={{ color: "#f8fafc", fontWeight: "bold", fontFamily: "monospace" }}>
                  {vtValue} m/s
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#94a3b8" }}>Tooth Root Bending (σb):</span>
                <b style={{ color: isStressHigh ? "#ef4444" : "#4ade80", fontFamily: "monospace" }}>
                  {sigmaValue} MPa {isStressHigh ? "⚠ High" : "✓ Nominal"}
                </b>
              </div>

              <div style={{ marginTop: 4 }}>
                <div style={{ height: 6, width: "100%", background: "#0b0f19", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, (inputTorqueNm / 200) * 100)}%`,
                      background: inputTorqueNm > 140 ? "#ef4444" : inputTorqueNm > 80 ? "#f59e0b" : "#22c55e",
                      transition: "width 0.1s ease, background 0.2s ease",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#64748b", marginTop: 2 }}>
                  <span>0 MPa</span>
                  <span>180 MPa (Limit)</span>
                  <span>300 MPa</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#38bdf8",
              marginBottom: 8,
              borderBottom: "1px solid #334155",
              paddingBottom: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Thermal Equilibrium</span>
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background:
                  thermalData.thermalStatus === "NOMINAL"
                    ? "#064e3b"
                    : thermalData.thermalStatus === "ELEVATED"
                    ? "#78350f"
                    : "#7f1d1d",
                color:
                  thermalData.thermalStatus === "NOMINAL"
                    ? "#6ee7b7"
                    : thermalData.thermalStatus === "ELEVATED"
                    ? "#fde68a"
                    : "#fca5a5",
                fontWeight: "bold",
              }}
            >
              {thermalData.thermalStatus}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Sump Temp (T_oil):</span>
              <b
                style={{
                  color:
                    thermalData.oilTempC > 90 ? "#ef4444" : thermalData.oilTempC > 70 ? "#f59e0b" : "#4ade80",
                }}
              >
                {thermalData.oilTempC} °C
              </b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Mechanical Power Loss:</span>
              <span style={{ color: "#f8fafc" }}>
                {thermalData.powerLossKw} kW ({thermalData.powerInKw} kW In)
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Operating Viscosity:</span>
              <span style={{ color: "#38bdf8" }}>{thermalData.operatingViscosityCSt} cSt (VG 220)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Film Adequacy (EHL):</span>
              <b
                style={{
                  color:
                    thermalData.filmAdequacyRatio < 1.0
                      ? "#ef4444"
                      : thermalData.filmAdequacyRatio < 1.4
                      ? "#fbbf24"
                      : "#4ade80",
                }}
              >
                {thermalData.filmAdequacyRatio}x
              </b>
            </div>
          </div>
        </div>

        <OilChemistryHUD metrics={oilChemistryData} oilTempC={thermalData.oilTempC} />

        <ThermalExpansionHUD metrics={thermalExpansionData} sumpTempC={thermalData.oilTempC} />

        <ScuffingFlashHUD metrics={scuffingData} />

        <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#38bdf8",
              marginBottom: 8,
              borderBottom: "1px solid #334155",
              paddingBottom: 4,
            }}
          >
            AI Engineering Assistant
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button
              onClick={() => handleAskAi("What failure mode will occur if lubrication fails?")}
              disabled={!selectedComponent || isLoadingAi}
              style={{
                fontSize: 10,
                padding: "6px 8px",
                background: "#334155",
                color: "#f8fafc",
                border: "none",
                borderRadius: 4,
                cursor: selectedComponent && !isLoadingAi ? "pointer" : "not-allowed",
                opacity: selectedComponent ? 1 : 0.5,
              }}
            >
              Failure Modes
            </button>
            <button
              onClick={() => handleAskAi("Explain operational mechanical role and mating constraints")}
              disabled={!selectedComponent || isLoadingAi}
              style={{
                fontSize: 10,
                padding: "6px 8px",
                background: "#334155",
                color: "#f8fafc",
                border: "none",
                borderRadius: 4,
                cursor: selectedComponent && !isLoadingAi ? "pointer" : "not-allowed",
                opacity: selectedComponent ? 1 : 0.5,
              }}
            >
              Load & Mating
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              type="text"
              placeholder={selectedComponent ? "Ask about this component..." : "Select component first..."}
              value={customQuery}
              disabled={!selectedComponent || isLoadingAi}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customQuery.trim()) {
                  handleAskAi(customQuery);
                  setCustomQuery("");
                }
              }}
              style={{
                flex: 1,
                fontSize: 11,
                padding: "6px 8px",
                background: "#0b0f19",
                border: "1px solid #334155",
                color: "#f8fafc",
                borderRadius: 4,
                outline: "none",
              }}
            />
            <button
              onClick={() => {
                if (customQuery.trim()) {
                  handleAskAi(customQuery);
                  setCustomQuery("");
                }
              }}
              disabled={!selectedComponent || !customQuery.trim() || isLoadingAi}
              style={{
                fontSize: 11,
                padding: "6px 10px",
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                cursor: selectedComponent && customQuery.trim() && !isLoadingAi ? "pointer" : "not-allowed",
                opacity: selectedComponent && customQuery.trim() ? 1 : 0.5,
              }}
            >
              Ask
            </button>
          </div>

          {isLoadingAi && (
            <div style={{ fontSize: 11, color: "#38bdf8", padding: "6px 0" }}>
              Consulting CAD reasoning engine...
            </div>
          )}

          {aiResponse && !isLoadingAi && (
            <div
              style={{
                fontSize: 11,
                color: "#e2e8f0",
                lineHeight: 1.5,
                background: "#0b0f19",
                padding: 10,
                borderRadius: 4,
                border: "1px solid #1e293b",
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {aiResponse.cited_standards && aiResponse.cited_standards.length > 0 && (
                <div
                  style={{
                    marginBottom: 8,
                    padding: "6px 8px",
                    background: "#172554",
                    borderRadius: 4,
                    border: "1px solid #1d4ed8",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#93c5fd", fontWeight: "bold" }}>
                    RETRIEVED STANDARD: {aiResponse.cited_standards[0].standard_codes.join(", ")}
                  </div>
                  <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 2 }}>
                    {aiResponse.cited_standards[0].title}
                  </div>
                </div>
              )}

              <p style={{ margin: "0 0 8px 0" }}>{aiResponse.answer}</p>

              {aiResponse.failure_risks && aiResponse.failure_risks.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <b style={{ color: "#ef4444" }}>Identified Risks:</b>
                  <ul style={{ margin: "2px 0 0 14px", padding: 0 }}>
                    {aiResponse.failure_risks.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResponse.suggested_inspections && aiResponse.suggested_inspections.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <b style={{ color: "#38bdf8" }}>Suggested Inspections:</b>
                  <ul style={{ margin: "2px 0 0 14px", padding: 0 }}>
                    {aiResponse.suggested_inspections.map((insp, i) => (
                      <li key={i}>{insp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;