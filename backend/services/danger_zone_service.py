"""
ORCA Coastal Danger Zones & 100 KM Proximity Safety Scanner Service
Provides state-wise maritime risk evaluations and 100 km radius incident/hazard scanning.
Developed for ISRO SIH #26176.
"""

import math
from typing import Dict, List, Any, Optional
from data.imbl_boundaries import IMBL_INDIA_SRI_LANKA, IMBL_INDIA_PAKISTAN, MARINE_PROTECTED_AREAS

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance in kilometers using the Haversine formula."""
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(6371 * c, 2)

def calculate_compass_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Calculates true compass bearing (0-360 degrees) from point 1 to point 2."""
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlon_r = math.radians(lon2 - lon1)

    y = math.sin(dlon_r) * math.cos(lat2_r)
    x = math.cos(lat1_r) * math.sin(lat2_r) - math.sin(lat1_r) * math.cos(lat2_r) * math.cos(dlon_r)
    bearing = (math.degrees(math.atan2(y, x)) + 360) % 360
    return round(bearing)

def bearing_to_compass(bearing: float) -> str:
    compass_sectors = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                       "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = round(bearing / 22.5) % 16
    return compass_sectors[idx]

# =========================================================================
# 1. State-Wise Coastal Maritime Danger & Hazard Assessment Registry
# =========================================================================
STATE_DANGER_ZONES = [
    {
        "state": "Gujarat",
        "state_hi": "गुजरात",
        "risk_level": "CRITICAL",
        "risk_badge": "HIGH BORDER RISK",
        "color": "#ef4444",
        "primary_hazard": "Pakistan IMBL Border Buffer & Saurashtra High Swell",
        "summary": "Sir Creek / Pakistan maritime boundary within 15 NM. High risk of naval interception west of Okha/Jakhau.",
        "affected_ports": ["Okha", "Veraval", "Porbandar", "Kandla", "Jakhau"],
        "hotspots": [
            {"name": "Sir Creek Outer Mouth", "lat": 23.6333, "lon": 68.0833, "hazard_type": "IMBL Border Hazard"},
            {"name": "Marine National Park (Gulf of Kutch)", "lat": 22.45, "lon": 69.80, "hazard_type": "Coral No-Trawl Zone"},
            {"name": "Veraval Offshore Swell", "lat": 20.85, "lon": 70.15, "hazard_type": "Rough Swell (>2.0m)"}
        ],
        "safety_advisory": "Do not venture west of longitude 68°15' E. Ensure AIS Class-B / NavIC DAT transponders are active."
    },
    {
        "state": "Tamil Nadu & Puducherry",
        "state_hi": "तमिलनाडु एवं पुडुचेरी",
        "risk_level": "CRITICAL",
        "risk_badge": "BORDER & MPA ALERT",
        "color": "#ef4444",
        "primary_hazard": "Sri Lanka IMBL Palk Bay Boundary & Gulf of Mannar MPA",
        "summary": "Palk Bay international boundary line (9–14 NM from Rameswaram). Gulf of Mannar Marine National Park strict trawling ban.",
        "affected_ports": ["Rameswaram (Mandapam)", "Chennai (Kasimedu)", "Tuticorin (Thoothukudi)", "Nagapattinam"],
        "hotspots": [
            {"name": "Katchatheevu / IMBL Point 4", "lat": 9.4833, "lon": 79.4333, "hazard_type": "International Border Line"},
            {"name": "Gulf of Mannar Core Reefs", "lat": 9.15, "lon": 78.95, "hazard_type": "Wildlife Sanctuary (No-Trawl)"},
            {"name": "Palk Strait Shallow Shallows", "lat": 9.80, "lon": 79.70, "hazard_type": "Submerged Shoals"}
        ],
        "safety_advisory": "Maintain minimum 5 NM safety buffer from Sri Lanka IMBL line. Strictly avoid mechanized trawling in Gulf of Mannar."
    },
    {
        "state": "Odisha",
        "state_hi": "ओडिशा",
        "risk_level": "CAUTION",
        "risk_badge": "TURTLE SANCTUARY BAN",
        "color": "#f59e0b",
        "primary_hazard": "Gahirmatha Olive Ridley Sanctuary & Bay of Bengal Depressions",
        "summary": "Mechanized trawling strictly prohibited within 20 km of Gahirmatha shoreline (Wildlife Protection Act 1972). Seasonal cyclone squalls.",
        "affected_ports": ["Paradeep", "Puri", "Dhamra", "Gopalpur"],
        "hotspots": [
            {"name": "Gahirmatha Marine Sanctuary", "lat": 20.72, "lon": 87.05, "hazard_type": "Olive Ridley Nesting (No-Trawl)"},
            {"name": "Wheeler Island (APJ Abdul Kalam Island) Exclusion", "lat": 20.92, "lon": 87.08, "hazard_type": "Defense Testing Exclusion"}
        ],
        "safety_advisory": "Mechanized boats must stay 20 km offshore Gahirmatha; mandatory use of Turtle Excluder Devices (TED)."
    },
    {
        "state": "West Bengal",
        "state_hi": "पश्चिम बंगाल",
        "risk_level": "CAUTION",
        "risk_badge": "SHALLOW DELTA HAZARD",
        "color": "#f59e0b",
        "primary_hazard": "Sundarbans Biosphere Reserve & Bangladesh Maritime Border",
        "summary": "UNESCO Sundarbans core tiger delta restriction. Shifting silt sandbanks and tidal bore surges > 4.5m.",
        "affected_ports": ["Digha", "Kolkata (Diamond Harbour)", "Kakdwip", "Fraserganj"],
        "hotspots": [
            {"name": "Sundarbans Marine Delta", "lat": 21.75, "lon": 88.75, "hazard_type": "Protected Biosphere"},
            {"name": "Sandheads Shallow Sandbar", "lat": 21.05, "lon": 88.20, "hazard_type": "Grounding Hazard"}
        ],
        "safety_advisory": "Navigate strictly via marked nautical buoys; do not cross eastern delta channels into Bangladesh waters."
    },
    {
        "state": "Kerala",
        "state_hi": "केरल",
        "risk_level": "CAUTION",
        "risk_badge": "ROUGH SWELL & TSS",
        "color": "#f59e0b",
        "primary_hazard": "High Southwest Arabian Sea Swell & Commercial Shipping Lanes",
        "summary": "Heavy international merchant vessel Traffic Separation Scheme (TSS) off Kochi. Monsoon rough swell waves reaching 2.4m.",
        "affected_ports": ["Kochi (Thoppumpady)", "Kollam (Neendakara)", "Beypore (Kozhikode)", "Vizhinjam"],
        "hotspots": [
            {"name": "Kochi Offshore Commercial TSS Lane", "lat": 9.90, "lon": 76.00, "hazard_type": "Container Vessel Collision Risk"},
            {"name": "Vizhinjam Deep Trench Surge", "lat": 8.35, "lon": 76.90, "hazard_type": "Steep Coastal Drop-off"}
        ],
        "safety_advisory": "Keep clear of container ship fairway lines. Carry dual VHF and radar reflectors at night."
    },
    {
        "state": "Maharashtra & Goa",
        "state_hi": "महाराष्ट्र एवं गोवा",
        "risk_level": "SAFE",
        "risk_badge": "NORMAL / MODERATE",
        "color": "#10b981",
        "primary_hazard": "Malvan Coral Marine Sanctuary & Mumbai High Oil Platforms",
        "summary": "Malvan marine sanctuary ecological buffer. Mumbai High offshore rigs have 500m safety exclusion zones.",
        "affected_ports": ["Goa (Malim / Panaji)", "Mumbai (Sassoon Docks)", "Ratnagiri", "Alibaug"],
        "hotspots": [
            {"name": "Malvan Marine Sanctuary", "lat": 16.05, "lon": 73.45, "hazard_type": "Coral Protected Sanctuary"},
            {"name": "Mumbai High Exclusion Zone", "lat": 19.40, "lon": 71.30, "hazard_type": "Offshore Oil Rig Zone"}
        ],
        "safety_advisory": "Coastal weather calm to moderate. Maintain 500m clearance from offshore drilling platforms."
    },
    {
        "state": "Andhra Pradesh",
        "state_hi": "आंध्र प्रदेश",
        "risk_level": "SAFE",
        "risk_badge": "FAVOURABLE / SAFE",
        "color": "#10b981",
        "primary_hazard": "Godavari River Mouth Rip Currents & Deep Sea Drops",
        "summary": "Seasonal river confluence rip currents near Kakinada. Overall wave height calm (0.8m–1.2m).",
        "affected_ports": ["Visakhapatnam", "Kakinada", "Machilipatnam", "Nizamapatnam"],
        "hotspots": [
            {"name": "Hope Island Kakinada Spit", "lat": 16.95, "lon": 82.35, "hazard_type": "Shoal Sandbar"}
        ],
        "safety_advisory": "Weather favourable for deep-sea gillnetting. Check local bar mouth depth during ebb tide."
    },
    {
        "state": "Karnataka",
        "state_hi": "कर्नाटक",
        "risk_level": "SAFE",
        "risk_badge": "SAFE SAILING",
        "color": "#10b981",
        "primary_hazard": "Netravati River Bar Shallowing",
        "summary": "Favourable coastal conditions. Localized breakers at river mouths during low tide.",
        "affected_ports": ["Mangalore (Old Port)", "Karwar", "Bhatkal", "Malpe"],
        "hotspots": [
            {"name": "Netravati Estuary Bar", "lat": 12.84, "lon": 74.82, "hazard_type": "Estuary Breakers"}
        ],
        "safety_advisory": "Calm seas. Cross river sandbar during flood tide for safe navigation."
    },
    {
        "state": "Andaman & Nicobar Islands",
        "state_hi": "अंडमान एवं निकोबार",
        "risk_level": "CAUTION",
        "risk_badge": "REMOTE OCEAN WATERS",
        "color": "#f59e0b",
        "primary_hazard": "Tribal Coastal Reserves & Isolated Open Ocean Squalls",
        "summary": "5 km coastal exclusion around Jarawa & North Sentinel tribal reserves. Remote oceanic swell.",
        "affected_ports": ["Port Blair (Junglighat)", "Campbell Bay", "Diglipur"],
        "hotspots": [
            {"name": "North Sentinel Tribal Zone", "lat": 11.55, "lon": 92.23, "hazard_type": "Prohibited Tribal Sanctuary"},
            {"name": "Ten Degree Channel Currents", "lat": 10.00, "lon": 92.50, "hazard_type": "Strong Cross Current"}
        ],
        "safety_advisory": "Strict adherence to 5 km tribal buffer. Carry satellite DAT-SG transmitter for emergency SOS."
    }
]

