let issMap;
let issMarker;
let predictedPath;
let countdown = 30;
let lastData = null;
const timerElement = document.getElementById('iss-timer');

const issIcon = L.icon({
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/International_Space_Station.svg',
    iconSize: [50, 30],
    iconAnchor: [25, 15]
});

// Orbital Constants
const INCLINATION = 51.64 * (Math.PI / 180); 
const ORBIT_PERIOD = 92.8 * 60; 
const EARTH_ROTATION_RATE = (2 * Math.PI) / 86400; 
const ANGULAR_VELOCITY = (2 * Math.PI) / ORBIT_PERIOD; 

// Initialize map immediately with default view
function initMap() {
    if (!issMap) {
        const hour = new Date().getHours();
        const isDark = hour < 6 || hour > 18;
        const mapStyle = isDark ? 'dark_all' : 'light_all';
        
        issMap = L.map('iss-map', { zoomControl: false }).setView([0, 0], 2);
        L.tileLayer(`https://{s}.basemaps.cartocdn.com/${mapStyle}/{z}/{x}/{y}{r}.png`, {
            attribution: '© OpenStreetMap © CARTO'
        }).addTo(issMap);
        
        issMarker = L.marker([0, 0], { icon: issIcon }).addTo(issMap);
    }
}

async function fetchISSLocation(isInitial = false) {
    const timestampElement = document.getElementById('iss-timestamp');
    try {
        // Using Where the ISS at? API (Supports HTTPS and is more reliable)
        const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        const lat = parseFloat(data.latitude);
        const lon = parseFloat(data.longitude);
        const time = data.timestamp;

        if (isInitial && !lastData) {
            lastData = { lat, lon, time };
            timestampElement.textContent = 'Calculating orbital vector...';
            setTimeout(() => fetchISSLocation(true), 5000);
            return;
        }

        if (lastData) {
            const dt = time - lastData.time;
            if (dt > 0) {
                const vLat = (lat - lastData.lat) / dt;
                const vLon = (lon - lastData.lon) / dt;
                drawPrediction(lat, lon, vLat, vLon);
            }
        }

        lastData = { lat, lon, time };
        updateISSUI(lat, lon, new Date(time * 1000).toLocaleTimeString());
        updateISSMap(lat, lon);
        
        countdown = 30;
    } catch (error) {
        console.error('Error fetching ISS location:', error);
        timestampElement.textContent = 'Connection issue. Retrying...';
        if (isInitial) {
            setTimeout(() => fetchISSLocation(true), 5000);
        }
    }
}

function drawPrediction(currLat, currLon, vLat, vLon) {
    const points = [];
    const stepSeconds = 60; 
    const totalSteps = 95; 

    let phase = Math.asin(Math.min(1, Math.max(-1, (currLat * (Math.PI / 180)) / INCLINATION)));
    if (vLat < 0) phase = Math.PI - phase;

    for (let i = 0; i <= totalSteps; i++) {
        const t = i * stepSeconds;
        const currentPhase = phase + (ANGULAR_VELOCITY * t);
        
        let lat = Math.asin(Math.sin(INCLINATION) * Math.sin(currentPhase));
        let lon = Math.atan2(Math.cos(INCLINATION) * Math.sin(currentPhase), Math.cos(currentPhase));
        
        lat = lat * (180 / Math.PI);
        lon = lon * (180 / Math.PI);
        
        let adjustedLon = currLon + (lon - (Math.atan2(Math.cos(INCLINATION) * Math.sin(phase), Math.cos(phase)) * (180 / Math.PI))) - (EARTH_ROTATION_RATE * t * (180 / Math.PI));
        
        while (adjustedLon > 180) adjustedLon -= 360;
        while (adjustedLon < -180) adjustedLon += 360;

        points.push([lat, adjustedLon]);
    }

    if (predictedPath) {
        predictedPath.setLatLngs(points);
    } else {
        predictedPath = L.polyline(points, {
            color: '#38bdf8',
            weight: 2,
            opacity: 0.6,
            dashArray: '10, 10',
            interactive: false
        }).addTo(issMap);
    }
}

function updateISSUI(lat, lon, time) {
    document.getElementById('iss-lat').textContent = lat.toFixed(4);
    document.getElementById('iss-lon').textContent = lon.toFixed(4);
    document.getElementById('iss-timestamp').textContent = `Last seen at ${time}`;
}

function updateISSMap(lat, lon) {
    if (issMarker) {
        issMarker.setLatLng([lat, lon]);
        if (issMap.getZoom() < 3) issMap.setView([lat, lon], 3);
        else issMap.panTo([lat, lon]);
    }
}

function startCountdown() {
    setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            fetchISSLocation();
        }
        if (timerElement) {
            timerElement.textContent = Math.max(0, countdown);
        }
    }, 1000);
}

// Start sequence
initMap();
fetchISSLocation(true);
startCountdown();

document.getElementById('refresh-iss').addEventListener('click', () => {
    countdown = 30;
    fetchISSLocation();
});
