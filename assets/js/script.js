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
const getHistory = () => {
  return JSON.parse(localStorage.getItem('cityHistory')) || [];
};

const addHistory = (newCity) => {
  const history = getHistory();
  // Check if whats being added already exists in history
  if (history.indexOf(newCity) >= 0) return;
  // Add to history
  history.push(newCity);
  localStorage.setItem('cityHistory', JSON.stringify(history));
};

const displayHistory = () => {
  // Clear it
  historyUlEl.text('');
  const history = getHistory();
  for (let i = 0; i < history.length; i++) {
    // Create li and button
    const liEl = $('<li>').addClass('mt-2');
    const btnEl = $('<button>').addClass('bg-orange-300 hover:bg-orange-400 p-2 rounded block mx-auto');
    btnEl.text(history[i]);
    btnEl.click(() => {
      cityWeatherFetch(history[i]);
    });

    // Append to list
    historyUlEl.append(liEl);
    liEl.append(btnEl);
  }
};

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
  const tempEl = baseP().text(`Temperature: ${Math.round(dayObj.currentTemp)}`);
  const feelsEl = baseP().text(`Feels like: ${Math.round(dayObj.currentFeelsLike)}`);
  const highEl = baseP().text(`High: ${Math.round(dayObj.dayHigh)}`);
  const lowEl = baseP().text(`Low: ${Math.round(dayObj.dayLow)}`);
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
      // If its first load, hide the initial message and show others
      $('.hidden').removeClass('hidden');
      $('#initial-message').addClass('hidden');
      const cityData = data.city;
      // Add city name to history
      addHistory(cityData.name);
      displayHistory();
      const daysArray = rawDataToDays(data);
      const daysArrayObj = daysArray.map(dayArrayToObj);

      // Build and display current weather section
      const todayObj = daysArrayObj[0];
      const todayH2 = $('<h2>').addClass('text-2xl font-semibold inline-block mr-2');
      todayH2.text(`${cityData.name}, ${cityData.country} - ${todayObj.instanceTime.format('M/D')}`);
      // Create icon
      const iconEl = $('<i>');
      switch (todayObj.currentWeatherCondition) {
        case 'Clear':
          iconEl.addClass('fa-solid fa-sun');
          break;
        case 'Clouds':
          iconEl.addClass('fa-solid fa-cloud');
          break;
        case 'Rain':
          iconEl.addClass('fa-solid fa-cloud-rain');
          break;
        case 'Snow':
          iconEl.addClass('fa-solid fa-snowflake');
          break;
        default:
          iconEl.addClass('fa-solid fa-cloud');
      }
      currentWeatherEl.text('');
      currentWeatherEl.append([todayH2, iconEl, ...createDayPElements(todayObj)]);

      // Build and display the 5 day forecast
      fiveForecastEl.text('');
      for (let i = 1; i < daysArrayObj.length; i++) {
        // Indexes 1 through 5 contain the days needed
        const indexObj = daysArrayObj[i];
        const outerDiv = $('<div>').addClass('p-2 w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5');

        const daySection = $('<section>').addClass('bg-sky-200 p-3 rounded');
        const dayH3 = $('<h3>').addClass('text-xl font-semibold inline-block mr-2');
        dayH3.text(`${indexObj.instanceTime.format('M/D')}`);

        // Create icon
        const fiveIconEl = $('<i>');
        switch (indexObj.currentWeatherCondition) {
          case 'Clear':
            fiveIconEl.addClass('fa-solid fa-sun');
            break;
          case 'Clouds':
            fiveIconEl.addClass('fa-solid fa-cloud');
            break;
          case 'Rain':
            fiveIconEl.addClass('fa-solid fa-cloud-rain');
            break;
          case 'Snow':
            fiveIconEl.addClass('fa-solid fa-snowflake');
            break;
          default:
            fiveIconEl.addClass('fa-solid fa-cloud');
        }

        fiveForecastEl.append(outerDiv);
        outerDiv.append(daySection);
        daySection.append([dayH3, fiveIconEl, ...createDayPElements(indexObj)]);
      }
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

$(() => {
  // On page load, show history
  displayHistory();
});
