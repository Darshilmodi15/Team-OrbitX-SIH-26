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
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4.5 w-4.5 text-red-600" />
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-slate-900">
              {t.boundaryStatus}
            </h3>
            <p className="text-xs text-slate-500">
              {t.capabilityBoundariesDesc}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Status Card */}
        {isNearPakistanBorder ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3.5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-red-900">
                PROXIMITY WARNING: Sir Creek IMBL Sector
              </p>
              <p className="text-xs text-red-800 mt-1 leading-relaxed">
                Vessel is operating within 25 NM of the India-Pakistan International Maritime Boundary Line. Crossings are strictly prohibited. Maintain vigilant radio watch on VHF Channel 16.
              </p>
            </div>
          </div>
        ) : isNearSriLankaBorder ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-900">
                CAUTION: Palk Strait & Gulf of Mannar Sector
              </p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Operating in proximity to India-Sri Lanka bilateral maritime boundary line and Gulf of Mannar Marine Biosphere Reserve. Commercial bottom trawling prohibited in reserve waters.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-emerald-900">
                {t.boundarySafe}
              </p>
              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                Vessel position is comfortably inside Indian territorial EEZ waters. No sovereign boundary infringement risks detected.
              </p>
            </div>
          </div>
        )}

        {/* Monitored Marine Geofences Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Compass className="h-3.5 w-3.5 text-slate-500" />
              <span>IMBL Sir Creek Sector</span>
            </div>
            <span className="font-mono font-bold text-slate-900">
              {isNearPakistanBorder ? '14.2 NM' : '> 85 NM'}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Compass className="h-3.5 w-3.5 text-slate-500" />
              <span>IMBL Palk Strait Sector</span>
            </div>
            <span className="font-mono font-bold text-slate-900">
              {isNearSriLankaBorder ? '12.8 NM' : '> 120 NM'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
