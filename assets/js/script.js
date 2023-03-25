// Get elements
const searchFormEl = $('#search-form');
const cityInputEl = $('#citySearchInput');
const historyUlEl = $('#citySearchHistory');
const currentWeatherEl = $('#current-weather');
const fiveForecastEl = $('#five-day-forecast');

// API
const apiKey = '74279bb28d33ffc433c2392787dfb9ae';

// Geocoding API
const baseGeocodingURL = 'http://api.openweathermap.org/geo/1.0/direct';
const getGeocodingURL = (city) => {
  return `${baseGeocodingURL}?q=${city}&limit=1&appid=${apiKey}`;
};

// Forecast API
const baseForecastURL = 'http://api.openweathermap.org/data/2.5/forecast';
const getForecastURL = (lat, lon) => {
  return `${baseForecastURL}?lat=${lat}&lon=${lon}&appid=${apiKey}`;
};

// Fetch functions
const toJSON = (response) => {
  return response.json();
};

const displayWeather = (data) => {
  // Data is a response from the geocoding API, should have 1 city
  if (data.length !== 1) return;
  const cityData = data[0];
  fetch(getForecastURL(cityData.lat, cityData.lon))
    .then(toJSON)
    .then((data) => {
      console.log(data);
    });
};

const cityWeatherFetch = (city) => {
  fetch(getGeocodingURL(city)).then(toJSON).then(displayWeather);
};

// Event handlers
searchFormEl.submit((event) => {
  event.preventDefault();
  cityWeatherFetch(cityInputEl.val());
});
