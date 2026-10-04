import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GestureState } from "../vision/GestureEngine";

interface Props {
  gestureStateRef: React.MutableRefObject<GestureState | null>;
}

export const SpatialCursor: React.FC<Props> = ({ gestureStateRef }) => {
  const cursorRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ camera }) => {
    const gesture = gestureStateRef.current;
    if (!cursorRef.current || !ringRef.current) return;

    if (gesture && gesture.gesture !== "NEUTRAL") {
      cursorRef.current.visible = true;
      ringRef.current.visible = true;

      // Unproject NDC coordinates to a 3D plane in front of the camera
      const vector = new THREE.Vector3(gesture.pointerNdc.x, gesture.pointerNdc.y, 0.5);
      vector.unproject(camera);

      // Position the cursor along the camera ray at fixed distance
      const dir = vector.sub(camera.position).normalize();
      const distance = 4.0; // Distance in front of camera
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));

      cursorRef.current.position.copy(pos);
      ringRef.current.position.copy(pos);

      // Orient the cursor toward the camera
      cursorRef.current.quaternion.copy(camera.quaternion);
      ringRef.current.quaternion.copy(camera.quaternion);

      // Visual feedback: shrink and color ring when pinching
      const isPinched = gesture.gesture === "PINCH";
      const targetScale = isPinched ? 0.6 : 1.0;
      ringRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);

      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(isPinched ? "#22c55e" : "#38bdf8");
    } else {
      cursorRef.current.visible = false;
      ringRef.current.visible = false;
    }
  });

  return (
    <group>
      {/* Central target dot */}
      <mesh ref={cursorRef} visible={false}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>

      {/* Outer targeting reticle */}
      <mesh ref={ringRef} visible={false}>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};