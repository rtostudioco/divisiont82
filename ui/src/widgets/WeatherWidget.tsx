import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudLightning, CloudSnow, CloudSun, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface WeatherWidgetProps {
  settings?: { lat?: number; lon?: number; city?: string };
}

interface WeatherState {
  temperature: number | null;
  windspeed: number | null;
  code: number | null;
  max: number | null;
  min: number | null;
  error: string | null;
}

function iconForCode(code: number | null): LucideIcon {
  if (code === null) return CloudSun;
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code <= 48) return Cloud;
  if (code <= 67) return CloudDrizzle;
  if (code <= 77) return CloudSnow;
  if (code <= 99) return CloudLightning;
  return Cloud;
}

/**
 * Level 2 widget — live weather via Open-Meteo (CORS-friendly, keyless).
 * Coordinates come from widget settings (defaults to Bogotá).
 */
export function WeatherWidget({ settings }: WeatherWidgetProps) {
  const lat = settings?.lat ?? 4.71;
  const lon = settings?.lon ?? -74.07;
  const city = settings?.city ?? "Bogotá";
  const [wx, setWx] = useState<WeatherState>({
    temperature: null, windspeed: null, code: null, max: null, min: null, error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`weather ${r.status}`);
        return r.json() as Promise<{
          current_weather: { temperature: number; windspeed: number; weathercode: number };
          daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
        }>;
      })
      .then((data) => {
        setWx({
          temperature: data.current_weather.temperature,
          windspeed: data.current_weather.windspeed,
          code: data.current_weather.weathercode,
          max: data.daily.temperature_2m_max[0],
          min: data.daily.temperature_2m_min[0],
          error: null,
        });
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setWx((s) => ({ ...s, error: e.message }));
      });
    return () => controller.abort();
  }, [lat, lon]);

  const Icon = iconForCode(wx.code);

  return (
    <div className="widget" role="group" aria-label={`Weather in ${city}`}>
      <div className="widget__label">
        <CloudSun size={11} /> WEATHER · {city.toUpperCase()}
      </div>
      {wx.error ? (
        <div className="wx__meta" style={{ color: "var(--d82-warn)" }}>
          OFFLINE · {wx.error}
        </div>
      ) : (
        <>
          <div className="wx__main">
            <Icon size={30} className="wx__icon" />
            <span className="wx__temp">
              {wx.temperature !== null ? `${wx.temperature.toFixed(0)}°` : "--°"}
            </span>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div className="wx__meta">↑ {wx.max !== null ? `${wx.max.toFixed(0)}°` : "--"}</div>
              <div className="wx__meta">↓ {wx.min !== null ? `${wx.min.toFixed(0)}°` : "--"}</div>
            </div>
          </div>
          <div className="wx__meta">
            WIND {wx.windspeed !== null ? wx.windspeed.toFixed(0) : "--"} KM/H · OPEN-METEO
          </div>
        </>
      )}
    </div>
  );
}
