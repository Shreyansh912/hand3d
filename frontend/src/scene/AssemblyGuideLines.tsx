import React, { useMemo } from "react";
import * as THREE from "three";

interface Props {
  explodedProgress: number;
}

export const AssemblyGuideLines: React.FC<Props> = ({ explodedProgress }) => {
  if (explodedProgress < 0.05) return null;

  const lineMeshInput = useMemo(() => {
    const points = [new THREE.Vector3(-2.8, 0, 0), new THREE.Vector3(2.8, 0, 0)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: "#38bdf8",
      dashSize: 0.15,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.7,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }, []);

  const lineMeshOutput = useMemo(() => {
    const points = [new THREE.Vector3(-2.8, 1.95, 0), new THREE.Vector3(2.8, 1.95, 0)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: "#38bdf8",
      dashSize: 0.15,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.7,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }, []);

  return (
    <group position={[0, -0.9, 0]}>
      <primitive object={lineMeshInput} />
      <primitive object={lineMeshOutput} />
    </group>
  );
};