"""
Geospatial boundaries for International Maritime Boundary Lines (IMBL),
Buffer zones, Marine Protected Areas (MPAs), and Indian Exclusive Economic Zone (EEZ).
"""

import os
import json

# India - Sri Lanka IMBL coordinates (1974 & 1976 historic boundary agreements)
IMBL_INDIA_SRI_LANKA = [
    {"lat": 10.0833, "lon": 80.0833, "point_id": "IMBL-1"},
    {"lat": 9.9833, "lon": 79.9167, "point_id": "IMBL-2"},
    {"lat": 9.7000, "lon": 79.5333, "point_id": "IMBL-3"},
    {"lat": 9.4833, "lon": 79.4333, "point_id": "IMBL-4 (Near Katchatheevu)"},
    {"lat": 9.3667, "lon": 79.3833, "point_id": "IMBL-5 (Adam's Bridge)"},
    {"lat": 9.1000, "lon": 79.3500, "point_id": "IMBL-6 (Gulf of Mannar N)"},
    {"lat": 8.7000, "lon": 79.0333, "point_id": "IMBL-7"},
    {"lat": 8.4333, "lon": 78.9167, "point_id": "IMBL-8 (Gulf of Mannar S)"},
    {"lat": 7.9167, "lon": 78.7500, "point_id": "IMBL-9"}
]

# India - Pakistan Notified Maritime Boundary Zone (Sir Creek / Arabian Sea)
IMBL_INDIA_PAKISTAN = [
    {"lat": 23.6333, "lon": 68.0833, "point_id": "IN-PK-1 (Sir Creek Mouth)"},
    {"lat": 23.5000, "lon": 67.8000, "point_id": "IN-PK-2"},
    {"lat": 23.3333, "lon": 67.4167, "point_id": "IN-PK-3"},
    {"lat": 23.1500, "lon": 67.0000, "point_id": "IN-PK-4"},
    {"lat": 22.8000, "lon": 66.2500, "point_id": "IN-PK-5"}
]

# Marine Protected Areas (MPAs) & Ecologically Sensitive Coastal Reserves
MARINE_PROTECTED_AREAS = [
    {
        "id": "MPA-GOM",
        "name": "Gulf of Mannar Marine National Park & Biosphere Reserve",
        "state": "Tamil Nadu",
        "type": "No-Trawling / Ecological Sensitive Zone",
        "center": {"lat": 9.15, "lon": 78.95},
        "polygon": [
            [9.30, 78.70],
            [9.30, 79.25],
            [8.95, 79.20],
            [8.80, 78.60],
            [9.30, 78.70]
        ]
    },
    {
        "id": "MPA-GAHIR",
        "name": "Gahirmatha Marine Sanctuary (Olive Ridley Nesting Zone)",
        "state": "Odisha",
        "type": "Seasonal Mechanized Fishing Prohibition Zone",
        "center": {"lat": 20.72, "lon": 87.05},
        "polygon": [
            [20.85, 86.90],
            [20.85, 87.20],
            [20.55, 87.15],
            [20.55, 86.85],
            [20.85, 86.90]
        ]
    },
    {
        "id": "MPA-SUNDAR",
        "name": "Sundarbans Biosphere Reserve & Tiger Marine Delta",
        "state": "West Bengal",
        "type": "Protected Marine Ecosystem",
        "center": {"lat": 21.75, "lon": 88.75},
        "polygon": [
            [22.00, 88.50],
            [22.00, 89.10],
            [21.50, 89.00],
            [21.50, 88.40],
            [22.00, 88.50]
        ]
    }
]

def get_geofence_geojson():
    """Return GeoJSON feature collection including official Indian EEZ from dataset."""
    features = []

    # 1. Add Official Indian EEZ Polygon if available from dataset
    eez_file = os.path.join(os.path.dirname(__file__), "indian_eez.json")
    if os.path.exists(eez_file):
        try:
            with open(eez_file, "r", encoding="utf-8") as f:
                eez_data = json.load(f)
                for feat in eez_data.get("features", []):
                    feat["properties"]["name"] = "Indian Exclusive Economic Zone (200 NM)"
                    feat["properties"]["category"] = "EEZ_BOUNDARY"
                    feat["properties"]["warning"] = "Sovereign Rights of India (Area: ~1.66M km²)"
                    feat["properties"]["color"] = "#0284c7"
                    feat["properties"]["fillColor"] = "#0284c7"
                    feat["properties"]["fillOpacity"] = 0.08
                    feat["properties"]["weight"] = 2
                    features.append(feat)
        except Exception:
            pass
    
    # 2. Add India-Sri Lanka IMBL line
    features.append({
        "type": "Feature",
        "properties": {
            "name": "India - Sri Lanka International Maritime Boundary Line (IMBL)",
            "category": "IMBL_BORDER",
            "warning": "DO NOT CROSS. Indian Coast Guard / Sri Lanka Navy monitoring zone.",
            "color": "#ef4444",
            "weight": 3.5,
            "dashArray": "6, 6"
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[p["lon"], p["lat"]] for p in IMBL_INDIA_SRI_LANKA]
        }
    })

    # 3. Add India-Pakistan IMBL line
    features.append({
        "type": "Feature",
        "properties": {
            "name": "India - Pakistan Maritime Boundary (Sir Creek Outer Zone)",
            "category": "IMBL_BORDER",
            "warning": "HIGH RISK: International maritime border restriction area.",
            "color": "#ef4444",
            "weight": 3.5,
            "dashArray": "6, 6"
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[p["lon"], p["lat"]] for p in IMBL_INDIA_PAKISTAN]
        }
    })

    # 4. Add Marine Protected Areas
    for mpa in MARINE_PROTECTED_AREAS:
        features.append({
            "type": "Feature",
            "properties": {
                "name": mpa["name"],
                "category": "MPA_PROTECTED",
                "id": mpa["id"],
                "state": mpa["state"],
                "warning": mpa["type"],
                "color": "#f59e0b",
                "fillColor": "#f59e0b",
                "fillOpacity": 0.25,
                "weight": 2
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[pt[1], pt[0]] for pt in mpa["polygon"]]]
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }
