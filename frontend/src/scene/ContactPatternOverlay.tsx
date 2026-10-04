import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  visible: boolean;
  inputTorqueNm: number;
  contactPatchCenterPercent: number;
}

export const ContactPatternOverlay: React.FC<Props> = ({
  visible,
  inputTorqueNm,
  contactPatchCenterPercent,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Pitch mesh contact point between Pinion and Driven Gear
  const contactPos = useMemo(() => new THREE.Vector3(0.2, 0.075, 0.62), []);

  useFrame(() => {
    if (!meshRef.current || !visible) return;
    // Offset along face width based on contact patch center (50% = center)
    const zOffset = ((contactPatchCenterPercent - 50.0) / 50.0) * 0.08;
    meshRef.current.position.set(contactPos.x, contactPos.y, contactPos.z + zOffset);

    const lengthScale = THREE.MathUtils.lerp(0.8, 1.4, inputTorqueNm / 200.0);
    meshRef.current.scale.set(1.0, lengthScale, 1.0);
  });

  if (!visible) return null;

  return (
    <group>
      <mesh ref={meshRef} position={contactPos}>
        <capsuleGeometry args={[0.018, 0.06, 8, 16]} />
        <meshBasicMaterial
          color={contactPatchCenterPercent > 72 ? "#ef4444" : "#0284c7"}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
};