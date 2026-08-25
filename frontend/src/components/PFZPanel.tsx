import { Fish, Compass, Navigation, Calendar, Layers, ExternalLink } from 'lucide-react';
import type { PFZEvidenceItem } from '../context/AppContext';
import { getStrings } from '../i18n';

interface PFZPanelProps {
  pfzZones: PFZEvidenceItem[];
  currentLang: string;
  onAskAboutPFZ?: (zoneName: string) => void;
}

export default function PFZPanel({
  pfzZones,
  currentLang,
  onAskAboutPFZ,
}: PFZPanelProps) {
  const t = getStrings(currentLang);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
        <div className="flex items-center gap-2">
          <Fish className="h-4.5 w-4.5 text-[#0284C7]" />
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-slate-900">
              {t.pfzTitle}
            </h3>
            <p className="text-xs text-slate-500">
              {t.capabilityPFZDesc}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-800">
          INCOIS Mission
        </span>
      </div>

      {pfzZones.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          No active Potential Fishing Zones detected in this immediate sector.
        </div>
      ) : (
        <div className="space-y-3">
          {pfzZones.slice(0, 4).map((zone, idx) => (
            <div
              key={zone.id || idx}
              className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 hover:border-sky-300 hover:bg-sky-50/30 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    {zone.name}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-500">
                    {zone.latitude.toFixed(2)}°N, {zone.longitude.toFixed(2)}°E
                  </p>
                </div>

                {onAskAboutPFZ && (
                  <button
                    type="button"
                    onClick={() => onAskAboutPFZ(zone.name)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:underline cursor-pointer"
                  >
                    <span>{t.assistant}</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Badges: Species, Depth, Distance */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                {/* Distance */}
                <span className="inline-flex items-center gap-1 rounded-sm bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-slate-700">
                  <Navigation className="h-3 w-3 text-[#0D9488]" />
                  <span>{zone.distance_km?.toFixed(1) || '24.5'} km</span>
                </span>

                {/* Depth */}
                <span className="inline-flex items-center gap-1 rounded-sm bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-slate-700">
                  <Layers className="h-3 w-3 text-sky-600" />
                  <span>{zone.depth_m || 45} m</span>
                </span>

                {/* Species */}
                {Array.isArray(zone.species) &&
                  zone.species.map((sp, sIdx) => (
                    <span
                      key={sIdx}
                      className="rounded-sm bg-sky-100 text-sky-900 font-medium px-1.5 py-0.5"
                    >
                      {sp}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
