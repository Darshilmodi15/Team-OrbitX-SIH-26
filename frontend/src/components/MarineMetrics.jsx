import React from 'react';

export default function MarineMetrics({ weather, riskLevel }) {
  if (!weather) return null;

  const isSevere = weather.wave_height_m > 2.5 || weather.wind_speed_kmh > 50 || weather.forecast === 'stormy';
  const isCaution = !isSevere && (weather.wave_height_m > 1.5 || weather.wind_speed_kmh > 40 || weather.forecast === 'rainy');

  const getStatusBadge = () => {
    if (riskLevel === 'unsafe' || isSevere) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950/60 text-rose-400 border border-rose-500/40">
          🚨 UNSAFE
        </span>
      );
    }
    if (riskLevel === 'caution' || isCaution) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950/60 text-amber-400 border border-amber-500/40">
          ⚠️ CAUTION
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
        ✅ SAFE
      </span>
    );
  };

  const getForecastIcon = (forecast) => {
    const f = (forecast || '').toLowerCase();
    if (f.includes('storm')) return '⛈️';
    if (f.includes('rain')) return '🌧️';
    return '☀️';
  };

  return (
    <div className="mt-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
          <span>🌊</span> Marine Conditions
        </span>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono">Forecast</div>
          <div className="text-sm font-semibold text-white mt-0.5 flex items-center gap-1">
            <span>{getForecastIcon(weather.forecast)}</span>
            <span className="capitalize">{weather.forecast || 'Clear'}</span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono">Wave Height</div>
          <div className={`text-sm font-semibold mt-0.5 ${weather.wave_height_m > 2.0 ? 'text-rose-400' : weather.wave_height_m > 1.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {weather.wave_height_m} <span className="text-xs font-normal text-slate-400">m</span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono">Wind Speed</div>
          <div className={`text-sm font-semibold mt-0.5 ${weather.wind_speed_kmh > 45 ? 'text-rose-400' : weather.wind_speed_kmh > 35 ? 'text-amber-400' : 'text-cyan-400'}`}>
            {weather.wind_speed_kmh} <span className="text-xs font-normal text-slate-400">km/h</span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono">Temperature / Vis</div>
          <div className="text-sm font-semibold text-white mt-0.5">
            {weather.temperature_c ?? 29}°C <span className="text-xs text-slate-400 font-normal">/ {weather.visibility_km ?? 15}km</span>
          </div>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-slate-500 font-mono text-right">
        Source: <span className="text-slate-400">{weather.source || 'mock_marine_weather'}</span>
      </div>
    </div>
  );
}
