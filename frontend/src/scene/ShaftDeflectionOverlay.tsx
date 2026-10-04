import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  visible: boolean;
  midspanDeflectionMicrons: number;
  bearingTiltMrad: number;
  isTiltCritical: boolean;
}

export const ShaftDeflectionOverlay: React.FC<Props> = ({
  visible,
  midspanDeflectionMicrons,
  bearingTiltMrad,
  isTiltCritical,
}) => {
  const arrowGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!arrowGroupRef.current || !visible) return;
    // Scale visual indication slightly for human perceptibility in the viewport
    const visualScale = Math.min(2.5, 0.6 + (midspanDeflectionMicrons / 50.0) * 1.5);
    arrowGroupRef.current.scale.set(visualScale, visualScale, visualScale);
  });

  if (!visible) return null;

  const vectorColor = isTiltCritical ? "#ef4444" : "#f59e0b";

  return (
    <group ref={arrowGroupRef} position={[0.0, -0.9, 0.45]}>
      {/* Midspan Deflection Vector Indicator */}
      <group position={[0.2, 0.0, 0.0]}>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.3, 8]} />
          <meshBasicMaterial color={vectorColor} />
        </mesh>
        <mesh position={[0, -0.32, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.025, 0.08, 12]} />
          <meshBasicMaterial color={vectorColor} />
        </mesh>
      </group>

      {/* Support Reaction Incline Marker (Bearing A) */}
      <group position={[-1.1, 0.0, 0.0]} rotation={[0, 0, (bearingTiltMrad / 1000) * 15]}>
        <mesh>
          <torusGeometry args={[0.09, 0.006, 8, 24, Math.PI]} />
          <meshBasicMaterial color={vectorColor} transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Support Reaction Incline Marker (Bearing B) */}
      <group position={[1.1, 0.0, 0.0]} rotation={[0, 0, -(bearingTiltMrad / 1000) * 15]}>
        <mesh>
          <torusGeometry args={[0.09, 0.006, 8, 24, Math.PI]} />
          <meshBasicMaterial color={vectorColor} transparent opacity={0.7} />
        </mesh>
      </group>
    </group>
  );
};