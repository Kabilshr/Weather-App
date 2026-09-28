const apiKey = '888c55a2a3mshaf8298c64826c79p1014fbjsnaa55b030354a';
const apiHost = 'open-weather13.p.rapidapi.com';

const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherDisplay = document.getElementById('weather-display');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const unitCheckbox = document.getElementById('unit-checkbox');
const unitC = document.getElementById('unit-c');
const unitF = document.getElementById('unit-f');

const cityName = document.getElementById('city-name');
const dateText = document.getElementById('date');
const tempValue = document.getElementById('temp');
const weatherIcon = document.getElementById('weather-icon');
const description = document.getElementById('description');
const feelsLike = document.getElementById('feels-like');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const pressure = document.getElementById('pressure');
const visibility = document.getElementById('visibility');
const clouds = document.getElementById('clouds');
const seaLevel = document.getElementById('sea-level');
const grndLevel = document.getElementById('grnd-level');
const countryCode = document.getElementById('country-code');
const sunriseTime = document.getElementById('sunrise-time');
const sunsetTime = document.getElementById('sunset-time');
const sunStatus = document.getElementById('sun-status');

let currentWeatherData = null;
let map = null;
let marker = null;

async function fetchWeatherByCity(city) {
    const url = `https://open-weather13.p.rapidapi.com/city?city=${city}&lang=EN`;
    await fetchWeatherData(url);
}

async function fetchWeatherByCoords(lat, lon) {
    const url = `https://open-weather13.p.rapidapi.com/latlon?latitude=${lat}&longitude=${lon}&lang=EN`;
    await fetchWeatherData(url);
}

async function fetchWeatherData(url) {
    showLoader();
    hideError();
    
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': apiHost
        }
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Location not found');
        const data = await response.json();
        if (data.cod && data.cod !== 200) throw new Error('Location not found');
        
        currentWeatherData = data;
        updateUI(data);
        updateMap(data.coord.lat, data.coord.lon);
        updateTheme(data);
        updateSolarArc(data);
    } catch (error) {
        console.error(error);
        showError();
    } finally {
        hideLoader();
    }
}

function updateUI(data) {
    cityName.textContent = data.name || 'Unknown';
    
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    dateText.textContent = now.toLocaleDateString('en-US', options);

    displayTemperature();
    description.textContent = data.weather[0].description;
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${data.wind.speed} m/s`;
    pressure.textContent = `${data.main.pressure} hPa`;
    visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    clouds.textContent = `${data.clouds.all}%`;
    seaLevel.textContent = data.main.sea_level ? `${data.main.sea_level} hPa` : '--';
    grndLevel.textContent = data.main.grnd_level ? `${data.main.grnd_level} hPa` : '--';
    countryCode.textContent = data.sys.country || '--';

    sunriseTime.textContent = formatTime(data.sys.sunrise, data.timezone);
    sunsetTime.textContent = formatTime(data.sys.sunset, data.timezone);

    showWeather();
}

function displayTemperature() {
    if (!currentWeatherData) return;
    
    const isFahrenheit = unitCheckbox.checked;
    let tempRaw = currentWeatherData.main.temp;
    let feelsRaw = currentWeatherData.main.feels_like;

    // Normalize to Fahrenheit first if the API gives Kelvin (common in latlon endpoint)
    if (tempRaw > 200) {
        tempRaw = (tempRaw - 273.15) * 9/5 + 32;
        feelsRaw = (feelsRaw - 273.15) * 9/5 + 32;
    }

    const unitLabel = document.querySelector('.unit-label');
    
    if (isFahrenheit) {
        tempValue.textContent = Math.round(tempRaw);
        feelsLike.textContent = `${Math.round(feelsRaw)}°F`;
        unitLabel.textContent = '°F';
        unitF.classList.add('active');
        unitC.classList.remove('active');
    } else {
        const tempC = (tempRaw - 32) * 5 / 9;
        const feelsC = (feelsRaw - 32) * 5 / 9;
        tempValue.textContent = Math.round(tempC);
        feelsLike.textContent = `${Math.round(feelsC)}°C`;
        unitLabel.textContent = '°C';
        unitC.classList.add('active');
        unitF.classList.remove('active');
    }
}

function updateSolarArc(data) {
    const sunrise = data.sys.sunrise;
    const sunset = data.sys.sunset;
    const now = data.dt;
    
    const totalDaylight = sunset - sunrise;
    const elapsed = now - sunrise;
    let progress = elapsed / totalDaylight;
    
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;
    
    const arcPath = document.getElementById('arc-path');
    const arcProgress = document.getElementById('arc-progress');
    const sunMarker = document.getElementById('sun-marker');
    
    const pathLength = arcPath.getTotalLength();
    arcProgress.style.strokeDasharray = `${progress * pathLength} ${pathLength}`;
    
    const point = arcPath.getPointAtLength(progress * pathLength);
    sunMarker.setAttribute('cx', point.x);
    sunMarker.setAttribute('cy', point.y);
    
    if (now < sunrise) {
        sunStatus.textContent = `Sunrise in ${formatDuration(sunrise - now)}`;
    } else if (now < sunset) {
        sunStatus.textContent = `${formatDuration(sunset - now)} until sunset`;
    } else {
        sunStatus.textContent = 'Night time';
    }
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(unix, offset) {
    const d = new Date((unix + offset) * 1000);
    return d.getUTCHours().toString().padStart(2, '0') + ":" + d.getUTCMinutes().toString().padStart(2, '0');
}

function updateTheme(data) {
    const isDay = data.dt >= data.sys.sunrise && data.dt < data.sys.sunset;
    document.body.className = isDay ? 'light-mode' : 'dark-mode';
}

function updateMap(lat, lon) {
    const isDay = currentWeatherData.dt >= currentWeatherData.sys.sunrise && currentWeatherData.dt < currentWeatherData.sys.sunset;
    const mapStyle = isDay ? 'light_all' : 'dark_all';
    const tileUrl = `https://{s}.basemaps.cartocdn.com/${mapStyle}/{z}/{x}/{y}{r}.png`;

    if (!map) {
        map = L.map('map', { zoomControl: false }).setView([lat, lon], 10);
        L.tileLayer(tileUrl, {
            attribution: '© OpenStreetMap © CARTO'
        }).addTo(map);
        marker = L.marker([lat, lon]).addTo(map);
        map.on('click', (e) => fetchWeatherByCoords(e.latlng.lat, e.latlng.lng));
    } else {
        map.setView([lat, lon], 10);
        marker.setLatLng([lat, lon]);
        
        // Update tile layer to match theme
        map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                layer.setUrl(tileUrl);
            }
        });
    }
    setTimeout(() => map.invalidateSize(), 400);
}

function showLoader() { loader.classList.remove('hidden'); }
function hideLoader() { loader.classList.add('hidden'); }
function showWeather() { weatherDisplay.classList.remove('hidden'); }
function showError() { errorMessage.classList.remove('hidden'); setTimeout(() => errorMessage.classList.add('hidden'), 3000); }
function hideError() { errorMessage.classList.add('hidden'); }

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) fetchWeatherByCity(city);
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) fetchWeatherByCity(city);
    }
});

unitCheckbox.addEventListener('change', displayTemperature);

window.addEventListener('load', () => fetchWeatherByCity('Kathmandu'));
