import React, { useState } from "react";
import type { MaintenancePrediction } from "../telemetry/predictiveMaintenance";

interface Props {
  prediction: MaintenancePrediction;
  isOpen: boolean;
  onDismiss: () => void;
  inputRpm: number;
  inputTorqueNm: number;
  oilTempC: number;
  vibrationRms: number;
  selectedComponentId?: string;
}

export const MaintenanceAlertModal: React.FC<Props> = ({
  prediction,
  isOpen,
  onDismiss,
  inputRpm,
  inputTorqueNm,
  oilTempC,
  vibrationRms,
  selectedComponentId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDispatch = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/maintenance/work-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dominant_failure_driver: prediction.dominantFailureDriver,
          health_index_percent: prediction.healthIndexPercent,
          remaining_useful_life_hours: prediction.remainingUsefulLifeHours,
          vibration_rms_mms: vibrationRms,
          operating_rpm: inputRpm,
          operating_torque_nm: inputTorqueNm,
          sump_temp_c: oilTempC,
          inspected_component: selectedComponentId || "Gearbox_Assembly",
        }),
      });

      if (!res.ok) throw new Error("Failed to generate work order");
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.work_order_id}.json`;
      a.click();
      URL.revokeObjectURL(url);

      onDismiss();
    } catch (err) {
      console.error("Work order dispatch failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(3, 7, 18, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          width: 520,
          background: "#0f172a",
          border: "2px solid #ef4444",
          borderRadius: 8,
          padding: 24,
          boxShadow: "0 10px 40px rgba(239, 68, 68, 0.35)",
          color: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>🚨</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: "#f87171" }}>
              PREDICTIVE MAINTENANCE TRIGGER (ISO 10816)
            </h3>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Automated anomaly trip threshold exceeded
            </div>
          </div>
        </div>

        <div style={{ background: "#1e293b", padding: 12, borderRadius: 6, margin: "14px 0", fontSize: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#94a3b8" }}>System Health Index:</span>
            <b style={{ color: "#ef4444" }}>{prediction.healthIndexPercent}%</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#94a3b8" }}>Estimated Remaining Life (RUL):</span>
            <b style={{ color: "#fbbf24" }}>{prediction.remainingUsefulLifeHours.toLocaleString()} Operating Hours</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#94a3b8" }}>Failure Probability (30-Day):</span>
            <b style={{ color: "#f87171" }}>{prediction.failureProbabilityPercent}%</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Dominant Degradation Driver:</span>
            <span style={{ color: "#38bdf8" }}>{prediction.dominantFailureDriver}</span>
          </div>
        </div>

        <p style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.5, margin: "12px 0" }}>
          Immediate corrective intervention required. Recommended scope includes acoustic demodulation analysis, dynamic real-time relubrication, and bearing radial play clearance verification per DIN 3962 / ISO 281 standards.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button
            onClick={onDismiss}
            style={{
              padding: "8px 16px",
              background: "#1e293b",
              border: "1px solid #475569",
              color: "#cbd5e1",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Acknowledge & Mute
          </button>
          <button
            onClick={handleDispatch}
            disabled={isSubmitting}
            style={{
              padding: "8px 18px",
              background: "#dc2626",
              border: "1px solid #ef4444",
              color: "#ffffff",
              borderRadius: 4,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontSize: 12,
              fontWeight: "bold",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Generating Work Order..." : "Dispatch Work Order"}
          </button>
        </div>
      </div>
    </div>
  );
};