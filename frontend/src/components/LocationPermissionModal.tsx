import { useState } from 'react';
import { MapPin, Navigation, Compass, AlertCircle, CheckCircle2 } from 'lucide-react';
import { INDIAN_PORTS, type Port } from '../data/maritimeData';
import { validateLocation } from '../services/api';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onLocationApproved: (location: { lat: number; lon: number }, validationInfo: any) => void;
  currentLang?: string;
}

export default function LocationPermissionModal({
  isOpen,
  onLocationApproved,
}: LocationPermissionModalProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showManualPicker, setShowManualPicker] = useState(false);

  if (!isOpen) return null;

  const handleRequestGPS = () => {
    setErrorMsg(null);
    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation is not supported by your browser. Please select a coastal port manually.');
      setShowManualPicker(true);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        try {
          const valRes = await validateLocation(lat, lon, accuracy);
          setValidationResult(valRes);
          if (valRes.is_coastal_supported) {
            setTimeout(() => {
              onLocationApproved({ lat, lon }, valRes);
            }, 900);
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Location validation error');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        setErrorMsg(`GPS access denied (${err.message}). You can select your coastal base manually below.`);
        setShowManualPicker(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSelectPort = async (port: Port) => {
    setIsLocating(true);
    setErrorMsg(null);
    try {
      const valRes = await validateLocation(port.lat, port.lon);
      setValidationResult(valRes);
      onLocationApproved({ lat: port.lat, lon: port.lon }, valRes);
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation error');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl text-white">
        {/* Top Icon */}
        <div className="w-12 h-12 rounded-2xl bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400 mx-auto mb-3 shadow-sm">
          <Navigation className="w-6 h-6 animate-pulse" />
        </div>

        {/* Title */}
        <h2 className="text-lg font-black text-center text-white tracking-tight mb-1">
          Allow Location Access?
        </h2>
        <p className="text-xs text-center text-slate-300 leading-relaxed mb-5">
          ORCA uses your GPS location to calculate coastal distance, provide live wave and weather telemetry from INCOIS, and monitor maritime boundary geofences.
        </p>

        {/* Status / Validation Feedback */}
        {validationResult && (
          <div
            className={`mb-4 p-3.5 rounded-2xl border text-xs leading-relaxed ${
              validationResult.is_coastal_supported
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {validationResult.is_coastal_supported ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
              <span>
                {validationResult.is_coastal_supported
                  ? `Coastal Zone Verified (${validationResult.coastal_region})`
                  : 'Inland / Unsupported Location'}
              </span>
            </div>
            <p className="text-[11px] text-slate-200">{validationResult.message}</p>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Action Buttons */}
        {!showManualPicker ? (
          <div className="space-y-3">
            <button
              onClick={handleRequestGPS}
              disabled={isLocating}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isLocating ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>Allow GPS Location</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowManualPicker(true)}
              className="w-full py-3 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Choose Coastal Location Manually</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">
              Select Coastal Port Base:
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {INDIAN_PORTS.map((port) => (
                <button
                  key={port.id}
                  onClick={() => handleSelectPort(port)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-teal-950/60 border border-slate-800 hover:border-teal-500 text-left transition flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-slate-200 group-hover:text-teal-300">
                      {port.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {port.state} ({port.lat.toFixed(2)}°N, {port.lon.toFixed(2)}°E)
                    </div>
                  </div>
                  <span className="text-[10px] text-teal-400 opacity-0 group-hover:opacity-100 transition">
                    Select →
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowManualPicker(false)}
              className="w-full py-2 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              ← Back to GPS prompt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
