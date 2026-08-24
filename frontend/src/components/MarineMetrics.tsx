interface MarineMetricsProps {
  weather?: {
    forecast?: string;
    wave_height_m?: number;
    wave_period_s?: number | null;
    wave_direction_deg?: number | null;
    wave_direction_cardinal?: string | null;
    wind_speed_kmh?: number;
    wind_gust_kmh?: number | null;
    wind_direction_deg?: number | null;
    wind_direction_cardinal?: string | null;
    cloud_cover_pct?: number | null;
    cloud_category?: string | null;
    visibility_km?: number | null;
    visibility_category?: string | null;
    temperature_c?: number | null;
    sea_surface_temperature_c?: number | null;
    source?: string;
  };
  riskLevel?: string | null;
  riskProfile?: any;
}

export default function MarineMetrics({ weather, riskLevel, riskProfile }: MarineMetricsProps) {
  if (!weather) return null;

  const wave = weather.wave_height_m ?? 0;
  const wind = weather.wind_speed_kmh ?? 0;
  const gust = weather.wind_gust_kmh ?? Math.round(wind * 1.3);
  const forecast = (weather.forecast || '').toLowerCase();

  const isSevere = wave > 2.5 || wind > 50 || gust > 60 || forecast.includes('storm');
  const isCaution = !isSevere && (wave > 1.5 || wind > 30 || gust > 40 || forecast.includes('rain'));

  const getStatusBadge = () => {
    if (riskLevel === 'unsafe' || riskProfile?.overall === 'HIGH' || isSevere) {
      return (
<<<<<<< HEAD
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
=======
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-950/90 text-rose-300 border border-rose-500/50 shadow-[0_0_12px_rgba(251,113,133,0.3)] flex items-center gap-1">
>>>>>>> 53469ae0314cc74b90cef1a39872bb0970851fd6
          <span>🚨</span>
          <span>HIGH RISK / UNSAFE</span>
        </span>
      );
    }
    if (riskLevel === 'caution' || riskProfile?.overall === 'MODERATE' || isCaution) {
      return (
<<<<<<< HEAD
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
=======
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-950/90 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.3)] flex items-center gap-1">
>>>>>>> 53469ae0314cc74b90cef1a39872bb0970851fd6
          <span>⚠️</span>
          <span>CAUTION ADVISED</span>
        </span>
      );
    }
    return (
<<<<<<< HEAD
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
=======
      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.3)] flex items-center gap-1">
