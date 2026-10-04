import React from "react";
import type { DTEMetrics } from "./dteEngine";

interface Props {
  metrics: DTEMetrics;
}

export const DTEOscilloscopeHUD: React.FC<Props> = ({ metrics }) => {
  const gradeColor =
    metrics.meshQualityGradeISO === "GRADE_4_PRECISION"
      ? "#4ade80"
      : metrics.meshQualityGradeISO === "GRADE_6_COMMERCIAL"
      ? "#fbbf24"
      : "#ef4444";

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
        <span>Dynamic Transmission Error (DTE)</span>
        <span
          style={{
            fontSize: 9,
            padding: "2px 6px",
            borderRadius: 4,
            background: "#0f172a",
            color: gradeColor,
            border: `1px solid ${gradeColor}`,
            fontWeight: "bold",
          }}
        >
          {metrics.meshQualityGradeISO.replace("_", " ")}
        </span>
      </div>

      {/* Cyclical Mesh TE Waveform Trace */}
      <div
        style={{
          height: 44,
          background: "#0b0f19",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          padding: "0 4px",
          border: "1px solid #334155",
          marginBottom: 8,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Zero-line reference */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            height: 1,
            background: "#334155",
          }}
        />

        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", gap: 2 }}>
          {metrics.teWaveform.map((val, idx) => {
            const maxAmpl = Math.max(1, metrics.peakToPeakTeMicrons / 2);
            const heightPct = Math.min(45, (Math.abs(val) / maxAmpl) * 45);
            const isPos = val >= 0;

            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: isPos ? "flex-end" : "flex-start",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    height: `${heightPct}%`,
                    background: val > 2.5 ? "#ef4444" : "#38bdf8",
                    borderRadius: 1,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Peak-to-Peak TE:</span>
          <b style={{ color: metrics.peakToPeakTeMicrons > 5.0 ? "#ef4444" : "#f8fafc" }}>
            {metrics.peakToPeakTeMicrons} µm (RMS: {metrics.rmsTeMicrons} µm)
          </b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Mesh Whine SPL:</span>
          <span style={{ color: metrics.gearWhineDbaEstimate > 85 ? "#ef4444" : "#fbbf24" }}>
            ~{metrics.gearWhineDbaEstimate} dBA @ 1 m
          </span>
        </div>
      </div>
    </div>
  );
};