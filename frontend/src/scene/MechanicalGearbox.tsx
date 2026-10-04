import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GestureState } from "../vision/GestureEngine";
import { createStressMaterial } from "./StressHeatmapMaterial";

export interface ComponentMetadata {
  id: string;
  name: string;
  type: string;
  material: string;
  role: string;
}

interface MechanicalGearboxProps {
  gestureStateRef: React.MutableRefObject<GestureState | null>;
  explodedProgress: number;
  selectedId: string | null;
  isIsolated: boolean;
  sectionCut: boolean;
  inputTorqueNm: number;
  inputRpm: number;
  isCaliperMode: boolean;
  useStressShader?: boolean;
  onSelectComponent: (meta: ComponentMetadata | null) => void;
  onCaliperPointSelect: (pt: THREE.Vector3) => void;
}

export const MechanicalGearbox: React.FC<MechanicalGearboxProps> = ({
  explodedProgress,
  selectedId,
  isIsolated,
  sectionCut,
  inputTorqueNm,
  inputRpm,
  isCaliperMode,
  useStressShader = false,
  onSelectComponent,
  onCaliperPointSelect,
}) => {
  const pinionRef = useRef<THREE.Mesh>(null);
  const gearRef = useRef<THREE.Mesh>(null);
  const inputShaftRef = useRef<THREE.Mesh>(null);
  const outputShaftRef = useRef<THREE.Mesh>(null);

  // Initialize custom GLSL stress materials
  const pinionStressMat = useMemo(() => createStressMaterial(), []);
  const gearStressMat = useMemo(() => createStressMaterial(), []);

  // Section cut clipping plane (Z-axis)
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.2), []);

  // Standard procedural materials
  const defaultPinionMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#22c55e", roughness: 0.35, metalness: 0.65 }),
    []
  );
  const defaultGearMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#22c55e", roughness: 0.35, metalness: 0.65 }),
    []
  );

  useEffect(() => {
    defaultPinionMat.clippingPlanes = sectionCut ? [clippingPlane] : [];
    defaultGearMat.clippingPlanes = sectionCut ? [clippingPlane] : [];
    pinionStressMat.clippingPlanes = sectionCut ? [clippingPlane] : [];
    gearStressMat.clippingPlanes = sectionCut ? [clippingPlane] : [];
  }, [sectionCut, clippingPlane, defaultPinionMat, defaultGearMat, pinionStressMat, gearStressMat]);

  useFrame((_, delta) => {
    const omega = (2.0 * Math.PI * inputRpm) / 60.0;
    const rotDelta = omega * delta * 0.1;

    if (pinionRef.current) pinionRef.current.rotation.x += rotDelta;
    if (gearRef.current) gearRef.current.rotation.x -= rotDelta / 1.5;
    if (inputShaftRef.current) inputShaftRef.current.rotation.x += rotDelta;
    if (outputShaftRef.current) outputShaftRef.current.rotation.x -= rotDelta / 1.5;

    // Update uniform stress intensity based on applied torque
    const normalizedStress = Math.min(1.4, inputTorqueNm / 140.0);
    pinionStressMat.uniforms.uStressIntensity.value = normalizedStress;
    gearStressMat.uniforms.uStressIntensity.value = normalizedStress * 0.85;
    pinionStressMat.uniforms.uTime.value += delta;
    gearStressMat.uniforms.uTime.value += delta;
  });

  const handleMeshClick = (id: string, name: string, type: string, mat: string, role: string, e: any) => {
    e.stopPropagation();
    if (isCaliperMode) {
      onCaliperPointSelect(e.point);
      return;
    }
    onSelectComponent({ id, name, type, material: mat, role });
  };

  const isHidden = (id: string) => isIsolated && selectedId !== null && selectedId !== id;

  return (
    <group>
      {/* Driving Pinion (20T) */}
      {!isHidden("Driver_Pinion_20T") && (
        <mesh
          ref={pinionRef}
          position={[0.2, -0.9 - explodedProgress * 0.8, 0.45]}
          material={useStressShader ? pinionStressMat : defaultPinionMat}
          onClick={(e) =>
            handleMeshClick(
              "Driver_Pinion_20T",
              "Driver Pinion (20T)",
              "Spur Gear",
              "Carburized 8620 Alloy Steel (58-62 HRC)",
              "High-speed driving pinion mesh with 20 teeth transferring torque at a 1:1.5 ratio.",
              e
            )
          }
        >
          <cylinderGeometry args={[0.5, 0.5, 0.25, 20]} />
        </mesh>
      )}

      {/* Driven Gear (30T) */}
      {!isHidden("Driven_Gear_30T") && (
        <mesh
          ref={gearRef}
          position={[0.2, 1.05 + explodedProgress * 0.8, 0.45]}
          material={useStressShader ? gearStressMat : defaultGearMat}
          onClick={(e) =>
            handleMeshClick(
              "Driven_Gear_30T",
              "Driven Gear (30T)",
              "Spur Gear",
              "Carburized 8620 Alloy Steel (58-62 HRC)",
              "Low-speed reduction gear delivering amplified output torque.",
              e
            )
          }
        >
          <cylinderGeometry args={[0.75, 0.75, 0.25, 30]} />
        </mesh>
      )}

      {/* Input Shaft */}
      {!isHidden("Input_Shaft") && (
        <mesh
          ref={inputShaftRef}
          position={[0.0, -0.9, 0.45]}
          rotation={[0, 0, Math.PI / 2]}
          onClick={(e) =>
            handleMeshClick(
              "Input_Shaft",
              "Drive Input Shaft",
              "Transmission Shaft",
              "AISI 4140 Chromium-Molybdenum Steel",
              "Delivers primary input torque directly from the drive motor to the driving pinion.",
              e
            )
          }
        >
          <cylinderGeometry args={[0.12, 0.12, 2.2, 24]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
        </mesh>
      )}

      {/* Output Shaft */}
      {!isHidden("Output_Shaft") && (
        <mesh
          ref={outputShaftRef}
          position={[0.0, 1.05, 0.45]}
          rotation={[0, 0, Math.PI / 2]}
          onClick={(e) =>
            handleMeshClick(
              "Output_Shaft",
              "Driven Output Shaft",
              "Output Shaft",
              "AISI 4140 Alloy Steel",
              "Transmits reduced speed and amplified torque to downstream machinery.",
              e
            )
          }
        >
          <cylinderGeometry args={[0.15, 0.15, 2.2, 24]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
        </mesh>
      )}

      {/* Bearings & Structural Housing */}
      <mesh
        position={[-1.1, -0.9, 0.45]}
        rotation={[0, 0, Math.PI / 2]}
        onClick={(e) =>
          handleMeshClick(
            "Bearing_Input_A",
            "Deep-Groove Ball Bearing 6204",
            "Rolling-Element Bearing",
            "High-Carbon Chromium Steel (AISI 52100 / 100Cr6)",
            "Supports radial and moderate thrust loads on the high-speed input pinion shaft.",
            e
          )
        }
      >
        <cylinderGeometry args={[0.24, 0.24, 0.18, 24]} />
        <meshStandardMaterial
          color={selectedId === "Bearing_Input_A" ? "#38bdf8" : "#1e293b"}
          emissive={selectedId === "Bearing_Input_A" ? "#0284c7" : "#000000"}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      <mesh
        position={[1.1, -0.9, 0.45]}
        rotation={[0, 0, Math.PI / 2]}
        onClick={(e) =>
          handleMeshClick(
            "Bearing_Input_B",
            "Deep-Groove Ball Bearing 6204",
            "Rolling-Element Bearing",
            "High-Carbon Chromium Steel (AISI 52100 / 100Cr6)",
            "Supports radial loads on the opposing end of the input shaft.",
            e
          )
        }
      >
        <cylinderGeometry args={[0.24, 0.24, 0.18, 24]} />
        <meshStandardMaterial
          color={selectedId === "Bearing_Input_B" ? "#38bdf8" : "#1e293b"}
          emissive={selectedId === "Bearing_Input_B" ? "#0284c7" : "#000000"}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      <mesh
        position={[-1.1, 1.05, 0.45]}
        rotation={[0, 0, Math.PI / 2]}
        onClick={(e) =>
          handleMeshClick(
            "Bearing_Output_A",
            "Deep-Groove Ball Bearing 6205",
            "Rolling-Element Bearing",
            "High-Carbon Chromium Steel (AISI 52100 / 100Cr6)",
            "Absorbs high reactionary radial loads resulting from output torque transmission.",
            e
          )
        }
      >
        <cylinderGeometry args={[0.26, 0.26, 0.18, 24]} />
        <meshStandardMaterial
          color={selectedId === "Bearing_Output_A" ? "#38bdf8" : "#1e293b"}
          emissive={selectedId === "Bearing_Output_A" ? "#0284c7" : "#000000"}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      <mesh
        position={[1.1, 1.05, 0.45]}
        rotation={[0, 0, Math.PI / 2]}
        onClick={(e) =>
          handleMeshClick(
            "Bearing_Output_B",
            "Deep-Groove Ball Bearing 6205",
            "Rolling-Element Bearing",
            "High-Carbon Chromium Steel (AISI 52100 / 100Cr6)",
            "Maintains output shaft alignment under cyclic bending loads.",
            e
          )
        }
      >
        <cylinderGeometry args={[0.26, 0.26, 0.18, 24]} />
        <meshStandardMaterial
          color={selectedId === "Bearing_Output_B" ? "#38bdf8" : "#1e293b"}
          emissive={selectedId === "Bearing_Output_B" ? "#0284c7" : "#000000"}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
};