import React from "react";

interface Props {
  samples: number[];
  isActive: boolean;
}

export const RunoutOscilloscope: React.FC<Props> = ({ samples, isActive }) => {
  if (!isActive) return null;

  const width = 348;
  const height = 48;
  const maxLimit = 25; // ±25 µm scale

  const points = samples
    .map((val, idx) => {
      const x = (idx / (samples.length - 1 || 1)) * width;
      const normalizedY = 0.5 - val / (maxLimit * 2);
      const y = Math.min(height, Math.max(0, normalizedY * height));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const latestVal = samples[samples.length - 1] ?? 0;
  const isOutOfTolerance = Math.abs(latestVal) > 15;

  return (
    <div
      style={{
        background: "#0b0f19",
        borderRadius: 6,
        padding: 8,
        border: "1px solid #334155",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#94a3b8",
          marginBottom: 4,
        }}
      >
        <span>DYNAMIC RUNOUT WAVEFORM (Fr)</span>
        <b style={{ color: isOutOfTolerance ? "#ef4444" : "#4ade80" }}>
          {isOutOfTolerance ? "TOLERANCE EXCEEDED" : "IN SPEC (DIN 3962)"}
        </b>
      </div>

      <svg width={width} height={height} style={{ overflow: "visible" }}>
        {/* Baseline Centerline */}
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#334155"
          strokeDasharray="4 4"
        />
        {/* Upper Tolerance Threshold (+15 µm) */}
        <line
          x1={0}
          y1={height * 0.2}
          x2={width}
          y2={height * 0.2}
          stroke="#7f1d1d"
          strokeWidth={0.8}
        />
        {/* Lower Tolerance Threshold (-15 µm) */}
        <line
          x1={0}
          y1={height * 0.8}
          x2={width}
          y2={height * 0.8}
          stroke="#7f1d1d"
          strokeWidth={0.8}
        />

        {/* Live Signal Line */}
        {samples.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke={isOutOfTolerance ? "#ef4444" : "#38bdf8"}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
};