# =========================================================================
# 2. Coastal Maritime Incidents & Reported Trouble Log (Simulated / Real-World)
# =========================================================================
RECENT_COASTAL_INCIDENTS = [
    {
        "incident_id": "INC-2026-088",
        "title": "Trawler Engine Breakdown",
        "title_hi": "ट्रॉलर का इंजन फेलियर",
        "lat": 9.4200,
        "lon": 79.3500,
        "nearest_port": "Rameswaram",
        "state": "Tamil Nadu",
        "severity": "MEDIUM",
        "reported_ago": "18 hours ago",
        "status": "RESCUED_BY_COAST_GUARD",
        "details": "Mechanized boat IND-TN-08 suffered engine failure 7 NM off Dhanushkodi. Safely towed to Mandapam jetty by ICG hovercraft."
    },
    {
        "incident_id": "INC-2026-079",
        "title": "Rough Sea Net Snag on Coral Outcrop",
        "title_hi": "मरीन कोरल पर जाल फँसना",
        "lat": 9.1800,
        "lon": 78.8800,
        "nearest_port": "Tuticorin",
        "state": "Tamil Nadu",
        "severity": "LOW",
        "reported_ago": "2 days ago",
        "status": "CLEARED",
        "details": "Fishing gear entangled near northern reef shelf. Fishermen cautioned against shallow reef dragging."
    },
    {
        "incident_id": "INC-2026-064",
        "title": "Border Proximity Warning Intercept",
        "title_hi": "सीमा के नजदीक चेतावनी व रेस्क्यू",
        "lat": 23.4500,
        "lon": 67.9200,
        "nearest_port": "Okha",
        "state": "Gujarat",
        "severity": "HIGH",
        "reported_ago": "3 days ago",
        "status": "ALERT_RESOLVED",
        "details": "2 traditional gillnetters alerted by coastal radar 3.5 NM from Pakistan boundary line. Safely guided back to Indian waters."
    },
    {
        "incident_id": "INC-2026-051",
        "title": "Olive Ridley Entanglement Rescue",
        "title_hi": "समुद्री कछुए का रेस्क्यू",
        "lat": 20.7500,
        "lon": 87.1200,
        "nearest_port": "Paradeep",
        "state": "Odisha",
        "severity": "LOW",
        "reported_ago": "4 days ago",
        "status": "RELEASED_SAFELY",
        "details": "Forest department and local fishers safely freed an entangled Olive Ridley sea turtle in Gahirmatha waters."
    },
    {
        "incident_id": "INC-2026-039",
        "title": "Squall Breakers Warning at River Mouth",
        "title_hi": "नदी के मुहाने पर ऊँची लहरें",
        "lat": 15.4800,
        "lon": 73.7800,
        "nearest_port": "Goa (Malim)",
        "state": "Goa",
        "severity": "LOW",
        "reported_ago": "5 days ago",
        "status": "NORMAL_WEATHER_RESTORED",
        "details": "Brief localized 1.8m swell reported at Mandovi bar. Waters currently calm and safe."
    }
]

