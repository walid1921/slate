import { useEffect, useState } from "react";

const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: "Clear sky",      emoji: "☀️" },
  1:  { label: "Mainly clear",   emoji: "🌤️" },
  2:  { label: "Partly cloudy",  emoji: "⛅" },
  3:  { label: "Overcast",       emoji: "☁️" },
  45: { label: "Fog",            emoji: "🌫️" },
  48: { label: "Icy fog",        emoji: "🌫️" },
  51: { label: "Drizzle",        emoji: "🌦️" },
  53: { label: "Drizzle",        emoji: "🌦️" },
  55: { label: "Drizzle",        emoji: "🌧️" },
  61: { label: "Light rain",     emoji: "🌧️" },
  63: { label: "Rain",           emoji: "🌧️" },
  65: { label: "Heavy rain",     emoji: "🌧️" },
  71: { label: "Light snow",     emoji: "🌨️" },
  73: { label: "Snow",           emoji: "❄️" },
  75: { label: "Heavy snow",     emoji: "❄️" },
  80: { label: "Showers",        emoji: "🌦️" },
  81: { label: "Showers",        emoji: "🌧️" },
  82: { label: "Heavy showers",  emoji: "⛈️" },
  95: { label: "Thunderstorm",   emoji: "⛈️" },
  96: { label: "Thunderstorm",   emoji: "⛈️" },
  99: { label: "Thunderstorm",   emoji: "⛈️" },
};

function wmo(code: number) {
  return WMO[code] ?? { label: "Unknown", emoji: "🌡️" };
}

interface DayForecast {
  date: string;
  code: number;
  max: number;
  min: number;
}

interface WeatherState {
  city: string;
  currentTemp: number;
  currentCode: number;
  days: DayForecast[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const geo = await fetch("http://ip-api.com/json/").then(r => r.json());
        const { lat, lon, city } = geo;

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
        const data = await fetch(url).then(r => r.json());

        const days: DayForecast[] = data.daily.time.map((date: string, i: number) => ({
          date,
          code: data.daily.weather_code[i],
          max: Math.round(data.daily.temperature_2m_max[i]),
          min: Math.round(data.daily.temperature_2m_min[i]),
        }));

        setWeather({
          city,
          currentTemp: Math.round(data.current.temperature_2m),
          currentCode: data.current.weather_code,
          days,
        });
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="text-[11px] text-t5 select-none">Fetching weather…</p>;
  }

  if (!weather) return null;

  const today = weather.days[0];
  const { label, emoji } = wmo(weather.currentCode);

  return (
    <div className="flex flex-col gap-3 w-full select-none">
      {/* Current */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-t4 font-medium">{weather.city}</p>
          <p className="text-[28px] font-semibold text-t1 leading-none mt-1">{weather.currentTemp}°</p>
          <p className="text-[11px] text-t4 mt-1">{label}</p>
        </div>
        <div className="text-right">
          <p className="text-[22px] leading-none">{emoji}</p>
          <p className="text-[11px] text-t4 mt-1">H:{today.max}° L:{today.min}°</p>
        </div>
      </div>

      {/* 7-day row */}
      <div className="flex justify-between gap-1">
        {weather.days.map((day, i) => {
          const d = new Date(day.date + "T12:00:00");
          const label = i === 0 ? "Today" : DAY_LABELS[d.getDay()];
          const w = wmo(day.code);
          return (
            <div key={day.date} className="flex flex-col items-center gap-0.5 flex-1">
              <p className={`text-[10px] font-medium ${i === 0 ? "text-t2" : "text-t4"}`}>{label}</p>
              <span className="text-[14px] leading-none">{w.emoji}</span>
              <p className="text-[10px] text-t2">{day.max}°</p>
              <p className="text-[10px] text-t5">{day.min}°</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
