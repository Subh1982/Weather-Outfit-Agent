const DEFAULTS = {
  latitude: "-33.8688",
  longitude: "151.2093",
  locationName: "Sydney, NSW",
  timezone: "Australia/Sydney",
  colorPreference: "neutral colors",
  stylePreference: "minimal, comfortable, smart casual",
  brandPreference: "Uniqlo",
  avoidPreference: "none",
  geminiModel: "gemini-2.5-flash"
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

function normalizePreference(value, fallback) {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
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

function buildUniqloShortlist(maxTemp, minTemp, rainChance, preferences) {
  const picks = [];
  const colorNote = preferences.colorPreference;
  const styleNote = preferences.stylePreference;
  const brandNote = preferences.brandPreference;
  const avoidNote = preferences.avoidPreference;

  if (maxTemp <= 18) {
    picks.push({
      name: "HEATTECH top",
      reason: `Recommended because the day is cool and a thin thermal layer adds warmth without bulk. Look for ${colorNote} so it fits your preferred palette.`,
      url: uniqloSearchUrl(`HEATTECH top ${colorNote}`)
    });
    picks.push({
      name: "Fleece jacket",
      reason: `Recommended as an easy mid-layer for the ${minTemp.toFixed(1)}°C morning low and your ${styleNote} style preference.`,
      url: uniqloSearchUrl(`Fleece Jacket ${colorNote}`)
    });
    picks.push({
      name: "Ultra Light Down jacket",
      reason: `Recommended if you will be outside early or late; it adds packable warmth while staying close to the ${brandNote} preference.`,
      url: uniqloSearchUrl(`Ultra Light Down ${colorNote}`)
    });
  } else {
    picks.push({
      name: "AIRism cotton oversized T-shirt",
      reason: `Recommended because the ${maxTemp.toFixed(1)}°C max is mild enough for a breathable first layer. Choose ${colorNote} to match your preference.`,
      url: uniqloSearchUrl(`AIRism cotton oversized t-shirt ${colorNote}`)
    });
    picks.push({
      name: "Merino crew neck sweater",
      reason: `Recommended as a polished light layer for cooler parts of the day and a good match for ${styleNote}.`,
      url: uniqloSearchUrl(`Merino Crew Neck Sweater ${colorNote}`)
    });
    picks.push({
      name: "Smart ankle pants",
      reason: `Recommended for comfortable all-day wear in mild weather, especially if you want the outfit to stay ${styleNote}.`,
      url: uniqloSearchUrl(`Smart Ankle Pants ${colorNote}`)
    });
  }

  if (rainChance >= 40) {
    picks.push({
      name: "Pocketable parka",
      reason: `Recommended because the rain chance is ${rainChance}%, so a light shell is useful without committing to a heavy coat.`,
      url: uniqloSearchUrl(`Pocketable Parka ${colorNote}`)
    });
  }

  return picks.filter((pick) => {
    if (/^none$/i.test(avoidNote)) {
      return true;
    }

    return !avoidNote
      .toLowerCase()
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .some((avoid) => pick.name.toLowerCase().includes(avoid));
  });
}

function stripJsonFence(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
}

function withUniqloUrls(products = []) {
  return products.slice(0, 5).map((product) => {
    const searchQuery = product.searchQuery || product.name || "Uniqlo";

    return {
      name: product.name || searchQuery,
      reason: product.reason || "Recommended for today's weather and your preferences.",
      url: product.url || uniqloSearchUrl(searchQuery)
    };
  });
}

function buildGeminiPrompt({ locationName, date, maxTemp, minTemp, rainChance, conditions, preferences }) {
  return `Create a daily outfit recommendation and Uniqlo AU shopping shortlist.

You are a practical clothing stylist. Return compact JSON only. Recommend only wearable clothing categories, not medical or safety advice.

Weather:
- Location: ${locationName}
- Date: ${date}
- Conditions: ${conditions}
- Max temperature: ${maxTemp} C
- Min temperature: ${minTemp} C
- Rain chance: ${rainChance}%

User preferences:
- Preferred colors: ${preferences.colorPreference}
- Style: ${preferences.stylePreference}
- Brand notes: ${preferences.brandPreference}
- Avoid: ${preferences.avoidPreference}

Return JSON with this exact shape:
{
  "summary": "One natural sentence explaining the outfit strategy.",
  "outfitItems": ["item 1", "item 2", "item 3"],
  "products": [
    {
      "name": "Uniqlo category or product search phrase",
      "reason": "Why this is recommended for the weather and preferences.",
      "searchQuery": "Uniqlo AU search query"
    }
  ]
}

Rules:
- Recommend 3 to 6 outfit items.
- Recommend 3 to 5 Uniqlo options.
- Respect the avoid list.
- Keep each reason under 26 words.
- Use Australian weather context.
- Use Uniqlo-searchable categories, not made-up product names.
- Return JSON only.`;
}

async function fetchGeminiRecommendation(context, apiKey, model) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildGeminiPrompt(context)
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned no recommendation text.");
  }

  const parsed = JSON.parse(stripJsonFence(text));

  if (!Array.isArray(parsed.outfitItems) || !Array.isArray(parsed.products)) {
    throw new Error("Gemini response did not include outfitItems and products arrays.");
  }

  return {
    source: "Gemini",
    summary: parsed.summary || "",
    outfit: parsed.outfitItems.slice(0, 8),
    picks: withUniqloUrls(parsed.products)
  };
}

