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
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
          <span>🚨</span>
          <span>HIGH RISK / UNSAFE</span>
        </span>
      );
    }
    if (riskLevel === 'caution' || riskProfile?.overall === 'MODERATE' || isCaution) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
          <span>⚠️</span>
          <span>CAUTION ADVISED</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
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
    <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-xs">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/80">
        <span className="font-bold text-slate-800 flex items-center gap-1.5 font-mono tracking-tight text-xs">
          <span>🌊</span> METEOROLOGICAL TELEMETRY
        </span>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          </div>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-slate-500 font-mono text-right flex items-center justify-end gap-1">
        <span>Provenance:</span>
        <span className="text-teal-700 font-bold">{weather.source || 'INCOIS_OSF_LIVE'}</span>
      </div>
    </div>
  );
}
