import React, { useMemo, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  visible: boolean;
}

export const NominalGhostOverlay: React.FC<Props> = ({ visible }) => {
  const { scene } = useGLTF("/models/gearbox_assembly.glb");
  const ghostScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    ghostScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshBasicMaterial({
          color: "#38bdf8",
          wireframe: true,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        });
      }
    });
  }, [ghostScene]);

  if (!visible) return null;

  return (
    <group position={[0, -0.9, 0]}>
      <primitive object={ghostScene} />
    </group>
  );
};