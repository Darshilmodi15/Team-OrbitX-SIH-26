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
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/50 shadow-[0_0_12px_rgba(251,113,133,0.25)] flex items-center gap-1">
          <span>🚨</span>
          <span>UNSAFE</span>
        </span>
      );
    }
    if (riskLevel === 'caution' || isCaution) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.25)] flex items-center gap-1">
          <span>⚠️</span>
          <span>CAUTION</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.25)] flex items-center gap-1">
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
    <div className="mt-3.5 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 text-xs shadow-md">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-bold text-slate-200 flex items-center gap-2 font-mono tracking-wide text-[11px]">
          <span className="text-cyan-400">🌊</span> METEOROLOGICAL TELEMETRY
        </span>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Forecast */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Forecast</div>
          <div className="text-sm font-bold text-slate-100 mt-1 flex items-center gap-1.5">
            <span className="text-base">{getForecastIcon(weather.forecast)}</span>
            <span className="capitalize">{weather.forecast || 'Clear'}</span>
          </div>
        </div>

        {/* Wave Height */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Significant Wave</div>
          <div className={`text-sm font-bold mt-1 ${wave > 2.0 ? 'text-rose-400' : wave > 1.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {wave.toFixed(2)} <span className="text-xs font-normal text-slate-400 font-mono">m</span>
          </div>
        </div>

        {/* Wind Speed */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Wind Speed</div>
          <div className={`text-sm font-bold mt-1 ${wind > 45 ? 'text-rose-400' : wind > 35 ? 'text-amber-400' : 'text-[#22d3ee]'}`}>
            {wind.toFixed(1)} <span className="text-xs font-normal text-slate-400 font-mono">km/h</span>
          </div>
        </div>

        {/* Temp & Visibility */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Temp / Vis</div>
          <div className="text-sm font-bold text-slate-100 mt-1">
            {weather.temperature_c ?? 29.5}°C <span className="text-xs text-slate-400 font-normal font-mono">/ {weather.visibility_km ?? 16}km</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 text-[10px] text-slate-500 font-mono text-right flex items-center justify-end gap-1.5">
        <span>Provenance:</span>
        <span className="text-cyan-400 font-semibold">{weather.source || 'mock_marine_weather'}</span>
      </div>
    </div>
  );
}
