const DEFAULTS = {
  latitude: "-33.8688",
  longitude: "151.2093",
  locationName: "Sydney, NSW",
  timezone: "Australia/Sydney"
};

const WMO_CODES = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "depositing rime fog",
  51: "light drizzle",
  53: "moderate drizzle",
  55: "dense drizzle",
  56: "light freezing drizzle",
  57: "dense freezing drizzle",
  61: "slight rain",
  63: "moderate rain",
  65: "heavy rain",
  66: "light freezing rain",
  67: "heavy freezing rain",
  71: "slight snow",
  73: "moderate snow",
  75: "heavy snow",
  77: "snow grains",
  80: "slight rain showers",
  81: "moderate rain showers",
  82: "violent rain showers",
  85: "slight snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with slight hail",
  99: "thunderstorm with heavy hail"
};

function env(name, fallback) {
  return process.env[name] || fallback;
}

function uniqloSearchUrl(query) {
  return `https://www.uniqlo.com/au/en/search?q=${encodeURIComponent(query)}`;
}

function describeWeather(code) {
  return WMO_CODES[code] || `weather code ${code}`;
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

function buildUniqloShortlist(maxTemp, rainChance) {
  const picks = [];

  if (maxTemp <= 18) {
    picks.push({
      name: "HEATTECH top",
      reason: "Thin warmth under normal clothes without making the outfit bulky.",
      url: uniqloSearchUrl("HEATTECH top")
    });
    picks.push({
      name: "Fleece jacket",
      reason: "Easy mid-layer for cool mornings and evenings.",
      url: uniqloSearchUrl("Fleece Jacket")
    });
    picks.push({
      name: "Ultra Light Down jacket",
      reason: "Packable outer warmth if you will be outside after dark.",
      url: uniqloSearchUrl("Ultra Light Down")
    });
  } else {
    picks.push({
      name: "AIRism cotton oversized T-shirt",
      reason: "Breathable first layer for a mild day.",
      url: uniqloSearchUrl("AIRism cotton oversized t-shirt")
    });
    picks.push({
      name: "Merino crew neck sweater",
      reason: "Polished light layer that works when the temperature dips.",
      url: uniqloSearchUrl("Merino Crew Neck Sweater")
    });
    picks.push({
      name: "Smart ankle pants",
      reason: "Comfortable all-day trousers for mild weather.",
      url: uniqloSearchUrl("Smart Ankle Pants")
    });
  }

  if (rainChance >= 40) {
    picks.push({
      name: "Pocketable parka",
      reason: "Useful light shell when showers are possible.",
      url: uniqloSearchUrl("Pocketable Parka")
    });
  }

  return picks;
}

function formatReport({ locationName, date, maxTemp, minTemp, rainChance, conditions, outfit, picks }) {
  const pickLines = picks.map((pick) => `- [${pick.name}](${pick.url}) - ${pick.reason}`).join("\n");
  const outfitLine = outfit.join(", ");

  return `# Daily Weather Outfit Agent

**Location:** ${locationName}  
**Date:** ${date}  
**Forecast:** ${conditions}  
**Max temperature:** ${maxTemp.toFixed(1)}°C  
**Min temperature:** ${minTemp.toFixed(1)}°C  
**Rain chance:** ${rainChance}%

## What to Wear

${outfitLine}.

## Uniqlo Shortlist

${pickLines}
`;
}

async function fetchForecast({ latitude, longitude, timezone }) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    timezone,
    forecast_days: "1"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  const config = {
    latitude: env("LATITUDE", DEFAULTS.latitude),
    longitude: env("LONGITUDE", DEFAULTS.longitude),
    locationName: env("LOCATION_NAME", DEFAULTS.locationName),
    timezone: env("TIMEZONE", DEFAULTS.timezone)
  };

  const forecast = await fetchForecast(config);
  const daily = forecast.daily;
  const date = daily.time[0];
  const maxTemp = daily.temperature_2m_max[0];
  const minTemp = daily.temperature_2m_min[0];
  const rainChance = daily.precipitation_probability_max[0];
  const conditions = describeWeather(daily.weather_code[0]);
  const outfit = buildOutfitAdvice(maxTemp, minTemp, rainChance, conditions);
  const picks = buildUniqloShortlist(maxTemp, rainChance);

  const report = formatReport({
    locationName: config.locationName,
    date,
    maxTemp,
    minTemp,
    rainChance,
    conditions,
    outfit,
    picks
  });

  console.log(report);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const fs = await import("node:fs/promises");
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, report);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
