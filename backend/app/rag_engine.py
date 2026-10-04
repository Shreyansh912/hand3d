"""
Hand3D - Local Vector RAG Engine
File location: hand3d/backend/app/rag_engine.py
"""

from typing import List, Dict, Any
import math
import numpy as np

# Ground truth service manual repository
SERVICE_MANUAL_DOCS = [
    {
        "id": "DOC_GEAR_LUB_01",
        "component_type": "Spur Gear",
        "title": "ISO 6336-2: Lubricant Film Breakdown & Scuffing",
        "content": (
            "Under boundary lubrication conditions where elastohydrodynamic film thickness drops below composite "
            "surface roughness (lambda < 1.0), direct metal-to-metal contact occurs. For case-hardened alloy steels "
            "(8620/20MnCr5), friction heats the contact line above flash temperature, initiating adhesive micro-welding "
            "and tearing known as scuffing. Progressive operation induces micropitting at the dedendum flank."
        ),
        "standards": ["ISO 6336-2", "AGMA 925-A03"]
    },
    {
        "id": "DOC_BEARING_01",
        "component_type": "Rolling-Element Bearing",
        "title": "SKF Bearing Maintenance: Deep-Groove Ball Clearances & Brinelling",
        "content": (
            "Deep-groove ball bearings (6204/6205 series) operating with contaminated or depleted grease experience "
            "asperity shear. True brinelling results from static overload causing permanent raceway indentations. "
            "False brinelling results from micro-oscillation and fretting wear under static vibration, producing reddish "
            "iron oxide debris (Fe2O3) and characteristic fluting marks across the raceway."
        ),
        "standards": ["ISO 281", "DIN 625-1"]
    },
    {
        "id": "DOC_SHAFT_01",
        "component_type": "Transmission Shaft",
        "title": "DIN 743: Shaft Fatigue & Keyway Stress Concentration",
        "content": (
            "For transmission shafts under combined reversed-bending and steady torsion, geometric discontinuities "
            "(retaining ring grooves, shoulder fillets, DIN 6885 keyways) produce geometric notch factors Kt between 1.8 "
            "and 2.6. Fatigue fractures initiate at keyway root corners and propagate transversely along 45-degree shear planes."
        ),
        "standards": ["DIN 743-2", "ASME B106.1M"]
    },
    {
        "id": "DOC_HOUSING_01",
        "component_type": "Housing Frame",
        "title": "ASTM A48 Class 30: Casing Resonance & Alignment Retention",
        "content": (
            "Cast iron housings provide internal damping to attenuate gear meshing frequencies (GMF). Operating temperatures "
            "exceeding 80 deg C cause differential thermal expansion between the steel bearing outer rings and cast iron bores, "
            "risking loss of bearing seating interference and bore fretting corrosion."
        ),
        "standards": ["ASTM A48", "ISO 1940-1"]
    }
]


def _text_to_vector(text: str, vocab: List[str]) -> np.ndarray:
    """Computes a normalized bag-of-words / character-trigram frequency vector."""
    tokens = text.lower().replace("-", " ").replace(":", " ").replace(",", " ").split()
    vec = np.zeros(len(vocab), dtype=np.float32)
    for word in tokens:
        if word in vocab:
            vec[vocab.index(word)] += 1.0
    norm = np.linalg.norm(vec)
    return vec / (norm + 1e-6)


# Build vocabulary index
all_words = set()
for doc in SERVICE_MANUAL_DOCS:
    for w in (doc["title"] + " " + doc["content"]).lower().split():
        clean_w = w.strip(".,():;\"'")
        if len(clean_w) > 2:
            all_words.add(clean_w)

VOCAB = sorted(list(all_words))
DOC_VECTORS = np.array([_text_to_vector(d["title"] + " " + d["content"], VOCAB) for d in SERVICE_MANUAL_DOCS])


def retrieve_relevant_manuals(query: str, component_type: str, top_k: int = 2) -> List[Dict[str, Any]]:
    """Retrieves top-k relevant technical manual documents using cosine similarity."""
    full_query = f"{component_type} {query}"
    q_vec = _text_to_vector(full_query, VOCAB)

    similarities = np.dot(DOC_VECTORS, q_vec)
    top_indices = np.argsort(similarities)[::-1][:top_k]

    results = []
    for idx in top_indices:
        results.append({
            "id": SERVICE_MANUAL_DOCS[idx]["id"],
            "title": SERVICE_MANUAL_DOCS[idx]["title"],
            "content": SERVICE_MANUAL_DOCS[idx]["content"],
            "standards": SERVICE_MANUAL_DOCS[idx]["standards"],
            "relevance_score": float(similarities[idx])
        })
    return results