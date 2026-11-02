/**
 * Forecast for a trip day from Open-Meteo (free, no key). Beyond 16 days ahead there is no forecast,
 * so the caller gets the date from which it will show up.
 */
import { daysBetween } from "./time";

/** Open-Meteo: free, no API key, CORS-enabled. Forecasts cover the next 16 days. */
const API = "https://api.open-meteo.com/v1/forecast";
export const FORECAST_DAYS = 16;

export type Sky = "sun" | "partly" | "cloud" | "rain";

export interface WeatherSlot {
  hour: number;
  temperature: number;
  rainChance: number;
  sky: Sky;
}

export type WeatherState =
  | { kind: "ok"; slots: WeatherSlot[]; sunset?: string }
  | { kind: "tooFar"; availableFrom: string }
  | { kind: "past" }
  | { kind: "error" };

/** WMO weather code → icon family. */
export function skyFromCode(code: number): Sky {
  if (code <= 1) return "sun";
  if (code === 2) return "partly";
  if (code === 3 || code === 45 || code === 48) return "cloud";
  return "rain";
}

/** Five hours spread over the day's schedule. */
export function slotHours(firstHour: number, lastHour: number): number[] {
  const a = Math.max(0, Math.min(23, firstHour));
  const b = Math.max(a + 4, Math.min(23, lastHour));
  return Array.from({ length: 5 }, (_, i) => Math.round(a + ((b - a) * i) / 4));
}

export async function fetchWeather(
  lat: number, lng: number, date: string, today: string, timezone: string, hours: number[],
): Promise<WeatherState> {
  const ahead = daysBetween(today, date);
  if (ahead < 0) return { kind: "past" };
  if (ahead >= FORECAST_DAYS) {
    const from = new Date(`${date}T12:00:00Z`);
    from.setUTCDate(from.getUTCDate() - (FORECAST_DAYS - 1));
    return { kind: "tooFar", availableFrom: from.toISOString().slice(0, 10) };
  }
  const params = new URLSearchParams({
    latitude: String(lat), longitude: String(lng), timezone,
    hourly: "temperature_2m,precipitation_probability,weather_code",
    daily: "sunset", start_date: date, end_date: date,
  });
  try {
    const res = await fetch(`${API}?${params}`);
    if (!res.ok) return { kind: "error" };
    const data = await res.json();
    const slots = hours.map((h) => ({
      hour: h,
      temperature: Math.round(data.hourly.temperature_2m[h]),
      rainChance: data.hourly.precipitation_probability[h] ?? 0,
      sky: skyFromCode(data.hourly.weather_code[h]),
    }));
    const sunset: string | undefined = data.daily?.sunset?.[0]?.slice(11, 16);
    return { kind: "ok", slots, sunset };
  } catch {
    return { kind: "error" };
  }
}
