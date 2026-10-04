"""
Hand3D - Mechanical Intelligence API Service
File location: hand3d/backend/app/main.py
"""

import asyncio
import random
from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .schemas import DiagnosticsRequest, DiagnosticsResponse, ComponentData, MechanicalSpecs, CitedStandard
from .rag_engine import retrieve_relevant_manuals

app = FastAPI(
    title="Hand3D Mechanical Intelligence Service",
    version="1.0.0",
    description="Grounded Engineering Reasoning Engine with Local Vector RAG, Metrology Logging, Real-Time IoT Stream, and Automated Work Orders"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CAD_REGISTRY: Dict[str, ComponentData] = {
    "Input_Shaft": ComponentData(
        id="Input_Shaft",
        name="Drive Input Shaft",
        type="Transmission Shaft",
        role="Delivers primary input torque directly from the drive motor to the driving pinion.",
        specs=MechanicalSpecs(
            material="AISI 4140 Chromium-Molybdenum Steel",
            mating_parts=["Driver_Pinion_20T", "Bearing_Input_A", "Bearing_Input_B"],
            operational_limits={"max_torque_nm": 320, "max_shear_stress_mpa": 145}
        )
    ),
    "Driver_Pinion_20T": ComponentData(
        id="Driver_Pinion_20T",
        name="Driver Pinion (20T)",
        type="Spur Gear",
        role="High-speed driving pinion mesh with 20 teeth transferring torque at a 1:1.5 ratio.",
        specs=MechanicalSpecs(
            module=2.5,
            teeth=20,
            pitch_diameter_mm=50.0,
            material="Carburized 8620 Alloy Steel (58-62 HRC)",
            mating_parts=["Driven_Gear_30T", "Input_Shaft"],
            operational_limits={"tangential_load_kn": 4.8, "root_bending_stress_mpa": 280}
        )
    ),
    "Driven_Gear_30T": ComponentData(
        id="Driven_Gear_30T",
        name="Driven Gear (30T)",
        type="Spur Gear",
        role="Low-speed reduction gear delivering amplified output torque.",
        specs=MechanicalSpecs(
            module=2.5,
            teeth=30,
            pitch_diameter_mm=75.0,
            material="Carburized 8620 Alloy Steel (58-62 HRC)",
            mating_parts=["Driver_Pinion_20T", "Output_Shaft"],
            operational_limits={"tangential_load_kn": 4.8, "root_bending_stress_mpa": 240}
        )
    ),
    "Output_Shaft": ComponentData(
        id="Output_Shaft",
        name="Driven Output Shaft",
        type="Output Shaft",
        role="Transmits reduced speed and amplified torque to downstream machinery.",
        specs=MechanicalSpecs(
            material="AISI 4140 Alloy Steel",
            mating_parts=["Driven_Gear_30T", "Bearing_Output_A", "Bearing_Output_B"],
            operational_limits={"max_torque_nm": 480}
        )
    ),
    "Bearing_Input_A": ComponentData(
        id="Bearing_Input_A",
        name="Deep-Groove Ball Bearing 6204",
        type="Rolling-Element Bearing",
        role="Supports radial and moderate thrust loads on the high-speed input pinion shaft.",
        specs=MechanicalSpecs(
            material="High-Carbon Chromium Steel (AISI 52100 / 100Cr6)",
            mating_parts=["Input_Shaft", "Housing_Base"],
            operational_limits={"dynamic_load_rating_kn": 12.8, "limiting_speed_rpm": 18000}
        )
    ),
    "Bearing_Input_B": ComponentData(
        id="Bearing_Input_B",
        name="Deep-Groove Ball Bearing 6204",
        type="Rolling-Element Bearing",
        role="Supports radial loads on the opposing end of the input shaft.",
        specs=MechanicalSpecs(
            material="High-Carbon Chromium Steel (AISI 52100 / 100Cr6)",
            mating_parts=["Input_Shaft", "Housing_Base"],
            operational_limits={"dynamic_load_rating_kn": 12.8, "limiting_speed_rpm": 18000}
        )
    ),
    "Bearing_Output_A": ComponentData(
        id="Bearing_Output_A",
        name="Deep-Groove Ball Bearing 6205",
        type="Rolling-Element Bearing",
        role="Absorbs high reactionary radial loads resulting from output torque transmission.",
        specs=MechanicalSpecs(
            material="High-Carbon Chromium Steel (AISI 52100 / 100Cr6)",
            mating_parts=["Output_Shaft", "Housing_Base"],
            operational_limits={"dynamic_load_rating_kn": 14.8, "limiting_speed_rpm": 15000}
        )
    ),
    "Bearing_Output_B": ComponentData(
        id="Bearing_Output_B",
        name="Deep-Groove Ball Bearing 6205",
        type="Rolling-Element Bearing",
        role="Maintains output shaft alignment under cyclic bending loads.",
        specs=MechanicalSpecs(
            material="High-Carbon Chromium Steel (AISI 52100 / 100Cr6)",
            mating_parts=["Output_Shaft", "Housing_Base"],
            operational_limits={"dynamic_load_rating_kn": 14.8, "limiting_speed_rpm": 15000}
        )
    ),
    "Housing_Base": ComponentData(
        id="Housing_Base",
        name="Structural Casing",
        type="Housing Frame",
        role="Maintains rigid shaft alignment, absorbs reactionary torque, and holds lubrication reservoir.",
        specs=MechanicalSpecs(
            material="Class 30 Gray Cast Iron (ASTM A48)",
            mating_parts=["Input_Shaft", "Output_Shaft", "Bearing_Input_A", "Bearing_Output_A"],
            operational_limits={"reservoir_temp_c": 85}
        )
    )
}

class MetrologyData(BaseModel):
    caliper_distance_mm: Optional[float] = None
    max_runout_microns: Optional[float] = None
    runout_din_grade_compliant: Optional[bool] = None
    normal_backlash_mm: Optional[float] = None
    face_load_kh_beta: Optional[float] = None
    sump_temperature_c: Optional[float] = None
    clearance_margin_mm: Optional[float] = None
    oil_tan_mg_koh: Optional[float] = None
    oil_oxidation_factor: Optional[float] = None
    oil_health_status: Optional[str] = None

class InspectionSessionData(BaseModel):
    selected_components: List[str]
    max_torque_nm: float
    max_stress_mpa: float
    operating_speed_rpm: float
    diagnostics_history: List[DiagnosticsResponse] = []
    metrology: Optional[MetrologyData] = None

class WorkOrderRequest(BaseModel):
    dominant_failure_driver: str
    health_index_percent: float
    remaining_useful_life_hours: int
    vibration_rms_mms: float
    operating_rpm: float
    operating_torque_nm: float
    sump_temp_c: float
    inspected_component: Optional[str] = "Gearbox_Assembly"


@app.get("/health")
async def health_check():
    return {"status": "online", "subsystem": "Hand3D-Core"}


@app.websocket("/ws/telemetry")
async def websocket_telemetry_stream(websocket: WebSocket):
    await websocket.accept()
    base_rpm = 1200.0
    base_torque = 65.0

    try:
        while True:
            jitter_rpm = base_rpm + random.uniform(-15.0, 15.0)
            jitter_torque = base_torque + random.uniform(-2.0, 2.0)

            is_shock_anomaly = random.random() < 0.06
            if is_shock_anomaly:
                jitter_torque += random.uniform(45.0, 95.0)

            vibe_rms = 1.6 + (jitter_torque / 200.0) * 2.4 + random.uniform(-0.1, 0.2)
            if is_shock_anomaly:
                vibe_rms += random.uniform(2.8, 4.5)

            packet = {
                "timestamp": datetime.utcnow().isoformat(),
                "sensor_rpm": round(jitter_rpm, 1),
                "sensor_torque_nm": round(jitter_torque, 1),
                "vibration_rms_mms": round(vibe_rms, 2),
                "ambient_temp_c": 26.5,
                "is_shock_anomaly": is_shock_anomaly,
                "sensor_health": "ONLINE"
            }

            await websocket.send_json(packet)
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket closed: {e}")


@app.get("/components/{component_id}", response_model=ComponentData)
async def get_component_metadata(component_id: str):
    if component_id not in CAD_REGISTRY:
        raise HTTPException(status_code=404, detail="Component not found in CAD assembly.")
    return CAD_REGISTRY[component_id]


@app.post("/ai/diagnose", response_model=DiagnosticsResponse)
async def diagnose_component(req: DiagnosticsRequest):
    comp = req.component_context
    q = req.query

    retrieved_docs = retrieve_relevant_manuals(q, comp.type, top_k=1)
    top_doc = retrieved_docs[0] if retrieved_docs else None

    cited_standards: List[CitedStandard] = []
    if top_doc:
        cited_standards.append(
            CitedStandard(
                title=top_doc["title"],
                standard_codes=top_doc["standards"],
                relevance_score=round(top_doc["relevance_score"], 3)
            )
        )

    if any(k in q.lower() for k in ["fail", "wear", "lubricat", "break", "stress"]):
        if "gear" in comp.type.lower():
            answer = (
                f"For {comp.name} ({comp.specs.material}), loss of lubrication induces adhesive scuffing "
                f"followed by pitch-line pitting (d = {comp.specs.pitch_diameter_mm} mm). As documented in "
                f"{top_doc['title'] if top_doc else 'ISO 6336'}, boundary film collapse leads to micro-welding "
                f"and tooth flank degradation under cyclic root bending fatigue."
            )
            key_factors = [
                f"Pitch Line Velocity (module m = {comp.specs.module})",
                "Case Hardness (HRC 58-62) vs Contact Shear",
                "Elastohydrodynamic Lubrication (EHL) film thickness"
            ]
            failure_risks = ["Micropitting", "Flank scuffing", "Tooth root fatigue shear"]
            suggested_inspections = [
                "Ferrographic oil sample analysis for particulate count",
                "Contact pattern inspection across face width"
            ]
        elif "bearing" in comp.type.lower():
            answer = (
                f"{comp.name} relies on high-speed hydrodynamic film separation. Per "
                f"{top_doc['title'] if top_doc else 'SKF maintenance standards'}, operational starvation "
                f"triggers asperity micro-welding, raceway spalling, and false brinelling under cyclic oscillation."
            )
            key_factors = ["Dynamic load rating (C)", "L10 bearing life calculation", "Raceway surface roughness (Ra)"]
            failure_risks = ["Subsurface fatigue flaking", "Cage breakdown", "Raceway brinelling"]
            suggested_inspections = ["Envelope vibration demodulation", "Acoustic emission tracking"]
        elif "shaft" in comp.type.lower():
            answer = (
                f"The {comp.name} ({comp.specs.material}) is governed by {top_doc['title'] if top_doc else 'DIN 743'}. "
                f"Geometric stress concentration factors (Kt between 1.8 and 2.6) at keyways and bearing shoulder radii "
                f"make it susceptible to reverse-bending fatigue cracking."
            )
            key_factors = ["Keyway fillet stress concentration (Kt)", "Rotational unbalance", "Bending-torsion phase relationship"]
            failure_risks = ["Reverse-bending fatigue cracking", "Keyway deformation/shear"]
            suggested_inspections = ["Magnetic particle inspection (MPI)", "Vibration phase analysis"]
        else:
            answer = (
                f"{comp.name} functions as a structural constraint. Per {top_doc['title'] if top_doc else 'ASTM A48'}, "
                f"primary failure modes include vibration-induced fatigue and thermal bore expansion."
            )
            key_factors = ["Vibration resonance", "Mounting bolt torque consistency"]
            failure_risks = ["Casing distortion", "Bore misalignment"]
            suggested_inspections = ["CMM bore alignment inspection"]
    else:
        answer = (
            f"{comp.name} is an active {comp.type} operating in the gearbox assembly. "
            f"Its primary function is: {comp.role}. It is manufactured using {comp.specs.material} "
            f"to withstand severe mechanical stresses while interacting directly with {', '.join(comp.specs.mating_parts)}."
        )
        key_factors = ["Torque transmission continuity", "Material shear resistance", "Kinematic compatibility"]
        failure_risks = ["Normal operational wear over L10 lifetime"]
        suggested_inspections = ["Routine visual and acoustic emissions monitoring"]

    return DiagnosticsResponse(
        component_id=comp.id,
        answer=answer,
        key_factors=key_factors,
        failure_risks=failure_risks,
        suggested_inspections=suggested_inspections,
        cited_standards=cited_standards
    )


@app.post("/inspection/report")
async def generate_inspection_report(session: InspectionSessionData):
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    checks = {
        "ISO_6336_ROOT_BENDING": {
            "metric": f"{session.max_stress_mpa} MPa",
            "threshold": "<= 180 MPa",
            "passed": session.max_stress_mpa <= 180.0
        },
        "DIN_3962_RADIAL_RUNOUT": {
            "metric": f"{session.metrology.max_runout_microns if session.metrology and session.metrology.max_runout_microns is not None else 0.0} µm",
            "threshold": "<= 15.0 µm",
            "passed": bool(session.metrology and session.metrology.runout_din_grade_compliant)
        },
        "ISO_21771_NORMAL_BACKLASH": {
            "metric": f"{session.metrology.normal_backlash_mm if session.metrology and session.metrology.normal_backlash_mm is not None else 0.12} mm",
            "threshold": "0.06 - 0.18 mm",
            "passed": bool(session.metrology and 0.06 <= (session.metrology.normal_backlash_mm or 0.12) <= 0.18)
        },
        "THERMAL_SUMP_LIMIT": {
            "metric": f"{session.metrology.sump_temperature_c if session.metrology and session.metrology.sump_temperature_c is not None else 50.0} °C",
            "threshold": "<= 85.0 °C",
            "passed": (session.metrology.sump_temperature_c or 50.0) <= 85.0 if session.metrology else True
        },
        "HOUSING_CLEARANCE_INTERLOCK": {
            "metric": f"{session.metrology.clearance_margin_mm if session.metrology and session.metrology.clearance_margin_mm is not None else 1.2} mm",
            "threshold": ">= 0.08 mm",
            "passed": (session.metrology.clearance_margin_mm or 1.2) >= 0.08 if session.metrology else True
        },
        "ASTM_D664_LUBE_ACIDITY_TAN": {
            "metric": f"{session.metrology.oil_tan_mg_koh if session.metrology and session.metrology.oil_tan_mg_koh is not None else 0.35} mg KOH/g",
            "threshold": "<= 2.0 mg KOH/g",
            "passed": (session.metrology.oil_tan_mg_koh or 0.35) <= 2.0 if session.metrology else True
        }
    }

    all_passed = all(item["passed"] for item in checks.values())

    findings = []
    for diag in session.diagnostics_history:
        findings.append({
            "component_id": diag.component_id,
            "failure_risks": diag.failure_risks,
            "inspections": diag.suggested_inspections,
            "cited_standards": [s.standard_codes for s in (diag.cited_standards or [])]
        })

    report = {
        "report_id": f"CERT-QA-{int(datetime.utcnow().timestamp())}",
        "generation_time": timestamp,
        "overall_status": "CERTIFIED_PASS" if all_passed else "QUALITY_HOLD_FLAGGED",
        "compliance_scorecard": checks,
        "operating_kinematics": {
            "input_torque_nm": session.max_torque_nm,
            "max_root_bending_stress_mpa": session.max_stress_mpa,
            "operating_rpm": session.operating_speed_rpm,
        },
        "metrology_summary": {
            "caliper_measurement_mm": session.metrology.caliper_distance_mm if session.metrology else None,
            "peak_runout_microns": session.metrology.max_runout_microns if session.metrology else None,
            "normal_backlash_mm": session.metrology.normal_backlash_mm if session.metrology else None,
            "face_load_kh_beta": session.metrology.face_load_kh_beta if session.metrology else None,
            "oil_tan_mg_koh": session.metrology.oil_tan_mg_koh if session.metrology else None,
            "oil_oxidation_factor": session.metrology.oil_oxidation_factor if session.metrology else None,
            "oil_health_status": session.metrology.oil_health_status if session.metrology else None
        },
        "inspected_components": list(set(session.selected_components)),
        "ai_diagnostics_records": findings
    }
    return report


@app.post("/maintenance/work-order")
async def generate_work_order(req: WorkOrderRequest):
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    order_id = f"WO-MNT-{int(datetime.utcnow().timestamp())}"

    retrieved_manuals = retrieve_relevant_manuals(
        query=f"repair procedure corrective action for {req.dominant_failure_driver}",
        component_type="Bearing" if "Bearing" in req.dominant_failure_driver else "Gear",
        top_k=2
    )

    action_items = [
        "Lockout/Tagout (LOTO) primary drive motor before mechanical disassembly.",
        f"Inspect dynamic alignment and runout per DIN 3962; verify baseline runout does not exceed 15 µm.",
        "Perform ferrographic oil analysis and flush lubricant sump if particulate threshold is exceeded (ISO 4406).",
        "Inspect rolling elements and raceways for spalling, flaking, or micro-welding asperities per ISO 281."
    ]

    cited_docs = [
        {"title": doc["title"], "standards": doc["standards"]}
        for doc in retrieved_manuals
    ]

    return {
        "work_order_id": order_id,
        "issued_at": timestamp,
        "priority": "P1_URGENT" if req.health_index_percent < 40.0 else "P2_ELEVATED",
        "asset_id": "GBX-TWIN-01",
        "telemetry_at_trip": {
            "vibration_rms": f"{req.vibration_rms_mms} mm/s",
            "operating_rpm": req.operating_rpm,
            "torque_load_nm": req.operating_torque_nm,
            "sump_temp": f"{req.sump_temp_c} °C",
            "health_index": f"{req.health_index_percent}%",
            "estimated_rul": f"{req.remaining_useful_life_hours} hrs"
        },
        "root_cause_diagnosis": req.dominant_failure_driver,
        "prescribed_actions": action_items,
        "referenced_standards": cited_docs
    }