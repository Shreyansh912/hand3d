import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  visible: boolean;
  carrierRpm: number;
  planetCount: number;
  torquePerPlanetNm: number;
}

export const PlanetCarrierVisualizer: React.FC<Props> = ({
  visible,
  carrierRpm,
  planetCount,
  torquePerPlanetNm,
}) => {
  const carrierRef = useRef<THREE.Group>(null);

  // Radius of planet pin pitch circle
  const orbitRadius = 0.38;

  const planetAngles = useMemo(() => {
    const angles: number[] = [];
    for (let i = 0; i < planetCount; i++) {
      angles.push((i * 2 * Math.PI) / planetCount);
    }
    return angles;
  }, [planetCount]);

  useFrame((_, delta) => {
    if (!carrierRef.current || !visible) return;
    const omegaCarrier = (2.0 * Math.PI * carrierRpm) / 60.0;
    carrierRef.current.rotation.x += omegaCarrier * delta * 0.08;
  });

  if (!visible) return null;

  const pinColor = torquePerPlanetNm > 50 ? "#ef4444" : "#38bdf8";

  return (
    <group ref={carrierRef} position={[0.0, 1.05, 0.3]}>
      {/* Carrier Pitch Orbit Reference Line */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[orbitRadius - 0.004, orbitRadius + 0.004, 48]} />
        <meshBasicMaterial color="#64748b" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Planet Pin Positions & Reaction Indicators */}
      {planetAngles.map((angle, idx) => {
        const y = Math.cos(angle) * orbitRadius;
        const z = Math.sin(angle) * orbitRadius;
        return (
          <group key={idx} position={[0, y, z]}>
            <mesh>
              <sphereGeometry args={[0.03, 16, 16]} />
              <meshBasicMaterial color={pinColor} />
            </mesh>
            {/* Shear Reaction Marker */}
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.08, 8]} />
              <meshBasicMaterial color={pinColor} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};