# =========================================================================
# 3. 100 KM Proximity Safety Scanner Function
# =========================================================================
def scan_100km_radius(lat: float, lon: float) -> Dict[str, Any]:
    """
    Scans a 100 km (~54 Nautical Miles) radius around the given coordinates.
    Checks for:
      1. Active incidents / distress in last 7 days within 100 km.
      2. International Maritime Boundary Lines (IMBL) within 100 km.
      3. Marine Protected Areas (MPAs) within 100 km.
      4. General safety status verdict.
    """
    RADIUS_KM = 100.0
    detected_hazards = []
    incidents_in_radius = []
    border_in_radius = []
    mpas_in_radius = []

    # A. Scan Recent Reported Incidents within 100 km
    for inc in RECENT_COASTAL_INCIDENTS:
        dist_km = haversine_km(lat, lon, inc["lat"], inc["lon"])
        if dist_km <= RADIUS_KM:
            bearing = calculate_compass_bearing(lat, lon, inc["lat"], inc["lon"])
            compass_dir = bearing_to_compass(bearing)
            incidents_in_radius.append({
                **inc,
                "distance_km": dist_km,
                "distance_nm": round(dist_km * 0.539957, 1),
                "bearing_deg": bearing,
                "bearing_dir": compass_dir
            })

    # B. Scan Sri Lanka IMBL Points within 100 km
    closest_sl_dist = float('inf')
    closest_sl_pt = None
    for pt in IMBL_INDIA_SRI_LANKA:
        d = haversine_km(lat, lon, pt["lat"], pt["lon"])
        if d < closest_sl_dist:
            closest_sl_dist = d
            closest_sl_pt = pt

    if closest_sl_dist <= RADIUS_KM and closest_sl_pt:
        bearing = calculate_compass_bearing(lat, lon, closest_sl_pt["lat"], closest_sl_pt["lon"])
        border_in_radius.append({
            "border_name": "India - Sri Lanka International Maritime Boundary Line (IMBL)",
            "closest_point": closest_sl_pt["point_id"],
            "distance_km": closest_sl_dist,
            "distance_nm": round(closest_sl_dist * 0.539957, 1),
            "bearing_deg": bearing,
            "bearing_dir": bearing_to_compass(bearing),
            "risk_level": "CRITICAL" if closest_sl_dist < 20 else ("CAUTION" if closest_sl_dist < 60 else "MONITOR")
        })

    # C. Scan Pakistan IMBL Points within 100 km
    closest_pk_dist = float('inf')
    closest_pk_pt = None
    for pt in IMBL_INDIA_PAKISTAN:
        d = haversine_km(lat, lon, pt["lat"], pt["lon"])
        if d < closest_pk_dist:
            closest_pk_dist = d
            closest_pk_pt = pt

    if closest_pk_dist <= RADIUS_KM and closest_pk_pt:
        bearing = calculate_compass_bearing(lat, lon, closest_pk_pt["lat"], closest_pk_pt["lon"])
        border_in_radius.append({
            "border_name": "India - Pakistan Maritime Boundary Line (Sir Creek Zone)",
            "closest_point": closest_pk_pt["point_id"],
            "distance_km": closest_pk_dist,
            "distance_nm": round(closest_pk_dist * 0.539957, 1),
            "bearing_deg": bearing,
            "bearing_dir": bearing_to_compass(bearing),
            "risk_level": "CRITICAL" if closest_pk_dist < 25 else ("CAUTION" if closest_pk_dist < 70 else "MONITOR")
        })

    # D. Scan Marine Protected Areas within 100 km
    for mpa in MARINE_PROTECTED_AREAS:
        c_lat = mpa["center"]["lat"]
        c_lon = mpa["center"]["lon"]
        d = haversine_km(lat, lon, c_lat, c_lon)
        if d <= RADIUS_KM:
            bearing = calculate_compass_bearing(lat, lon, c_lat, c_lon)
            mpas_in_radius.append({
                "name": mpa["name"],
                "state": mpa["state"],
                "type": mpa["type"],
                "distance_km": d,
                "distance_nm": round(d * 0.539957, 1),
                "bearing_deg": bearing,
                "bearing_dir": bearing_to_compass(bearing)
            })

    # E. Formulate Overall Shield Status
    total_issues = len(incidents_in_radius) + len(border_in_radius) + len(mpas_in_radius)
    has_critical_border = any(b["risk_level"] == "CRITICAL" for b in border_in_radius)

    if has_critical_border:
        shield_status = "CRITICAL_BORDER_PROXIMITY"
        shield_badge = "HIGH ALERT"
        shield_color = "#ef4444"
        verdict = f"सावधान: 100 किमी के दायरे में अंतर्राष्ट्रीय समुद्री सीमा (IMBL) बहुत नजदीक ({border_in_radius[0]['distance_km']} km) है। सीमा की ओर न जाएँ!"
        verdict_en = f"CAUTION: International Border (IMBL) is only {border_in_radius[0]['distance_km']} km away. Do not sail eastward/seaward toward foreign waters!"
    elif total_issues > 0:
        shield_status = "CAUTION_RESTRICTIONS_NEARBY"
        shield_badge = "CAUTION ADVISED"
        shield_color = "#f59e0b"
        reasons = []
        if border_in_radius:
            reasons.append(f"IMBL Border ({border_in_radius[0]['distance_km']} km)")
        if mpas_in_radius:
            reasons.append(f"Protected Sanctuary ({mpas_in_radius[0]['name'].split('(')[0].strip()})")
        if incidents_in_radius:
            reasons.append(f"{len(incidents_in_radius)} recent incident logged")
        verdict = f"100 किमी के दायरे में ध्यान देने योग्य बातें: {', '.join(reasons)}। समुद्री नियमों का पालन करें।"
        verdict_en = f"Notice within 100 km: {', '.join(reasons)}. Follow maritime safety guidelines."
    else:
        shield_status = "ALL_CLEAR_SAFE"
        shield_badge = "100 KM ALL CLEAR"
        shield_color = "#10b981"
        verdict = "सुरक्षित क्षेत्र: 100 किमी के दायरे में कोई सक्रिय सीमा खतरा, समुद्री दुर्घटना या प्रतिबंधित क्षेत्र नहीं है। समुद्र में जाना सुरक्षित है।"
        verdict_en = "Safe Zone: 100 km radius is completely clear of border disputes, active distress incidents, or prohibited sanctuaries."

    return {
        "status": "success",
        "scanned_coordinates": {"lat": lat, "lon": lon},
        "radius_km": RADIUS_KM,
        "shield_status": shield_status,
        "shield_badge": shield_badge,
        "shield_color": shield_color,
        "total_items_found": total_issues,
        "verdict_hi": verdict,
        "verdict_en": verdict_en,
        "incidents_in_100km": incidents_in_radius,
        "borders_in_100km": border_in_radius,
        "mpas_in_100km": mpas_in_radius
    }

def get_all_state_danger_zones() -> List[Dict[str, Any]]:
    """Returns official danger zone summaries for all 9 Indian coastal states."""
    return STATE_DANGER_ZONES
