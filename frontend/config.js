/**
 * ORCA Maritime Platform — Frontend Configuration
 * Connects Vercel Frontend to Render Backend.
 */

// 1. Set your deployed Render Web Service URL below:
const RENDER_BACKEND_URL = "https://orca-marine-ecosystem-reasoning-with.onrender.com";

// 2. Environment Auto-detection:
// If running on local dev server (http://localhost:5500 or http://127.0.0.1), use local backend (8000).
// If opened directly as a file (file:///) or deployed on Vercel, connect to the live Render backend!
const isLocalDevServer = (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") && 
                         window.location.protocol !== "file:";

window.ORCA_BASE_URL = isLocalDevServer 
    ? "http://127.0.0.1:8000" 
    : (window.localStorage.getItem("ORCA_BACKEND_URL") || RENDER_BACKEND_URL);

console.info("[ORCA Intelligence] API Base URL:", window.ORCA_BASE_URL);
