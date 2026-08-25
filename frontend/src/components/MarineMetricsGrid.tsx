import {
  Waves,
  Wind,
  Navigation,
  Thermometer,
  Eye,
  Activity,
  Radio,
  Clock,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getStrings } from '../i18n';

export default function MarineMetricsGrid() {
  const { weather, currentLang } = useAppContext();
  const t = getStrings(currentLang);

  const metrics = [
    {
      id: 'wave',
      label: t.waveHeight || 'Significant Wave Height',
      value: `${(weather.wave_height_m || 1.2).toFixed(2)} m`,
      subtext: weather.wave_height_m && weather.wave_height_m > 1.8 ? 'Rough Swell' : 'Moderate Sea',
      icon: Waves,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      border: 'border-sky-200/60',
    },
    {
      id: 'wind',
      label: t.windSpeed || 'Wind Velocity',
      value: `${(weather.wind_speed_kmh || 18.0).toFixed(1)} km/h`,
      subtext: `${weather.wind_direction_cardinal || 'WSW'} (${weather.wind_direction_deg || 240}°)`,
      icon: Wind,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-200/60',
    },
    {
      id: 'swell',
      label: t.swellPeriod || 'Peak Swell Period',
      value: `${(weather.swell_period_s || 7.5).toFixed(1)} s`,
      subtext: 'Deep Water Swell',
      icon: Activity,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200/60',
    },
    {
      id: 'sst',
      label: t.seaTemperature || 'Sea Surface Temp',
      value: `${(weather.sst_c || 28.2).toFixed(1)} °C`,
      subtext: 'Thermal Fronts Active',
      icon: Thermometer,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200/60',
    },
    {
      id: 'vis',
      label: t.visibility || 'Optical Visibility',
      value: `${(weather.visibility_km || 15.0).toFixed(0)} km`,
      subtext: 'Clear Horizon',
      icon: Eye,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200/60',
    },
    {
      id: 'tide',
      label: t.tideState || 'Tidal Phase',
      value: weather.tide_state || 'Ebb (Falling)',
      subtext: 'Falling Phase',
      icon: Navigation,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      border: 'border-slate-200/60',
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      {/* Header with Data Freshness */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div>
          <h3 className="font-display text-xs sm:text-sm font-bold text-slate-900">
            {t.marineConditions || 'Live Oceanographic Conditions'}
          </h3>
          <p className="text-[11px] text-slate-500">
            {t.capabilityWeatherDesc || 'Authoritative ocean state telemetry from INCOIS numerical wave & wind models.'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700 font-mono">
            <Radio className="h-2.5 w-2.5 animate-pulse" />
            <span>{t.live || 'LIVE'}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            INCOIS WW3
          </span>
        </div>
      </div>

      {/* Grid of 6 Oceanographic Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 hover:border-slate-200 hover:bg-slate-50 transition"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-medium text-slate-600 truncate">
                  {m.label}
                </span>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${m.bg} ${m.color}`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
              <div>
                <p className="font-display text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  {m.value}
                </p>
                <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                  {m.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
