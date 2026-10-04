import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  anchorPosition: [number, number, number];
  inputRpm: number;
  inputTorqueNm: number;
  visible: boolean;
}

export const BearingWhirlOrbit: React.FC<Props> = ({
  anchorPosition,
  inputRpm,
  inputTorqueNm,
  visible,
}) => {
  const orbitGroupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.LineBasicMaterial | null>(null);

  // Generate 64 points forming the circular/elliptical whirl trajectory
  const lineMesh = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 64;
    for (let i = 0; i <= count; i++) {
      const theta = (i / count) * Math.PI * 2;
      pts.push(new THREE.Vector3(0, Math.sin(theta), Math.cos(theta)));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const material = new THREE.LineBasicMaterial({
      color: "#38bdf8",
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });
    materialRef.current = material;
    return new THREE.Line(geometry, material);
  }, []);

  useFrame((state) => {
    if (!orbitGroupRef.current || !visible) return;

    const t = state.clock.getElapsedTime();
    const omega = (2 * Math.PI * inputRpm) / 60.0;

    // Whirl radius expands with torque deflection and speed harmonics
    const baseRadius = 0.18;
    const radialEccentricity = (inputTorqueNm / 200.0) * 0.08;
    const currentRadius = baseRadius + radialEccentricity * Math.sin(omega * t * 0.2);

    orbitGroupRef.current.scale.set(1.0, currentRadius, currentRadius * 0.75);
    orbitGroupRef.current.rotation.x = omega * t * 0.05;

    // Dynamic warning color change under high torque
    if (materialRef.current) {
      materialRef.current.color.set(inputTorqueNm > 140 ? "#ef4444" : "#38bdf8");
    }
  });

  if (!visible) return null;

  return (
    <group position={anchorPosition}>
      {/* Dynamic Whirling Precession Trajectory */}
      <group ref={orbitGroupRef}>
        <primitive object={lineMesh} />
      </group>

      {/* Center Journal Axis Reticle */}
      <mesh>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
    </group>
  );
};