import React from "react";
import type { ScuffingMetrics } from "./scuffingFlashEngine";

interface Props {
  metrics: ScuffingMetrics;
}

export const ScuffingFlashHUD: React.FC<Props> = ({ metrics }) => {
  const badgeBg =
    metrics.scuffingRiskLevel === "OPTIMAL"
      ? "#064e3b"
      : metrics.scuffingRiskLevel === "ELEVATED"
      ? "#78350f"
      : "#7f1d1d";

  const badgeColor =
    metrics.scuffingRiskLevel === "OPTIMAL"
      ? "#6ee7b7"
      : metrics.scuffingRiskLevel === "ELEVATED"
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
        <span>Flash Temp & Scuffing (ISO 6336-21)</span>
        <span
          style={{
            fontSize: 9,
            padding: "2px 6px",
            borderRadius: 4,
            background: badgeBg,
            color: badgeColor,
            fontWeight: "bold",
          }}
        >
          {metrics.scuffingRiskLevel}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Contact Peak Temp (θ_B):</span>
          <b style={{ color: metrics.contactTotalTempC > 240 ? "#ef4444" : "#f8fafc" }}>
            {metrics.contactTotalTempC} °C (Flash: +{metrics.flashTempRiseC} °C)
          </b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Scuffing Safety (S_intS):</span>
          <b style={{ color: metrics.scuffingSafetyFactor < 1.3 ? "#ef4444" : "#4ade80" }}>
            {metrics.scuffingSafetyFactor} (Limit: 1.20)
          </b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Flank Sliding Speed:</span>
          <span style={{ color: "#38bdf8" }}>{metrics.slidingVelocityMs} m/s</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>EHL Friction Coeff (μ):</span>
          <span style={{ color: "#fbbf24" }}>{metrics.meshFrictionCoefficient}</span>
        </div>
      </div>
    </div>
  );
};