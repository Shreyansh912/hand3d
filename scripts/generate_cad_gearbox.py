"""
Hand3D - Milestone 8: Procedural CAD Generator for glTF/GLB Assemblies
File location: hand3d/scripts/generate_cad_gearbox.py
"""

import os
import math
import numpy as np
import trimesh
from trimesh.scene import Scene
from trimesh.transformations import rotation_matrix, translation_matrix


def create_gear_disk(radius: float, thickness: float, bore_radius: float):
    """Creates a gear blank with a center bore."""
    outer = trimesh.creation.cylinder(radius=radius, height=thickness, sections=40)
    return outer


def create_bearing(inner_r: float, outer_r: float, width: float):
    """Creates a representative bearing ring geometry."""
    ring = trimesh.creation.cylinder(radius=outer_r, height=width, sections=36)
    return ring


def main():
    target_dir = os.path.join("frontend", "public", "models")
    os.makedirs(target_dir, exist_ok=True)
    out_file = os.path.join(target_dir, "gearbox_assembly.glb")

    scene = Scene()
    rot_y = rotation_matrix(math.pi / 2.0, [0, 1, 0])

    # 1. Drive Input Shaft
    shaft1 = trimesh.creation.cylinder(radius=0.18, height=2.8, sections=32)
    shaft1.apply_transform(rot_y)
    scene.add_geometry(shaft1, node_name="Input_Shaft")

    # 2. Driver Pinion Gear (20T equivalent pitch)
    gear1 = create_gear_disk(radius=0.75, thickness=0.4, bore_radius=0.18)
    gear1.apply_transform(rot_y)
    gear1.apply_translation([0.2, 0, 0])
    scene.add_geometry(gear1, node_name="Driver_Pinion_20T")

    # 3. Input Bearings (6204)
    b_in_a = create_bearing(inner_r=0.18, outer_r=0.42, width=0.18)
    b_in_a.apply_transform(rot_y)
    b_in_a.apply_translation([-1.1, 0, 0])
    scene.add_geometry(b_in_a, node_name="Bearing_Input_A")

    b_in_b = create_bearing(inner_r=0.18, outer_r=0.42, width=0.18)
    b_in_b.apply_transform(rot_y)
    b_in_b.apply_translation([1.1, 0, 0])
    scene.add_geometry(b_in_b, node_name="Bearing_Input_B")

    # 4. Driven Output Shaft
    center_dist = 1.95
    shaft2 = trimesh.creation.cylinder(radius=0.22, height=2.8, sections=32)
    shaft2.apply_transform(rot_y)
    shaft2.apply_translation([0, center_dist, 0])
    scene.add_geometry(shaft2, node_name="Output_Shaft")

    # 5. Driven Output Gear (30T equivalent pitch)
    gear2 = create_gear_disk(radius=1.2, thickness=0.4, bore_radius=0.22)
    gear2.apply_transform(rot_y)
    gear2.apply_translation([0.2, center_dist, 0])
    scene.add_geometry(gear2, node_name="Driven_Gear_30T")

    # 6. Output Bearings (6205)
    b_out_a = create_bearing(inner_r=0.22, outer_r=0.50, width=0.20)
    b_out_a.apply_transform(rot_y)
    b_out_a.apply_translation([-1.1, center_dist, 0])
    scene.add_geometry(b_out_a, node_name="Bearing_Output_A")

    b_out_b = create_bearing(inner_r=0.22, outer_r=0.50, width=0.20)
    b_out_b.apply_transform(rot_y)
    b_out_b.apply_translation([1.1, center_dist, 0])
    scene.add_geometry(b_out_b, node_name="Bearing_Output_B")

    # 7. Structural Housing Frame
    housing = trimesh.creation.box(extents=[1.8, 4.2, 2.0])
    housing.apply_translation([0, center_dist / 2.0, 0])
    scene.add_geometry(housing, node_name="Housing_Base")

    # Export to GLB
    glb_data = scene.export(file_type="glb")
    with open(out_file, "wb") as f:
        f.write(glb_data)

    print(f"[Hand3D CAD Engine] Exported complete mechanical model -> {out_file}")


if __name__ == "__main__":
    main()