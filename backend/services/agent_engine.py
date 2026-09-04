"""
ORCA Collaborative Multi-Agent Engine (ISRO SIH #26176)
Coordinates specialized AI agents:
1. Intent & Planning Agent
2. Ocean Analytics & PFZ Agent
3. Marine Weather & Hazard Agent
4. Geospatial Risk & Geofencing Agent
5. Route Optimization Agent
6. Multilingual Synthesis & Explainability Agent (Gemini / Groq LLM)
"""

import os
import json
import logging
import requests
from dotenv import load_dotenv

from data.coastal_ports import COASTAL_PORTS, match_port_name, find_nearest_port
from services.marine_service import get_marine_weather
from services.pfz_service import get_pfz_advisories_for_port
from services.geofence_service import evaluate_geofence_risk
from services.routing_service import calculate_safe_route

load_dotenv()
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def call_gemini_llm(prompt: str) -> str:
    """Call Google Gemini 2.5/1.5 Flash API."""
    if not GEMINI_API_KEY:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3}
    }
    try:
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=12)
        if res.status_code == 200:
            data = res.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        else:
            logger.warning(f"Gemini API returned status {res.status_code}: {res.text[:150]}")
    except Exception as e:
        logger.warning(f"Gemini API exception: {e}")
    return None

def call_groq_llm(prompt: str) -> str:
    """Call Groq API (Qwen 3.6/3.8 or Llama 3) as high-speed fallback."""
    if not GROQ_API_KEY:
        return None
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    # Try accessible model
    models = ["qwen/qwen3.6-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]
    for model in models:
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3
        }
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=10)
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"]
        except Exception:
            continue
    return None

def query_llm(prompt: str) -> str:
    """Execute LLM inference with Gemini as primary and Groq as fast fallback."""
    ans = call_gemini_llm(prompt)
    if ans:
        return ans
    ans = call_groq_llm(prompt)
    if ans:
        return ans
    return None

