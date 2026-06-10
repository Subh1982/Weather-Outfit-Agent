const WMO_CODES = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "rime fog",
  51: "light drizzle",
  53: "moderate drizzle",
  55: "dense drizzle",
  61: "slight rain",
  63: "moderate rain",
  65: "heavy rain",
  71: "slight snow",
  73: "moderate snow",
  75: "heavy snow",
  80: "slight rain showers",
  81: "moderate rain showers",
  82: "violent rain showers",
  95: "thunderstorm"
};

const form = document.querySelector("#preference-form");
const statusEl = document.querySelector("#status");
const productList = document.querySelector("#product-list");
const outfitList = document.querySelector("#outfit-list");

function uniqloSearchUrl(query) {
  return `https://www.uniqlo.com/au/en/search?q=${encodeURIComponent(query)}`;
}

function weatherText(code) {
  return WMO_CODES[code] || `weather code ${code}`;
}

function getPreferences() {
  const data = new FormData(form);

  return {
    locationName: String(data.get("locationName") || "Your location").trim(),
    latitude: Number(data.get("latitude")),
    longitude: Number(data.get("longitude")),
    colors: String(data.get("colors") || "neutral colors").trim(),
    style: String(data.get("style") || "comfortable basics").trim(),
    brand: String(data.get("brand") || "Uniqlo").trim(),
    avoid: String(data.get("avoid") || "none").trim()
  };
}

function setStatus(message) {
  statusEl.textContent = message;
}

function buildOutfitAdvice(maxTemp, minTemp, rainChance, conditions) {
  const items = [];

  if (maxTemp <= 12) {
    items.push("thermal base layer", "warm knit or fleece", "insulated jacket", "warm trousers", "closed shoes");
  } else if (maxTemp <= 18) {
    items.push("long-sleeve base layer", "light knit or fleece", "light puffer or jacket", "jeans or chinos", "closed shoes");
  } else if (maxTemp <= 24) {
    items.push("tee or light long-sleeve top", "thin knit, cardigan, or overshirt", "light jacket for morning/evening", "jeans, chinos, or relaxed trousers");
  } else {
    items.push("breathable tee or shirt", "light trousers or shorts", "sun protection", "comfortable shoes");
  }

  if (rainChance >= 50 || /rain|drizzle|shower|thunderstorm/i.test(conditions)) {
    items.push("compact umbrella or water-resistant outer layer");
  }

  if (minTemp <= 10) {
    items.push("warmer socks for the morning");
  }

  return items;
}

function buildUniqloShortlist(maxTemp, minTemp, rainChance, preferences) {
  const picks = [];
  const colorNote = preferences.colors;
  const styleNote = preferences.style;
  const brandNote = preferences.brand;

  if (maxTemp <= 18) {
    picks.push({
      name: "HEATTECH top",
      reason: `The forecast is cool, so a thin warm base layer helps without adding bulk. Search in ${colorNote} to keep it aligned with your palette.`,
      url: uniqloSearchUrl(`HEATTECH top ${colorNote}`)
    });
    picks.push({
      name: "Fleece jacket",
      reason: `A fleece works well for the ${minTemp.toFixed(1)}°C low and still suits a ${styleNote} outfit.`,
      url: uniqloSearchUrl(`Fleece Jacket ${colorNote}`)
    });
    picks.push({
      name: "Ultra Light Down jacket",
      reason: `Useful if you leave early or return late, especially when you want a warm layer from ${brandNote} that packs down easily.`,
      url: uniqloSearchUrl(`Ultra Light Down ${colorNote}`)
    });
  } else {
    picks.push({
      name: "AIRism cotton oversized T-shirt",
      reason: `The ${maxTemp.toFixed(1)}°C max is mild enough for a breathable first layer, and ${colorNote} will make it easy to combine.`,
      url: uniqloSearchUrl(`AIRism cotton oversized t-shirt ${colorNote}`)
    });
    picks.push({
      name: "Merino crew neck sweater",
      reason: `This gives you a polished light layer for cooler parts of the day and fits a ${styleNote} wardrobe.`,
      url: uniqloSearchUrl(`Merino Crew Neck Sweater ${colorNote}`)
    });
    picks.push({
      name: "Smart ankle pants",
      reason: `A neat all-day trouser option for mild weather when you want comfort without looking too casual.`,
      url: uniqloSearchUrl(`Smart Ankle Pants ${colorNote}`)
    });
  }

  if (rainChance >= 40) {
    picks.push({
      name: "Pocketable parka",
      reason: `Rain chance is ${rainChance}%, so a light shell is worth considering without wearing a heavy coat all day.`,
      url: uniqloSearchUrl(`Pocketable Parka ${colorNote}`)
    });
  }

  return filterAvoidedPicks(picks, preferences.avoid);
}

