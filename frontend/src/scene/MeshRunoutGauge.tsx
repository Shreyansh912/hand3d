import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  isActive: boolean;
  inputRpm: number;
  inputTorqueNm: number;
  onSampleDeviation?: (deviationMicrons: number) => void;
}

export const MeshRunoutGauge: React.FC<Props> = ({
  isActive,
  inputRpm,
  inputTorqueNm,
  onSampleDeviation,
}) => {
  const needleRef = useRef<THREE.Group>(null);
  const valRef = useRef<HTMLDivElement>(null);

  // Mesh contact pitch coordinate: between Pinion (y = -0.9) and Gear (y = 1.05)
  const meshPoint = useMemo(() => new THREE.Vector3(0.2, 0.075, 0.6), []);

  useFrame((state) => {
    if (!isActive) return;

    const t = state.clock.getElapsedTime();
    const omega = (2 * Math.PI * inputRpm) / 60;

    // Simulate eccentric runout fundamental + tooth mesh harmonics
    const torqueFlex = (inputTorqueNm / 200) * 8.0;
    const runout =
      10.0 * Math.sin(omega * t * 0.1) +
      3.0 * Math.sin(20 * omega * t * 0.1) +
      torqueFlex;

    const runoutClamped = Math.round(runout * 10) / 10;

    if (valRef.current) {
      valRef.current.textContent = `${runoutClamped > 0 ? "+" : ""}${runoutClamped.toFixed(1)} µm`;
      valRef.current.style.color = Math.abs(runoutClamped) > 15 ? "#ef4444" : "#38bdf8";
    }

    if (needleRef.current) {
      needleRef.current.rotation.z = -(runoutClamped / 25.0) * Math.PI * 0.4;
    }

    if (onSampleDeviation) {
      onSampleDeviation(runoutClamped);
    }
  });

  if (!isActive) return null;

  return (
    <group position={meshPoint}>
      {/* Sensor Stylus Probe Tip */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.008, 0.004, 0.3, 12]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <sphereGeometry args={[0.015, 12, 12]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>

      {/* Floating Precision Dial Indicator Gauge */}
      <Html position={[0.25, 0.15, 0]} center distanceFactor={6}>
        <div
          style={{
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid #f59e0b",
            borderRadius: 6,
            padding: "6px 10px",
            minWidth: 120,
            fontFamily: "monospace",
            color: "#f8fafc",
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.8)",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 9, color: "#f59e0b", letterSpacing: 0.5 }}>
            DIAL INDICATOR (Fr)
          </div>
          <div
            ref={valRef}
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: "#38bdf8",
              marginTop: 2,
            }}
          >
            +0.0 µm
          </div>
          <div style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>
            DIN 3962 Class 6 (Limit: ±15 µm)
          </div>
        </div>
      </Html>
    </group>
  );
};