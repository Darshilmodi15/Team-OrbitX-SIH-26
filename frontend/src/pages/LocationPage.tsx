import { useState } from 'react';
import { MapPin, Navigation, AlertCircle, CheckCircle2, Anchor, Loader2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { INDIAN_PORTS, type Port } from '../data/maritimeData';
import { validateLocation } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { getStrings } from '../i18n';

export default function LocationPage() {
  const { currentLang, setUserLocation, handleSelectPort } = useAppContext();
  const navigate = useNavigate();
  const t = getStrings(currentLang);

  const [isLocating, setIsLocating] = useState(false);
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPorts = INDIAN_PORTS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRequestGPS = () => {
    setErrorMsg(null);
    setValidationResult(null);

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
            setUserLocation({ lat, lon });
            setIsLocating(false);
            navigate('/dashboard');
          } else {
            setIsLocating(false);
            setErrorMsg(
              valRes.message ||
                `Your position is ${valRes.distance_to_coast_km?.toFixed(0) || 'too'} km from the coast. Please select a coastal port below.`
            );
            setShowManualPicker(true);
          }
        } catch {
          setUserLocation({ lat, lon });
          setIsLocating(false);
          navigate('/dashboard');
        }
      },
      (err) => {
        setIsLocating(false);
        setErrorMsg(`GPS access unavailable (${err.message}). Please select a coastal base port below.`);
        setShowManualPicker(true);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const onChoosePort = (port: Port) => {
    setSelectedPortId(port.id);
    handleSelectPort(port);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A2540] text-white shadow-xs">
              <Anchor className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-base font-extrabold text-[#0A2540]">
                ORCA
              </span>
              <span className="rounded-sm bg-[#0D9488]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#0D9488] ml-1.5">
                MARINE AI
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-[#0D9488] mb-3">
                <MapPin className="h-6 w-6" />
              </div>
              <h1 className="font-display text-xl font-black text-slate-900">
                {t.locationTitle}
              </h1>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                {t.locationPurpose}
              </p>
            </div>

            {validationResult && (
              <div
                className={`mb-4 p-3 rounded-lg border text-xs ${
                  validationResult.is_coastal_supported
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {validationResult.is_coastal_supported ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                  )}
                  <div>
                    <p className="font-bold">
                      {validationResult.is_coastal_supported ? t.locationValid : t.locationInvalid}
                    </p>
                    {validationResult.distance_to_coast_km != null && (
                      <p className="text-[11px] mt-0.5">
                        {t.distanceToCoast}: {validationResult.distance_to_coast_km.toFixed(1)} km
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 font-medium">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* GPS Trigger Button */}
            <button
              type="button"
              onClick={handleRequestGPS}
              disabled={isLocating}
              className="w-full rounded-xl bg-[#0A2540] py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#081D33] active:scale-98 transition disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mb-3"
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              <span>{isLocating ? t.loading : t.allowGps}</span>
            </button>

            {/* Manual Selection Toggle */}
            <button
              type="button"
              onClick={() => setShowManualPicker(!showManualPicker)}
              className="w-full py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              {t.chooseManual}
            </button>

            {/* Searchable Port List */}
            {showManualPicker && (
              <div className="mt-4 border-t border-slate-100 pt-4 animate-fadeIn">
                <div className="relative mb-2.5">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t.searchLocation}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D9488] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {filteredPorts.map((port) => (
                    <button
                      key={port.id}
                      type="button"
                      onClick={() => onChoosePort(port)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition text-xs flex items-center justify-between cursor-pointer ${
                        selectedPortId === port.id
                          ? 'bg-[#0D9488]/10 border border-[#0D9488]/30 text-[#0D9488] font-bold'
                          : 'hover:bg-slate-50 text-slate-800 border border-slate-100 bg-slate-50/50'
                      }`}
                    >
                      <div>
                        <span className="font-bold">{port.name}</span>
                        <span className="text-slate-400 ml-1.5 text-[11px]">{port.state}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {port.lat.toFixed(1)}°N
                      </span>
                    </button>
                  ))}
                  {filteredPorts.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-4">No matching ports found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
