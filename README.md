🌊 ORCA — Marine EcoSystem Reasoning with Collaborative Agents

**Smart India Hackathon 2026 | Problem Statement: SIH26176**
**Organization:** Indian Space Research Organisation (ISRO)

An Agentic AI-powered conversational platform that helps fishermen, coastal researchers, and maritime operators get real-time, explainable answers about marine conditions — safety, fishing zones, weather, and geofencing — through natural language, in their own language.

🎯 The Problem

Marine stakeholders need to check multiple scattered government portals (IMD, INCOIS, ISRO Bhuvan) to answer simple questions like *"Is it safe to go to sea tomorrow?"* or *"Where's the nearest fishing zone?"* ORCA brings this all into one conversational assistant.

✨ Key Features

- 🗣️ **Natural language chat** — ask in Hindi, English, Tamil, Telugu, Bengali
- 🌊 **Real-time marine data** — live wave height, wind, sea temperature (Open-Meteo Marine API)
- 🎣 **Potential Fishing Zone (PFZ) estimation** — thermal-front analysis using live SST data
- ⚠️ **Proactive safety alerts** — automatic warnings for high waves/winds
- 🗺️ **Geofencing** — Indian EEZ boundary + Marine Protected Area detection
- 🧭 **Route safety suggestions** — wave-height-aware waypoints between ports
- 🔄 **Multi-turn conversation** — remembers context across questions
- 📊 **Explainable answers** — every response cites its data sources
- 🤖 **Multi-agent architecture** — Planner → Weather → PFZ → Geofence → Route → Synthesizer
- 👤 **Simple user history** — track your past queries

🏗️ Architecture


## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | PostgreSQL + PostGIS |
| AI/LLM | Google Gemini |
| Weather Data | Open-Meteo Marine Weather API |
| Geospatial | GeoPandas, Marine Regions EEZ data, Protected Planet MPA data |
| Frontend | HTML/CSS/JS + Leaflet maps |

## 🚀 Running Locally

```bash
# Backend setup
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Add your own .env file (see .env.example)
python -m uvicorn main:app --reload

# Frontend
# Open frontend/index.html in your browser
```

## 📊 Data Sources

- **Open-Meteo Marine API** — live wave/weather data (no key required)
- **Marine Regions EEZ** — Indian Exclusive Economic Zone boundary
- **Protected Planet** — Marine Protected Areas (India)
- **Google Gemini** — natural language reasoning

## 👥 Team

Team Ai ORCA — Smart India Hackathon 2026

---