async function buildRecommendation(context) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = env("GEMINI_MODEL", DEFAULTS.geminiModel);

  if (apiKey) {
    try {
      return await fetchGeminiRecommendation(context, apiKey, model);
    } catch (error) {
      console.warn(`Gemini unavailable, using rules fallback: ${error.message}`);

      return {
        source: "Rules fallback after Gemini error",
        summary: `Using local outfit rules instead of Gemini. Gemini error: ${summarizeGeminiError(error.message)}`,
        outfit: buildOutfitAdvice(context.maxTemp, context.minTemp, context.rainChance, context.conditions),
        picks: buildUniqloShortlist(context.maxTemp, context.minTemp, context.rainChance, context.preferences)
      };
    }
  }

  return {
    source: "Rules fallback - GEMINI_API_KEY not set",
    summary: "Using local outfit rules instead of Gemini.",
    outfit: buildOutfitAdvice(context.maxTemp, context.minTemp, context.rainChance, context.conditions),
    picks: buildUniqloShortlist(context.maxTemp, context.minTemp, context.rainChance, context.preferences)
  };
}

function summarizeGeminiError(message) {
  const text = String(message || "Unknown Gemini error");

  if (/API_KEY_INVALID|invalid api key|permission denied/i.test(text)) {
    return "The API key was rejected. Recheck the GEMINI_API_KEY secret.";
  }

  if (/not found|not supported|model/i.test(text)) {
    return "The configured Gemini model may not be available for your key. Try GEMINI_MODEL=gemini-flash-latest.";
  }

  if (/quota|billing|rate/i.test(text)) {
    return "The key may have quota, billing, or rate-limit restrictions.";
  }

  return text.slice(0, 220);
}

function formatReport({ locationName, date, maxTemp, minTemp, rainChance, conditions, recommendation, preferences }) {
  const pickLines = recommendation.picks.map((pick) => `- [${pick.name}](${pick.url}) - ${pick.reason}`).join("\n");
  const outfitLine = recommendation.outfit.join(", ");

  return `# Daily Weather Outfit Agent

**Location:** ${locationName}  
**Date:** ${date}  
**Forecast:** ${conditions}  
**Max temperature:** ${maxTemp.toFixed(1)}°C  
**Min temperature:** ${minTemp.toFixed(1)}°C  
**Rain chance:** ${rainChance}%  
**Recommendation source:** ${recommendation.source}

${recommendation.summary ? `_${recommendation.summary}_\n` : ""}

## What to Wear

${outfitLine}.

## Your Preferences

- Colors: ${preferences.colorPreference}
- Style: ${preferences.stylePreference}
- Brand notes: ${preferences.brandPreference}
- Avoid: ${preferences.avoidPreference}

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
  const preferences = {
    colorPreference: normalizePreference(env("COLOR_PREFERENCE", DEFAULTS.colorPreference), DEFAULTS.colorPreference),
    stylePreference: normalizePreference(env("STYLE_PREFERENCE", DEFAULTS.stylePreference), DEFAULTS.stylePreference),
    brandPreference: normalizePreference(env("BRAND_PREFERENCE", DEFAULTS.brandPreference), DEFAULTS.brandPreference),
    avoidPreference: normalizePreference(env("AVOID_PREFERENCE", DEFAULTS.avoidPreference), DEFAULTS.avoidPreference)
  };

  const forecast = await fetchForecast(config);
  const daily = forecast.daily;
  const date = daily.time[0];
  const maxTemp = daily.temperature_2m_max[0];
  const minTemp = daily.temperature_2m_min[0];
  const rainChance = daily.precipitation_probability_max[0];
  const conditions = describeWeather(daily.weather_code[0]);
  const context = {
    locationName: config.locationName,
    date,
    maxTemp,
    minTemp,
    rainChance,
    conditions,
    preferences
  };
  const recommendation = await buildRecommendation(context);

  const report = formatReport({
    locationName: config.locationName,
    date,
    maxTemp,
    minTemp,
    rainChance,
    conditions,
    recommendation,
    preferences
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
