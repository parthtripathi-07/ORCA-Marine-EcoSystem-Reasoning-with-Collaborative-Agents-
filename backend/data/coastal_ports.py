"""
Catalog of Major and Minor Fishing Harbors / Landing Centers across Indian Coastline.
Includes latitude, longitude, state, and coastal zone categorization.
"""

COASTAL_PORTS = {
    "chennai": {
        "name": "Chennai (Kasimedu Fishing Harbour)",
        "state": "Tamil Nadu",
        "lat": 13.1256,
        "lon": 80.2974,
        "region": "Coromandel Coast (Bay of Bengal)"
    },
    "visakhapatnam": {
        "name": "Visakhapatnam Fishing Harbour",
        "state": "Andhra Pradesh",
        "lat": 17.6975,
        "lon": 83.3005,
        "region": "Northern Andhra Coast (Bay of Bengal)"
    },
    "kakinada": {
        "name": "Kakinada Fishing Harbour",
        "state": "Andhra Pradesh",
        "lat": 16.9891,
        "lon": 82.2475,
        "region": "Godavari Delta (Bay of Bengal)"
    },
    "paradeep": {
        "name": "Paradeep Fishing Harbour",
        "state": "Odisha",
        "lat": 20.3168,
        "lon": 86.6114,
        "region": "Odisha Coast (Bay of Bengal)"
    },
    "digha": {
        "name": "Digha / Shankarpur Harbour",
        "state": "West Bengal",
        "lat": 21.6266,
        "lon": 87.5074,
        "region": "Bengal Delta Coast"
    },
    "kochi": {
        "name": "Kochi (Thoppumpady Fishing Harbour)",
        "state": "Kerala",
        "lat": 9.9312,
        "lon": 76.2673,
        "region": "Malabar Coast (Arabian Sea)"
    },
    "kollam": {
        "name": "Kollam (Neendakara Fishing Harbour)",
        "state": "Kerala",
        "lat": 8.9378,
        "lon": 76.5414,
        "region": "South Kerala Coast (Arabian Sea)"
    },
    "mangalore": {
        "name": "Mangalore (Old Port Fishing Harbour)",
        "state": "Karnataka",
        "lat": 12.8708,
        "lon": 74.8430,
        "region": "Canara Coast (Arabian Sea)"
    },
    "goa": {
        "name": "Malim / Panaji Fishing Jetty",
        "state": "Goa",
        "lat": 15.5036,
        "lon": 73.8344,
        "region": "Konkan Coast (Arabian Sea)"
    },
    "mumbai": {
        "name": "Mumbai (Sassoon Docks / Versova)",
        "state": "Maharashtra",
        "lat": 18.9167,
        "lon": 72.8250,
        "region": "Northern Maharashtra Coast (Arabian Sea)"
    },
    "veraval": {
        "name": "Veraval Fishing Harbour",
        "state": "Gujarat",
        "lat": 20.9077,
        "lon": 70.3678,
        "region": "Saurashtra Coast (Arabian Sea)"
    },
    "porbandar": {
        "name": "Porbandar Fishing Harbour",
        "state": "Gujarat",
        "lat": 21.6417,
        "lon": 69.6293,
        "region": "Saurashtra Coast (Arabian Sea)"
    },
    "tuticorin": {
        "name": "Tuticorin (Thoothukudi Harbour)",
        "state": "Tamil Nadu",
        "lat": 8.7642,
        "lon": 78.1348,
        "region": "Gulf of Mannar"
    },
    "rameswaram": {
        "name": "Rameswaram / Mandapam Port",
        "state": "Tamil Nadu",
        "lat": 9.2876,
        "lon": 79.3129,
        "region": "Palk Bay & Strait"
    },
    "nagapattinam": {
        "name": "Nagapattinam Fishing Harbour",
        "state": "Tamil Nadu",
        "lat": 10.7656,
        "lon": 79.8424,
        "region": "Cauvery Delta Coast"
    },
    "kanyakumari": {
        "name": "Kanyakumari / Chinnamuttam Harbour",
        "state": "Tamil Nadu",
        "lat": 8.0883,
        "lon": 77.5385,
        "region": "Indian Ocean Confluence"
    },
    "port_blair": {
        "name": "Port Blair (Junglighat Fishing Jetty)",
        "state": "Andaman & Nicobar",
        "lat": 11.6670,
        "lon": 92.7350,
        "region": "Andaman Sea"
    }
}

