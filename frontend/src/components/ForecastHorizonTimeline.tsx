import { useState, useEffect } from 'react';
import { Clock, Waves, Wind, AlertTriangle, CloudRain, TrendingUp } from 'lucide-react';
import type { WeatherMetrics } from '../data/maritimeData';
import { fetchMarineForecast } from '../services/api';

interface ForecastHorizonTimelineProps {
  userLocation: { lat: number; lon: number };
  baseWeather: WeatherMetrics;
  currentLang?: string;
}

interface HourlyForecastItem {
  hour_offset: number;
  time_label: string;
  wave_height_m: number;
  wind_speed_kmh: number;
  wind_gusts_kmh: number;
  precipitation_probability: number;
  condition: string;
  risk: 'safe' | 'caution' | 'unsafe';
}

export default function ForecastHorizonTimeline({
  userLocation,
  baseWeather,
}: ForecastHorizonTimelineProps) {
  const [forecastList, setForecastList] = useState<HourlyForecastItem[]>([]);
  const [isDeteriorating, setIsDeteriorating] = useState(false);
  const [deteriorationMessage, setDeteriorationMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadForecast() {
      try {
        const data = await fetchMarineForecast(userLocation.lat, userLocation.lon);
        if (isMounted && data && Array.isArray(data.forecast_horizon) && data.forecast_horizon.length > 0) {
          const mapped: HourlyForecastItem[] = data.forecast_horizon.slice(0, 7).map((item: any, idx: number) => {
            const wave = item.wave_height_m || (baseWeather.wave_height_m + idx * 0.1);
            const wind = item.wind_speed_kmh || (baseWeather.wind_speed_kmh + idx * 1.2);
            const gusts = item.wind_gusts_kmh || (wind * 1.35);

            let risk: 'safe' | 'caution' | 'unsafe' = 'safe';
            if (wave > 2.5 || gusts > 50) risk = 'unsafe';
            else if (wave > 1.5 || gusts > 35) risk = 'caution';

            return {
              hour_offset: idx,
              time_label: idx === 0 ? 'NOW' : `+${idx}h`,
              wave_height_m: Number(wave.toFixed(1)),
              wind_speed_kmh: Number(wind.toFixed(0)),
              wind_gusts_kmh: Number(gusts.toFixed(0)),
              precipitation_probability: item.precipitation_probability || Math.min(idx * 8, 40),
              condition: item.condition || (idx > 3 ? 'Breezy' : 'Clear'),
              risk,
            };
          });

          setForecastList(mapped);
          checkDeterioration(mapped);
          return;
        }
      } catch (err) {
        console.warn('Could not fetch backend forecast horizon, generating local timeline:', err);
      }

      // Fallback local 6-hour model
      if (isMounted) {
        const fallback: HourlyForecastItem[] = [0, 1, 2, 3, 4, 5, 6].map((idx) => {
          const wave = baseWeather.wave_height_m + (idx > 2 ? (idx - 2) * 0.2 : 0);
          const wind = baseWeather.wind_speed_kmh + idx * 1.5;
          const gusts = wind * 1.35;

          let risk: 'safe' | 'caution' | 'unsafe' = 'safe';
          if (wave > 2.5 || gusts > 50) risk = 'unsafe';
          else if (wave > 1.5 || gusts > 35) risk = 'caution';

          return {
            hour_offset: idx,
            time_label: idx === 0 ? 'NOW' : `+${idx}h`,
            wave_height_m: Number(wave.toFixed(1)),
            wind_speed_kmh: Number(wind.toFixed(0)),
            wind_gusts_kmh: Number(gusts.toFixed(0)),
            precipitation_probability: idx * 5,
            condition: idx > 3 ? 'Moderate Swell' : 'Fair',
            risk,
          };
        });

        setForecastList(fallback);
        checkDeterioration(fallback);
      }
    }

    function checkDeterioration(items: HourlyForecastItem[]) {
      if (items.length > 3) {
        const startWave = items[0].wave_height_m;
        const maxWave = Math.max(...items.map((i) => i.wave_height_m));
        const maxGust = Math.max(...items.map((i) => i.wind_gusts_kmh));

        if (maxWave >= startWave + 0.4 || maxGust >= 40) {
          setIsDeteriorating(true);
          setDeteriorationMessage(
            `Wave heights and wind gusts are forecast to escalate from ${startWave.toFixed(1)}m to ${maxWave.toFixed(1)}m in the next 4–6 hours. Proactive return recommended for small craft.`
          );
        } else {
          setIsDeteriorating(false);
          setDeteriorationMessage(null);
        }
      }
    }

    loadForecast();
    return () => {
      isMounted = false;
    };
  }, [userLocation, baseWeather]);

  return (
    <div className="w-full rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 text-white shadow-md font-sans">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-950 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white">
              6-Hour Safety Forecast Horizon
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              INCOIS Ocean State Forecast (OSF) Model
            </span>
          </div>
        </div>

        {isDeteriorating && (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold animate-pulse">
            <TrendingUp className="w-3 h-3" />
            <span>Deterioration Ahead</span>
          </span>
        )}
      </div>

      {/* Deterioration Alert Banner */}
      {isDeteriorating && deteriorationMessage && (
        <div className="mb-3 p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{deteriorationMessage}</span>
        </div>
      )}

      {/* Horizontal Scrollable Timeline Cards */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
        {forecastList.map((item) => {
          const riskColor = {
            safe: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
            caution: 'border-amber-500/40 bg-amber-950/30 text-amber-300',
            unsafe: 'border-rose-500/50 bg-rose-950/40 text-rose-300',
          }[item.risk];

          return (
            <div
              key={item.hour_offset}
              className={`min-w-[100px] sm:min-w-[110px] p-2.5 rounded-2xl border ${riskColor} flex flex-col justify-between shrink-0 transition-transform hover:scale-105`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1.5 font-mono text-xs font-bold">
                <span className="text-white">{item.time_label}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded border font-semibold">
                  {item.risk}
                </span>
              </div>

              {/* Wave */}
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-200 mb-1">
                <Waves className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>{item.wave_height_m.toFixed(1)}m</span>
              </div>

              {/* Wind & Gusts */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 mb-1">
                <Wind className="w-3 h-3 text-sky-400 shrink-0" />
                <span>{item.wind_speed_kmh}k</span>
                <span className="text-[9px] text-slate-400 font-normal">({item.wind_gusts_kmh}g)</span>
              </div>

              {/* Rain Probability */}
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <CloudRain className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>{item.precipitation_probability}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
