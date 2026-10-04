"""
Hand3D - Backend Pydantic Schemas
File location: hand3d/backend/app/schemas.py
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class MechanicalSpecs(BaseModel):
    module: Optional[float] = None
    teeth: Optional[int] = None
    pitch_diameter_mm: Optional[float] = None
    material: str
    mating_parts: List[str] = []
    operational_limits: Dict[str, Any] = {}


class ComponentData(BaseModel):
    id: str
    name: str
    type: str
    role: str
    specs: MechanicalSpecs


class DiagnosticsRequest(BaseModel):
    component_id: str
    query: str
    component_context: ComponentData


class CitedStandard(BaseModel):
    title: str
    standard_codes: List[str]
    relevance_score: float


class DiagnosticsResponse(BaseModel):
    component_id: str
    answer: str
    key_factors: List[str]
    failure_risks: List[str]
    suggested_inspections: List[str]
    cited_standards: List[CitedStandard] = []