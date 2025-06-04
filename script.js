const API_TOKEN = 'c7f60b09bf6d5e4886041732e550d199631b6d4b3fc013cca6940d4bd426ddca';
let weatherData = [];
let map;
let marker;

// Éléments DOM
const form = document.getElementById('weatherForm');
const cityInput = document.getElementById('city');
const daysSlider = document.getElementById('days');
const daysValue = document.getElementById('daysValue');
const loading = document.getElementById('loading');
const weatherResults = document.getElementById('weatherResults');
const darkModeToggle = document.getElementById('darkModeToggle');
const mapInfo = document.getElementById('mapInfo');
const mapCity = document.getElementById('mapCity');
const mapLat = document.getElementById('mapLat');
const mapLng = document.getElementById('mapLng');

// Initialisation
document.addEventListener('DOMContentLoaded', function () {
    initializeDarkMode();
    initializeMap();
    setupEventListeners();
});

function initializeDarkMode() {
    const isDarkMode = JSON.parse(localStorage.getItem('darkMode') || 'false');
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }
}

function initializeMap() {
    // Initialiser la carte centrée sur la France
    map = L.map('map').setView([46.603354, 1.888334], 6);

    // Ajouter la couche OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
    }).addTo(map);

    // Événement de clic sur la carte
    map.on('click', function(e) {
        const lat = e.latlng.lat.toFixed(4);
        const lng = e.latlng.lng.toFixed(4);
        
        // Géocodage inverse pour obtenir le nom de la ville
        reverseGeocode(e.latlng.lat, e.latlng.lng);
    });
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.municipality || 'Lieu inconnu';
            
            // Remplir automatiquement le champ ville
            cityInput.value = city;
            
            // Mettre à jour les informations de la carte
            updateMapInfo(city, lat, lng);
            
            // Ajouter/déplacer le marqueur
            if (marker) {
                marker.setLatLng([lat, lng]);
            } else {
                marker = L.marker([lat, lng]).addTo(map);
            }
            
            marker.bindPopup(`<b>${city}</b><br>Lat: ${lat}<br>Lng: ${lng}`).openPopup();
        }
    } catch (error) {
        console.error('Erreur lors du géocodage inverse:', error);
    }
}

function updateMapInfo(city, lat, lng) {
    mapCity.textContent = city;
    mapLat.textContent = lat;
    mapLng.textContent = lng;
    mapInfo.style.display = 'block';
}

function setupEventListeners() {
    // Slider pour le nombre de jours
    daysSlider.addEventListener('input', function () {
        const value = this.value;
        daysValue.textContent = value + (value === '1' ? ' jour' : ' jours');
    });

    // Dark mode
    darkModeToggle.addEventListener('click', function () {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
        localStorage.setItem('darkMode', isDarkMode);
    });

    form.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const city = cityInput.value.trim();
    const days = parseInt(daysSlider.value);
    const selectedOptions = Array.from(document.querySelectorAll('input[name="options"]:checked'))
        .map(checkbox => checkbox.value);

    if (!city) {
        showError('Veuillez saisir une commune.');
        return;
    }

    showLoading();

    try {
        const data = await fetchWeatherData(city, days);
        displayWeatherData(data, selectedOptions);
        
        // Centrer la carte sur la ville
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        map.setView([lat, lng], 12);
        
        // Ajouter/déplacer le marqueur
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng]).addTo(map);
        }
        
        marker.bindPopup(`<b>${data.city}</b><br>Lat: ${lat}<br>Lng: ${lng}`).openPopup();
        updateMapInfo(data.city, lat.toFixed(4), lng.toFixed(4));
        
    } catch (error) {
        showError('Erreur lors de la récupération des données météorologiques. Vérifiez le nom de la commune.');
        console.error('Erreur API:', error);
    }
}

