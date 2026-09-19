/**
 * ORCA Maritime Platform — Frontend Configuration & Geospatial Catalog
 * Connects Vercel Frontend to Render / Local Backend.
 */

// 1. Set your deployed Render Web Service URL below:
const RENDER_BACKEND_URL = "https://orca-marine-ecosystem-reasoning-with.onrender.com";
const LOCAL_BACKEND_URL = "http://127.0.0.1:8000";

window.ORCA_RENDER_URL = RENDER_BACKEND_URL;
window.ORCA_LOCAL_URL = LOCAL_BACKEND_URL;

// 2. Environment Auto-detection:
// If running on local dev server (http://localhost:5500 or http://127.0.0.1) OR opened as a file (file:///), connect to local backend (8000).
// If deployed on Vercel, connect to the live Render backend!
const isLocal = window.location.hostname === "127.0.0.1" || 
                window.location.hostname === "localhost" || 
                window.location.protocol === "file:";

const savedBackend = window.localStorage.getItem("ORCA_BACKEND_URL");
window.ORCA_BASE_URL = isLocal ? LOCAL_BACKEND_URL : (savedBackend || RENDER_BACKEND_URL);

console.info("[ORCA Intelligence] API Base URL:", window.ORCA_BASE_URL);

// Helper to switch backend between Cloud and Local
window.switchOrcaBackend = function(target) {
    if (target === 'cloud' || target === 'render') {
        window.ORCA_BASE_URL = RENDER_BACKEND_URL;
        localStorage.setItem("ORCA_BACKEND_URL", RENDER_BACKEND_URL);
    } else if (target === 'local') {
        window.ORCA_BASE_URL = LOCAL_BACKEND_URL;
        localStorage.setItem("ORCA_BACKEND_URL", LOCAL_BACKEND_URL);
    }
    console.info("[ORCA Intelligence] Backend switched to:", window.ORCA_BASE_URL);
    window.dispatchEvent(new CustomEvent('orca:backend_changed', { detail: { url: window.ORCA_BASE_URL } }));
    return window.ORCA_BASE_URL;
};

// 2.5 Smart Transparent Fetch Failover:
// If a local request to 127.0.0.1:8000 fails (e.g. backend not started locally),
// automatically and seamlessly fallback to the live Render cloud backend!
(function setupOrcaSmartFetch() {
    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
        let url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');

        const isLocalCall = url.includes('127.0.0.1:8000') || url.includes('localhost:8000');
        if (isLocalCall) {
            try {
                const res = await originalFetch(resource, init);
                if (res.status === 502 || res.status === 503 || res.status === 504) {
                    throw new Error('Local server gateway error ' + res.status);
                }
                return res;
            } catch (err) {
                console.warn('[ORCA Intelligence] Local backend (127.0.0.1:8000) not responding. Seamlessly switching to live Render Cloud Backend:', window.ORCA_RENDER_URL);
                window.ORCA_BASE_URL = window.ORCA_RENDER_URL;
                window.dispatchEvent(new CustomEvent('orca:backend_changed', { detail: { url: window.ORCA_RENDER_URL } }));

                const fallbackUrl = url.replace(/http:\/\/(127\.0\.0\.1|localhost):8000/, window.ORCA_RENDER_URL);
                if (typeof resource === 'string') {
                    return await originalFetch(fallbackUrl, init);
                } else if (window.Request && resource instanceof Request) {
                    return await originalFetch(new Request(fallbackUrl, init || resource));
                }
                return await originalFetch(fallbackUrl, init);
            }
        }

        return originalFetch(resource, init);
    };
})();

// 2.8 Automatic Keep-Alive & Background Warm-up for Render Backend:
// Sends an immediate background handshake to ensure the Render instance stays warm and awake.
(function warmUpRenderBackend() {
    try {
        const ping = () => {
            fetch(RENDER_BACKEND_URL + "/", { method: "GET", mode: "no-cors" }).catch(() => {});
        };
        ping();
        setInterval(ping, 4 * 60 * 1000); // Repeat every 4 minutes to prevent idle sleep
    } catch(e) {}
})();

