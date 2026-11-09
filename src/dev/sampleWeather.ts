/**
 * Development only: a fixed forecast for ?sampleWeather (the preview page), so its screens never call
 * Open-Meteo and always look the same.
 */
import type { Sky, WeatherState } from "../weather";

const SKIES: Sky[] = ["sun", "partly", "cloud", "rain", "partly"];

export function sampleWeather(hours: number[]): WeatherState {
  return {
    kind: "ok",
    slots: hours.map((hour, i) => ({ hour, temperature: 9 + i, rainChance: [0, 10, 30, 60, 20][i % 5], sky: SKIES[i % SKIES.length] })),
    sunset: "17:21",
  };
}
