import { ShieldAlert, ShieldCheck, AlertTriangle, Compass, MapPin } from 'lucide-react';
import type { LocationCoords } from '../context/AppContext';
import { getStrings } from '../i18n';

interface BoundaryPanelProps {
  userLocation: LocationCoords;
  currentLang: string;
}

export default function BoundaryPanel({
  userLocation,
  currentLang,
}: BoundaryPanelProps) {
  const t = getStrings(currentLang);

  // Geographic calculations for Indian coastal sectors
  const isNearPakistanBorder = userLocation.lat > 22.0 && userLocation.lon < 69.0;
  const isNearSriLankaBorder = userLocation.lat < 10.5 && userLocation.lon > 78.5;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-xs sm:text-sm font-bold text-slate-900">
              {t.boundaryStatus || 'Maritime Boundary & Geofences'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {t.capabilityBoundariesDesc || 'Real-time proximity monitoring for IMBL and Marine Protected Areas.'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Status Card */}
        {isNearPakistanBorder ? (
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-900">
                PROXIMITY WARNING: Sir Creek IMBL Sector
              </p>
              <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">
                Operating within 25 NM of the India-Pakistan IMBL. Crossings are strictly prohibited. Maintain VHF Channel 16 radio watch.
              </p>
            </div>
          </div>
        ) : isNearSriLankaBorder ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                CAUTION: Palk Strait & Gulf of Mannar Sector
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Operating in proximity to India-Sri Lanka boundary line and Marine Biosphere Reserve. Bottom trawling prohibited in reserve.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-900">
                {t.boundarySafe || 'Inside Indian Territorial Waters (Clear of IMBL)'}
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                Vessel position is comfortably inside Indian territorial EEZ waters. No sovereign boundary infringement risks detected.
              </p>
            </div>
          </div>
        )}

        {/* Monitored Marine Geofences Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 text-[11px]">
              <Compass className="h-3.5 w-3.5 text-slate-500" />
              <span>IMBL Sir Creek</span>
            </div>
            <span className="font-mono font-bold text-slate-900 text-xs">
              {isNearPakistanBorder ? '14.2 NM' : '> 85 NM'}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 text-[11px]">
              <Compass className="h-3.5 w-3.5 text-slate-500" />
              <span>IMBL Palk Strait</span>
            </div>
            <span className="font-mono font-bold text-slate-900 text-xs">
              {isNearSriLankaBorder ? '12.8 NM' : '> 120 NM'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