function filterAvoidedPicks(picks, avoidText) {
  if (!avoidText || /^none$/i.test(avoidText)) {
    return picks;
  }

  const avoidTerms = avoidText
    .toLowerCase()
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);

  return picks.filter((pick) => !avoidTerms.some((term) => pick.name.toLowerCase().includes(term)));
}

async function fetchForecast(latitude, longitude) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "auto";
  const params = new URLSearchParams({
    latitude,
    longitude,
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    timezone,
    forecast_days: "1"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

  if (!response.ok) {
    throw new Error("Weather service did not return a forecast.");
  }

  return response.json();
}

function renderForecast(forecast, preferences) {
  const daily = forecast.daily;
  const date = daily.time[0];
  const maxTemp = daily.temperature_2m_max[0];
  const minTemp = daily.temperature_2m_min[0];
  const rainChance = daily.precipitation_probability_max[0];
  const conditions = weatherText(daily.weather_code[0]);
  const outfit = buildOutfitAdvice(maxTemp, minTemp, rainChance, conditions);
  const picks = buildUniqloShortlist(maxTemp, minTemp, rainChance, preferences);

  document.querySelector("#max-temp").textContent = `${maxTemp.toFixed(1)}°C`;
  document.querySelector("#min-temp").textContent = `${minTemp.toFixed(1)}°C`;
  document.querySelector("#rain-chance").textContent = `${rainChance}%`;
  document.querySelector("#conditions").textContent = conditions;
  document.querySelector("#forecast-date").textContent = `${preferences.locationName} · ${date} · ${preferences.colors} · ${preferences.style}`;

  outfitList.innerHTML = "";
  outfit.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    outfitList.append(li);
  });

  productList.innerHTML = "";
  picks.forEach((pick) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <h3></h3>
      <p></p>
      <a target="_blank" rel="noopener noreferrer">Open Uniqlo search</a>
    `;
    card.querySelector("h3").textContent = pick.name;
    card.querySelector("p").textContent = pick.reason;
    card.querySelector("a").href = pick.url;
    productList.append(card);
  });

  setStatus("Recommendation ready.");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const preferences = getPreferences();
  if (!Number.isFinite(preferences.latitude) || !Number.isFinite(preferences.longitude)) {
    setStatus("Please enter valid latitude and longitude.");
    return;
  }

  try {
    setStatus("Checking today's weather...");
    const forecast = await fetchForecast(preferences.latitude, preferences.longitude);
    renderForecast(forecast, preferences);
  } catch (error) {
    setStatus(error.message || "Could not fetch the weather right now.");
  }
});

document.querySelector("#use-location").addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Your browser does not support location lookup.");
    return;
  }

  setStatus("Asking your browser for location permission...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      document.querySelector("#latitude").value = position.coords.latitude.toFixed(4);
      document.querySelector("#longitude").value = position.coords.longitude.toFixed(4);
      document.querySelector("#location-name").value = "Current location";
      setStatus("Location added. Generate the outfit when ready.");
    },
    () => {
      setStatus("Location permission was not granted. You can still enter coordinates manually.");
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
});
