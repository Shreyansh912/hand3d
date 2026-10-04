import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  visible: boolean;
  normalBacklashMm: number;
  pitchRadiusPinion?: number;
}

export const MeshFlankGapOverlay: React.FC<Props> = ({
  visible,
  normalBacklashMm,
}) => {
  const meshGroupRef = useRef<THREE.Group>(null);

  // Normal backlash tolerance thresholds (ISO 21771)
  const isTooTight = normalBacklashMm < 0.06;
  const isTooLoose = normalBacklashMm > 0.18;
  const gapColor = isTooTight ? "#ef4444" : isTooLoose ? "#f59e0b" : "#4ade80";

  useFrame(() => {
    if (!meshGroupRef.current || !visible) return;
    // Scale visual callout thickness relative to dynamic backlash
    const scaleFactor = Math.min(3.0, 1.0 + (normalBacklashMm / 0.12));
    meshGroupRef.current.scale.set(scaleFactor, scaleFactor, 1.0);
  });

  if (!visible) return null;

  return (
    // Pitch contact point between Pinion (y = -0.9) and Gear (y = 1.05) centerlines
    <group ref={meshGroupRef} position={[0.2, 0.075, 0.45]}>
      {/* Pitch Line Tangent Reticle */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, 0.25, 8]} />
        <meshBasicMaterial color={gapColor} transparent opacity={0.8} />
      </mesh>

      {/* Flank Clearance Micro-Arc */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.05, 0.006, 8, 24, Math.PI]} />
        <meshBasicMaterial color={gapColor} />
      </mesh>

      {/* Target Marker Indicator */}
      <mesh position={[0, 0, 0.02]}>
        <ringGeometry args={[0.015, 0.022, 16]} />
        <meshBasicMaterial color={gapColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};