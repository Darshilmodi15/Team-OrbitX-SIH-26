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
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <Fish className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-xs sm:text-sm font-bold text-slate-900">
              {t.pfzTitle || 'Potential Fishing Zones (PFZ)'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {t.capabilityPFZDesc || 'INCOIS satellite chlorophyll & thermal front detection.'}
            </p>
          </div>
        </div>
        <span className="rounded-md bg-sky-50 border border-sky-200/80 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-800">
          INCOIS
        </span>
      </div>

      {pfzZones.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          No active Potential Fishing Zones detected in this immediate sector.
        </div>
      ) : (
        <div className="space-y-2">
          {pfzZones.slice(0, 4).map((zone, idx) => (
            <div
              key={zone.id || idx}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 hover:border-sky-200 hover:bg-sky-50/20 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {zone.name}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-500">
                    {zone.latitude.toFixed(2)}°N, {zone.longitude.toFixed(2)}°E
                  </p>
                </div>

                {onAskAboutPFZ && (
                  <button
                    type="button"
                    onClick={() => onAskAboutPFZ(zone.name)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#0D9488] hover:underline cursor-pointer"
                  >
                    <span>Ask ORCA</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>

              {/* Badges: Distance, Depth, Species */}
              <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
                {/* Distance */}
                <span className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200/80 px-1.5 py-0.5 font-mono text-slate-700 font-medium">
                  <Navigation className="h-2.5 w-2.5 text-[#0D9488]" />
                  <span>{zone.distance_km?.toFixed(1) || '24.5'} km</span>
                </span>

                {/* Depth */}
                <span className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200/80 px-1.5 py-0.5 font-mono text-slate-700 font-medium">
                  <Layers className="h-2.5 w-2.5 text-sky-600" />
                  <span>{zone.depth_m || 45} m</span>
                </span>

                {/* Species */}
                {Array.isArray(zone.species) &&
                  zone.species.slice(0, 3).map((sp, sIdx) => (
                    <span
                      key={sIdx}
                      className="rounded-md bg-sky-100/80 text-sky-900 font-medium px-1.5 py-0.5"
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