async function fetchWeatherData(city, days) {
    const baseUrl = 'https://api.meteo-concept.com/api';

    // Recherche de la ville pour obtenir son code INSEE
    const locationResponse = await fetch(`${baseUrl}/location/cities?token=${API_TOKEN}&search=${encodeURIComponent(city)}`);
    const locationData = await locationResponse.json();

    if (!locationData.cities || locationData.cities.length === 0) {
        throw new Error("Commune introuvable.");
    }

    const cityInfo = locationData.cities[0];

    // Récupération des prévisions météo quotidiennes
    const forecastResponse = await fetch(`${baseUrl}/forecast/daily?token=${API_TOKEN}&insee=${cityInfo.insee}`);
    const forecastData = await forecastResponse.json();

    const forecasts = forecastData.forecast.slice(0, days).map(day => ({
        date: new Date(day.datetime).toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        temperature: day.tmax,
        weather: getWeatherIcon(day.weather),
        latitude: cityInfo.latitude.toFixed(4),
        longitude: cityInfo.longitude.toFixed(4),
        rain: day.rr10 || 0,
        wind: day.wind10m,
        windDirection: day.dirwind10m
    }));

    return {
        city: `${cityInfo.name} (${cityInfo.cp})`,
        latitude: cityInfo.latitude,
        longitude: cityInfo.longitude,
        forecasts
    };
}

function showLoading() {
    loading.style.display = 'block';
    weatherResults.innerHTML = '';
}

function showError(message) {
    loading.style.display = 'none';
    weatherResults.innerHTML = `<div class="error">${message}</div>`;
}

function getWeatherIcon(code) {
    const icons = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',4:'🌫️',5:'🌫️',6:'🌦️',7:'🌦️',10:'🌧️',11:'🌧️',12:'🌧️',13:'🌧️',14:'🌧️',15:'🌧️',16:'🌨️',20:'❄️',21:'🌨️',22:'❄️',30:'⛈️',31:'⛈️',32:'⛈️',40:'🌦️',41:'🌦️',42:'🌦️',43:'🌨️',44:'🌨️',45:'🌨️',46:'❄️',47:'🌨️',48:'❄️',60:'⛈️',61:'⛈️',62:'⛈️',63:'⛈️',64:'⛈️',65:'⛈️',66:'⛈️',67:'⛈️',68:'⛈️',70:'🌨️',71:'❄️',72:'🌨️',73:'🌨️',74:'❄️',75:'🌨️',76:'💎',77:'❄️',78:'🌨️'};
    return icons[code] || '🌡️';
}

function displayWeatherData(data, selectedOptions) {
    loading.style.display = 'none';

    let html = `<h2 style="margin-bottom: 20px; color: var(--text-color);">Prévisions pour ${data.city}</h2>`;

    data.forecasts.forEach(forecast => {
        html += `
            <div class="weather-card">
                <div class="weather-header">
                    <div class="weather-date">${forecast.date}</div>
                    <div class="weather-icon">${forecast.weather}</div>
                </div>
                <div class="weather-info">
                    <div class="info-item">
                        <div class="info-value">${forecast.temperature}°C</div>
                        <div class="info-label">Température</div>
                    </div>
        `;

        // Ajout des informations optionnelles

        if (selectedOptions.includes('rain')) {
            html += `
                <div class="info-item">
                    <div class="info-value">${forecast.rain} mm</div>
                    <div class="info-label">Cumul de pluie</div>
                </div>
            `;
        }

        if (selectedOptions.includes('wind')) {
            html += `
                <div class="info-item">
                    <div class="info-value">${forecast.wind} km/h</div>
                    <div class="info-label">Vent moyen</div>
                </div>
            `;
        }

        if (selectedOptions.includes('windDirection')) {
            html += `
                <div class="info-item">
                    <div class="info-value">${getWindDirection(forecast.windDirection)}</div>
                    <div class="info-label">Direction du vent</div>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
    });

    weatherResults.innerHTML = html;
}

function getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}