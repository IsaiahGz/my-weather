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
  return `${baseForecastURL}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
};

// Utility functions
const rawDataToDays = (rawData) => {
  // Given the raw data from the forecast API, return an array where index 0 is today, index 1 is tomorrow, etc.
  const toReturn = [];
  let iDate = null;
  let dayIndex = 0;
  for (let i = 0; i < 6; i++) {
    if (!iDate) {
      // On first iteration
      const firstDay = dayjs.unix(rawData.list[0].dt);
      const currentDayArr = rawData.list.filter((dataPoint) => {
        const day = dayjs.unix(dataPoint.dt);
        if (firstDay.isSame(day, 'day')) return true;
        return false;
      });
      toReturn.push(currentDayArr);
      dayIndex += currentDayArr.length;
      iDate = firstDay;
    } else {
      // Find index where next day is
      const nextDay = dayjs.unix(rawData.list[dayIndex].dt);
      const nextDayArr = rawData.list.filter((dataPoint) => {
        const day = dayjs.unix(dataPoint.dt);
        if (nextDay.isSame(day, 'day')) return true;
        return false;
      });
      toReturn.push(nextDayArr);
      dayIndex += nextDayArr.length;
    }
  }
  return toReturn;
};

const dayArrayToObj = (dayArray) => {
  // Given an array from rawDataToDays() for a specific day, turn it into useable information
  const dayHigh = dayArray.reduce((accumulator, currentVal) => {
    const dataHigh = currentVal.main.temp_max;
    if (accumulator < dataHigh) return dataHigh;
    else return accumulator;
  }, 0);

  const dayLow = dayArray.reduce((accumulator, currentVal) => {
    const dataLow = currentVal.main.temp_min;
    if (accumulator > dataLow) return dataLow;
    else return accumulator;
  }, 999);

  const currentTemp = dayArray[0].main.temp;
  const currentFeelsLike = dayArray[0].main.feels_like;
  const currentHumidity = dayArray[0].main.humidity;
  const currentWind = dayArray[0].wind.speed;
  const currentWeatherCondition = dayArray[0].weather[0].main;
  return {
    currentTemp,
    currentFeelsLike,
    currentHumidity,
    currentWind,
    currentWeatherCondition,
    dayHigh,
    dayLow,
    instanceTime: dayjs.unix(dayArray[0].dt),
  };
};

const createDayPElements = (dayObj) => {
  // Given an object from dayArrayToObj(), creates P elements for temp, humidity, etc
  const baseP = () => $('<p>').addClass('text-base');
  const tempEl = baseP().text(`Temperature: ${dayObj.currentTemp}`);
  const feelsEl = baseP().text(`Feels like: ${dayObj.currentFeelsLike}`);
  const highEl = baseP().text(`High: ${dayObj.dayHigh}`);
  const lowEl = baseP().text(`Low: ${dayObj.dayLow}`);
  const humidEl = baseP().text(`Humidity: ${dayObj.currentHumidity}%`);
  const windEl = baseP().text(`Winds: ${dayObj.currentWind} MPH`);
  return [tempEl, feelsEl, highEl, lowEl, humidEl, windEl];
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
      const cityData = data.city;
      const daysArray = rawDataToDays(data);
      const daysArrayObj = daysArray.map(dayArrayToObj);
      console.log(data);
      console.log(daysArray);
      console.log(daysArrayObj);

      // Build and display current weather section
      const todayObj = daysArrayObj[0];
      const todayH2 = $('<h2>').addClass('text-2xl font-semibold');
      todayH2.text(`${cityData.name}, ${cityData.country} - ${todayObj.instanceTime.format('M/D')}`);
      currentWeatherEl.text('');
      currentWeatherEl.append([todayH2, ...createDayPElements(todayObj)]);

      // Build and display the 5 day forecast
    });
};

const cityWeatherFetch = (city) => {
  if (!city) return; // Do nothing if theres no input
  fetch(getGeocodingURL(city)).then(toJSON).then(displayWeather);
};

// Event handlers
searchFormEl.submit((event) => {
  event.preventDefault();
  cityWeatherFetch(cityInputEl.val());
});
