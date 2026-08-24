interface MarineMetricsProps {
  weather?: {
    forecast?: string;
    wave_height_m?: number;
    wind_speed_kmh?: number;
    temperature_c?: number | null;
    visibility_km?: number | null;
    source?: string;
  };
  riskLevel?: string | null;
}

export default function MarineMetrics({ weather, riskLevel }: MarineMetricsProps) {
  if (!weather) return null;

  const wave = weather.wave_height_m ?? 0;
  const wind = weather.wind_speed_kmh ?? 0;
  const forecast = (weather.forecast || '').toLowerCase();

  const isSevere = wave > 2.5 || wind > 50 || forecast === 'stormy';
  const isCaution = !isSevere && (wave > 1.5 || wind > 40 || forecast === 'rainy');

  const getStatusBadge = () => {
    if (riskLevel === 'unsafe' || isSevere) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
          <span>🚨</span>
          <span>UNSAFE</span>
        </span>
      );
    }
    if (riskLevel === 'caution' || isCaution) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
          <span>⚠️</span>
          <span>CAUTION</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
        <span>✅</span>
        <span>SAFE TO SAIL</span>
      </span>
    );
  };

  const getForecastIcon = (fc?: string) => {
    const f = (fc || '').toLowerCase();
    if (f.includes('storm')) return '⛈️';
    if (f.includes('rain')) return '🌧️';
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

