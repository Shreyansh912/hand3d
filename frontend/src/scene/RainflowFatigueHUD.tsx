import React from "react";
import type { RainflowFatigueMetrics } from "./rainflowFatigueEngine";

interface Props {
  metrics: RainflowFatigueMetrics;
}

export const RainflowFatigueHUD: React.FC<Props> = ({ metrics }) => {
  const statusColor =
    metrics.fatigueStatus === "SAFE"
      ? "#4ade80"
      : metrics.fatigueStatus === "ACCELERATED_WEAR"
      ? "#fbbf24"
      : "#ef4444";

  const statusBg =
    metrics.fatigueStatus === "SAFE"
      ? "#064e3b"
      : metrics.fatigueStatus === "ACCELERATED_WEAR"
      ? "#78350f"
      : "#7f1d1d";

  const maxCycles = Math.max(1, ...metrics.bins.map((b) => b.cycleCount));

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
        <span>Cumulative Fatigue (ISO 6336-6)</span>
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
          {metrics.fatigueStatus}
        </span>
      </div>

      {/* 8-Bin Rainflow Cycle Spectrum Histogram */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>
          Rainflow Stress Spectrum (ASTM E1049):
        </div>
        <div
          style={{
            height: 40,
            background: "#0b0f19",
            borderRadius: 4,
            display: "flex",
            alignItems: "flex-end",
            gap: 3,
            padding: "3px 6px",
            border: "1px solid #334155",
          }}
        >
          {metrics.bins.map((b, i) => {
            const heightPct = Math.max(8, (b.cycleCount / maxCycles) * 100);
            const isHighStress = i >= 5;
            return (
              <div
                key={i}
                title={`${b.rangeMpaMin}-${b.rangeMpaMax} MPa: ${b.cycleCount.toLocaleString()} cycles`}
                style={{
                  flex: 1,
                  height: `${heightPct}%`,
                  background: isHighStress ? "#ef4444" : "#0284c7",
                  borderRadius: "2px 2px 0 0",
                  transition: "height 0.2s ease",
                }}
              />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#64748b", marginTop: 2 }}>
          <span>0 MPa</span>
          <span>160 MPa</span>
          <span>350 MPa</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Palmgren-Miner Damage (D):</span>
          <b style={{ color: metrics.cumulativeMinerDamage > 0.8 ? "#ef4444" : "#f8fafc" }}>
            {metrics.cumulativeMinerDamage} / 1.00
          </b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Fatigue Life Consumed:</span>
          <b style={{ color: statusColor }}>
            {metrics.fatigueLifeConsumedPercent}%
          </b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Counted Load Cycles:</span>
          <span style={{ color: "#38bdf8" }}>{metrics.totalCountedCycles.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};