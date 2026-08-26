import { useState } from 'react';
import { MapPin, Navigation, Compass, AlertCircle, CheckCircle2 } from 'lucide-react';
import { INDIAN_PORTS, type Port } from '../data/maritimeData';
import { getLocalizedPort } from '../data/localizedGeo';
import { validateLocation } from '../services/api';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onLocationApproved: (location: { lat: number; lon: number }, validationInfo: any) => void;
  currentLang?: string;
}

export default function LocationPermissionModal({
  isOpen,
  onLocationApproved,
  currentLang = 'en',
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
    <div className="modal-backdrop">
      <div className="modal-card p-6 sm:p-8">
        {/* Icon */}
        <div className="text-center mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #0B3D5B 0%, #0F766E 100%)' }}
          >
            <Navigation className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Set Your Location</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
            ORCA uses your location for coastal distance, live wave telemetry, and maritime boundary monitoring.
          </p>
        </div>

        {/* Validation Feedback */}
        {validationResult && (
          <div
            className={`mb-4 p-3.5 rounded-xl border text-xs leading-relaxed ${
              validationResult.is_coastal_supported
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold mb-1">
              {validationResult.is_coastal_supported ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span>
                {validationResult.is_coastal_supported
                  ? `Coastal Zone Verified — ${validationResult.coastal_region}`
                  : 'Inland / Unsupported Location'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">{validationResult.message}</p>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        {!showManualPicker ? (
          <div className="space-y-3">
            <button
              onClick={handleRequestGPS}
              disabled={isLocating}
              className="w-full py-3 rounded-xl text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.97] cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0B3D5B 0%, #0F766E 100%)' }}
            >
              {isLocating ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>Use GPS Location</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowManualPicker(true)}
              className="w-full py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Compass className="w-4 h-4 text-teal-700" />
              <span>Choose Coastal Port Manually</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Select Coastal Port
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {INDIAN_PORTS.map((port) => {
                const localizedPort = getLocalizedPort(port, currentLang);
                return (
                  <button
                    key={port.id}
                    onClick={() => handleSelectPort(port)}
                    className="w-full p-3 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-left transition flex items-center justify-between text-xs cursor-pointer group"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 group-hover:text-teal-800 flex items-center gap-1.5">
                        <span>⚓</span>
                        <span>{localizedPort.name}</span>
                        {localizedPort.name !== port.name && (
                          <span className="text-[10px] text-slate-400 font-normal">({port.name})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {port.state} · {port.lat.toFixed(2)}°N, {port.lon.toFixed(2)}°E
                      </div>
                    </div>
                    <span className="text-[11px] text-teal-600 opacity-0 group-hover:opacity-100 transition font-medium">
                      Select →
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowManualPicker(false)}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 transition cursor-pointer font-medium"
            >
              ← Back to GPS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
