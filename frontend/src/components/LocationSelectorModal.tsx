import { useState } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  Check,
  AlertCircle,
  X,
  Compass,
} from 'lucide-react';
import { INDIAN_PORTS, type Port } from '../data/maritimeData';
import { getLocalizedPort } from '../data/localizedGeo';
import { validateLocation, updateUserLocation } from '../services/api';
import type { LocationCoords } from '../context/AppContext';
import { getStrings } from '../i18n';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPort: Port;
  onSelectPort: (port: Port) => void;
  onUpdateCoords: (coords: LocationCoords) => void;
  currentLang?: string;
}

export default function LocationSelectorModal({
  isOpen,
  onClose,
  selectedPort,
  onSelectPort,
  onUpdateCoords,
  currentLang = 'en',
}: LocationSelectorModalProps) {
  const t = getStrings(currentLang);
  const [searchTerm, setSearchTerm] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [customLat, setCustomLat] = useState(selectedPort.lat.toString());
  const [customLon, setCustomLon] = useState(selectedPort.lon.toString());
  const [validationMsg, setValidationMsg] = useState<{ valid: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const filteredPorts = INDIAN_PORTS.filter((port) => {
    const loc = getLocalizedPort(port, currentLang);
    const q = searchTerm.toLowerCase().trim();
    return (
      port.name.toLowerCase().includes(q) ||
      loc.name.toLowerCase().includes(q) ||
      port.state.toLowerCase().includes(q)
    );
  });

  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setValidationMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCustomLat(lat.toFixed(4));
        setCustomLon(lon.toFixed(4));

        try {
          const res = await validateLocation(lat, lon);
          if (res.valid) {
            onUpdateCoords({ lat, lon });
            setValidationMsg({ valid: true, text: 'GPS coastal coordinates verified.' });
            setTimeout(() => onClose(), 800);
          } else {
            setValidationMsg({
              valid: false,
              text: res.message || 'Position is inland or outside Indian coastal waters.',
            });
          }
        } catch {
          onUpdateCoords({ lat, lon });
          onClose();
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setValidationMsg({ valid: false, text: 'Unable to acquire GPS signal. Please select a port below.' });
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleCustomValidate = async () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (isNaN(lat) || isNaN(lon)) {
      setValidationMsg({ valid: false, text: 'Please enter valid decimal coordinates.' });
      return;
    }

    try {
      const res = await validateLocation(lat, lon);
      if (res.valid) {
        onUpdateCoords({ lat, lon });
        setValidationMsg({ valid: true, text: 'Custom coordinates successfully verified.' });
        setTimeout(() => onClose(), 700);
      } else {
        setValidationMsg({
          valid: false,
          text: res.message || 'Coordinates are outside Indian coastal waters.',
        });
      }
    } catch {
      onUpdateCoords({ lat, lon });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl animate-scaleIn max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A2540] text-white shadow-xs">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                {t.locationTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {t.locationSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* GPS Quick Action */}
        <div className="mb-4 shrink-0">
          <button
            type="button"
            onClick={handleGpsDetect}
            disabled={gpsLoading}
            className="w-full rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs font-bold text-[#0D9488] hover:bg-teal-100/70 active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Navigation className={`h-4 w-4 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? t.detectingGps : t.allowGps}</span>
          </button>
        </div>

        {/* Search Port Input */}
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchLocation}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D9488] focus:bg-white focus:outline-none"
          />
        </div>

        {/* Ports Directory List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[160px] max-h-[220px]">
          {filteredPorts.map((port) => {
            const isSelected = selectedPort.id === port.id;
            const localizedPort = getLocalizedPort(port, currentLang);
            return (
              <button
                key={port.id}
                type="button"
                onClick={() => {
                  onSelectPort(port);
                  onClose();
                }}
                className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left text-xs transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#0D9488]/10 border border-[#0D9488]/30 font-bold text-[#0D9488]'
                    : 'border border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>⚓</span>
                    <span>{localizedPort.name}</span>
                    {localizedPort.name !== port.name && (
                      <span className="text-[10px] text-slate-400 font-normal">({port.name})</span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {port.state} • {port.lat.toFixed(2)}°N, {port.lon.toFixed(2)}°E
                  </p>
                </div>
                {isSelected && <Check className="h-4 w-4 text-[#0D9488]" />}
              </button>
            );
          })}
        </div>

        {/* Custom Coordinates Inputs */}
        <div className="mt-4 pt-3 border-t border-slate-100 shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Manual Coordinate Verification
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              placeholder="Lat (°N)"
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800"
            />
            <input
              type="text"
              value={customLon}
              onChange={(e) => setCustomLon(e.target.value)}
              placeholder="Lon (°E)"
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800"
            />
          </div>
          <button
            type="button"
            onClick={handleCustomValidate}
            className="mt-2 w-full rounded-lg bg-[#0A2540] py-2 text-xs font-bold text-white shadow-xs hover:bg-[#081D33] transition cursor-pointer"
          >
            {t.validateLocation}
          </button>
        </div>

        {/* Validation Feedback Banner */}
        {validationMsg && (
          <div
            className={`mt-3 rounded-lg border p-2.5 text-xs flex items-center gap-2 ${
              validationMsg.valid
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {validationMsg.valid ? (
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{validationMsg.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