// 3. Indian Coastal Ports & Landing Centers Catalog
window.PORT_COORDINATES = {
    chennai: { id: "chennai", name: "Chennai (Kasimedu)", state: "Tamil Nadu", lat: 13.1256, lon: 80.2974, region: "Coromandel Coast (Bay of Bengal)" },
    rameswaram: { id: "rameswaram", name: "Rameswaram (Mandapam)", state: "Tamil Nadu", lat: 9.2876, lon: 79.3129, region: "Palk Bay & Strait" },
    tuticorin: { id: "tuticorin", name: "Tuticorin (Thoothukudi)", state: "Tamil Nadu", lat: 8.7642, lon: 78.1348, region: "Gulf of Mannar" },
    visakhapatnam: { id: "visakhapatnam", name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6975, lon: 83.3005, region: "Northern Andhra Coast (Bay of Bengal)" },
    kakinada: { id: "kakinada", name: "Kakinada", state: "Andhra Pradesh", lat: 16.9891, lon: 82.2475, region: "Godavari Delta (Bay of Bengal)" },
    kochi: { id: "kochi", name: "Kochi (Thoppumpady)", state: "Kerala", lat: 9.9312, lon: 76.2673, region: "Malabar Coast (Arabian Sea)" },
    kollam: { id: "kollam", name: "Kollam (Neendakara)", state: "Kerala", lat: 8.9378, lon: 76.5414, region: "South Kerala Coast (Arabian Sea)" },
    mangalore: { id: "mangalore", name: "Mangalore (Old Port)", state: "Karnataka", lat: 12.8708, lon: 74.8430, region: "Canara Coast (Arabian Sea)" },
    goa: { id: "goa", name: "Goa (Malim / Panaji)", state: "Goa", lat: 15.5036, lon: 73.8344, region: "Konkan Coast (Arabian Sea)" },
    mumbai: { id: "mumbai", name: "Mumbai (Sassoon Docks)", state: "Maharashtra", lat: 18.9167, lon: 72.8250, region: "Northern Maharashtra (Arabian Sea)" },
    veraval: { id: "veraval", name: "Veraval", state: "Gujarat", lat: 20.9077, lon: 70.3678, region: "Saurashtra Coast (Arabian Sea)" },
    porbandar: { id: "porbandar", name: "Porbandar", state: "Gujarat", lat: 21.6417, lon: 69.6293, region: "Saurashtra Coast (Arabian Sea)" },
    paradeep: { id: "paradeep", name: "Paradeep", state: "Odisha", lat: 20.3168, lon: 86.6114, region: "Odisha Coast (Bay of Bengal)" },
    digha: { id: "digha", name: "Digha / Shankarpur", state: "West Bengal", lat: 21.6266, lon: 87.5074, region: "Bengal Delta Coast" },
    port_blair: { id: "port_blair", name: "Port Blair", state: "Andaman & Nicobar", lat: 11.6670, lon: 92.7350, region: "Andaman Sea" }
};

// 4. Indian Coast Guard Maritime Rescue Coordination Centres (MRCC)
window.COAST_GUARD_MRCC = [
    { id: "MRCC-MUMBAI", name: "Coast Guard Regional HQ (West) / MRCC Mumbai", phone: "+91-22-24388065", hotline: "1554", lat: 18.9220, lon: 72.8347 },
    { id: "MRCC-CHENNAI", name: "Coast Guard Regional HQ (East) / MRCC Chennai", phone: "+91-44-23460405", hotline: "1554", lat: 13.0827, lon: 80.2707 },
    { id: "MRCC-KOCHI", name: "Coast Guard District HQ No. 4 / MRCC Kochi", phone: "+91-484-2218042", hotline: "1554", lat: 9.9674, lon: 76.2425 },
    { id: "MRCC-PORTBLAIR", name: "Coast Guard Regional HQ (A&N) / MRCC Port Blair", phone: "+91-3192-232648", hotline: "1554", lat: 11.6670, lon: 92.7350 },
    { id: "MRCC-GANDHINAGAR", name: "Coast Guard Regional HQ (NW) / MRSC Porbandar", phone: "+91-286-2244243", hotline: "1554", lat: 21.6417, lon: 69.6293 }
];

// 5. Great-Circle Distance Utilities (Haversine)
window.calculateDistanceKm = function(lat1, lon1, lat2, lon2) {
    const R = 6371.0;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10) / 10;
};

window.calculateDistanceNM = function(lat1, lon1, lat2, lon2) {
    return Math.round(window.calculateDistanceKm(lat1, lon1, lat2, lon2) * 0.539957 * 10) / 10;
};

window.findNearestMRCC = function(lat, lon) {
    let best = null;
    let minNM = Infinity;
    window.COAST_GUARD_MRCC.forEach(mrcc => {
        const d = window.calculateDistanceNM(lat, lon, mrcc.lat, mrcc.lon);
        if (d < minNM) {
            minNM = d;
            best = { ...mrcc, distance_nm: d, distance_km: Math.round(d * 1.852 * 10) / 10 };
        }
    });
    return best;
};

// 6. Authentication & Session Helpers
window.getAuthSession = function() {
    try {
        const s = JSON.parse(localStorage.getItem('orca_auth_session') || 'null');
        if (s && s.token) return s;
    } catch(e) {}
    return null;
};

window.getAuthToken = function() {
    const s = window.getAuthSession();
    return s ? s.token : null;
};

window.getAuthUser = function() {
    const s = window.getAuthSession();
    return s ? s.user : null;
};

window.getAuthHeaders = function() {
    const token = window.getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

