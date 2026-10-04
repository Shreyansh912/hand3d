import React, { useState } from "react";
import type { BearingFaultFrequencies } from "../audio/envelopeDemodulator";

interface Props {
  metrics: BearingFaultFrequencies;
  vibrationRms: number;
}

export const EnvelopeSpectrumHUD: React.FC<Props> = ({ metrics, vibrationRms }) => {
  const [activeTab, setActiveTab] = useState<"RAW" | "ENVELOPE">("ENVELOPE");

  const hasOuterFault = metrics.outerRaceFaultSeverity > 0.6;
  const hasInnerFault = metrics.innerRaceFaultSeverity > 0.6;

  return (
    <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          borderBottom: "1px solid #334155",
          paddingBottom: 4,
        }}
      >
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#38bdf8" }}>
          Demodulated Envelope FFT
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setActiveTab("RAW")}
            style={{
              padding: "2px 6px",
              fontSize: 9,
              background: activeTab === "RAW" ? "#0284c7" : "#0f172a",
              color: activeTab === "RAW" ? "#ffffff" : "#94a3b8",
              border: "1px solid #334155",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            RAW
          </button>
          <button
            onClick={() => setActiveTab("ENVELOPE")}
            style={{
              padding: "2px 6px",
              fontSize: 9,
              background: activeTab === "ENVELOPE" ? "#0284c7" : "#0f172a",
              color: activeTab === "ENVELOPE" ? "#ffffff" : "#94a3b8",
              border: "1px solid #334155",
              borderRadius: 3,
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            HILBERT ENV
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>
        <span>1X: <b style={{ color: "#f8fafc" }}>{metrics.shaftFreq1xHz} Hz</b></span>
        <span>BPFO: <b style={{ color: hasOuterFault ? "#ef4444" : "#38bdf8" }}>{metrics.bpfoHz} Hz</b></span>
        <span>BPFI: <b style={{ color: hasInnerFault ? "#ef4444" : "#38bdf8" }}>{metrics.bpfiHz} Hz</b></span>
      </div>

      {/* Simulated Demodulated FFT Bars */}
      <div
        style={{
          height: 48,
          background: "#0b0f19",
          borderRadius: 4,
          display: "flex",
          alignItems: "flex-end",
          gap: 3,
          padding: "4px 8px",
          border: "1px solid #334155",
          marginBottom: 8,
        }}
      >
        {Array.from({ length: 24 }).map((_, idx) => {
          // Emphasize BPFO harmonic spikes in envelope mode
          const isBpfoBin = activeTab === "ENVELOPE" && (idx === 7 || idx === 14);
          const isBpfiBin = activeTab === "ENVELOPE" && idx === 18;
          let heightPct = 15 + Math.sin(idx * 1.5) * 10;

          if (isBpfoBin) {
            heightPct = Math.min(95, 30 + metrics.outerRaceFaultSeverity * 65);
          } else if (isBpfiBin) {
            heightPct = Math.min(90, 25 + metrics.innerRaceFaultSeverity * 55);
          } else if (activeTab === "RAW" && idx === 10) {
            heightPct = 85; // Strong GMF spike in raw
          }

          const barColor = isBpfoBin || isBpfiBin
            ? (heightPct > 65 ? "#ef4444" : "#f59e0b")
            : "#0284c7";

          return (
            <div
              key={idx}
              style={{
                flex: 1,
                height: `${heightPct}%`,
                background: barColor,
                borderRadius: "1px 1px 0 0",
                transition: "height 0.15s ease",
              }}
            />
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
        <span style={{ color: "#94a3b8" }}>Outer Race Defect (BPFO):</span>
        <b style={{ color: hasOuterFault ? "#ef4444" : "#4ade80" }}>
          {hasOuterFault ? "HARMONIC TRIP (> 0.6g)" : "NOMINAL (< 0.2g)"}
        </b>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginTop: 4 }}>
        <span style={{ color: "#94a3b8" }}>Hilbert Amplitude Peak:</span>
        <span style={{ color: "#f8fafc" }}>
          {(vibrationRms * (hasOuterFault ? 1.6 : 0.8)).toFixed(2)} g pk-pk
        </span>
      </div>
    </div>
  );
};