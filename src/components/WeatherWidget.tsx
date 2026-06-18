import { useEffect, useState } from "react";

const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: "Clear sky",       emoji: "☀️" },
  1:  { label: "Mainly clear",    emoji: "🌤️" },
  2:  { label: "Partly cloudy",   emoji: "⛅" },
  3:  { label: "Overcast",        emoji: "☁️" },
  45: { label: "Fog",             emoji: "🌫️" },
  48: { label: "Icy fog",         emoji: "🌫️" },
  51: { label: "Light drizzle",   emoji: "🌦️" },
  53: { label: "Drizzle",         emoji: "🌦️" },
  55: { label: "Heavy drizzle",   emoji: "🌧️" },
  61: { label: "Light rain",      emoji: "🌧️" },
  63: { label: "Rain",            emoji: "🌧️" },
  65: { label: "Heavy rain",      emoji: "🌧️" },
  71: { label: "Light snow",      emoji: "🌨️" },
  73: { label: "Snow",            emoji: "❄️" },
  75: { label: "Heavy snow",      emoji: "❄️" },
  80: { label: "Rain showers",    emoji: "🌦️" },
  81: { label: "Showers",         emoji: "🌧️" },
  82: { label: "Heavy showers",   emoji: "⛈️" },
  95: { label: "Thunderstorm",    emoji: "⛈️" },
  96: { label: "Thunderstorm",    emoji: "⛈️" },
  99: { label: "Thunderstorm",    emoji: "⛈️" },
};

function wmo(code: number) {
  return WMO[code] ?? { label: "Unknown", emoji: "🌡️" };
}

export default function WeatherWidget() {
  const [temp, setTemp] = useState<number | null>(null);
  const [code, setCode] = useState<number | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude: lat, longitude: lon } = coords;

          const [weatherRes, geoRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`),
          ]);

          const weather = await weatherRes.json();
          setTemp(Math.round(weather.current.temperature_2m));
          setCode(weather.current.weather_code);

          const geo = await geoRes.json();
          setCity(geo.address?.city || geo.address?.town || geo.address?.village || null);
        } catch {
          setError(true);
        }
      },
      () => setError(true),
      { timeout: 8000 }
    );
  }, []);

  if (error || (temp === null && code === null)) return null;

  const w = code !== null ? wmo(code) : null;

  return (
    <div className="flex items-center gap-2 select-none">
      {w && <span className="text-[18px] leading-none">{w.emoji}</span>}
      <div className="flex flex-col">
        <span className="text-[13px] font-medium text-t2 leading-none">
          {temp !== null ? `${temp}°C` : "—"}
          {w && <span className="text-t4 font-normal ml-1.5 text-[11px]">{w.label}</span>}
        </span>
        {city && <span className="text-[11px] text-t5 mt-0.5">{city}</span>}
      </div>
    </div>
  );
}
