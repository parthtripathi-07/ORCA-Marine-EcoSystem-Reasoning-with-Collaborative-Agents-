"""
Geofencing and Maritime Boundary Risk Assessment Service.
Calculates proximity to International Maritime Boundary Lines (IMBL - India/Sri Lanka, India/Pakistan),
and checks containment within Marine Protected Areas (MPAs).
"""

import math
from data.imbl_boundaries import IMBL_INDIA_SRI_LANKA, IMBL_INDIA_PAKISTAN, MARINE_PROTECTED_AREAS

def haversine_km(lat1, lon1, lat2, lon2):
    """Compute great-circle distance in kilometers."""
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return 6371 * c

def point_to_segment_dist_km(px, py, x1, y1, x2, y2):
    """
    Approximate minimum distance from point (px, py) to line segment (x1, y1)-(x2, y2).
    x=lon, y=lat
    """
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return haversine_km(py, px, y1, x1)

    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return haversine_km(py, px, proj_y, proj_x)

def check_point_in_polygon(lat, lon, polygon):
    """Ray casting algorithm to determine if (lat, lon) is inside a polygon."""
    inside = False
    n = len(polygon)
    p1lat, p1lon = polygon[0]
    for i in range(1, n + 1):
        p2lat, p2lon = polygon[i % n]
        if min(p1lat, p2lat) < lat <= max(p1lat, p2lat):
            if lon <= max(p1lon, p2lon):
                if p1lat != p2lat:
                    xinters = (lat - p1lat) * (p2lon - p1lon) / (p2lat - p1lat) + p1lon
                if p1lon == p2lon or lon <= xinters:
                    inside = not inside
        p1lat, p1lon = p2lat, p2lon
    return inside

def evaluate_geofence_risk(lat: float, lon: float):
    """
    Evaluates maritime safety risks against IMBL border lines and MPAs.
    Returns structured safety alerts and distance metrics.
    """
    # 1. Check India-Sri Lanka IMBL
    min_dist_sl_km = float('inf')
    closest_sl_point = None
    for i in range(len(IMBL_INDIA_SRI_LANKA) - 1):
        p1 = IMBL_INDIA_SRI_LANKA[i]
        p2 = IMBL_INDIA_SRI_LANKA[i+1]
        d = point_to_segment_dist_km(lon, lat, p1["lon"], p1["lat"], p2["lon"], p2["lat"])
        if d < min_dist_sl_km:
            min_dist_sl_km = d
            closest_sl_point = p1["point_id"]

    min_dist_sl_nm = min_dist_sl_km * 0.539957

    # 2. Check India-Pakistan IMBL
    min_dist_pk_km = float('inf')
    for i in range(len(IMBL_INDIA_PAKISTAN) - 1):
        p1 = IMBL_INDIA_PAKISTAN[i]
        p2 = IMBL_INDIA_PAKISTAN[i+1]
        d = point_to_segment_dist_km(lon, lat, p1["lon"], p1["lat"], p2["lon"], p2["lat"])
        if d < min_dist_pk_km:
            min_dist_pk_km = d

    min_dist_pk_nm = min_dist_pk_km * 0.539957

    # 3. Check Marine Protected Areas
    mpa_violations = []
    for mpa in MARINE_PROTECTED_AREAS:
        if check_point_in_polygon(lat, lon, mpa["polygon"]):
            mpa_violations.append(mpa)

    # 4. Generate Alert & Recommendations
    alerts = []
    geofence_status = "SAFE"

    # Sri Lanka IMBL threshold check
    if min_dist_sl_nm < 3.0:
        geofence_status = "DANGER_BORDER_PROXIMITY"
        alerts.append({
            "level": "CRITICAL",
            "title": "IMBL Extreme Proximity Alert (Sri Lanka Border)",
            "message": f"Vessel is only {round(min_dist_sl_nm, 1)} NM ({round(min_dist_sl_km, 1)} km) from India-Sri Lanka Maritime Boundary near {closest_sl_point}. Turn immediately westward towards Indian waters to avoid border seizure."
        })
    elif min_dist_sl_nm < 7.0:
        if geofence_status != "DANGER_BORDER_PROXIMITY":
            geofence_status = "CAUTION_BORDER_PROXIMITY"
        alerts.append({
            "level": "WARNING",
            "title": "IMBL Buffer Zone Advisory",
            "message": f"Vessel is {round(min_dist_sl_nm, 1)} NM from the International Maritime Boundary Line. Do not drift eastward into Sri Lankan waters."
        })

    # Pakistan IMBL threshold check
    if min_dist_pk_nm < 5.0:
        geofence_status = "DANGER_BORDER_PROXIMITY"
        alerts.append({
            "level": "CRITICAL",
            "title": "Notified Border Danger Zone (Sir Creek / Pakistan)",
            "message": f"Vessel is within {round(min_dist_pk_nm, 1)} NM of the India-Pakistan maritime boundary. Navigating further west/northwest is strictly prohibited."
        })

    # MPA check
    for mpa in mpa_violations:
        geofence_status = "RESTRICTED_MPA"
        alerts.append({
            "level": "VIOLATION",
            "title": f"Restricted Ecological Zone: {mpa['name']}",
            "message": f"These coordinates fall inside an Indian Marine Protected Area ({mpa['type']}). Commercial mechanized trawling is prohibited under the Wildlife Protection Act."
        })

    return {
        "geofence_status": geofence_status,
        "is_safe_zone": len(alerts) == 0,
        "nearest_imbl_sl_nm": round(min_dist_sl_nm, 1),
        "nearest_imbl_sl_km": round(min_dist_sl_km, 1),
        "nearest_imbl_pk_nm": round(min_dist_pk_nm, 1),
        "alerts": alerts
    }

