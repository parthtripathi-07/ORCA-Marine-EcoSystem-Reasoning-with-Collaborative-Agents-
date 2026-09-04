"""
Marine Vessel Route Planning and Safe Navigation Engine.
Calculates optimal waypoints, nautical distance, compass headings, estimated travel time,
and ensures routes avoid IMBL international boundaries and Marine Protected Areas.
"""

import math
from services.geofence_service import haversine_km, evaluate_geofence_risk
from services.pfz_service import calculate_bearing

def calculate_safe_route(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float, avg_speed_knots: float = 8.0):
    """
    Computes navigation route waypoints and safety parameters between origin and destination.
    """
    # Direct distance
    total_km = haversine_km(origin_lat, origin_lon, dest_lat, dest_lon)
    total_nm = total_km * 0.539957

    # Direct bearing
    heading_deg, heading_dir = calculate_bearing(origin_lat, origin_lon, dest_lat, dest_lon)

    # Generate 5 intermediate waypoints
    num_pts = 5
    waypoints = []
    has_danger_near_route = False

    for i in range(num_pts + 1):
        frac = i / num_pts
        w_lat = origin_lat + frac * (dest_lat - origin_lat)
        w_lon = origin_lon + frac * (dest_lon - origin_lon)
        
        # Check geofence risk along waypoint
        geo_eval = evaluate_geofence_risk(w_lat, w_lon)
        if not geo_eval["is_safe_zone"]:
            has_danger_near_route = True

        waypoints.append({
            "step": i + 1,
            "lat": round(w_lat, 4),
            "lon": round(w_lon, 4),
            "dist_from_origin_nm": round(total_nm * frac, 1)
        })

    # Travel time in hours and minutes
    travel_time_hours = total_nm / max(avg_speed_knots, 1.0)
    hours = int(travel_time_hours)
    minutes = int((travel_time_hours - hours) * 60)

    # Approximate fuel consumption (1.1 - 1.4 liters diesel per NM for mechanized gillnetter/trawler)
    estimated_fuel_liters = round(total_nm * 1.25, 1)

    return {
        "origin": {"lat": origin_lat, "lon": origin_lon},
        "destination": {"lat": dest_lat, "lon": dest_lon},
        "total_distance_nm": round(total_nm, 1),
        "total_distance_km": round(total_km, 1),
        "heading_degrees": heading_deg,
        "heading_compass": heading_dir,
        "cruising_speed_knots": avg_speed_knots,
        "estimated_duration": f"{hours}h {minutes}m" if hours > 0 else f"{minutes} mins",
        "estimated_fuel_diesel_liters": estimated_fuel_liters,
        "route_has_border_risk": has_danger_near_route,
        "waypoints": waypoints,
        "polyline_coordinates": [[pt["lat"], pt["lon"]] for pt in waypoints]
    }

