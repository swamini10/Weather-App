// script.js

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const weatherCurrentDiv = document.getElementById("weatherCurrent");
const locationNameDiv = document.getElementById("locationName");
const currentTempDiv = document.getElementById("currentTemp");
const descriptionDiv = document.getElementById("description");
const humiditySpan = document.getElementById("humidity");
const windSpeedSpan = document.getElementById("windSpeed");
const forecastSectionDiv = document.getElementById("forecastSection");
const forecastCardsDiv = document.getElementById("forecastCards");
const errorMsgDiv = document.getElementById("errorMsg");

// Helper: get coordinates for a city via geocoding (using Open-Meteo’s geocoding API)
async function getCoords(city) {
  const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
  if (!resp.ok) throw new Error("City not found");
  const data = await resp.json();
  if (data && data.results && data.results.length > 0) {
    return {
      lat: data.results[0].latitude,
      lon: data.results[0].longitude,
      name: data.results[0].name,
      country: data.results[0].country
    };
  } else {
    throw new Error("City not found");
  }
}

async function fetchWeather(lat, lon, placeName) {
  // Open-Meteo current + hourly forecast
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&current_weather=true&forecast_days=1&timezone=auto`;
  
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Weather fetch failed");
  const data = await resp.json();
  
  displayCurrent(data.current_weather, placeName);
  displayForecast(data.hourly, data.hourly.time, data.hourly.temperature_2m, data.hourly.weathercode);
}

function displayCurrent(current, placeName) {
  errorMsgDiv.style.display = "none";
  locationNameDiv.textContent = placeName;
  currentTempDiv.textContent = `${current.temperature}°C`;
  
  // Map weathercode to description
  const desc = weatherCodeToDescription(current.weathercode);
  descriptionDiv.textContent = desc;
  
  // Humidity & wind -- Note: Open-Meteo current_weather has windspeed, but not humidity
  windSpeedSpan.textContent = current.windspeed.toFixed(1);
  humiditySpan.textContent = "N/A";  // If API doesn't provide humidity, or fetch more data if needed
  
  weatherCurrentDiv.style.display = "block";
}

function displayForecast(hourly, times, temps, codes) {
  forecastCardsDiv.innerHTML = "";
  // Show next few hours, say 6 forecast points
  const now = new Date();
  for (let i = 1; i <= 6; i++) {
    if (i >= times.length) break;
    const timeStr = times[i];
    const temp = temps[i];
    const code = codes[i];
    const card = document.createElement("div");
    card.className = "forecast-card";
    
    const hourDiv = document.createElement("div");
    const dt = new Date(timeStr);
    const hour = dt.getHours();
    hourDiv.textContent = (hour % 12 === 0 ? 12 : hour % 12) + (hour < 12 ? "AM" : "PM");
    hourDiv.className = "hour";
    
    const tempDiv = document.createElement("div");
    tempDiv.textContent = `${temp.toFixed(1)}°C`;
    tempDiv.className = "f-temp";
    
    const iconDiv = document.createElement("div");
    iconDiv.textContent = weatherCodeToShortIcon(code);
    iconDiv.className = "icon";
    
    card.append(hourDiv, iconDiv, tempDiv);
    forecastCardsDiv.append(card);
  }
  forecastSectionDiv.style.display = "block";
}

// A simple mapping from Open-Meteo weather codes to description
function weatherCodeToDescription(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    80: "Rain showers",
    95: "Thunderstorm",
    // etc. Add more if needed
  };
  return map[code] || "Weather";
}

// A short icon/text representation; could replace with real icons
function weatherCodeToShortIcon(code) {
  const map = {
    0: "☀️",
    1: "🌤",
    2: "⛅️",
    3: "☁️",
    45: "🌫️",
    48: "🌫️",
    51: "🌦️",
    53: "🌦️",
    55: "🌧️",
    61: "🌧️",
    63: "🌧️",
    65: "🌧️",
    80: "🌧️",
    95: "⛈️",
  };
  return map[code] || "❓";
}

function showError(msg) {
  weatherCurrentDiv.style.display = "none";
  forecastSectionDiv.style.display = "none";
  errorMsgDiv.textContent = msg;
  errorMsgDiv.style.display = "block";
}

searchBtn.addEventListener("click", async () => {
  const city = cityInput.value.trim();
  if (!city) {
    showError("Please enter a city name.");
    return;
  }
  try {
    const coord = await getCoords(city);
    const placeName = `${coord.name}, ${coord.country}`;
    fetchWeather(coord.lat, coord.lon, placeName);
  } catch (err) {
    showError(err.message);
  }
});

// On load, optionally get user location
window.addEventListener("load", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // reverse geocoding to get place name might need a service or skip
        const placeName = `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;
        fetchWeather(latitude, longitude, placeName);
      },
      (err) => {
        console.log("Geolocation error:", err.message);
        // no fallback by default
      }
    );
  }
});

