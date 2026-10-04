import React from "react";
import type { OilChemistryMetrics } from "./oilChemistry";

interface Props {
  metrics: OilChemistryMetrics;
  oilTempC: number;
}

export const OilChemistryHUD: React.FC<Props> = ({ metrics, oilTempC }) => {
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