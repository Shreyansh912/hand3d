import React from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface AnnotationProps {
  position: [number, number, number];
  componentName: string;
  riskSummary?: string;
  standardCode?: string;
  onDismiss: () => void;
}

export const SpatialAnnotation: React.FC<AnnotationProps> = ({
  position,
  componentName,
  riskSummary,
  standardCode,
  onDismiss,
}) => {
  return (
    <group position={new THREE.Vector3(...position)}>
      {/* 3D Anchor Indicator Sphere */}
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Billboarding HTML Callout Box */}
      <Html
        distanceFactor={6}
        center
        style={{
          pointerEvents: "auto",
          userSelect: "none",
          transform: "translate3d(0, -60px, 0)",
        }}
      >
        <div
          style={{
            background: "rgba(15, 23, 42, 0.92)",
            border: "1px solid #38bdf8",
            borderRadius: 6,
            padding: "8px 12px",
            minWidth: 160,
            maxWidth: 220,
            backdropFilter: "blur(6px)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
            fontFamily: "monospace",
            color: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: "bold", color: "#38bdf8" }}>
              {componentName}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 12,
                padding: "0 2px",
              }}
            >
              ✕
            </button>
          </div>

          {standardCode && (
            <div
              style={{
                fontSize: 9,
                color: "#93c5fd",
                background: "#1e3a8a",
                padding: "2px 4px",
                borderRadius: 3,
                marginBottom: 4,
                display: "inline-block",
              }}
            >
              {standardCode}
            </div>
          )}

          {riskSummary && (
            <div style={{ fontSize: 9, color: "#fca5a5", lineHeight: 1.3 }}>
              ⚠ {riskSummary}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};