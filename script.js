const API_TOKEN = 'c7f60b09bf6d5e4886041732e550d199631b6d4b3fc013cca6940d4bd426ddca'; // token API Météo Concept
let weatherData = [];

// Éléments DOM
const form = document.getElementById('weatherForm');
const cityInput = document.getElementById('city');
const daysSlider = document.getElementById('days');
const daysValue = document.getElementById('daysValue');
const loading = document.getElementById('loading');
const weatherResults = document.getElementById('weatherResults');
const darkModeToggle = document.getElementById('darkModeToggle');

// Initialisation
document.addEventListener('DOMContentLoaded', function () {
    initializeDarkMode();
    setupEventListeners();
});

function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }
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

    const cityInfo = locationData.cities[0]; // On prend la première correspondance
    const cityName = cityInfo.name;
    const cityInsee = cityInfo.insee;

    // Récupération des prévisions météo quotidiennes
    const forecastResponse = await fetch(`${baseUrl}/forecast/daily?token=${API_TOKEN}&insee=${cityInsee}`);
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
        humidity: day.rh2m,
        latitude: cityInfo.latitude.toFixed(4),
        longitude: cityInfo.longitude.toFixed(4),
        rain: day.rr10 || 0,
        wind: day.wind10m,
        windDirection: day.dirwind10m
    }));

    return {
        city: `${cityInfo.name} (${cityInfo.cp})`,
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
    const icons = {
        0: '☀️', 1: '⛅', 2: '☁️', 3: '🌧️', 4: '⛈️',
        5: '🌨️', 6: '❄️', 7: '🌫️', 8: '🌬️'
    };
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
                            <div class="info-item">
                                <div class="info-value">${forecast.humidity}%</div>
                                <div class="info-label">Humidité</div>
                            </div>
                `;

        // Ajout des informations optionnelles
        if (selectedOptions.includes('latitude')) {
            html += `
                        <div class="info-item">
                            <div class="info-value">${forecast.latitude}°</div>
                            <div class="info-label">Latitude</div>
                        </div>
                    `;
        }

        if (selectedOptions.includes('longitude')) {
            html += `
                        <div class="info-item">
                            <div class="info-value">${forecast.longitude}°</div>
                            <div class="info-label">Longitude</div>
                        </div>
                    `;
        }

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

// Fonction utilitaire pour formater la direction du vent
function getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}