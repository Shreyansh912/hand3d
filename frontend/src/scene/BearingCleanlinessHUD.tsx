import React from "react";
import type { BearingCleanlinessMetrics } from "./bearingCleanlinessEngine";

interface Props {
  metrics: BearingCleanlinessMetrics;
  nominalL10h: number;
}

export const BearingCleanlinessHUD: React.FC<Props> = ({ metrics, nominalL10h }) => {
  const badgeBg =
    metrics.cleanlinessStatus === "CLEAN_SUMP"
      ? "#064e3b"
      : metrics.cleanlinessStatus === "DEGRADED_PARTICULATES"
      ? "#78350f"
      : "#7f1d1d";

  const badgeColor =
    metrics.cleanlinessStatus === "CLEAN_SUMP"
      ? "#6ee7b7"
      : metrics.cleanlinessStatus === "DEGRADED_PARTICULATES"
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
        <span>Lube Cleanliness (ISO 281 App. A)</span>
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
          {metrics.cleanlinessStatus}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>ISO 4406 Cleanliness Code:</span>
          <b style={{ color: metrics.solidParticlePpm > 250 ? "#ef4444" : "#f8fafc" }}>
            {metrics.iso4406Code} ({metrics.solidParticlePpm} ppm)
          </b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Contamination Factor (e_C):</span>
          <b style={{ color: metrics.contaminationFactorEc < 0.25 ? "#ef4444" : "#38bdf8" }}>
            {metrics.contaminationFactorEc}
          </b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>ISO Modification Factor (a_ISO):</span>
          <b style={{ color: metrics.aIsoFactor < 0.5 ? "#ef4444" : "#4ade80" }}>
            {metrics.aIsoFactor}x
          </b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Modified Life (L_nmh):</span>
          <b style={{ color: metrics.modifiedRatingLifeLnmh < nominalL10h * 0.5 ? "#ef4444" : "#38bdf8" }}>
            {metrics.modifiedRatingLifeLnmh.toLocaleString()} hrs (Base: {nominalL10h.toLocaleString()})
          </b>
        </div>
      </div>
    </div>
  );
};