def run_orca_multi_agent_pipeline(user_query: str, user_lat: float = None, user_lon: float = None):
    """
    Main Multi-Agent Workflow:
    Executes collaborative agent steps and returns synthesized decision support payload.
    """
    agent_logs = []
    
    # -------------------------------------------------------------
    # AGENT 1: Orchestration & Intent Planning Agent
    # -------------------------------------------------------------
    agent_logs.append({
        "agent": "Orchestration & Planning Agent",
        "action": "Analyzing user query, intent classification, and geospatial entity extraction.",
        "status": "COMPLETED"
    })

    # Resolve target coastal port & coordinates
    port_key, port_info = match_port_name(user_query)
    
    if user_lat is not None and user_lon is not None and user_lat > 0:
        target_lat, target_lon = user_lat, user_lon
        nearest_key, nearest_info, dist = find_nearest_port(user_lat, user_lon)
        port_key, port_info = nearest_key, nearest_info
    else:
        target_lat, target_lon = port_info["lat"], port_info["lon"]

    # Detect Query Category
    q_lower = user_query.lower()
    is_pfz_query = any(w in q_lower for w in ["fishing", "fish", "pfz", "machhli", "tuna", "zone", "macchli", "meen"])
    is_weather_query = any(w in q_lower for w in ["safe", "weather", "cyclone", "wave", "wind", "hawa", "storm", "toofan", "kal", "surakshit", "tide", "lightning"])
    is_geofence_query = any(w in q_lower for w in ["border", "sri lanka", "pakistan", "boundary", "imbl", "restricted", "seema", "cross", "mpa", "prohibited"])
    is_route_query = any(w in q_lower for w in ["route", "rasta", "direction", "navigation", "distance", "heading", "fuel", "time"])

    # -------------------------------------------------------------
    # AGENT 2: Ocean Analytics & PFZ Agent
    # -------------------------------------------------------------
    agent_logs.append({
        "agent": "Ocean Analytics & PFZ Agent",
        "action": f"Retrieving SST thermal fronts, Chlorophyll-a concentration, and INCOIS PFZ advisories for {port_info['name']}.",
        "status": "COMPLETED"
    })
    pfz_list = get_pfz_advisories_for_port(port_key)
    best_pfz = pfz_list[0] if pfz_list else None

    # -------------------------------------------------------------
    # AGENT 3: Marine Weather & Hazard Intelligence Agent
    # -------------------------------------------------------------
    agent_logs.append({
        "agent": "Marine Weather & Hazard Agent",
        "action": f"Querying Open-Meteo Marine & Atmospheric API for wave height, swell, wind gusts, and thunderstorm indicators at ({target_lat}, {target_lon}).",
        "status": "COMPLETED"
    })
    marine_weather = get_marine_weather(target_lat, target_lon)

    # -------------------------------------------------------------
    # AGENT 4: Geospatial Risk & Geofencing Agent
    # -------------------------------------------------------------
    agent_logs.append({
        "agent": "Geospatial Risk & Geofencing Agent",
        "action": "Evaluating proximity against India-Sri Lanka IMBL, India-Pakistan border, and Marine Protected Areas (MPAs).",
        "status": "COMPLETED"
    })
    # Evaluate at port and at PFZ location
    check_lat = best_pfz["lat"] if best_pfz else target_lat
    check_lon = best_pfz["lon"] if best_pfz else target_lon
    geofence_eval = evaluate_geofence_risk(check_lat, check_lon)

    # -------------------------------------------------------------
    # AGENT 5: Route Optimization & Navigation Agent
    # -------------------------------------------------------------
    agent_logs.append({
        "agent": "Route Optimization Agent",
        "action": f"Calculating safe navigation path, nautical distance, compass heading, and fuel consumption to target PFZ.",
        "status": "COMPLETED"
    })
    route_info = None
    if best_pfz:
        route_info = calculate_safe_route(
            port_info["lat"], port_info["lon"],
            best_pfz["lat"], best_pfz["lon"],
            avg_speed_knots=8.0
        )

    # -------------------------------------------------------------
    # AGENT 6: Multilingual Synthesis & Explainability Agent
    # -------------------------------------------------------------
    agent_logs.append({
        "agent": "Multilingual Synthesis & Explainability Agent",
        "action": "Synthesizing multi-agent evidence into explainable decision recommendations with regional language support.",
        "status": "COMPLETED"
    })

    # Prepare Context Prompt for LLM Synthesizer
    synthesis_prompt = f"""
You are ORCA, an advanced Agentic AI Marine Intelligence and Fishermen Safety Assistant built for ISRO (Indian Space Research Organisation) and INCOIS.

USER QUERY: "{user_query}"

LIVE AGENT DATA:
1. Target Coastal Port: {port_info['name']} ({port_info['state']}, {port_info['region']})
2. Marine Weather & Sea State:
   - Wave Height: {marine_weather['wave_height_m']} meters
   - Wave Period: {marine_weather['wave_period_s']} seconds
   - Wind Speed: {marine_weather['wind_speed_kmh']} km/h ({marine_weather['wind_speed_knots']} knots)
   - Wind Gusts: {marine_weather['wind_gusts_kmh']} km/h
   - Sea Surface Temperature: {marine_weather['sea_surface_temp_c']} °C
   - Current Velocity: {marine_weather['ocean_current_ms']} m/s
   - Weather Condition: {marine_weather['weather_condition']}
   - Sea Safety Status: {marine_weather['safety_status']} ({marine_weather['sea_state']})
   - Official Advisory: {marine_weather['advisory']}

3. Potential Fishing Zone (PFZ) Advisory:
   - Zone: {best_pfz['name'] if best_pfz else 'N/A'}
   - Distance: {best_pfz['distance_nm']} NM ({best_pfz['distance_km']} km) from port
   - Bearing / Heading: {best_pfz['bearing_deg']}° ({best_pfz['bearing_dir']})
   - Target Pelagic Fish: {', '.join(best_pfz['primary_species']) if best_pfz else 'N/A'}
   - Chlorophyll-a: {best_pfz['chlorophyll_mg_m3']} mg/m³ (High biological productivity)
   - SST: {best_pfz['sst_c']} °C (Thermal gradient front)
   - Confidence: {best_pfz['confidence_score']}%

4. Maritime Geofencing & Border Status:
   - Distance to nearest India-Sri Lanka IMBL: {geofence_eval['nearest_imbl_sl_nm']} NM
   - Distance to nearest India-Pakistan border: {geofence_eval['nearest_imbl_pk_nm']} NM
   - Geofence Safety: {geofence_eval['geofence_status']}
   - Active Border / MPA Alerts: {json.dumps(geofence_eval['alerts'])}

5. Safe Navigation Route:
   - Estimated Travel Time: {route_info['estimated_duration'] if route_info else 'N/A'} at 8 knots
   - Fuel Estimate: {route_info['estimated_fuel_diesel_liters'] if route_info else 'N/A'} Liters Diesel

INSTRUCTIONS:
1. Detect the user's language automatically (English, Hindi, Tamil, Telugu, Malayalam, Bengali, etc.). If asked in Hindi or Hinglish, respond clearly in natural Hindi/Hinglish. If in Tamil, respond in Tamil/English-Tamil mix. If in English, respond in English.
2. Directly answer the user's question first with clear decision-making (e.g. whether it is SAFE or UNSAFE).
3. Present key evidence clearly: Wave height, Wind, SST, PFZ direction & distance, and Boundary warnings.
4. If there is a boundary alert or high wave hazard, highlight it strongly.
5. Keep the tone helpful, professional, and fisherman-friendly.
6. Provide concise bullet points for easy reading on mobile/vessel screens.
"""

    llm_response = query_llm(synthesis_prompt)
    
    if not llm_response:
        # High quality fallback template if LLM is unreachable
        if is_weather_query:
            llm_response = (
                f"**Marine Safety Advisory for {port_info['name']}**:\n\n"
                f"- **Safety Status**: **{marine_weather['safety_status']}** ({marine_weather['sea_state']})\n"
                f"- **Wave Height**: {marine_weather['wave_height_m']} meters (Period: {marine_weather['wave_period_s']}s)\n"
                f"- **Wind Speed**: {marine_weather['wind_speed_kmh']} km/h (Gusts: {marine_weather['wind_gusts_kmh']} km/h)\n"
                f"- **Weather Condition**: {marine_weather['weather_condition']}\n"
                f"- **Sea Temperature**: {marine_weather['sea_surface_temp_c']} °C\n\n"
                f"**Recommendation**: {marine_weather['advisory']}"
            )
        elif is_pfz_query:
            llm_response = (
                f"**Nearest Potential Fishing Zone (PFZ) for {port_info['name']}**:\n\n"
                f"- **Zone**: {best_pfz['name']}\n"
                f"- **Bearing & Direction**: {best_pfz['bearing_deg']}° ({best_pfz['bearing_dir']})\n"
                f"- **Distance**: {best_pfz['distance_nm']} Nautical Miles ({best_pfz['distance_km']} km)\n"
                f"- **Target Fish Species**: {', '.join(best_pfz['primary_species'])}\n"
                f"- **Ocean Data**: SST {best_pfz['sst_c']}°C | Chlorophyll {best_pfz['chlorophyll_mg_m3']} mg/m³\n"
                f"- **Confidence Score**: {best_pfz['confidence_score']}%\n"
                f"- **Estimated Navigation Time**: {route_info['estimated_duration']} (Speed: 8 knots)"
            )
        else:
            llm_response = (
                f"**ORCA Marine Intelligence Report for {port_info['name']}**:\n\n"
                f"- **Sea Condition**: {marine_weather['safety_status']} (Wave: {marine_weather['wave_height_m']}m, Wind: {marine_weather['wind_speed_kmh']} km/h)\n"
                f"- **PFZ Location**: {best_pfz['bearing_deg']}° {best_pfz['bearing_dir']} at {best_pfz['distance_nm']} NM\n"
                f"- **Boundary Distance**: {geofence_eval['nearest_imbl_sl_nm']} NM from India-Sri Lanka IMBL border\n"
                f"- **Advisory**: {marine_weather['advisory']}"
            )

    # -------------------------------------------------------------
    # Construct Structured Response Payload for Frontend Map & UI
    # -------------------------------------------------------------
    return {
        "answer": llm_response,
        "port": port_info,
        "marine_weather": marine_weather,
        "pfz": best_pfz,
        "all_pfz": pfz_list,
        "geofence": geofence_eval,
        "route": route_info,
        "agent_logs": agent_logs,
        "sources": [
            "ISRO Oceansat-3 (OCM-3)",
            "INCOIS PFZ & Ocean State Forecast",
            "Open-Meteo Marine & Atmospheric API",
            "Indian Coast Guard IMBL Geofencing"
        ]
    }