COASTAL_LOCATIONS = {
    "mumbai": (18.9167, 72.8250),
    "bombay": (18.9167, 72.8250),
    "goa": (15.5036, 73.8344),
    "panaji": (15.5036, 73.8344),
    "malim": (15.5036, 73.8344),
    "chennai": (13.1256, 80.2974),
    "madras": (13.1256, 80.2974),
    "kasimedu": (13.1256, 80.2974),
    "kochi": (9.9312, 76.2673),
    "cochin": (9.9312, 76.2673),
    "visakhapatnam": (17.6975, 83.3005),
    "vizag": (17.6975, 83.3005),
    "kolkata": (22.5726, 88.3639),
    "calcutta": (22.5726, 88.3639),
    "digha": (21.6266, 87.5074),
    "paradeep": (20.3168, 86.6114),
    "puri": (19.8135, 85.8312),
    "kakinada": (16.9891, 82.2475),
    "mangalore": (12.8708, 74.8430),
    "mangaluru": (12.8708, 74.8430),
    "veraval": (20.9077, 70.3678),
    "porbandar": (21.6417, 69.6293),
    "tuticorin": (8.7642, 78.1348),
    "thoothukudi": (8.7642, 78.1348),
    "rameswaram": (9.2876, 79.3129),
    "mandapam": (9.2876, 79.3129),
    "nagapattinam": (10.7656, 79.8424),
    "kanyakumari": (8.0883, 77.5385),
    "port blair": (11.6670, 92.7350),
    "andaman": (11.6670, 92.7350),
    "kollam": (8.9378, 76.5414),
    "kandla": (23.0000, 70.2167),
    "okha": (22.4667, 69.0667),
    "ratnagiri": (16.9902, 73.3120),
    "karwar": (14.8185, 74.1306),
    "bhatkal": (13.9764, 74.5511),
    "machilipatnam": (16.1875, 81.1389),
    "gopalpur": (19.2600, 84.9000),
    "diu": (20.7144, 70.9874),
    "daman": (20.3974, 72.8328)
}

def extract_locations_from_query(query: str):
    """
    Find all coastal cities/ports mentioned in query in order of appearance.
    Returns list of (location_name, (lat, lon)) tuples.
    """
    import re
    q_lower = query.lower()
    matches = []
    
    # Sort location keys by length descending to match 'port blair' before 'port'
    sorted_locs = sorted(COASTAL_LOCATIONS.keys(), key=len, reverse=True)
    
    for loc_name in sorted_locs:
        # Match whole word
        pattern = r'\b' + re.escape(loc_name) + r'\b'
        for m in re.finditer(pattern, q_lower):
            matches.append((m.start(), loc_name, COASTAL_LOCATIONS[loc_name]))
            
    # Sort matches by appearance in query string
    matches.sort(key=lambda x: x[0])
    
    # Filter out overlapping substrings
    deduped = []
    last_idx = -1
    for start_pos, loc_name, coords in matches:
        if start_pos > last_idx:
            deduped.append((loc_name, coords))
            last_idx = start_pos + len(loc_name) - 1
            
    return deduped

def find_nearest_port(lat: float, lon: float):
    """Find the closest coastal harbor to given coordinates using Haversine formula."""
    import math
    min_dist = float('inf')
    best_port = None
    best_key = None

    for key, p in COASTAL_PORTS.items():
        # Haversine distance in km
        dlat = math.radians(p["lat"] - lat)
        dlon = math.radians(p["lon"] - lon)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat)) * math.cos(math.radians(p["lat"])) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        dist_km = 6371 * c
        
        if dist_km < min_dist:
            min_dist = dist_km
            best_port = p
            best_key = key

    return best_key, best_port, round(min_dist, 1)

def match_port_name(query: str):
    """Extract port key from natural language string."""
    found = extract_locations_from_query(query)
    if found:
        loc_name, coords = found[0]
        # Resolve to nearest COASTAL_PORTS key
        k, p, _ = find_nearest_port(coords[0], coords[1])
        return k, p
    return None, None