>>>>>>> 53469ae0314cc74b90cef1a39872bb0970851fd6
        <span>✅</span>
        <span>LOW RISK / SAFE TO SAIL</span>
      </span>
    );
  };

  const getForecastIcon = (fc?: string) => {
    const f = (fc || '').toLowerCase();
    if (f.includes('storm') || f.includes('thunder')) return '⛈️';
    if (f.includes('rain') || f.includes('drizzle') || f.includes('shower')) return '🌧️';
    if (f.includes('fog')) return '🌫️';
    if (f.includes('cloud')) return '⛅';
    return '☀️';
  };

  return (
<<<<<<< HEAD
    <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-xs">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/80">
        <span className="font-bold text-slate-800 flex items-center gap-1.5 font-mono tracking-tight text-xs">
          <span>🌊</span> METEOROLOGICAL TELEMETRY
=======
    <div className="mt-3.5 p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800/90 text-xs shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <span className="font-bold text-slate-200 flex items-center gap-2 font-mono tracking-wide text-[11px]">
          <span className="text-[#22d3ee]">🌊</span> MARINE METEOROLOGICAL TELEMETRY
>>>>>>> 53469ae0314cc74b90cef1a39872bb0970851fd6
        </span>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
<<<<<<< HEAD
        {/* Forecast */}
        <div className="p-2 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-mono font-bold">Forecast</div>
          <div className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1">
            <span>{getForecastIcon(weather.forecast)}</span>
            <span className="capitalize">{weather.forecast || 'Clear'}</span>
          </div>
        </div>

        {/* Wave Height */}
        <div className="p-2 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-mono font-bold">Wave Height</div>
          <div className={`text-xs font-bold mt-0.5 ${wave > 2.0 ? 'text-rose-600' : wave > 1.5 ? 'text-amber-600' : 'text-emerald-700'}`}>
            {wave.toFixed(1)} <span className="text-[10px] font-normal text-slate-500 font-mono">m</span>
          </div>
        </div>

        {/* Wind Speed */}
        <div className="p-2 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-mono font-bold">Wind Speed</div>
          <div className={`text-xs font-bold mt-0.5 ${wind > 45 ? 'text-rose-600' : wind > 35 ? 'text-amber-600' : 'text-teal-700'}`}>
            {wind.toFixed(0)} <span className="text-[10px] font-normal text-slate-500 font-mono">km/h</span>
          </div>
        </div>

        {/* Temp & Visibility */}
        <div className="p-2 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-mono font-bold">Temp / Vis</div>
          <div className="text-xs font-bold text-slate-900 mt-0.5">
            {weather.temperature_c ?? 29.5}°C <span className="text-[10px] text-slate-500 font-normal font-mono">/ {weather.visibility_km ?? 15}km</span>
=======
        {/* Wave Height & Period */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Significant Wave</div>
          <div className={`text-base font-bold mt-1 ${wave > 2.5 ? 'text-rose-400' : wave > 1.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {wave.toFixed(2)} <span className="text-xs font-normal text-slate-400 font-mono">m</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Period: <span className="text-slate-200">{weather.wave_period_s ? `${weather.wave_period_s}s` : 'N/A'}</span>
          </div>
        </div>

        {/* Wind Speed & Gusts */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Wind & Gusts</div>
          <div className={`text-base font-bold mt-1 ${wind > 50 ? 'text-rose-400' : wind > 30 ? 'text-amber-400' : 'text-[#22d3ee]'}`}>
            {wind.toFixed(1)} <span className="text-xs font-normal text-slate-400 font-mono">km/h</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Gust: <span className="text-amber-300 font-semibold">{gust} km/h</span> ({weather.wind_direction_cardinal || 'W'})
          </div>
        </div>

        {/* Cloud Cover */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Cloud Cover</div>
          <div className="text-sm font-bold text-slate-100 mt-1 flex items-center gap-1.5">
            <span className="text-base">{getForecastIcon(weather.forecast)}</span>
            <span className="capitalize">{weather.cloud_category || weather.forecast || 'Clear'}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Coverage: <span className="text-cyan-300 font-semibold">{weather.cloud_cover_pct != null ? `${Math.round(weather.cloud_cover_pct)}%` : 'N/A'}</span>
          </div>
        </div>

        {/* Visibility & SST */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Visibility & SST</div>
          <div className="text-sm font-bold text-slate-100 mt-1">
            {weather.visibility_km ? `${weather.visibility_km} km` : '15 km'}
            <span className="text-[10px] font-normal text-slate-400 font-mono"> ({weather.visibility_category || 'Good'})</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            SST: <span className="text-emerald-400 font-semibold">{weather.sea_surface_temperature_c ?? weather.temperature_c ?? 28.0}°C</span>
>>>>>>> 53469ae0314cc74b90cef1a39872bb0970851fd6
          </div>
        </div>
      </div>

<<<<<<< HEAD
      <div className="mt-2 text-[10px] text-slate-500 font-mono text-right flex items-center justify-end gap-1">
        <span>Provenance:</span>
        <span className="text-teal-700 font-bold">{weather.source || 'INCOIS_OSF_LIVE'}</span>
=======
      {/* Provenance footer */}
      <div className="mt-2.5 text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800/60 pt-2">
        <span>Trend: <span className="text-[#22d3ee] font-semibold">{riskProfile?.forecast_trend ? riskProfile.forecast_trend.toUpperCase() : 'STABLE (6H HORIZON)'}</span></span>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Source:</span>
          <span className="text-cyan-400 font-semibold">{weather.source || 'open_meteo_marine_api'}</span>
        </div>
>>>>>>> 53469ae0314cc74b90cef1a39872bb0970851fd6
      </div>
    </div>
  );
}

