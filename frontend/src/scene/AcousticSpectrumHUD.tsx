import React, { useEffect, useRef, useState } from "react";
import type { AcousticEngine } from "../audio/AcousticEngine";

interface Props {
  audioEngine: AcousticEngine;
  inputRpm: number;
  inputTorqueNm: number;
  isAudioMuted: boolean;
}

export const AcousticSpectrumHUD: React.FC<Props> = ({
  audioEngine,
  inputRpm,
  inputTorqueNm,
  isAudioMuted,
}) => {
  const [freqBins, setFreqBins] = useState<number[]>(new Array(32).fill(0));
  const animRef = useRef<number | null>(null);

  const shaftFreqHz = Math.round((inputRpm / 60.0) * 10) / 10;
  const gmfHz = Math.round(shaftFreqHz * 20);

  useEffect(() => {
    const buffer = new ArrayBuffer(64);
    const dataArray = new Uint8Array(buffer);

    const updateLoop = () => {
      audioEngine.getFrequencyData(dataArray);
      const reduced: number[] = [];
      for (let i = 0; i < 32; i++) {
        reduced.push(dataArray[i] || 0);
      }
      setFreqBins(reduced);
      animRef.current = requestAnimationFrame(updateLoop);
    };

    animRef.current = requestAnimationFrame(updateLoop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [audioEngine]);

  const peakSidebandLeft = Math.max(0, Math.round((gmfHz - shaftFreqHz) * 10) / 10);
  const peakSidebandRight = Math.round((gmfHz + shaftFreqHz) * 10) / 10;

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
        <span>Vibration FFT Spectrum (GMF)</span>
        <span
          style={{
            fontSize: 9,
            padding: "2px 6px",
            borderRadius: 4,
            background: isAudioMuted ? "#334155" : "#0284c7",
            color: isAudioMuted ? "#94a3b8" : "#ffffff",
          }}
        >
          {isAudioMuted ? "SYNTH MUTED" : "LIVE AUDIO DSP"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#94a3b8",
          marginBottom: 6,
        }}
      >
        <span>
          1X Shaft: <b style={{ color: "#f8fafc" }}>{shaftFreqHz} Hz</b>
        </span>
        <span>
          GMF (20T): <b style={{ color: "#38bdf8" }}>{gmfHz} Hz</b>
        </span>
        <span>
          Sidebands:{" "}
          <b style={{ color: "#f59e0b" }}>
            {peakSidebandLeft} / {peakSidebandRight} Hz
          </b>
        </span>
      </div>

      {/* Real-time FFT Frequency Bins Visualizer */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          height: 52,
          background: "#0b0f19",
          padding: "4px 6px",
          borderRadius: 4,
          border: "1px solid #334155",
        }}
      >
        {freqBins.map((val, idx) => {
          const heightPercent = isAudioMuted
            ? Math.max(4, Math.sin(idx * 0.4 + Date.now() * 0.003) * 12 + (idx === 10 ? 35 : 12))
            : Math.max(4, (val / 255.0) * 100);

          const isGmfBin = idx === 9 || idx === 10;
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                height: `${heightPercent}%`,
                background: isGmfBin
                  ? inputTorqueNm > 140
                    ? "#ef4444"
                    : "#38bdf8"
                  : "#0284c7",
                borderRadius: "1px 1px 0 0",
                opacity: isGmfBin ? 1.0 : 0.65,
                transition: "height 0.06s ease",
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 9,
          color: "#64748b",
          marginTop: 4,
        }}
      >
        <span>0 Hz</span>
        <span>f_gmf ({gmfHz} Hz)</span>
        <span>2x Harmonic ({gmfHz * 2} Hz)</span>
      </div>
    </div>
  );
};