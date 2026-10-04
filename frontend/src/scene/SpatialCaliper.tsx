import React, { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";

interface CaliperProps {
  pointA: THREE.Vector3 | null;
  pointB: THREE.Vector3 | null;
  scaleFactorMm?: number;
}

export const SpatialCaliper: React.FC<CaliperProps> = ({
  pointA,
  pointB,
  scaleFactorMm = 50.0,
}) => {
  const lineMesh = useMemo(() => {
    if (!pointA || !pointB) return null;
    const geo = new THREE.BufferGeometry().setFromPoints([pointA, pointB]);
    const mat = new THREE.LineBasicMaterial({
      color: "#2dd4bf",
      linewidth: 2,
    });
    return new THREE.Line(geo, mat);
  }, [pointA, pointB]);

  const midpoint = useMemo(() => {
    if (!pointA || !pointB) return null;
    return new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
  }, [pointA, pointB]);

  const distanceMm = useMemo(() => {
    if (!pointA || !pointB) return "0.00";
    return (pointA.distanceTo(pointB) * scaleFactorMm).toFixed(2);
  }, [pointA, pointB, scaleFactorMm]);

  if (!pointA) return null;

  return (
    <group>
      {/* Anchor Marker Point A */}
      <mesh position={pointA}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshBasicMaterial color="#2dd4bf" />
      </mesh>

      {/* Anchor Marker Point B */}
      {pointB && (
        <mesh position={pointB}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial color="#2dd4bf" />
        </mesh>
      )}

      {/* Caliper Measurement Vector */}
      {lineMesh && <primitive object={lineMesh} />}

      {/* Billboard Dimension Callout Badge */}
      {midpoint && pointB && (
        <Html position={midpoint} center distanceFactor={7}>
          <div
            style={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid #2dd4bf",
              borderRadius: 4,
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: "bold",
              color: "#2dd4bf",
              fontFamily: "monospace",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.7)",
            }}
          >
            📏 {distanceMm} mm
          </div>
        </Html>
      )}
    </group>
  );
};