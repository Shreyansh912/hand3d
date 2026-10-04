import React from "react";
import type { FlankCrowningMetrics } from "./flankCrowningEngine";

interface Props {
  metrics: FlankCrowningMetrics;
  isCrowningApplied: boolean;
  onToggleCrowning: () => void;
}

export const FlankCrowningHUD: React.FC<Props> = ({
  metrics,
  isCrowningApplied,
  onToggleCrowning,
}) => {
  const statusBg =
    isCrowningApplied
      ? "#064e3b"
      : metrics.crowningOptimizationStatus === "UNCORRECTED_EDGE_RISK"
      ? "#7f1d1d"
      : "#78350f";

  const statusColor =
    isCrowningApplied
      ? "#6ee7b7"
      : metrics.crowningOptimizationStatus === "UNCORRECTED_EDGE_RISK"
      ? "#fca5a5"
      : "#fde68a";

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
        <span>Flank Lead Crowning (ISO 21771)</span>
        <button
          onClick={onToggleCrowning}
          style={{
            padding: "2px 6px",
            borderRadius: 4,
            background: isCrowningApplied ? "#0284c7" : "#0f172a",
            color: isCrowningApplied ? "#ffffff" : "#94a3b8",
            border: `1px solid ${isCrowningApplied ? "#38bdf8" : "#334155"}`,
            cursor: "pointer",
            fontSize: 9,
            fontWeight: "bold",
          }}
        >
          {isCrowningApplied ? "CROWNING ON" : "APPLY CROWNING"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Target Crowning (C_β):</span>
          <b style={{ color: "#f8fafc" }}>{metrics.recommendedCrowningMicrons} µm</b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>End Relief Length / Depth:</span>
          <span style={{ color: "#38bdf8" }}>
            {metrics.endReliefLengthMm} mm / {metrics.endReliefDepthMicrons} µm
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Effective K_Hβ:</span>
          <b style={{ color: isCrowningApplied ? "#4ade80" : metrics.rawFaceLoadKhBeta > 1.25 ? "#ef4444" : "#fbbf24" }}>
            {isCrowningApplied ? metrics.optimizedFaceLoadKhBeta : metrics.rawFaceLoadKhBeta}{" "}
            {isCrowningApplied ? `(-${metrics.contactStressReductionPercent}% Stress)` : "(Raw)"}
          </b>
        </div>
        <div
          style={{
            marginTop: 4,
            padding: "3px 6px",
            borderRadius: 4,
            textAlign: "center",
            fontWeight: "bold",
            fontSize: 10,
            background: statusBg,
            color: statusColor,
          }}
        >
          {isCrowningApplied ? "OPTIMIZED ELLIPTICAL CONTACT" : metrics.crowningOptimizationStatus.replace(/_/g, " ")}
        </div>
      </div>
    </div>
  );
};