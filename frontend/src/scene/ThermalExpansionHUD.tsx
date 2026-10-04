import React from "react";
import type { ThermalExpansionMetrics } from "./thermalExpansion";

interface Props {
  metrics: ThermalExpansionMetrics;
  sumpTempC: number;
}

export const ThermalExpansionHUD: React.FC<Props> = ({ metrics, sumpTempC }) => {
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
        <span>Thermal Expansion & Tip Relief</span>
        <span
          style={{
            fontSize: 9,
            padding: "2px 6px",
            borderRadius: 4,
            background: metrics.isTipInterferenceRisk ? "#7f1d1d" : "#064e3b",
            color: metrics.isTipInterferenceRisk ? "#fca5a5" : "#6ee7b7",
            fontWeight: "bold",
          }}
        >
          {metrics.isTipInterferenceRisk ? "SCUFFING RISK" : "NOMINAL"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Center Growth (Δa):</span>
          <b style={{ color: "#f8fafc" }}>
            {metrics.netCenterDistanceGrowthMm > 0 ? "+" : ""}{metrics.netCenterDistanceGrowthMm} mm @ {sumpTempC}°C
          </b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Tip Relief Req. (c_α):</span>
          <b style={{ color: metrics.tipReliefRequiredMicrons > 20.0 ? "#ef4444" : "#38bdf8" }}>
            {metrics.tipReliefRequiredMicrons} µm (Limit: 22 µm)
          </b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Root Bottom Clearance:</span>
          <span style={{ color: "#4ade80" }}>{metrics.tipClearanceMarginMm} mm</span>
        </div>
      </div>
    </div>
  );
};