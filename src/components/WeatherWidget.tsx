import { useEffect, useState } from "react";

const WMO: Record<number, { label: string; emoji: string }> = {
  113: { label: "Clear",          emoji: "☀️" },
  116: { label: "Partly cloudy",  emoji: "⛅" },
  119: { label: "Cloudy",         emoji: "☁️" },
  122: { label: "Overcast",       emoji: "☁️" },
  143: { label: "Fog",            emoji: "🌫️" },
  176: { label: "Light rain",     emoji: "🌦️" },
  179: { label: "Light snow",     emoji: "🌨️" },
  182: { label: "Sleet",          emoji: "🌧️" },
  185: { label: "Freezing drizzle", emoji: "🌧️" },
  200: { label: "Thundery",       emoji: "⛈️" },
  227: { label: "Blowing snow",   emoji: "❄️" },
  230: { label: "Blizzard",       emoji: "❄️" },
  248: { label: "Fog",            emoji: "🌫️" },
  260: { label: "Freezing fog",   emoji: "🌫️" },
  263: { label: "Drizzle",        emoji: "🌦️" },
  266: { label: "Drizzle",        emoji: "🌦️" },
  281: { label: "Freezing drizzle", emoji: "🌧️" },
  284: { label: "Freezing drizzle", emoji: "🌧️" },
  293: { label: "Light rain",     emoji: "🌦️" },
  296: { label: "Light rain",     emoji: "🌦️" },
  299: { label: "Moderate rain",  emoji: "🌧️" },
  302: { label: "Moderate rain",  emoji: "🌧️" },
  305: { label: "Heavy rain",     emoji: "🌧️" },
  308: { label: "Heavy rain",     emoji: "🌧️" },
  311: { label: "Sleet",          emoji: "🌧️" },
  314: { label: "Sleet",          emoji: "🌧️" },
  317: { label: "Sleet",          emoji: "🌧️" },
  320: { label: "Light snow",     emoji: "🌨️" },
  323: { label: "Light snow",     emoji: "🌨️" },
  326: { label: "Light snow",     emoji: "🌨️" },
  329: { label: "Moderate snow",  emoji: "❄️" },
  332: { label: "Moderate snow",  emoji: "❄️" },
  335: { label: "Heavy snow",     emoji: "❄️" },
  338: { label: "Heavy snow",     emoji: "❄️" },
  350: { label: "Ice pellets",    emoji: "🌧️" },
  353: { label: "Light showers",  emoji: "🌦️" },
  356: { label: "Showers",        emoji: "🌧️" },
  359: { label: "Heavy showers",  emoji: "🌧️" },
  362: { label: "Sleet showers",  emoji: "🌧️" },
  365: { label: "Sleet showers",  emoji: "🌧️" },
  368: { label: "Snow showers",   emoji: "🌨️" },
  371: { label: "Snow showers",   emoji: "🌨️" },
  374: { label: "Ice showers",    emoji: "🌧️" },
  377: { label: "Ice showers",    emoji: "🌧️" },
  386: { label: "Thunderstorm",   emoji: "⛈️" },
  389: { label: "Thunderstorm",   emoji: "⛈️" },
  392: { label: "Snowy thunder",  emoji: "⛈️" },
  395: { label: "Snowy thunder",  emoji: "⛈️" },
};

interface WeatherState {
  temp: number;
  label: string;
  emoji: string;
  city: string;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://wttr.in/?format=j1")
      .then((r) => r.json())
      .then((data) => {
        const current = data.current_condition?.[0];
        const area = data.nearest_area?.[0];
        const code = parseInt(current?.weatherCode ?? "113", 10);
        const temp = parseInt(current?.temp_C ?? "0", 10);
        const city = area?.areaName?.[0]?.value ?? area?.region?.[0]?.value ?? "";
        const { label, emoji } = WMO[code] ?? { label: "", emoji: "🌡️" };
        setWeather({ temp, label, emoji, city });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 select-none">
        <span className="text-[11px] text-t5">Fetching weather…</span>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="flex items-center gap-2 select-none">
      <span className="text-[20px] leading-none">{weather.emoji}</span>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-medium text-t2">{weather.temp}°C</span>
          <span className="text-[11px] text-t4">{weather.label}</span>
        </div>
        {weather.city && <span className="text-[11px] text-t5">{weather.city}</span>}
      </div>
    </div>
  );
}
